# GitLab CI/CD Pipeline: AI Agent-Driven SDLC Orchestration

## Context

Design a GitLab CI/CD pipeline where each stage of the SDLC is performed by an AI agent with the skill set of a principal engineer. The entry point is a requirements document, and the pipeline flows through all SDLC stages — from requirements analysis through production and DR deployment.

Includes dedicated agents for Security Audit, Performance Testing, and System Operations verification.

---

## Pipeline Architecture

### Entry Point
A requirements document (markdown, PDF, or structured JSON) is committed to the repo or uploaded via GitLab issue/merge request. This triggers the pipeline.

### Pipeline Stages (11 stages, 10 agents + 1 human gate)

```
Requirements → Design → Implementation → Code Review → Security Audit → Testing → Performance Testing → UAT Deploy → UAT Approval → Production + DR Deploy → System Operations Verification
```

---

## Stage Definitions

### Stage 1: `requirements-analysis` (Agent: Requirements Analyst)
**Trigger:** New/updated requirements doc committed to `docs/requirements/`
**Agent Persona:** Principal BA/Requirements Engineer
**Inputs:** Raw requirements document
**Actions:**
- Parse and structure requirements into user stories with acceptance criteria
- Identify ambiguities, conflicts, and missing requirements
- Generate a traceability matrix (requirement → feature → test)
- Classify priority (P0-P3) and estimate complexity (S/M/L/XL)
- Flag compliance/security/regulatory considerations
**Outputs:** `artifacts/requirements-analysis.json`, `artifacts/user-stories.md`
**Gate:** Manual approval by Product Owner (GitLab environment protection)

### Stage 2: `architecture-design` (Agent: Solution Architect)
**Trigger:** Requirements analysis approved
**Agent Persona:** Principal Architect
**Inputs:** Structured requirements, existing codebase context
**Actions:**
- Analyze existing codebase for reuse opportunities
- Design data model changes (Prisma schema diff)
- Define API contracts (OpenAPI spec)
- Propose component architecture and sequence diagrams
- Identify infrastructure requirements and dependencies
- Produce ADR (Architecture Decision Record)
**Outputs:** `artifacts/architecture-design.md`, `artifacts/api-spec.yaml`, `artifacts/schema-changes.prisma`
**Gate:** Manual approval by Tech Lead

### Stage 3: `implementation` (Agent: Senior Developer)
**Trigger:** Architecture approved
**Agent Persona:** Principal Full-Stack Engineer
**Inputs:** Architecture design, API spec, schema changes, existing codebase
**Actions:**
- Generate implementation code (backend routes, services, frontend components)
- Follow existing project patterns and conventions (from CLAUDE.md / .cursorrules)
- Create database migrations
- Write inline documentation where logic is non-obvious
- Commit changes to a feature branch
**Outputs:** Feature branch with implementation code
**Gate:** Automatic (proceeds to code review)

### Stage 4: `code-review` (Agent: Code Reviewer)
**Trigger:** Implementation complete
**Agent Persona:** Principal Engineer (Quality focus)
**Inputs:** Git diff of implementation, architecture spec, coding standards
**Actions:**
- Check adherence to architecture design
- Validate error handling, edge cases, and input validation
- Check for performance anti-patterns (N+1 queries, memory leaks)
- Verify RBAC enforcement on new endpoints
- Ensure no secrets, credentials, or PII in code
- Generate review report with severity ratings
**Outputs:** `artifacts/code-review-report.md`, inline MR comments
**Gate:** All critical/high findings must be resolved (automatic re-review)

### Stage 5: `security-audit` (Agent: Security Engineer)
**Trigger:** Code review passed
**Agent Persona:** Principal Security Engineer / AppSec Lead
**Inputs:** Full codebase, dependency manifests (package-lock.json), Docker images, API spec
**Actions:**
- **Dependency Vulnerability Scan**
  - Run `npm audit` / `yarn audit` on all package-lock.json files
  - Check for known CVEs in direct and transitive dependencies
  - Flag packages with no maintenance (last publish > 2 years)
  - Verify license compliance (no GPL in proprietary code)
  - Generate SBOM (Software Bill of Materials)
- **Static Application Security Testing (SAST)**
  - Scan for OWASP Top 10: injection, XSS, CSRF, broken auth, SSRF
  - Detect hardcoded secrets, API keys, tokens, passwords in source
  - Check for insecure deserialization and prototype pollution
  - Validate input sanitization on all API endpoints
  - Verify parameterized queries (no raw SQL concatenation)
