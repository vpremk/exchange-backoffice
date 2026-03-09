# Test Coverage Report — Enterprise Back-Office Document Validation

**Run Date:** 2026-02-16
**Result:** 89/89 passed (55.8s)
**Browser:** Chromium (Desktop Chrome)
**Framework:** Playwright + playwright-bdd (Gherkin BDD)

---

## Summary

| Metric | Value |
|--------|-------|
| Total Scenarios | 89 |
| Passed | 89 |
| Failed | 0 |
| Skipped | 0 |
| Duration | 55.8s |
| Feature Files | 8 |
| Step Definition Files | 9 |
| Page Objects | 6 |

---

## Coverage by Feature

### 1. Authentication & Session Management (5 scenarios)
| # | Scenario | Status | Time |
|---|----------|--------|------|
| 1 | Submitter can log in successfully | PASS | 1.1s |
| 2 | Validator can log in and see review features | PASS | 0.3s |
| 3 | Supervisor has full access | PASS | 0.3s |
| 4 | User can log out | PASS | 0.3s |
| 5 | Unauthenticated API calls are rejected | PASS | 0.1s |

**Coverage:** Login per role, role-based nav visibility, logout, session cleanup, 401 on unauth API

### 2. Document Upload (7 scenarios)
| # | Scenario | Status | Time |
|---|----------|--------|------|
| 1 | Upload a PDF document via file picker | PASS | 0.4s |
| 2 | Upload a PNG image document | PASS | 0.4s |
| 3 | Upload a DOCX document | PASS | 0.4s |
| 4 | Document progresses through pipeline automatically | PASS | 8.4s |
| 5 | Uploaded document is clickable and navigates to detail | PASS | 0.4s |
| 6 | Multiple files can be uploaded in sequence | PASS | 0.3s |
| 7 | Upload page shows correct columns | PASS | 0.3s |

**Coverage:** PDF/PNG/DOCX upload, pipeline progression, navigation to detail, table columns, multi-file

### 3. Review Inbox & Queue Management (9 scenarios)
| # | Scenario | Status | Time |
|---|----------|--------|------|
| 1 | Validator sees the review inbox with pending documents | PASS | 0.3s |
| 2 | Filter inbox by status - All | PASS | 1.4s |
| 3 | Filter inbox by status - Approved | PASS | 1.3s |
| 4 | Filter inbox by status - Errors | PASS | 1.4s |
| 5 | Inbox shows SLA countdown indicators | PASS | 1.4s |
| 6 | Inbox table has all required columns | PASS | 0.3s |
| 7 | Clicking a document in inbox navigates to review page | PASS | 0.3s |
| 8 | Submitter cannot access the inbox | PASS | 1.3s |
| 9 | Supervisor can see the full inbox | PASS | 0.3s |

**Coverage:** Status filters, SLA indicators (time remaining + breached), column validation, navigation, RBAC redirect

### 4. Document Review Workflow (16 scenarios)
| # | Scenario | Status | Time |
|---|----------|--------|------|
| 1 | View document detail with extracted fields | PASS | 0.3s |
| 2 | View document validation results - passed | PASS | 0.3s |
| 3 | View document validation results - with errors | PASS | 0.3s |
| 4 | View document classification confidence | PASS | 0.3s |
| 5 | Validator assigns document to themselves | PASS | 2.4s |
| 6 | Approve a document with a comment | PASS | 0.4s |
| 7 | Approve a document without a comment | PASS | 0.4s |
| 8 | Reject a document with a reason | PASS | 0.4s |
| 9 | Request changes on a document | PASS | 0.5s |
| 10 | Review buttons only visible for PENDING_REVIEW | PASS | 0.3s |
| 11 | Submitter cannot see review controls | PASS | 0.2s |
| 12 | View error details on a failed document | PASS | 0.3s |
| 13 | Retry a failed document | PASS | 3.4s |
| 14 | Download original document | PASS | 0.3s |
| 15 | Review history shows chronological entries | PASS | 0.3s |
| 16 | Back button returns to previous page | PASS | 0.3s |

**Coverage:** Extracted fields (value + confidence + provenance), validation errors (color-coded severity), classify confidence, assign, approve/reject/request-changes with comments, review history, error retry, download, RBAC on review controls, navigation

### 5. Metrics Dashboard (9 scenarios)
| # | Scenario | Status | Time |
|---|----------|--------|------|
| 1 | Dashboard shows KPI summary cards | PASS | 0.3s |
| 2 | SLA At Risk card highlights when count > 0 | PASS | 0.3s |
| 3 | Dashboard shows documents by status pie chart | PASS | 0.3s |
| 4 | Dashboard shows documents by type bar chart | PASS | 0.3s |
| 5 | Dashboard shows validator productivity chart | PASS | 0.3s |
| 6 | Dashboard shows error reasons list | PASS | 0.3s |
| 7 | Dashboard shows recent review activity | PASS | 0.4s |
| 8 | Dashboard data refreshes automatically | PASS | 15.5s |
| 9 | Submitter cannot access the dashboard | PASS | 1.3s |

