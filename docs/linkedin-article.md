# Beyond Code Generation: Using Claude Opus 4.6 to Architect, Build, and Test an Enterprise Document Validation Platform

**TL;DR:** AI-assisted development has moved past "write me a function." I used Claude Opus 4.6 (1M context) to architect a full enterprise document validation workflow, implement it across the stack, and produce 89 Gherkin BDD test scenarios — with proper page objects, RBAC coverage, and domain-accurate validation rules. This is what AI as a senior engineering partner looks like.

> Taking a common enterprise back-office problem as an example, I've concluded the article with what this AI revolution means for different engineering teams.

---

## The Problem I Wanted to Solve

Enterprise operations teams across industries — financial services, insurance, healthcare, legal, logistics — spend hours manually reviewing incoming documents. Think onboarding forms, compliance filings, verification documents, and transactional confirmations. The process is typically email-driven, there's no SLA tracking, no audit trail, and validation is inconsistent across reviewers.

I wanted to see: **could an AI pair-programming session produce a working POC that a team could actually demo and iterate on?**

Not stubs. Not pseudocode. Runnable code with real data flows.

---

## What Got Built

### The Stack
- **Backend:** Node.js 20 + TypeScript + Express + Prisma (Postgres) + BullMQ (Redis)
- **Storage:** MinIO (S3-compatible) with presigned uploads
- **OCR:** Pluggable interface with Tesseract adapter stub
- **LLM Integration:** Claude API for document classification and field extraction
- **Frontend:** React 18 + Vite + Tailwind + React Query + Recharts
- **Auth:** JWT-based OIDC stub with three roles (Submitter, Validator, Supervisor)
- **Testing:** Playwright + playwright-bdd with Gherkin feature files

### The Workflow

```
Upload → OCR → Classify → Extract Fields → Validate Rules → Human Review
                                                              ↓
                                                   Approve / Reject / Request Changes
```

Every state transition is logged to an audit table. SLA deadlines are computed per document type. The dashboard shows queue health, SLA risk, error breakdowns, and validator productivity.

### What's Actually in the Repo

| Layer | Files | What It Does |
|-------|-------|-------------|
| Prisma Schema | 4 models | User, Document, Review, AuditLog with full relations and indexes |
| REST API | 12 endpoints | Upload, list, detail, assign, review, retry, 5 metrics endpoints |
| Worker Pipeline | 3-stage BullMQ chain | OCR → Extract → Validate, each step audited |
| Validation Engine | 4 rule sets | Configurable per document type with field-level rules |
| React Frontend | 5 screens | Login, Upload (drag-drop), Inbox (filterable queue), Document Review, Metrics Dashboard |
| Automation | 8 feature files, 89 scenarios | Gherkin BDD with Playwright page objects |

---

## The Automation Suite — This Is Where It Gets Interesting

I didn't just ask for "some tests." I asked for **Gherkin-style BDD scenarios covering every workflow path**, wired to Playwright with proper page objects.

Here's what came out:

### 8 Feature Files

| Feature | Scenarios | Coverage |
|---------|-----------|----------|
| Authentication | 5 | Login per role, logout, session, unauth rejection |
| Document Upload | 7 | File picker, drag-drop, pipeline progression, multi-upload |
| Review Inbox | 9 | Status filters, SLA indicators, column validation, pagination |
| Document Review | 16 | Extracted fields with provenance, approve/reject/request changes, error retry, review history |
| Dashboard | 9 | KPI cards, charts rendering, auto-refresh, access control |
| RBAC | 14 | API-level permission checks per role — Submitter/Validator/Supervisor |
| SLA & Pipeline | 12 | Pipeline stages, SLA deadline calculation, audit trail entries |
| Validation Rules | 17 | Data-table-driven rule testing — format checks, date validations, reference lookups |

### Sample Gherkin — this reads like a requirements doc:

```gherkin
@review
Feature: Document Review Workflow

  Scenario: Approve a document with a comment
    Given I am logged in as "bob@company.dev"
    And I open a document in "PENDING_REVIEW" status
    When I enter the review comment "All fields verified against source system."
    And I click the "Approve" button
    Then the document status should change to "APPROVED"
    And the review history should show the approval
    And the review comment should be visible in history

  Scenario: Document with unrecognized entity gets warning
    Given a Verification Document with fields:
      | field        | value                |
      | entity_name  | Unknown Corp         |
      | amount       | 100                  |
      | reference    | REF-2025-001         |
    When the validation rules are applied
    Then there should be a warning on field "entity_name" with rule "KNOWN_ENTITY"
```

### Architecture Choices in the Test Suite

- **Page Object pattern** — 6 PO classes isolate DOM selectors from step logic
- **API helper layer** — RBAC tests hit the REST API directly (no browser overhead)
- **Validation rules tested two ways** — via a dedicated `/api/validate-test` endpoint AND a local fallback engine mirroring backend logic
- **Self-contained runs** — Playwright config auto-starts backend, worker, and frontend via `webServer`
- **Tagged execution** — run `npm run test:rbac` or `npm run test:dashboard` independently

---

## What Impressed Me About Opus 4.6

### 1. Architectural Coherence Across 70+ Files
The model maintained consistent patterns — the same audit logging approach in every route, the same error handling in every worker step, the same field structure (`value` + `provenance` + `confidence`) flowing from OCR through extraction to the React review screen.

