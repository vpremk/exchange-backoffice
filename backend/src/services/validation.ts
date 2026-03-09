/**
 * Rule-based validation per document type.
 * Returns an array of validation errors (empty = passed).
 */

export interface ValidationError {
  field: string;
  rule: string;
  message: string;
  severity: "error" | "warning";
}

type FieldMap = Record<string, { value: string; provenance: string; confidence: number }>;

function parseDate(s: string): Date | null {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseNumber(s: string): number | null {
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

const KNOWN_COUNTERPARTIES = [
  "goldman sachs", "jpmorgan", "morgan stanley", "citadel",
  "barclays", "ubs", "credit suisse", "deutsche bank",
  "goldman sachs international", "jpmorgan chase",
];

const ALLOWED_JURISDICTIONS = [
  "united states", "united kingdom", "european union", "singapore",
  "hong kong", "japan", "switzerland", "canada", "australia",
  "united states - delaware", "united states - new york",
];

function validateTradeConfirmation(fields: FieldMap): ValidationError[] {
  const errors: ValidationError[] = [];

  const qty = fields.quantity ? parseNumber(fields.quantity.value) : null;
  if (qty === null || qty <= 0) {
    errors.push({ field: "quantity", rule: "POSITIVE_NUMBER", message: "Quantity must be > 0", severity: "error" });
  }

  const price = fields.price ? parseNumber(fields.price.value) : null;
  if (price === null || price <= 0) {
    errors.push({ field: "price", rule: "POSITIVE_NUMBER", message: "Price must be > 0", severity: "error" });
  }

  const tradeDate = fields.trade_date ? parseDate(fields.trade_date.value) : null;
  const settlDate = fields.settlement_date ? parseDate(fields.settlement_date.value) : null;
  if (tradeDate && settlDate) {
    const diffDays = (settlDate.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 1 || diffDays > 3) {
      errors.push({ field: "settlement_date", rule: "T_PLUS_RANGE", message: `Settlement must be T+1 to T+2, got T+${diffDays}`, severity: "warning" });
    }
  }

  if (fields.counterparty) {
    const cp = fields.counterparty.value.toLowerCase();
    if (!KNOWN_COUNTERPARTIES.some((k) => cp.includes(k))) {
      errors.push({ field: "counterparty", rule: "KNOWN_COUNTERPARTY", message: "Counterparty not in approved list", severity: "warning" });
    }
  }

  return errors;
}

function validateSettlementInstruction(fields: FieldMap): ValidationError[] {
  const errors: ValidationError[] = [];

  if (fields.bic) {
    const bic = fields.bic.value.replace(/\s/g, "");
    if (![8, 11].includes(bic.length)) {
      errors.push({ field: "bic", rule: "BIC_FORMAT", message: `BIC must be 8 or 11 characters, got ${bic.length}`, severity: "error" });
    }
  } else {
    errors.push({ field: "bic", rule: "REQUIRED", message: "BIC is required", severity: "error" });
  }

  if (fields.value_date) {
    const vd = parseDate(fields.value_date.value);
    if (vd && vd < new Date()) {
      errors.push({ field: "value_date", rule: "FUTURE_DATE", message: "Value date must be in the future", severity: "error" });
    }
  }

  return errors;
}

function validateKycDocument(fields: FieldMap): ValidationError[] {
  const errors: ValidationError[] = [];

  if (fields.document_expiry) {
    const exp = parseDate(fields.document_expiry.value);
    if (exp && exp < new Date()) {
      errors.push({ field: "document_expiry", rule: "NOT_EXPIRED", message: "KYC document has expired", severity: "error" });
    }
  }

  if (fields.jurisdiction) {
    const j = fields.jurisdiction.value.toLowerCase();
    if (!ALLOWED_JURISDICTIONS.some((a) => j.includes(a))) {
      errors.push({ field: "jurisdiction", rule: "ALLOWED_JURISDICTION", message: "Jurisdiction not in approved list", severity: "warning" });
    }
  }

  return errors;
}

function validateRegulatoryFiling(fields: FieldMap): ValidationError[] {
  const errors: ValidationError[] = [];

  if (fields.submission_deadline) {
    const dl = parseDate(fields.submission_deadline.value);
    if (dl && dl < new Date()) {
      errors.push({ field: "submission_deadline", rule: "FUTURE_DEADLINE", message: "Submission deadline has passed", severity: "error" });
    }
  }

  if (fields.reference_number) {
    const ref = fields.reference_number.value;
    if (!/^[A-Z]{2}-\d{4}-/.test(ref)) {
      errors.push({ field: "reference_number", rule: "REF_FORMAT", message: "Reference number format invalid (expected XX-YYYY-...)", severity: "warning" });
    }
  }

  return errors;
}

export function validateDocument(docType: string, fields: FieldMap): ValidationError[] {
  // Low-confidence fields are always warnings
  const lowConfWarnings: ValidationError[] = [];
  for (const [key, val] of Object.entries(fields)) {
    if (val.confidence < 0.7) {
      lowConfWarnings.push({
        field: key,
        rule: "LOW_CONFIDENCE",
        message: `Field '${key}' extracted with low confidence (${(val.confidence * 100).toFixed(0)}%)`,
        severity: "warning",
      });
    }
  }

  let ruleErrors: ValidationError[] = [];
  switch (docType) {
    case "TRADE_CONFIRMATION":
      ruleErrors = validateTradeConfirmation(fields);
      break;
    case "SETTLEMENT_INSTRUCTION":
      ruleErrors = validateSettlementInstruction(fields);
      break;
    case "KYC_DOCUMENT":
      ruleErrors = validateKycDocument(fields);
      break;
    case "REGULATORY_FILING":
      ruleErrors = validateRegulatoryFiling(fields);
      break;
  }

  return [...ruleErrors, ...lowConfWarnings];
}