**Coverage:** All 4 KPI cards, SLA highlighting, pie/bar/productivity charts, error reasons, recent reviews, auto-refresh, RBAC redirect

### 6. Role-Based Access Control (14 scenarios)
| # | Scenario | Status | Time |
|---|----------|--------|------|
| 1 | Submitter can only see their own documents via API | PASS | 0.1s |
| 2 | Submitter cannot access another user's document | PASS | 0.1s |
| 3 | Submitter cannot submit a review via API | PASS | 0.1s |
| 4 | Submitter cannot assign documents via API | PASS | 0.1s |
| 5 | Submitter cannot access metrics via API | PASS | 0.1s |
| 6 | Submitter cannot access audit log via API | PASS | 0.1s |
| 7 | Validator can see all documents | PASS | 0.1s |
| 8 | Validator can submit reviews | PASS | 0.1s |
| 9 | Validator can assign documents | PASS | 0.1s |
| 10 | Validator can access metrics overview | PASS | 0.1s |
| 11 | Validator cannot access audit log | PASS | 0.1s |
| 12 | Supervisor can access audit log | PASS | 0.1s |
| 13 | Supervisor can perform all validator actions | PASS | 0.1s |
| 14 | Expired/invalid token is rejected | PASS | 0.1s |

**Coverage:** Full permission matrix (Submitter/Validator/Supervisor) across documents, reviews, assign, metrics, audit log endpoints. Token validation (invalid + missing).

### 7. SLA Tracking & Document Pipeline (12 scenarios)
| # | Scenario | Status | Time |
|---|----------|--------|------|
| 1 | Newly uploaded document enters OCR processing | PASS | 0.1s |
| 2 | Pipeline classifies document type correctly | PASS | 0.1s |
| 3 | Pipeline extracts fields with provenance | PASS | 0.1s |
| 4 | Pipeline runs validation rules after extraction | PASS | 0.1s |
| 5 | Pipeline sets SLA deadline (Trade Confirmation) | PASS | 0.1s |
| 6 | Pipeline sets SLA deadline (Settlement Instruction) | PASS | 0.1s |
| 7 | Pipeline handles OCR failure gracefully | PASS | 0.1s |
| 8 | SLA performance endpoint returns adherence data | PASS | 0.1s |
| 9 | SLA at risk count reflects documents near deadline | PASS | 0.1s |
| 10 | Status changes are recorded in audit log | PASS | 0.1s |
| 11 | Reviews are recorded in audit log | PASS | 0.1s |
| 12 | Document upload is recorded in audit log | PASS | 0.1s |

**Coverage:** All 3 pipeline stages (OCR, extract, validate), SLA computation per doc type, error handling, SLA metrics API (adherence, at-risk), audit trail (status changes, reviews, uploads)

### 8. Validation Rules (17 scenarios)
| # | Scenario | Status | Time |
|---|----------|--------|------|
| 1 | Valid trade confirmation passes all rules | PASS | 0.1s |
| 2 | Trade confirmation: zero quantity fails | PASS | 0.1s |
| 3 | Trade confirmation: negative price fails | PASS | 0.1s |
| 4 | Trade confirmation: unknown counterparty warns | PASS | 0.1s |
| 5 | Trade confirmation: settlement outside T+1/T+2 warns | PASS | 0.1s |
| 6 | Valid settlement instruction passes | PASS | 0.1s |
| 7 | Settlement instruction: invalid BIC length fails | PASS | 0.1s |
| 8 | Settlement instruction: missing BIC fails | PASS | 0.1s |
| 9 | Settlement instruction: past value date fails | PASS | 0.1s |
| 10 | Valid KYC document passes | PASS | 0.1s |
| 11 | KYC document: expired date fails | PASS | 0.1s |
| 12 | KYC document: disallowed jurisdiction warns | PASS | 0.1s |
| 13 | Valid regulatory filing passes | PASS | 0.1s |
| 14 | Regulatory filing: past deadline fails | PASS | 0.1s |
| 15 | Regulatory filing: bad reference format warns | PASS | 0.1s |
| 16 | Low confidence field generates warning | PASS | 0.1s |
| 17 | Missing authorization header is rejected | PASS | 0.1s |

**Coverage:** All 4 document types with happy + negative paths. Field-level rules: POSITIVE_NUMBER, T_PLUS_RANGE, KNOWN_COUNTERPARTY, BIC_FORMAT, REQUIRED, FUTURE_DATE, NOT_EXPIRED, ALLOWED_JURISDICTION, FUTURE_DEADLINE, REF_FORMAT, LOW_CONFIDENCE.

---

## Application Coverage Matrix