### 2. It Understood the Domain Without a Briefing Doc
I gave it a one-paragraph problem statement. It inferred document types, validation rules, SLA structures, and role hierarchies that made sense for the domain. The validation rules aren't generic placeholder checks — they apply real format validations, date logic, reference lookups, and confidence thresholds specific to document processing workflows.

### 3. The Test Suite Thinks Like a QA Engineer
The 89 scenarios aren't just happy paths. They cover:
- **Negative paths:** expired documents, past-due deadlines, invalid field formats
- **Permission boundaries:** Submitter can't review, Validator can't see audit logs
- **Edge cases:** unassigned documents, error retry flows, low-confidence field warnings
- **Data-driven testing:** Gherkin data tables for parametric validation rule checks

### 4. 1M Context Window Matters
By the time we got to the automation suite, the model had the full backend (Prisma schema, routes, validation logic, worker pipeline) and frontend (all 5 React screens) in context. The step definitions reference exact CSS classes, DOM structures, and API response shapes from the actual code — not generic guesses.

---

## How to Run It

```bash
# Infrastructure
docker compose up -d          # Postgres + Redis + MinIO

# Backend
cd backend && npm install
npx prisma db push && npx prisma db seed
npm run dev                   # Terminal 1
npm run worker                # Terminal 2

# Frontend
cd frontend && npm install
npm run dev                   # → http://localhost:5173

# Tests
cd automation && npm install
npx playwright install chromium
npm test                      # All 89 scenarios
npm run test:headed           # Watch in browser
npm run test:ui               # Playwright interactive UI
```

---

## My Takeaway: AI Is Reshaping the Entire SDLC, Not Just the Coding Phase

We've crossed a threshold. AI pair programming isn't "write me a function" anymore. It's **"architect a system, implement it across the stack, seed it with realistic data, then write 89 BDD scenarios that a QA lead would approve."**

What struck me most is that this wasn't just a coding exercise. The AI participated meaningfully across **every phase of the SDLC**:

### Requirements → Design
I gave a one-paragraph problem statement. What came back was a structured product spec with document types, workflow states, SLA rules per category, and a role matrix. In a traditional process, that's a BA spending a day distilling stakeholder conversations into a requirements doc. The AI inferred domain constraints — like settlement timing conventions and BIC format rules — without being told.

### Design → Implementation
The architecture decisions weren't random. Prisma for type-safe data access. BullMQ for reliable job chaining with retry semantics. Presigned URLs so the backend never proxies file bytes. A pluggable OCR interface so the adapter can be swapped without touching the pipeline. These are the kinds of choices a senior engineer makes after weighing trade-offs — and the AI made them coherently across 70+ files.

### Implementation → Testing
This is where traditional AI-assisted development usually stops. "Here's the code, good luck testing it." Instead, the automation suite was built **with full knowledge of the implementation** — referencing actual DOM structures, API response shapes, and Prisma model fields. The Gherkin scenarios read like a QA engineer wrote them after a sprint of exploratory testing: negative paths, permission boundaries, edge cases, data-driven parametric checks.

### Testing → Documentation
The OpenAPI spec, the README with Docker Compose instructions, the seed script with realistic synthetic data — these aren't afterthoughts. They're the artifacts that make a POC **demonstrable** to stakeholders and **onboardable** for new team members.

### What This Means for Engineering Teams

The POC took one session. In a traditional workflow, this would be:
- **1-2 days** for a BA/architect to produce the spec and data model
- **2-3 days** for a senior engineer to scaffold the backend + frontend
- **1-2 days** for a QA engineer to write the Gherkin specs and Playwright automation
- **Half a day** to wire up Docker, seed scripts, and documentation

That's roughly **a full sprint** compressed into one session. I'm not arguing that AI replaces these roles. But it fundamentally changes **the unit of work** we can accomplish in the early stages of a project. The feedback loop from "idea" to "something stakeholders can click through and evaluate" has collapsed from weeks to hours.

This has real implications:
- **Product teams** can validate ideas faster. Instead of debating requirements in the abstract, build a working POC and let people react to something real.
- **QA teams** get a head start. The Gherkin scenarios generated here aren't throwaway — they're a **living specification** that a QA engineer can refine, not write from scratch.
- **Engineering leads** can evaluate architectural approaches by generating competing POCs instead of relying solely on design docs.
- **Stakeholders** see working software earlier, which means better feedback, fewer expensive pivots, and faster go/no-go decisions.

### The Honest Caveat

Is it production-ready? No. It's a POC. The auth is stubbed. The OCR is synthetic. There are no integration tests against real external services. But it's a **runnable, testable, demonstrable** POC — and that's exactly what you need to get buy-in and start iterating.

The code is structured well enough that a team could take it from here: swap the OCR stub for a production service, point auth at a real OIDC provider, add WebSocket notifications for real-time status updates, harden the validation rules with domain experts, and deploy behind a proper CI pipeline. The same architecture applies whether you're validating financial documents, insurance claims, legal contracts, or healthcare forms.

The SDLC isn't shrinking. But the time between each phase is. And that changes everything about how we plan, staff, and deliver software.

---

**Tools used:** Claude Opus 4.6 (1M context) via Claude Code CLI

*What's the most ambitious thing you've built in a single AI session? I'd love to hear about it in the comments.*

---

#AI #SoftwareEngineering #ClaudeAI #Anthropic #EnterpriseAI #TestAutomation #Playwright #TypeScript #React #NodeJS #BDD #Gherkin #DeveloperProductivity #AIAssistedDevelopment
