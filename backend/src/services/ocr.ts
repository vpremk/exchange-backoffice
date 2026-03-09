/**
 * Pluggable OCR interface.
 * POC uses a stub that returns synthetic text based on file name patterns.
 * Swap with Tesseract, Azure Doc Intelligence, or AWS Textract in production.
 */

export interface OcrResult {
  text: string;
  confidence: number;
  pages: number;
}

export interface OcrAdapter {
  extract(buffer: Buffer, mimeType: string): Promise<OcrResult>;
}

/** Stub adapter — returns deterministic text for POC testing */
export class StubOcrAdapter implements OcrAdapter {
  async extract(buffer: Buffer, mimeType: string): Promise<OcrResult> {
    // For POC, generate plausible OCR text from the buffer size as a seed
    const seed = buffer.length % 4;
    const templates: Record<number, string> = {
      0: `TRADE CONFIRMATION
Counterparty: Goldman Sachs International
Instrument: AAPL US Equity
Quantity: 10,000
Price: 185.50
Trade Date: 2025-01-15
Settlement Date: 2025-01-17
Reference: TC-2025-00142`,

      1: `SETTLEMENT INSTRUCTION
Beneficiary: JPMorgan Chase & Co
BIC: CHASUS33XXX
Account Number: 066-28394-001
Value Date: 2025-02-01
Currency: USD
Amount: 1,855,000.00
Reference: SI-2025-00087`,

      2: `KYC DOCUMENT - ENTITY VERIFICATION
Entity Name: Citadel Securities LLC
Registration Number: 5765682
Jurisdiction: United States - Delaware
Document Expiry: 2026-06-30
LEI: 549300D2PC5L1FM3V974
Authorized Signatory: John Smith`,

      3: `REGULATORY FILING
Filing Type: Form 13F
Reference Number: RF-2025-Q1-0042
Submission Deadline: 2025-02-14
Reporting Period: Q4 2024
Filer: Renaissance Technologies LLC
CIK: 0001037389`,
    };

    return {
      text: templates[seed] || templates[0]!,
      confidence: 0.92 + Math.random() * 0.06,
      pages: 1,
    };
  }
}

// Future: TesseractAdapter, AzureDocIntelligenceAdapter, etc.
export const ocrAdapter: OcrAdapter = new StubOcrAdapter();