- **Infrastructure Security**
  - Audit Dockerfile for running as root, exposed ports, unnecessary packages
  - Check Docker Compose for privileged containers, host network mode
  - Verify environment variable handling (no secrets in docker-compose.yml)
  - Validate TLS/SSL configuration
  - Check CORS policy for overly permissive origins
- **Authentication & Authorization Audit**
  - Verify JWT validation (signature, expiry, issuer, audience)
  - Check RBAC enforcement on every route/endpoint
  - Validate session management (token rotation, revocation)
  - Ensure password/secret hashing uses bcrypt/argon2 (not MD5/SHA1)
  - Check for broken access control (IDOR, privilege escalation)
- **Data Security**
  - Verify PII is not logged or exposed in error responses
  - Check database encryption at rest configuration
  - Validate file upload restrictions (type, size, content validation)
  - Ensure presigned URLs have appropriate expiry
  - Check for data leakage in API responses (over-fetching)
- **Security Headers & Transport**
  - Verify Helmet.js configuration (CSP, HSTS, X-Frame-Options)
  - Check rate limiting on authentication endpoints
  - Validate API response headers (no server version disclosure)
**Severity Levels:**
- **CRITICAL:** Exploitable vulnerability, must block deployment
- **HIGH:** Security weakness, must fix before production
- **MEDIUM:** Best practice violation, fix within sprint
- **LOW:** Informational, track in backlog
**Outputs:** `artifacts/security-audit-report.md`, `artifacts/sbom.json`, `artifacts/vulnerability-summary.json`
**Gate:** Zero CRITICAL/HIGH findings. MEDIUM findings documented with remediation plan.

### Stage 6: `testing` (Agent: QA Engineer)
**Trigger:** Security audit passed
**Agent Persona:** Principal QA Engineer
**Inputs:** Implementation code, requirements traceability matrix, existing test suite
**Actions:**
- Generate Gherkin BDD feature files from user stories
- Write Playwright step definitions and page objects
- Create API-level test cases for new endpoints
- Run existing test suite (regression)
- Run new tests
- Generate test coverage report
- Map test results back to requirements (traceability)
**Outputs:** `automation/features/*.feature`, `artifacts/test-report.html`, `artifacts/traceability-matrix.md`
**Gate:** 100% of acceptance criteria covered, no critical test failures

### Stage 7: `performance-testing` (Agent: Performance Engineer)
**Trigger:** Functional tests passed
**Agent Persona:** Principal Performance Engineer / Capacity Planner
**Inputs:** API spec, deployment manifest, SLA requirements, architecture design
**Actions:**
- **Load Test Design**
  - Identify critical user journeys from requirements (upload → pipeline → review flow)
  - Define load profiles: baseline (expected), peak (2x), stress (5x), spike (sudden burst)
  - Map API endpoints to expected request rates from architecture spec
  - Configure think times and ramp-up patterns based on real user behavior
- **Load Test Execution** (using k6, Artillery, or Locust)
  - **Baseline Test:** Expected concurrent users for 10 minutes — establish performance benchmarks
  - **Peak Load Test:** 2x expected load for 15 minutes — verify system handles anticipated peaks
  - **Stress Test:** Gradually increase to 5x load — find the breaking point and document degradation curve
  - **Spike Test:** Sudden 10x burst for 60 seconds — verify system recovers without intervention
  - **Soak Test:** Expected load sustained for 1 hour — detect memory leaks, connection pool exhaustion, log rotation issues
- **API Performance Benchmarks**
  - Measure per-endpoint response times (p50, p95, p99)
  - Verify SLA compliance: p95 < 500ms for reads, p95 < 2s for writes, p95 < 5s for file upload
  - Track error rate under load (must be < 0.1% at baseline, < 1% at peak)
  - Measure throughput (requests/second) at each load tier
- **Database Performance**
  - Monitor query execution times under load (slow query log analysis)
  - Check connection pool saturation (active vs idle vs waiting)
  - Verify index utilization on high-traffic queries
  - Measure lock contention on concurrent writes
  - Track replication lag under load (for read replicas / DR)
- **Queue & Worker Performance**
  - Measure BullMQ job throughput (jobs/minute at each pipeline stage)
  - Monitor queue depth under load (should not grow unbounded)
  - Measure end-to-end pipeline latency (upload → PENDING_REVIEW)
  - Verify worker concurrency settings are optimal
  - Check Redis memory usage growth rate
- **Frontend Performance**
  - Run Lighthouse CI with performance budget thresholds
  - Measure Time to First Byte (TTFB), First Contentful Paint (FCP), Largest Contentful Paint (LCP)
  - Verify bundle size is within budget (< 500KB gzipped for initial load)
  - Check Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
  - Validate no layout shifts on data load (React Query skeleton/placeholder)
