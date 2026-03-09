# Exchange Back-Office Document Validation — Product Spec

## Problem
Exchange operations teams manually review settlement confirmations, trade reports, KYC documents, and regulatory filings. Current process is email-driven with no SLA tracking, audit trail, or standardized validation.

## Solution
A workflow app that ingests documents, auto-classifies and extracts fields using OCR + LLM, applies validation rules, and routes exceptions to human validators with full audit logging.

## Document Types (POC Scope)
1. **Trade Confirmation** — counterparty, instrument, quantity, price, settlement date
2. **Settlement Instruction** — SSI details, BIC, account numbers, value date
3. **KYC Document** — entity name, registration number, jurisdiction, expiry date
4. **Regulatory Filing** — filing type, reference number, submission deadline

## Assumptions
- **Auth**: OIDC stub — JWT tokens with hardcoded test users; no real IdP integration.
- **Storage**: MinIO locally, S3 in prod. Presigned URLs for upload/download.
- **OCR**: Tesseract adapter stub. In production, swap for Azure Document Intelligence / AWS Textract.
- **LLM**: Claude API for classification + extraction. Stubbed with deterministic responses for offline dev.
- **Scale**: Single-node POC. BullMQ handles job sequencing; no horizontal scaling concerns.
- **SLA**: Default 4-hour SLA from upload to final decision. Configurable per doc type.
- **RBAC**: Three roles — Submitter (upload only), Validator (review/decide), Supervisor (all + metrics).
- **Database**: Postgres 15 via Prisma. All mutations logged to AuditLog table.
- **No PII in logs**: Extracted fields stored in DB; raw OCR text stored but not logged.

## Workflow States
```
UPLOADED → OCR_PROCESSING → EXTRACTING → VALIDATING → PENDING_REVIEW → APPROVED | REJECTED | CHANGES_REQUESTED
```
Any step can fail → `ERROR` state with reason.

## SLA Rules
| Doc Type | SLA (hours) | Escalation |
|---|---|---|
| Trade Confirmation | 2 | Supervisor alert |
| Settlement Instruction | 4 | Supervisor alert |
| KYC Document | 24 | Email stub |
| Regulatory Filing | 1 | Supervisor alert + flag |

## Validation Rules (per doc type)
- **Trade Confirmation**: settlement date must be T+1 or T+2; quantity > 0; price > 0; counterparty in known list.
- **Settlement Instruction**: BIC must be valid format (8 or 11 chars); value date ≥ today.
- **KYC Document**: expiry date must be in the future; jurisdiction in allowed list.
- **Regulatory Filing**: deadline must be in the future; reference number format check.
