# AI Agent-Driven SDLC: From Requirements to Production in a GitLab Pipeline

## Submission for gitlab.devpost.com

---

## Inspiration

Enterprise software delivery is bottlenecked by handoffs. A requirements document sits in a queue waiting for an architect. The architecture waits for a developer. The code waits for a reviewer. The tests wait for a QA engineer. Each handoff adds days, context loss, and coordination overhead.

We asked: **what if every stage of the SDLC had a dedicated AI agent — with the expertise of a principal engineer — orchestrated by GitLab CI/CD?**

Not replacing engineers. Augmenting them. An AI agent drafts the architecture; a human approves it. An AI agent writes the tests; a human reviews the coverage. The pipeline enforces quality gates. Humans make decisions. Agents do the work.

---

## What It Does

A complete GitLab CI/CD pipeline where **10 AI agents** handle every stage of the software development lifecycle, from a requirements document to production + DR deployment.

### The Pipeline

```
Requirements Doc (committed to repo)
        ↓
┌─ 1. Requirements Analysis ──── Agent: Principal BA
├─ 2. Architecture Design ────── Agent: Principal Architect
├─ 3. Implementation ─────────── Agent: Principal Full-Stack Engineer
├─ 4. Code Review ────────────── Agent: Principal Engineer
├─ 5. Security Audit ─────────── Agent: Principal AppSec Lead
├─ 6. Testing ────────────────── Agent: Principal QA Engineer
├─ 7. Performance Testing ────── Agent: Principal Perf Engineer
├─ 8. UAT Deploy ─────────────── Agent: Principal DevOps/SRE
├─ 9. UAT Approval ───────────── HUMAN: PO + Stakeholder
├─ 10. Production + DR Deploy ── Agent: Principal Release Engineer
└─ 11. System Ops Verification ─ Agent: Principal Systems Engineer
        ↓
    ✅ Production + DR Live
```

### Key Capabilities

| Capability | How It Works |
|---|---|
| **Requirements → User Stories** | Agent parses docs, generates structured stories with acceptance criteria and traceability matrix |
| **Architecture Design** | Agent analyzes codebase, produces data model diffs, API specs (OpenAPI), and ADRs |
| **Code Generation** | Agent implements features following existing patterns, creates migrations, commits to feature branch |
| **Security Audit** | Dependency CVE scan, OWASP SAST, SBOM generation, RBAC audit, secret detection, license compliance |
| **BDD Test Generation** | Agent writes Gherkin scenarios + Playwright step definitions from user stories |
| **Performance Testing** | Load/stress/spike/soak tests with k6, Lighthouse CI, SLA validation, regression detection |
| **Production Deploy** | Blue-green deployment to production + DR, with automated smoke tests and rollback |
| **System Ops Verification** | Health checks, failover simulation, integration testing, RTO/RPO documentation |

### Human-in-the-Loop Gates

| Gate | Who Approves | When |
|---|---|---|
| Requirements | Product Owner | After analysis, before design |
| Architecture | Tech Lead | After design, before implementation |
| UAT | PO + Stakeholder | After all tests pass, before production |
| Production | Release Manager + Tech Lead | Before deploy (GitLab environment protection) |

---

## How We Built It

### The POC Application
To demonstrate the pipeline, we built a **full-stack enterprise document validation workflow** using Claude Opus 4.6 in a single session:

- **Backend:** Node.js 20 / TypeScript / Express / Prisma (Postgres) / BullMQ (Redis) / MinIO (S3)
- **Frontend:** React 18 / Vite / Tailwind / React Query / Recharts
- **Pipeline:** OCR → Classify → Extract Fields → Validate Rules → Human Review
- **Auth:** JWT RBAC with 3 roles (Submitter, Validator, Supervisor)
- **Automation:** 89 Gherkin BDD scenarios across 8 feature files using Playwright

### The GitLab CI Pipeline Design
Each stage runs a GitLab CI job that:
1. Pulls a Docker image with Claude Code CLI installed
2. Loads a stage-specific agent prompt from `ci/agents/<stage>.prompt.md`
3. Executes Claude Code in headless mode
4. Captures artifacts for the next stage
5. Posts results as MR comments
6. Enforces quality gates via GitLab environment protection rules