- **Resource Utilization Under Load**
  - Record CPU, memory, disk I/O, network I/O for each service at each load tier
  - Identify resource bottleneck (which service saturates first)
  - Calculate headroom: how much capacity remains at peak load
  - Recommend auto-scaling thresholds based on observed utilization curves
- **Comparison & Regression Detection**
  - Compare results against previous release baseline (if exists)
  - Flag any endpoint with > 20% response time regression
  - Flag any resource metric with > 30% increase from previous release
  - Generate trend chart (response time over releases)
**Performance Thresholds:**
- **PASS:** All SLA targets met, error rate < 0.1% at baseline
- **WARN:** p95 between 80-100% of SLA limit, or resource utilization > 70% at peak
- **FAIL:** SLA breach at baseline load, error rate > 1%, memory leak detected, or any service crash
**Outputs:** `artifacts/performance-report.md`, `artifacts/load-test-results.json`, `artifacts/lighthouse-report.html`, `artifacts/performance-trend.json`
**Gate:** Zero FAIL findings. WARN findings documented with capacity plan.

### Stage 8: `uat-deploy` (Agent: DevOps Engineer)
**Trigger:** Performance tests passed
**Agent Persona:** Principal DevOps/SRE
**Inputs:** Tested code, infrastructure config, environment specs
**Actions:**
- Build Docker images (backend, frontend, worker)
- Push to container registry (GitLab Container Registry)
- Deploy to UAT environment (Kubernetes / Docker Compose on UAT server)
- Run database migrations on UAT
- Seed UAT with representative test data
- Run smoke tests against UAT
- Generate deployment manifest
**Outputs:** Running UAT environment, `artifacts/deployment-manifest.json`, smoke test results
**Gate:** Smoke tests pass (automatic)

### Stage 9: `uat-approval` (Manual Gate)
**Trigger:** UAT deployed and smoke tests pass
**Agent Persona:** N/A — Human stakeholders
**Inputs:** UAT environment URL, test report, security audit report, performance report, requirements traceability
**Actions:**
- Product Owner and business stakeholders perform acceptance testing
- Security team reviews audit report
- Performance report reviewed for SLA compliance
- GitLab environment protection rule requires manual approval
- Approval recorded in GitLab audit log
**Outputs:** Approval/rejection with comments
**Gate:** Manual approval by authorized approvers (configurable: PO + 1 stakeholder)

### Stage 10: `production-dr-deploy` (Agent: Release Engineer)
**Trigger:** UAT approved
**Agent Persona:** Principal SRE / Release Engineer
**Inputs:** Approved artifacts, deployment manifest, production config
**Actions:**
- Deploy to Production (blue-green or canary strategy)
- Run production smoke tests
- Deploy to DR environment (replicated deployment)
- Verify DR replication (health checks, data sync validation)
- Update DNS / load balancer (if blue-green)
- Tag release in git
- Generate release notes from requirements + commits
- Notify stakeholders (Slack/email webhook)
**Outputs:** Production deployment, DR deployment, git tag, release notes
**Gate:** Production smoke tests pass, DR health checks pass

### Stage 11: `system-operations-verification` (Agent: System Operations Engineer)
**Trigger:** Production + DR deployment complete
**Agent Persona:** Principal Systems/Operations Engineer
**Inputs:** Production URLs, DR URLs, deployment manifest, infrastructure config
**Actions:**
- **System Health Checks**
  - Verify all services are running (API server, worker, frontend)
  - Check process uptime and resource utilization (CPU, memory, disk)
  - Validate log aggregation is capturing from all services
  - Verify monitoring dashboards are populated (Grafana/Datadog/CloudWatch)
  - Confirm alerting rules are active and routed correctly
- **Server Integration Checks**
  - Verify database connectivity from all backend instances
  - Verify Redis connectivity and queue health (BullMQ pending/failed counts)
  - Verify MinIO/S3 connectivity (upload + download test)
  - Check inter-service communication (API → Worker via queue)
  - Validate DNS resolution for all service endpoints
  - Verify SSL certificate validity and expiry (> 30 days remaining)
  - Check load balancer health check configuration and target group status
- **Failover Testing**
  - Simulate primary database failover → verify app reconnects to replica
  - Simulate Redis failover → verify queue processing resumes
  - Simulate single backend instance kill → verify LB routes to healthy instance
  - Verify circuit breaker behavior on downstream service failure
  - Validate auto-scaling triggers (if configured)
  - Document RTO (Recovery Time Objective) and RPO (Recovery Point Objective)
