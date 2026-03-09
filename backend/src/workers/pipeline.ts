import { Job } from "bullmq";
import { prisma } from "../db";
import { getFileBuffer } from "../storage";
import { ocrAdapter } from "../services/ocr";
import { classifyDocument, extractFields } from "../services/llm";
import { validateDocument } from "../services/validation";
import { logAudit } from "../services/audit";
import { documentQueue, PipelineJobData } from "../queue";
import { config } from "../config";
import { DocStatus, DocType } from "@prisma/client";

async function updateStatus(docId: string, status: DocStatus, extra?: Record<string, unknown>) {
  const old = await prisma.document.findUnique({ where: { id: docId }, select: { status: true } });
  await prisma.document.update({ where: { id: docId }, data: { status, ...extra } });
  await logAudit({
    action: "STATUS_CHANGED",
    entityType: "Document",
    entityId: docId,
    oldValue: { status: old?.status },
    newValue: { status, ...extra },
    documentId: docId,
  });
}

async function handleOcr(docId: string) {
  await updateStatus(docId, "OCR_PROCESSING");

  const doc = await prisma.document.findUniqueOrThrow({ where: { id: docId } });
  const buffer = await getFileBuffer(doc.s3Key);
  const ocrResult = await ocrAdapter.extract(buffer, doc.mimeType);

  await prisma.document.update({
    where: { id: docId },
    data: { ocrText: ocrResult.text },
  });

  // Chain to extraction
  await documentQueue.add("extract", { documentId: docId, step: "extract" } satisfies PipelineJobData);
}

async function handleExtract(docId: string) {
  await updateStatus(docId, "EXTRACTING");

  const doc = await prisma.document.findUniqueOrThrow({ where: { id: docId } });
  if (!doc.ocrText) throw new Error("No OCR text available");

  // Classify
  const classification = await classifyDocument(doc.ocrText);
  const docType = classification.docType as DocType;
  const slaHours = config.slaHours[docType] || 4;
  const slaDeadline = new Date(doc.createdAt.getTime() + slaHours * 60 * 60 * 1000);

  // Extract fields
  const extraction = await extractFields(doc.ocrText, docType);

  await prisma.document.update({
    where: { id: docId },
    data: {
      docType,
      classConfidence: classification.confidence,
      extractedFields: extraction.fields as any,
      slaDeadline,
    },
  });

  await logAudit({
    action: "FIELDS_EXTRACTED",
    entityType: "Document",
    entityId: docId,
    newValue: { docType, fieldCount: Object.keys(extraction.fields).length },
    documentId: docId,
  });

  // Chain to validation
  await documentQueue.add("validate", { documentId: docId, step: "validate" } satisfies PipelineJobData);
}

async function handleValidate(docId: string) {
  await updateStatus(docId, "VALIDATING");

  const doc = await prisma.document.findUniqueOrThrow({ where: { id: docId } });
  const fields = (doc.extractedFields as Record<string, any>) || {};

  const errors = validateDocument(doc.docType, fields);
  const hasBlockingErrors = errors.some((e) => e.severity === "error");

  await prisma.document.update({
    where: { id: docId },
    data: { validationErrors: errors as any },
  });

  // Move to pending review (human decides regardless, but errors are flagged)
  await updateStatus(docId, "PENDING_REVIEW", {
    validationErrors: errors as any,
  });

  await logAudit({
    action: "VALIDATION_COMPLETE",
    entityType: "Document",
    entityId: docId,
    newValue: { errorCount: errors.length, hasBlockingErrors },
    documentId: docId,
  });
}

export async function processPipelineJob(job: Job<PipelineJobData>) {
  const { documentId, step } = job.data;
  console.log(`[pipeline] Processing ${step} for document ${documentId}`);

  try {
    switch (step) {
      case "ocr":
        await handleOcr(documentId);
        break;
      case "extract":
        await handleExtract(documentId);
        break;
      case "validate":
        await handleValidate(documentId);
        break;
      default:
        throw new Error(`Unknown step: ${step}`);
    }
  } catch (err: any) {
    console.error(`[pipeline] Error in ${step} for ${documentId}:`, err);
    await updateStatus(documentId, "ERROR", { errorReason: err.message });
    throw err; // Let BullMQ handle retries
  }
}