### Agent Prompt Architecture
Each agent prompt follows a consistent structure:
- **Role:** Principal-level persona with domain expertise
- **Context:** Project description, tech stack, existing patterns
- **Inputs:** Artifacts from previous stages
- **Task:** Specific actions with clear exit criteria
- **Constraints:** Quality bars, security requirements, SLA targets
- **Output Format:** Structured artifacts for downstream consumption

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GitLab CI/CD                         │
│                                                         │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐              │
│  │ Stage 1 │──▶│ Stage 2 │──▶│ Stage 3 │──▶ ...       │
│  │ Agent   │   │ Agent   │   │ Agent   │              │
│  └────┬────┘   └────┬────┘   └────┬────┘              │
│       │             │             │                     │
│       ▼             ▼             ▼                     │
│  ┌─────────────────────────────────────┐               │
│  │         Artifact Store              │               │
│  │  (requirements → design → code →   │               │
│  │   review → security → tests →      │               │
│  │   perf → deploy manifest)          │               │
│  └─────────────────────────────────────┘               │
│                                                         │
│  ┌─────────────────────────────────────┐               │
│  │      Environment Protection         │               │
│  │  (Manual gates: PO, Tech Lead,     │               │
│  │   Stakeholder, Release Manager)    │               │
│  └─────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────┐     ┌─────────────┐
│ Production  │     │     DR      │
│ Environment │     │ Environment │
└─────────────┘     └─────────────┘
```

### Agent Roster

| # | Agent | Focus Area |
|---|-------|-----------|
| 1 | Requirements Analyst | User stories, traceability, prioritization |
| 2 | Solution Architect | Data model, API spec, ADR, component design |
| 3 | Senior Developer | Code generation, migrations, patterns |
| 4 | Code Reviewer | Quality, patterns, performance, standards |
| 5 | Security Engineer | Vulnerabilities, SAST, SBOM, auth audit |
| 6 | QA Engineer | BDD scenarios, regression, coverage, traceability |
| 7 | Performance Engineer | Load/stress/soak tests, SLA validation, capacity |
| 8 | DevOps Engineer | Build, deploy, smoke tests, environment setup |
| 9 | Release Engineer | Blue-green deploy, DR replication, release notes |
| 10 | System Ops Engineer | Health checks, failover, integration, capacity |

---

## Challenges We Ran Into

1. **Test data isolation** — BDD scenarios that modify state (approve/reject documents) exhaust test data for subsequent scenarios. Solved with dynamic document creation via API upload + pipeline polling.

2. **Agent prompt consistency** — Each agent needs enough context to work autonomously but not so much that it loses focus. We standardized a 7-section prompt template (Role, Context, Inputs, Task, Constraints, Output Format, Exit Criteria).

3. **Duplicate step definitions** — Playwright-bdd requires globally unique step patterns across all files. Refactored shared steps into a `common.steps.ts` module.

4. **DOM selector resilience** — Status badges appear in both the header and review history, causing strict mode violations. Fixed with `.first()` locators scoped to the correct DOM region.

5. **Pipeline stage dependencies** — Each stage's artifacts must be structured predictably for the next stage's agent to consume. This required strict output format specifications in each agent prompt.

---

## Accomplishments We're Proud Of

- **89/89 BDD test scenarios passing** — full coverage across auth, upload, inbox, document review, dashboard, RBAC, SLA/pipeline, and validation rules
- **11-stage pipeline with 10 AI agents** — each with a distinct principal-engineer persona and clear quality gate
- **Security audit agent** covers OWASP Top 10, dependency CVEs, SBOM generation, RBAC enforcement, secret detection, and license compliance
- **System ops agent** includes automated failover simulation and RTO/RPO documentation
- **Performance agent** runs 5 load profiles (baseline, peak, stress, spike, soak) with regression detection against previous releases
- **The entire POC** (backend + frontend + 89 tests + pipeline design) was built in a single Claude Code session

---

## What We Learned

### AI agents work best with clear boundaries
Each agent is scoped to one SDLC phase with explicit inputs and outputs. When we tried to combine code review + security audit into one agent, the output quality dropped. Specialization matters — even for AI.

### Human gates are the right abstraction
The pipeline doesn't try to fully automate decisions. It automates work and surfaces decisions. "Here's the architecture — approve or revise?" is a better interaction pattern than "I deployed to production, hope that's okay."

### The 1M context window changes what's possible
By the time the QA agent writes tests, it has the full backend (Prisma schema, routes, validation logic, worker pipeline) and frontend (all React screens) in context. The test step definitions reference exact CSS classes, DOM structures, and API response shapes from the actual code — not generic guesses.

### GitLab CI is the right orchestrator
Environment protection rules, artifact passing, manual approval gates, container registry, and audit logging are all built into GitLab. We didn't need to build any orchestration infrastructure — just agent prompts and quality gate thresholds.

---

## What's Next

1. **Live GitLab integration** — Wire the agents to actual GitLab CI jobs with Claude Code CLI in headless mode
2. **Agent memory** — Let agents learn from past pipeline runs (what got rejected in code review, what failed in security audit) to improve future output
3. **Multi-repo support** — Extend the pipeline to microservice architectures where one requirements change triggers coordinated changes across repos
4. **Cost optimization** — Use lighter models (Claude Haiku) for early stages (requirements parsing) and heavier models (Claude Opus) for complex stages (architecture, security audit)
5. **Metrics dashboard** — Track pipeline velocity, agent accuracy (how often human reviewers approve vs reject agent output), and time savings vs traditional SDLC

---

## Built With

- **AI:** Claude Opus 4.6 (1M context) via Claude Code CLI
- **CI/CD:** GitLab CI/CD with environment protection rules
- **Backend:** Node.js 20, TypeScript, Express, Prisma, BullMQ, Redis
- **Frontend:** React 18, Vite, Tailwind CSS, React Query, Recharts
- **Testing:** Playwright, playwright-bdd, Gherkin BDD
- **Infrastructure:** Docker, Docker Compose, PostgreSQL 15, Redis 7, MinIO
- **Performance:** k6 (load testing), Lighthouse CI (frontend)

---

## Try It

```bash
# Clone and start infrastructure
git clone https://github.com/vpremk/exchange-backoffice.git
cd exchange-backoffice
docker compose up -d

# Backend
cd backend && npm install
npx prisma db push && npx prisma db seed
npm run dev      # Terminal 1
npm run worker   # Terminal 2

# Frontend
cd frontend && npm install
npm run dev      # → http://localhost:5173

# Run all 89 BDD tests
cd automation && npm install
npx playwright install chromium
npm test
```

---

## Team

**Vandana Premkumar** — Solution Architect + Full-Stack Engineer

Built with Claude Opus 4.6 as an AI engineering partner.

---

## Links

- **GitHub:** https://github.com/vpremk/exchange-backoffice
- **Pipeline Design:** [docs/gitlab-ci-agent-pipeline-plan.md](gitlab-ci-agent-pipeline-plan.md)
- **Product Spec:** [docs/SPEC.md](SPEC.md)
- **API Spec:** [docs/openapi.yaml](openapi.yaml)
- **Test Coverage Report:** [automation/TEST_COVERAGE_REPORT.md](../automation/TEST_COVERAGE_REPORT.md)
