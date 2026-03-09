# Exchange Back-Office Document Validation

POC for an automated document intake, classification, extraction, validation, and human review workflow for exchange operations.

## Architecture

```
┌─────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐
│  Upload  │───▶│   OCR    │───▶│ Extract │───▶│ Validate │───▶ PENDING_REVIEW
│  (S3)   │    │ (Worker) │    │  (LLM)  │    │ (Rules)  │       ↓
└─────────┘    └──────────┘    └─────────┘    └──────────┘    Human Review
                                                              ↓    ↓    ↓
                                                          APPROVED  REJECTED  CHANGES_REQUESTED
```

**Stack:** Node 20 / TypeScript / Express / Prisma (Postgres) / BullMQ (Redis) / MinIO (S3) / React 18 / Vite / Tailwind / Recharts

## Quick Start

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts Postgres (5432), Redis (6379), and MinIO (9000/9001).

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env        # edit ANTHROPIC_API_KEY if you want live LLM
npx prisma db push           # create tables
npx prisma db seed           # seed test data
```

### 3. Start backend (2 terminals)

```bash
# Terminal 1: API server
npm run dev

# Terminal 2: Worker
npm run worker
```

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 5. Login

Click one of the test users:
- **Alice Chen** (Submitter) — can upload documents
- **Bob Martinez** (Validator) — can review and decide
- **Carol Johnson** (Supervisor) — full access + metrics + audit log

## Test Users

| Name | Email | Role |
|---|---|---|
| Alice Chen | alice@exchange.dev | SUBMITTER |
| Bob Martinez | bob@exchange.dev | VALIDATOR |
| Carol Johnson | carol@exchange.dev | SUPERVISOR |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/login | No | Dev login (email only) |
| POST | /api/documents/upload | Yes | Upload file, starts pipeline |
| GET | /api/documents | Yes | List with filters |
| GET | /api/documents/:id | Yes | Detail + reviews |
| GET | /api/documents/:id/download | Yes | Presigned download URL |
| POST | /api/documents/:id/assign | V/S | Assign to reviewer |
| POST | /api/documents/:id/review | V/S | Submit decision |
| POST | /api/documents/:id/retry | V/S | Re-queue errored doc |
| GET | /api/metrics/overview | V/S | Dashboard summary |
| GET | /api/metrics/validator-productivity | V/S | Review counts |
| GET | /api/metrics/error-reasons | V/S | Top errors |
| GET | /api/metrics/sla-performance | V/S | SLA adherence |
| GET | /api/metrics/audit-log | S | Audit trail |

## Project Structure

```
exchange-backoffice/
├── docker-compose.yml
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Data model
│   │   └── seed.ts             # Test data
│   └── src/
│       ├── server.ts           # Express app
│       ├── config.ts           # Environment config
│       ├── db.ts               # Prisma client
│       ├── queue.ts            # BullMQ setup
│       ├── storage.ts          # MinIO/S3 operations
│       ├── middleware/
│       │   └── auth.ts         # JWT auth + RBAC
│       ├── routes/
│       │   ├── auth.ts         # Login
│       │   ├── documents.ts    # CRUD + workflow
│       │   └── metrics.ts      # Dashboard data
│       ├── services/
│       │   ├── audit.ts        # Audit logging
│       │   ├── llm.ts          # Claude classification/extraction
│       │   ├── ocr.ts          # Pluggable OCR interface
│       │   └── validation.ts   # Rule engine
│       └── workers/
│           ├── index.ts        # Worker entrypoint
│           └── pipeline.ts     # OCR → Extract → Validate
├── frontend/
│   └── src/
│       ├── main.tsx
│       ├── lib/
│       │   ├── api.ts          # HTTP client
│       │   └── auth.tsx        # Auth context
│       ├── components/
│       │   ├── Layout.tsx
│       │   └── StatusBadge.tsx
│       └── pages/
│           ├── LoginPage.tsx
│           ├── UploadPage.tsx
│           ├── InboxPage.tsx
│           ├── DocumentReviewPage.tsx
│           └── DashboardPage.tsx
└── docs/
    ├── SPEC.md
    └── openapi.yaml
```

## LLM Integration

Set `ANTHROPIC_API_KEY` in `.env` to use Claude for document classification and field extraction. Without it, the system uses deterministic stubs that produce realistic synthetic output for testing.

## MinIO Console

Access the MinIO web console at http://localhost:9001 (minioadmin/minioadmin) to browse uploaded documents.
