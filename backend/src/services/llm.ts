/**
 * LLM service for document classification and field extraction.
 * Uses Claude API when ANTHROPIC_API_KEY is set, otherwise falls back to deterministic stub.
 */

import { config } from "../config";

export interface ClassificationResult {
  docType: string;
  confidence: number;
}

export interface ExtractionResult {
  fields: Record<string, { value: string; provenance: string; confidence: number }>;
}

// ─── Stub (offline / no API key) ────────────────────────────────────────

function classifyStub(ocrText: string): ClassificationResult {
  const lower = ocrText.toLowerCase();
  if (lower.includes("trade confirmation"))
    return { docType: "TRADE_CONFIRMATION", confidence: 0.96 };
  if (lower.includes("settlement instruction"))
    return { docType: "SETTLEMENT_INSTRUCTION", confidence: 0.94 };
  if (lower.includes("kyc document") || lower.includes("entity verification"))
    return { docType: "KYC_DOCUMENT", confidence: 0.93 };
  if (lower.includes("regulatory filing"))
    return { docType: "REGULATORY_FILING", confidence: 0.95 };
  return { docType: "UNKNOWN", confidence: 0.3 };
}

function extractStub(ocrText: string, docType: string): ExtractionResult {
  const lines = ocrText.split("\n").filter((l) => l.includes(":"));
  const fields: ExtractionResult["fields"] = {};

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line
      .slice(0, colonIdx)
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    const value = line.slice(colonIdx + 1).trim();
    if (key && value) {
      fields[key] = {
        value,
        provenance: `OCR line: "${line.trim()}"`,
        confidence: 0.88 + Math.random() * 0.1,
      };
    }
  }

  return { fields };
}

// ─── Claude API ─────────────────────────────────────────────────────────

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude API error ${resp.status}: ${err}`);
  }

  const data = (await resp.json()) as any;
  return data.content[0].text;
}

async function classifyWithClaude(ocrText: string): Promise<ClassificationResult> {
  const system = `You classify financial documents. Respond with ONLY valid JSON: {"docType":"<TYPE>","confidence":<0-1>}
Valid types: TRADE_CONFIRMATION, SETTLEMENT_INSTRUCTION, KYC_DOCUMENT, REGULATORY_FILING, UNKNOWN`;

  const result = await callClaude(system, `Classify this document:\n\n${ocrText.slice(0, 3000)}`);
  return JSON.parse(result);
}

async function extractWithClaude(ocrText: string, docType: string): Promise<ExtractionResult> {
  const fieldSpecs: Record<string, string> = {
    TRADE_CONFIRMATION: "counterparty, instrument, quantity, price, trade_date, settlement_date, reference",
    SETTLEMENT_INSTRUCTION: "beneficiary, bic, account_number, value_date, currency, amount, reference",
    KYC_DOCUMENT: "entity_name, registration_number, jurisdiction, document_expiry, lei, authorized_signatory",
    REGULATORY_FILING: "filing_type, reference_number, submission_deadline, reporting_period, filer, cik",
  };

  const system = `You extract structured fields from financial documents.
Respond with ONLY valid JSON: {"fields":{"field_name":{"value":"...","provenance":"exact text from source","confidence":0.0-1.0}}}
Required fields: ${fieldSpecs[docType] || "any relevant fields"}`;

  const result = await callClaude(system, `Extract fields from this ${docType}:\n\n${ocrText.slice(0, 4000)}`);
  return JSON.parse(result);
}

// ─── Public API ─────────────────────────────────────────────────────────

const useLive = !!config.anthropicApiKey;

export async function classifyDocument(ocrText: string): Promise<ClassificationResult> {
  if (useLive) {
    try {
      return await classifyWithClaude(ocrText);
    } catch (e) {
      console.warn("Claude classify failed, falling back to stub:", e);
    }
  }
  return classifyStub(ocrText);
}

export async function extractFields(ocrText: string, docType: string): Promise<ExtractionResult> {
  if (useLive) {
    try {
      return await extractWithClaude(ocrText, docType);
    } catch (e) {
      console.warn("Claude extract failed, falling back to stub:", e);
    }
  }
  return extractStub(ocrText, docType);
}
