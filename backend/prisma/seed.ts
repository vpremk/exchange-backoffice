import { PrismaClient, DocType, DocStatus, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Users
  const alice = await prisma.user.upsert({
    where: { email: "alice@exchange.dev" },
    update: {},
    create: { email: "alice@exchange.dev", name: "Alice Chen", role: Role.SUBMITTER },
  });
  const bob = await prisma.user.upsert({
    where: { email: "bob@exchange.dev" },
    update: {},
    create: { email: "bob@exchange.dev", name: "Bob Martinez", role: Role.VALIDATOR },
  });
  const carol = await prisma.user.upsert({
    where: { email: "carol@exchange.dev" },
    update: {},
    create: { email: "carol@exchange.dev", name: "Carol Johnson", role: Role.SUPERVISOR },
  });

  console.log(`Users: ${alice.name}, ${bob.name}, ${carol.name}`);

  // Synthetic documents in various states
  const syntheticDocs = [
    {
      fileName: "trade_confirm_AAPL_20250115.pdf",
      mimeType: "application/pdf",
      fileSize: 245000,
      s3Key: "uploads/seed/trade_confirm_AAPL.pdf",
      docType: DocType.TRADE_CONFIRMATION,
      status: DocStatus.PENDING_REVIEW,
      classConfidence: 0.96,
      submitterId: alice.id,
      assigneeId: bob.id,
      slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000),
      ocrText: "TRADE CONFIRMATION\nCounterparty: Goldman Sachs International\nInstrument: AAPL US Equity\nQuantity: 10,000\nPrice: 185.50\nTrade Date: 2025-01-15\nSettlement Date: 2025-01-17\nReference: TC-2025-00142",
      extractedFields: {
        counterparty: { value: "Goldman Sachs International", provenance: 'OCR line: "Counterparty: Goldman Sachs International"', confidence: 0.95 },
        instrument: { value: "AAPL US Equity", provenance: 'OCR line: "Instrument: AAPL US Equity"', confidence: 0.97 },
        quantity: { value: "10,000", provenance: 'OCR line: "Quantity: 10,000"', confidence: 0.94 },
        price: { value: "185.50", provenance: 'OCR line: "Price: 185.50"', confidence: 0.96 },
        trade_date: { value: "2025-01-15", provenance: 'OCR line: "Trade Date: 2025-01-15"', confidence: 0.93 },
        settlement_date: { value: "2025-01-17", provenance: 'OCR line: "Settlement Date: 2025-01-17"', confidence: 0.92 },
        reference: { value: "TC-2025-00142", provenance: 'OCR line: "Reference: TC-2025-00142"', confidence: 0.98 },
      },
      validationErrors: [],
    },
    {
      fileName: "settlement_instruction_JPM.pdf",
      mimeType: "application/pdf",
      fileSize: 180000,
      s3Key: "uploads/seed/settlement_JPM.pdf",
      docType: DocType.SETTLEMENT_INSTRUCTION,
      status: DocStatus.PENDING_REVIEW,
      classConfidence: 0.94,
      submitterId: alice.id,
      slaDeadline: new Date(Date.now() + 30 * 60 * 1000), // 30 min left - at risk!
      ocrText: "SETTLEMENT INSTRUCTION\nBeneficiary: JPMorgan Chase & Co\nBIC: CHASUS33XXX\nAccount Number: 066-28394-001\nValue Date: 2025-02-01\nCurrency: USD\nAmount: 1,855,000.00",
      extractedFields: {
        beneficiary: { value: "JPMorgan Chase & Co", provenance: 'OCR line: "Beneficiary: JPMorgan Chase & Co"', confidence: 0.93 },
        bic: { value: "CHASUS33XXX", provenance: 'OCR line: "BIC: CHASUS33XXX"', confidence: 0.96 },
        account_number: { value: "066-28394-001", provenance: 'OCR line: "Account Number: 066-28394-001"', confidence: 0.91 },
        value_date: { value: "2025-02-01", provenance: 'OCR line: "Value Date: 2025-02-01"', confidence: 0.94 },
        currency: { value: "USD", provenance: 'OCR line: "Currency: USD"', confidence: 0.98 },
        amount: { value: "1,855,000.00", provenance: 'OCR line: "Amount: 1,855,000.00"', confidence: 0.95 },
      },
      validationErrors: [
        { field: "value_date", rule: "FUTURE_DATE", message: "Value date must be in the future", severity: "error" },
      ],
    },
    {
      fileName: "kyc_citadel_securities.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: 320000,
      s3Key: "uploads/seed/kyc_citadel.docx",
      docType: DocType.KYC_DOCUMENT,
      status: DocStatus.APPROVED,
      classConfidence: 0.93,
      submitterId: alice.id,
      assigneeId: carol.id,
      slaDeadline: new Date(Date.now() - 2 * 60 * 60 * 1000), // Already past
      ocrText: "KYC DOCUMENT - ENTITY VERIFICATION\nEntity Name: Citadel Securities LLC\nRegistration Number: 5765682\nJurisdiction: United States - Delaware\nDocument Expiry: 2026-06-30",
      extractedFields: {
        entity_name: { value: "Citadel Securities LLC", provenance: 'OCR line: "Entity Name: Citadel Securities LLC"', confidence: 0.95 },
        registration_number: { value: "5765682", provenance: 'OCR line: "Registration Number: 5765682"', confidence: 0.92 },
        jurisdiction: { value: "United States - Delaware", provenance: 'OCR line: "Jurisdiction: United States - Delaware"', confidence: 0.94 },
        document_expiry: { value: "2026-06-30", provenance: 'OCR line: "Document Expiry: 2026-06-30"', confidence: 0.91 },
      },
      validationErrors: [],
    },
    {
      fileName: "reg_filing_13F_Q4_2024.pdf",
      mimeType: "application/pdf",
      fileSize: 456000,
      s3Key: "uploads/seed/reg_filing_13F.pdf",
      docType: DocType.REGULATORY_FILING,
      status: DocStatus.REJECTED,
      classConfidence: 0.95,
      submitterId: alice.id,
      assigneeId: bob.id,
      slaDeadline: new Date(Date.now() - 5 * 60 * 60 * 1000),
      ocrText: "REGULATORY FILING\nFiling Type: Form 13F\nReference Number: RF-2025-Q1-0042\nSubmission Deadline: 2025-02-14",
      extractedFields: {
        filing_type: { value: "Form 13F", provenance: 'OCR line: "Filing Type: Form 13F"', confidence: 0.96 },
        reference_number: { value: "RF-2025-Q1-0042", provenance: 'OCR line: "Reference Number: RF-2025-Q1-0042"', confidence: 0.94 },
        submission_deadline: { value: "2025-02-14", provenance: 'OCR line: "Submission Deadline: 2025-02-14"', confidence: 0.93 },
      },
      validationErrors: [
        { field: "submission_deadline", rule: "FUTURE_DEADLINE", message: "Submission deadline has passed", severity: "error" },
      ],
    },
    {
      fileName: "trade_confirm_MSFT_20250120.png",
      mimeType: "image/png",
      fileSize: 890000,
      s3Key: "uploads/seed/trade_confirm_MSFT.png",
      docType: DocType.TRADE_CONFIRMATION,
      status: DocStatus.ERROR,
      classConfidence: null,
      submitterId: alice.id,
      slaDeadline: new Date(Date.now() + 1 * 60 * 60 * 1000),
      ocrText: null,
      extractedFields: null,
      validationErrors: null,
      errorReason: "OCR processing failed: image quality too low",
    },
    {
      fileName: "settlement_barclays_20250201.pdf",
      mimeType: "application/pdf",
      fileSize: 210000,
      s3Key: "uploads/seed/settlement_barclays.pdf",
      docType: DocType.SETTLEMENT_INSTRUCTION,
      status: DocStatus.CHANGES_REQUESTED,
      classConfidence: 0.91,
      submitterId: alice.id,
      assigneeId: bob.id,
      slaDeadline: new Date(Date.now() - 1 * 60 * 60 * 1000),
      ocrText: "SETTLEMENT INSTRUCTION\nBeneficiary: Barclays Capital\nBIC: BARCGB22\nAccount Number: 201-55678-002\nValue Date: 2025-03-15",
      extractedFields: {
        beneficiary: { value: "Barclays Capital", provenance: 'OCR line: "Beneficiary: Barclays Capital"', confidence: 0.92 },
        bic: { value: "BARCGB22", provenance: 'OCR line: "BIC: BARCGB22"', confidence: 0.88 },
        account_number: { value: "201-55678-002", provenance: 'OCR line: "Account Number: 201-55678-002"', confidence: 0.85 },
        value_date: { value: "2025-03-15", provenance: 'OCR line: "Value Date: 2025-03-15"', confidence: 0.90 },
      },
      validationErrors: [],
    },
    // A few more in processing states
    {
      fileName: "kyc_renaissance_tech.pdf",
      mimeType: "application/pdf",
      fileSize: 275000,
      s3Key: "uploads/seed/kyc_renaissance.pdf",
      docType: DocType.UNKNOWN,
      status: DocStatus.EXTRACTING,
      classConfidence: null,
      submitterId: alice.id,
      slaDeadline: new Date(Date.now() + 23 * 60 * 60 * 1000),
      ocrText: "KYC DOCUMENT\nEntity Name: Renaissance Technologies LLC",
      extractedFields: null,
      validationErrors: null,
    },
    {
      fileName: "trade_confirm_TSLA_batch.pdf",
      mimeType: "application/pdf",
      fileSize: 512000,
      s3Key: "uploads/seed/trade_confirm_TSLA.pdf",
      docType: DocType.UNKNOWN,
      status: DocStatus.UPLOADED,
      classConfidence: null,
      submitterId: alice.id,
      slaDeadline: null,
      ocrText: null,
      extractedFields: null,
      validationErrors: null,
    },
    // Extra PENDING_REVIEW docs for review test scenarios (approve, reject, request changes, etc.)
    ...Array.from({ length: 6 }, (_, i) => ({
      fileName: `review_test_doc_${i + 1}.pdf`,
      mimeType: "application/pdf",
      fileSize: 200000 + i * 10000,
      s3Key: `uploads/seed/review_test_${i + 1}.pdf`,
      docType: DocType.TRADE_CONFIRMATION,
      status: DocStatus.PENDING_REVIEW,
      classConfidence: 0.94,
      submitterId: alice.id,
      slaDeadline: new Date(Date.now() + (i + 1) * 60 * 60 * 1000),
      ocrText: `TRADE CONFIRMATION\nCounterparty: Test Bank ${i + 1}\nInstrument: TEST${i + 1} Equity\nQuantity: ${(i + 1) * 1000}\nPrice: ${50 + i * 10}.00\nTrade Date: 2025-01-15\nSettlement Date: 2025-01-17\nReference: TC-TEST-000${i + 1}`,
      extractedFields: {
        counterparty: { value: `Test Bank ${i + 1}`, provenance: `OCR line: "Counterparty: Test Bank ${i + 1}"`, confidence: 0.94 },
        instrument: { value: `TEST${i + 1} Equity`, provenance: `OCR line: "Instrument: TEST${i + 1} Equity"`, confidence: 0.95 },
        quantity: { value: `${(i + 1) * 1000}`, provenance: `OCR line: "Quantity: ${(i + 1) * 1000}"`, confidence: 0.93 },
        price: { value: `${50 + i * 10}.00`, provenance: `OCR line: "Price: ${50 + i * 10}.00"`, confidence: 0.96 },
        trade_date: { value: "2025-01-15", provenance: 'OCR line: "Trade Date: 2025-01-15"', confidence: 0.92 },
        settlement_date: { value: "2025-01-17", provenance: 'OCR line: "Settlement Date: 2025-01-17"', confidence: 0.91 },
      },
      validationErrors: [],
    })),
  ];

  for (const docData of syntheticDocs) {
    await prisma.document.create({ data: docData as any });
  }

  console.log(`Created ${syntheticDocs.length} synthetic documents`);

  // Add some reviews for the approved/rejected docs
  const approvedDoc = await prisma.document.findFirst({ where: { status: "APPROVED" } });
  if (approvedDoc) {
    await prisma.review.create({
      data: {
        decision: "APPROVED",
        comment: "KYC docs verified, all fields match corporate registry.",
        documentId: approvedDoc.id,
        reviewerId: carol.id,
      },
    });
  }

  const rejectedDoc = await prisma.document.findFirst({ where: { status: "REJECTED" } });
  if (rejectedDoc) {
    await prisma.review.create({
      data: {
        decision: "REJECTED",
        comment: "Submission deadline has already passed. Filing is no longer valid.",
        documentId: rejectedDoc.id,
        reviewerId: bob.id,
      },
    });
  }

  const changesDoc = await prisma.document.findFirst({ where: { status: "CHANGES_REQUESTED" } });
  if (changesDoc) {
    await prisma.review.create({
      data: {
        decision: "CHANGES_REQUESTED",
        comment: "BIC code appears truncated. Please resubmit with complete settlement instruction.",
        documentId: changesDoc.id,
        reviewerId: bob.id,
      },
    });
  }

  // Seed some audit log entries
  const docs = await prisma.document.findMany({ take: 4 });
  for (const doc of docs) {
    await prisma.auditLog.create({
      data: {
        action: "DOCUMENT_UPLOADED",
        entityType: "Document",
        entityId: doc.id,
        newValue: { fileName: doc.fileName },
        userId: alice.id,
        documentId: doc.id,
      },
    });
  }

  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