- **Frontend Health Checks**
  - Verify frontend is accessible and renders correctly
  - Check static asset delivery (CDN cache headers, compression)
  - Validate API proxy configuration (no CORS errors in browser console)
  - Run Lighthouse audit (performance score, accessibility, SEO)
  - Verify WebSocket/SSE connections (if applicable)
  - Check Content Security Policy is not blocking required resources
- **Backend Health Checks**
  - Hit `/health` endpoint on all instances — verify 200 response
  - Verify API response times are within SLA (p95 < 500ms)
  - Check database connection pool status (active, idle, waiting)
  - Verify background worker is processing jobs (queue drain rate)
  - Check error rate in last 15 minutes (should be < 0.1%)
  - Validate audit logging is recording events to database
- **DR Verification**
  - Verify DR environment is reachable and functional
  - Compare DR deployment version with production (must match)
  - Run full smoke test suite against DR endpoints
  - Verify database replication lag is within acceptable range (< 1 minute)
  - Confirm DR can serve traffic if DNS is switched (manual failover test)
  - Validate backup schedules are active (database, file storage)
- **Capacity & Performance Baseline**
  - Record baseline response times for key endpoints
  - Document current resource utilization as post-deploy baseline
  - Verify auto-scaling policies are correctly configured
  - Check disk space on all persistent volumes
**Status Levels:**
- **PASS:** All checks green
- **WARN:** Non-critical issue detected, ops team notified
- **FAIL:** Critical issue, triggers rollback or on-call escalation
**Outputs:** `artifacts/ops-health-report.md`, `artifacts/failover-test-results.json`, `artifacts/performance-baseline.json`
**Gate:** All critical checks PASS. WARN items logged to ops backlog. FAIL triggers automatic rollback.

---

## Updated `.gitlab-ci.yml` Structure

```yaml
stages:
  - requirements-analysis
  - architecture-design
  - implementation
  - code-review
  - security-audit
  - testing
  - performance-testing
  - uat-deploy
  - uat-approval
  - production-dr-deploy
  - system-ops-verification

# Each stage uses a custom Docker image with Claude CLI + project deps
# Agent config is passed via environment variables and prompt files
```

### Agent Execution Model
Each stage runs a GitLab CI job that:
1. Pulls a Docker image with Claude Code CLI installed
2. Loads the stage-specific agent prompt from `ci/agents/<stage>.prompt.md`
3. Executes Claude Code in headless mode with the prompt
4. Captures artifacts and stores them as GitLab CI artifacts
5. Posts results as MR comments (for visibility)

### Key Files to Create
```
ci/
├── .gitlab-ci.yml                    # Main pipeline definition
├── agents/
│   ├── requirements-analyst.prompt.md
│   ├── solution-architect.prompt.md
│   ├── senior-developer.prompt.md
│   ├── code-reviewer.prompt.md
│   ├── security-engineer.prompt.md
│   ├── qa-engineer.prompt.md
│   ├── performance-engineer.prompt.md  # NEW
│   ├── devops-engineer.prompt.md
│   ├── release-engineer.prompt.md
│   └── system-ops-engineer.prompt.md
├── performance/
│   ├── k6-load-test.js              # k6 load test script
│   ├── load-profiles.json           # Baseline/peak/stress/spike configs
│   └── performance-budget.json      # SLA thresholds and budgets
├── scripts/
│   ├── run-agent.sh                  # Common agent execution wrapper
│   ├── post-mr-comment.sh            # Post results to MR
│   ├── failover-test.sh              # Failover simulation script
│   ├── health-check.sh               # Health check runner
│   └── notify-stakeholders.sh        # Slack/email notification
├── templates/
│   ├── requirements-template.md
│   ├── adr-template.md
│   ├── security-checklist.md
│   ├── performance-report-template.md # NEW
│   ├── ops-runbook-template.md
│   └── release-notes-template.md
└── environments/
    ├── uat.env
    ├── production.env
    └── dr.env
```

---

## Environment Protection Rules (GitLab)

| Environment | Required Approvers | Approval Count |
|---|---|---|
| `requirements-approved` | Product Owner | 1 |
| `architecture-approved` | Tech Lead | 1 |
| `security-cleared` | Security Lead | 1 (auto if zero CRITICAL/HIGH) |
| `performance-cleared` | Auto (thresholds) | 0 |
| `uat` | Auto (smoke tests) | 0 |
| `uat-approved` | Product Owner + Stakeholder | 2 |
| `production` | Release Manager + Tech Lead | 2 |
| `dr` | Auto (follows production) | 0 |
| `ops-verified` | Auto (health checks) | 0 |

---

## Complete Agent Roster (10 agents)

