# Project: Enterprise Back-Office Document Validation

## Quick Reference

### Prerequisites
- Docker Desktop running (for Postgres, Redis, MinIO)
- Node.js 20+

### Start Infrastructure
```bash
docker compose up -d
```

### Backend Setup & Run
```bash
cd backend
npm install
cp .env.example .env          # first time only
npx prisma db push             # create/sync tables
npx prisma db seed             # seed test data
npm run dev                    # API server on :3001
npm run worker                 # BullMQ worker (separate terminal)
```

### Frontend Setup & Run
```bash
cd frontend
npm install
npm run dev                    # Vite dev server on :5173
```

### Run Tests
```bash
cd automation
npm install
npx playwright install chromium  # first time only
npm test                         # all 89 BDD scenarios
npm run test:headed              # visible browser
npm run test:auth                # @auth tag only
npm run test:upload              # @upload tag only
npm run test:review              # @review tag only
npm run test:dashboard           # @dashboard tag only
npm run test:rbac                # @rbac tag only
```

### Reset Database
```bash
cd backend
npx prisma db push --force-reset && npx prisma db seed
```

### Root-Level Shortcuts
```bash
npm run install:all     # install backend + frontend + automation
npm run dev:api         # start API server
npm run dev:worker      # start worker
npm run dev:ui          # start frontend
npm run db:setup        # push schema + seed
npm test                # run all Playwright tests
```

## Project Structure
- `backend/` — Node.js/TypeScript/Express API + BullMQ workers + Prisma ORM
- `frontend/` — React 18/Vite/Tailwind SPA
- `automation/` — Playwright BDD tests (Gherkin features + step definitions + page objects)
- `docs/` — Product spec, OpenAPI, LinkedIn article

## Test Users
| Name | Email | Role |
|------|-------|------|
| Alice Chen | alice@exchange.dev | SUBMITTER |
| Bob Martinez | bob@exchange.dev | VALIDATOR |
| Carol Johnson | carol@exchange.dev | SUPERVISOR |

## Key URLs (when running)
- Frontend: http://localhost:5173
- API: http://localhost:3001
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

## Git Config
```
user.name = Vandana Premkumar
user.email = vandana.premkumar@gmail.com
remote = https://github.com/vpremk/exchange-backoffice.git
```