| Application Layer | Covered By | Scenarios |
|-------------------|-----------|-----------|
| **Login / Auth** | auth.feature | 5 |
| **JWT Token Validation** | rbac.feature | 2 (invalid + missing) |
| **RBAC - Submitter** | rbac.feature | 6 |
| **RBAC - Validator** | rbac.feature | 5 |
| **RBAC - Supervisor** | rbac.feature | 2 |
| **File Upload (PDF/PNG/DOCX)** | upload.feature | 4 |
| **Upload UI (table, columns)** | upload.feature | 3 |
| **Pipeline: OCR** | sla-pipeline.feature | 2 |
| **Pipeline: Classification** | sla-pipeline.feature | 1 |
| **Pipeline: Field Extraction** | sla-pipeline.feature | 1 |
| **Pipeline: Validation** | sla-pipeline.feature | 1 |
| **Pipeline: Error Handling** | sla-pipeline.feature | 1 |
| **SLA Deadline Computation** | sla-pipeline.feature | 2 |
| **SLA Metrics API** | sla-pipeline.feature | 2 |
| **Audit Trail** | sla-pipeline.feature | 3 |
| **Inbox Filters** | inbox.feature | 4 |
| **Inbox SLA Indicators** | inbox.feature | 1 |
| **Inbox Navigation** | inbox.feature | 2 |
| **Inbox RBAC** | inbox.feature | 2 |
| **Document Detail View** | document-review.feature | 4 |
| **Review: Approve** | document-review.feature | 2 |
| **Review: Reject** | document-review.feature | 1 |
| **Review: Request Changes** | document-review.feature | 1 |
| **Review: Assign** | document-review.feature | 1 |
| **Review: Error Retry** | document-review.feature | 1 |
| **Review: Download** | document-review.feature | 1 |
| **Review: History** | document-review.feature | 1 |
| **Review: RBAC** | document-review.feature | 2 |
| **Review: Navigation** | document-review.feature | 1 |
| **Dashboard: KPI Cards** | dashboard.feature | 2 |
| **Dashboard: Charts** | dashboard.feature | 3 |
| **Dashboard: Error Reasons** | dashboard.feature | 1 |
| **Dashboard: Recent Reviews** | dashboard.feature | 1 |
| **Dashboard: Auto-refresh** | dashboard.feature | 1 |
| **Dashboard: RBAC** | dashboard.feature | 1 |
| **Validation: Trade Confirmation** | validation-rules.feature | 5 |
| **Validation: Settlement Instruction** | validation-rules.feature | 4 |
| **Validation: KYC Document** | validation-rules.feature | 3 |
| **Validation: Regulatory Filing** | validation-rules.feature | 3 |
| **Validation: Low Confidence** | validation-rules.feature | 1 |

---

## Test Type Breakdown

| Test Type | Count | % |
|-----------|-------|---|
| UI / E2E (browser) | 51 | 57% |
| API-level (direct HTTP) | 21 | 24% |
| Rule engine (validation logic) | 17 | 19% |
| **Total** | **89** | **100%** |

---

## API Endpoint Coverage

| Endpoint | Method | Tested By |
|----------|--------|-----------|
| `/api/auth/login` | POST | auth, rbac (every test uses it) |
| `/api/documents/upload` | POST | upload, rbac, sla-pipeline |
| `/api/documents` | GET | inbox, rbac (list + filter) |
| `/api/documents/:id` | GET | document-review, rbac |
| `/api/documents/:id/download` | GET | document-review |
| `/api/documents/:id/assign` | POST | document-review, rbac |
| `/api/documents/:id/review` | POST | document-review, rbac |
| `/api/documents/:id/retry` | POST | document-review |
| `/api/metrics/overview` | GET | dashboard, rbac, sla-pipeline |
| `/api/metrics/validator-productivity` | GET | dashboard |
| `/api/metrics/error-reasons` | GET | dashboard |
| `/api/metrics/sla-performance` | GET | sla-pipeline |
| `/api/metrics/audit-log` | GET | rbac, sla-pipeline |
| `/api/validate-test` | POST | validation-rules (17 scenarios) |
| `/health` | GET | auth (every test background) |

**12/12 production endpoints covered (100%)**
**+ 2 utility endpoints (health, validate-test)**

---

## Untested / Out of Scope (POC)

| Area | Reason |
|------|--------|
| Real OIDC flow | Stubbed — no IdP integration |
| Real OCR processing | Stubbed — synthetic responses |
| File content validation | Files are synthetic fixtures |
| WebSocket / real-time push | Not implemented in POC |
| Pagination controls | Partially tested (data volume insufficient) |
| Concurrent multi-user | Single worker, sequential tests |
| Cross-browser (Firefox, Safari) | Chromium only in POC |
| Performance / load testing | Out of scope |
| Accessibility (a11y) | Out of scope |