| # | Agent | Persona | Stage | Focus |
|---|-------|---------|-------|-------|
| 1 | Requirements Analyst | Principal BA | requirements-analysis | User stories, traceability, prioritization |
| 2 | Solution Architect | Principal Architect | architecture-design | Data model, API spec, ADR, component design |
| 3 | Senior Developer | Principal Full-Stack Engineer | implementation | Code generation, migrations, patterns |
| 4 | Code Reviewer | Principal Engineer | code-review | Quality, patterns, performance, standards |
| 5 | Security Engineer | Principal AppSec Lead | security-audit | Vulnerabilities, SAST, SBOM, auth audit |
| 6 | QA Engineer | Principal QA Engineer | testing | BDD scenarios, regression, coverage, traceability |
| 7 | Performance Engineer | Principal Perf Engineer | performance-testing | Load/stress/soak tests, SLA validation, capacity |
| 8 | DevOps Engineer | Principal DevOps/SRE | uat-deploy | Build, deploy, smoke tests, environment setup |
| 9 | Release Engineer | Principal SRE | production-dr-deploy | Blue-green deploy, DR replication, release notes |
| 10 | System Ops Engineer | Principal Systems Engineer | system-ops-verification | Health checks, failover, integration, capacity |

---

## Agent Prompt Design Principles

Each agent prompt file follows a consistent structure:
1. **Role**: "You are a Principal [role] with 15+ years of experience..."
2. **Context**: Project description, tech stack, existing patterns (from CLAUDE.md)
3. **Inputs**: What artifacts from previous stages to read
4. **Task**: Specific actions to perform
5. **Constraints**: Quality bars, security requirements, performance targets
6. **Output Format**: Exact artifact structure expected
7. **Exit Criteria**: What constitutes "done" for this stage

---

## Security Considerations

- Agent API keys stored as GitLab CI/CD masked variables
- No secrets passed in agent prompts — use GitLab vault integration
- Security audit stage is mandatory — cannot be skipped or overridden
- Agent output is reviewed (code review + security audit) before deployment
- Production deployment requires 2-person approval
- All agent actions logged to GitLab audit trail
- DR deployment is automated but verified independently
- SBOM generated and stored for compliance/audit

---

## Rollback Strategy

- Production uses blue-green deployment — rollback = switch back to blue
- Database migrations must be backward-compatible (expand-contract pattern)
- DR environment maintains N-1 version as automatic rollback target
- Failed smoke tests in production auto-trigger rollback job
- System ops verification failure at FAIL level triggers automatic rollback
- Rollback notification sent to all stakeholders + on-call

---

## Pipeline Flow Diagram

```
┌─────────────────────┐
│  Requirements Doc    │ (committed to repo)
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 1. Requirements     │ Agent: Requirements Analyst
│    Analysis         │ Gate: PO approval
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 2. Architecture     │ Agent: Solution Architect
│    Design           │ Gate: Tech Lead approval
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 3. Implementation   │ Agent: Senior Developer
│                     │ Gate: Auto
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 4. Code Review      │ Agent: Code Reviewer
│                     │ Gate: Zero critical findings
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 5. Security Audit   │ Agent: Security Engineer
│                     │ Gate: Zero CRITICAL/HIGH
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 6. Testing          │ Agent: QA Engineer
│                     │ Gate: All tests pass
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 7. Performance      │ Agent: Performance Engineer
│    Testing          │ Gate: SLA thresholds met
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 8. UAT Deploy       │ Agent: DevOps Engineer
│                     │ Gate: Smoke tests pass
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 9. UAT Approval     │ HUMAN: PO + Stakeholder
│                     │ Gate: Manual approval (2)
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 10. Production + DR │ Agent: Release Engineer
│     Deploy          │ Gate: Smoke + DR health
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 11. System Ops      │ Agent: System Ops Engineer
│     Verification    │ Gate: All checks PASS
└──────────┬──────────┘
           ▼
       ✅ DONE
  (or 🔄 ROLLBACK if FAIL)
```

---

## Verification

To validate this pipeline:
1. Create a sample requirements doc and commit to `docs/requirements/`
2. Verify each stage triggers sequentially
3. Confirm manual gates pause the pipeline at the right stages
4. Verify artifacts are passed between stages
5. Confirm security audit blocks on CRITICAL/HIGH findings
6. Confirm performance tests validate SLA thresholds
7. Confirm UAT deployment is accessible and functional
8. Confirm production + DR deployments match
9. Verify system ops health checks run post-deploy
10. Test failover simulation produces accurate RTO/RPO
11. Test rollback by deliberately failing a smoke test or health check
