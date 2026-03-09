import { Router } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { prisma } from "../db";
import { uploadFile, getPresignedDownloadUrl } from "../storage";
import { documentQueue, PipelineJobData } from "../queue";
import { authenticate, authorize } from "../middleware/auth";
import { logAudit } from "../services/audit";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// All routes require auth
router.use(authenticate);

/**
 * POST /api/documents/upload
 * Upload a document file, store in S3, kick off pipeline.
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const s3Key = `uploads/${uuid()}/${req.file.originalname}`;
  await uploadFile(s3Key, req.file.buffer, req.file.mimetype);

  const doc = await prisma.document.create({
    data: {
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      s3Key,
      submitterId: req.user!.id,
    },
  });

  await logAudit({
    action: "DOCUMENT_UPLOADED",
    entityType: "Document",
    entityId: doc.id,
    newValue: { fileName: doc.fileName, mimeType: doc.mimeType, fileSize: doc.fileSize },
    userId: req.user!.id,
    documentId: doc.id,
    ipAddress: req.ip,
  });

  // Kick off pipeline
  await documentQueue.add("ocr", { documentId: doc.id, step: "ocr" } satisfies PipelineJobData);

  res.status(201).json(doc);
});

/**
 * GET /api/documents
 * List documents with filtering. Submitters see their own; Validators/Supervisors see all.
 */
router.get("/", async (req, res) => {
  const { status, docType, assigneeId, page = "1", limit = "20" } = req.query;
  const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
  const take = parseInt(limit as string, 10);

  const where: Record<string, unknown> = {};
  if (req.user!.role === "SUBMITTER") where.submitterId = req.user!.id;
  if (status) where.status = status;
  if (docType) where.docType = docType;
  if (assigneeId) where.assigneeId = assigneeId;

  const [docs, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { submitter: { select: { id: true, name: true, email: true } }, assignee: { select: { id: true, name: true } } },
    }),
    prisma.document.count({ where }),
  ]);

  res.json({ data: docs, total, page: parseInt(page as string, 10), limit: take });
});

/**
 * GET /api/documents/:id
 */
router.get("/:id", async (req, res) => {
  const doc = await prisma.document.findUnique({
    where: { id: req.params.id },
    include: {
      submitter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true } },
      reviews: { include: { reviewer: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!doc) { res.status(404).json({ error: "Not found" }); return; }
  if (req.user!.role === "SUBMITTER" && doc.submitterId !== req.user!.id) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json(doc);
});

/**
 * GET /api/documents/:id/download
 */
router.get("/:id/download", async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) { res.status(404).json({ error: "Not found" }); return; }

  const url = await getPresignedDownloadUrl(doc.s3Key);
  res.json({ url });
});

/**
 * POST /api/documents/:id/assign
 */
router.post("/:id/assign", authorize("VALIDATOR", "SUPERVISOR"), async (req, res) => {
  const { assigneeId } = req.body;
  const targetId = assigneeId || req.user!.id;

  const doc = await prisma.document.update({
    where: { id: req.params.id },
    data: { assigneeId: targetId },
  });

  await logAudit({
    action: "DOCUMENT_ASSIGNED",
    entityType: "Document",
    entityId: doc.id,
    newValue: { assigneeId: targetId },
    userId: req.user!.id,
    documentId: doc.id,
  });

  res.json(doc);
});

/**
 * POST /api/documents/:id/review
 * Submit a review decision (APPROVED, REJECTED, CHANGES_REQUESTED)
 */
router.post("/:id/review", authorize("VALIDATOR", "SUPERVISOR"), async (req, res) => {
  const { decision, comment } = req.body;
  const validDecisions = ["APPROVED", "REJECTED", "CHANGES_REQUESTED"];
  if (!validDecisions.includes(decision)) {
    res.status(400).json({ error: `decision must be one of: ${validDecisions.join(", ")}` });
    return;
  }

  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) { res.status(404).json({ error: "Not found" }); return; }
  if (doc.status !== "PENDING_REVIEW") {
    res.status(400).json({ error: `Cannot review document in status ${doc.status}` });
    return;
  }

  const review = await prisma.review.create({
    data: {
      decision,
      comment,
      documentId: doc.id,
      reviewerId: req.user!.id,
    },
  });

  await prisma.document.update({
    where: { id: doc.id },
    data: { status: decision },
  });

  await logAudit({
    action: "REVIEW_SUBMITTED",
    entityType: "Review",
    entityId: review.id,
    newValue: { decision, comment },
    userId: req.user!.id,
    documentId: doc.id,
  });

  res.json(review);
});

/**
 * POST /api/documents/:id/retry
 * Re-queue a document that errored.
 */
router.post("/:id/retry", authorize("VALIDATOR", "SUPERVISOR"), async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) { res.status(404).json({ error: "Not found" }); return; }
  if (doc.status !== "ERROR") {
    res.status(400).json({ error: "Only ERROR documents can be retried" });
    return;
  }

  await prisma.document.update({ where: { id: doc.id }, data: { status: "UPLOADED", errorReason: null } });
  await documentQueue.add("ocr", { documentId: doc.id, step: "ocr" } satisfies PipelineJobData);

  await logAudit({
    action: "DOCUMENT_RETRIED",
    entityType: "Document",
    entityId: doc.id,
    userId: req.user!.id,
    documentId: doc.id,
  });

  res.json({ message: "Document re-queued" });
});

export default router;
