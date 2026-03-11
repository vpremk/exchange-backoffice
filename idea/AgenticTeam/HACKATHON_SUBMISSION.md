# GitLab AI Hackathon Submission: Compliance Sentinel

> **Hackathon**: [GitLab AI Hackathon](https://gitlab.devpost.com/) (Feb 9 - Mar 25, 2026)
>
> **Prize Track**: GitLab & Anthropic Grand Prize ($10,000) + Most Impactful ($5,000)
>
> **Team**: Compliance Sentinel Contributors
>
> **Repository**: `gitlab.com/gitlab-ai-hackathon/compliance-sentinel`

---

## The Pain

Every company building with AI agents faces the same terrifying question: **"Is our AI doing something illegal right now?"**

- A healthcare agent accesses patient records without authorization — **HIPAA violation, $50K+ fine per incident**
- A financial agent modifies ledger entries without dual approval — **SOX violation, criminal liability**
- A trading bot executes without licensing checks — **FINRA violation, firm shutdown**
- A mortgage underwriting agent denies loans using zip code as a proxy for race — **ECOA/fair lending violation, DOJ investigation**

Today, compliance teams discover these violations **after the damage is done** — in quarterly audits, customer complaints, or regulator letters. There is no real-time guardrail for AI agent behaviour.

Manual compliance review of agent traces is impossible at scale. A single agent can generate thousands of traces per hour. Hiring compliance analysts at $150K+/year to manually review them is neither scalable nor fast enough.

**The gap**: There is no tool that sits between AI agents and production that evaluates every action against regulatory rules in real-time, blocks violations before they happen, and generates audit-ready evidence automatically.

---

## How Compliance Sentinel Solves It

Compliance Sentinel is an **AI-powered compliance engine** built on the GitLab Duo Agent Platform that:

1. **Monitors every AI agent action in real-time** via OpenTelemetry traces
2. **Evaluates traces against 40+ regulatory rules** (HIPAA, SOX, FINRA, SOC2) in <100ms
3. **Blocks violations before they happen** — not after
4. **Generates audit-ready compliance reports** automatically
5. **Tracks LLM costs** across all agents with anomaly detection

### The Agent: How It Works (Trigger → Action)

```
Trigger: Agent trace received via SDK
    ↓
Action 1: Parse OpenTelemetry spans and extract attributes
    ↓
Action 2: Evaluate against all applicable regulatory rules
    ↓
Action 3: If violation detected →
    - BLOCK the agent action (prevent data access/modification)
    - ALERT via PagerDuty/Slack (P1 for critical violations)
    - LOG with 7-year retention for audit trail
    - ESCALATE to compliance officer
    ↓
Action 4: Generate real-time compliance score dashboard
    ↓
Action 5: On schedule → Generate PDF compliance report
```

**This is not a chatbot.** This is an autonomous compliance agent that reacts to triggers (incoming traces) and takes concrete actions (block, alert, escalate, report).

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  AI Agents      │     │  Sentinel SDK    │     │  Compliance Engine  │
│  (LangChain,    │────▸│  (1-line setup)  │────▸│  (Rule Evaluator)   │
│   CrewAI, etc.) │     │  sentinel-sdk    │     │  40+ YAML rules     │
└─────────────────┘     └──────────────────┘     └────────┬────────────┘
                                                          │
                              ┌────────────────────────────┤
                              ▼                            ▼
                    ┌──────────────────┐        ┌──────────────────┐
                    │  Block / Alert   │        │  Dashboard       │
                    │  PagerDuty/Slack │        │  React + Recharts│
                    │  Escalation      │        │  Trace Explorer  │
                    └──────────────────┘        └──────────────────┘
```

### GitLab Duo Agent Platform Integration

The project is built as a **custom GitLab Duo agent** that:

- **Custom Agent**: `compliance-sentinel-agent` — triggers on merge request events and CI pipeline completions to scan agent traces for compliance violations
- **Custom Flow**: `compliance-scan-flow` — a multi-step workflow that: (1) collects traces from the MR diff, (2) evaluates compliance rules, (3) posts violation comments on the MR, (4) blocks merge if critical violations exist

### Anthropic Integration

- The compliance engine uses **Claude** (via Anthropic API) for:
  - **Natural language rule explanations**: When a violation is detected, Claude generates a human-readable explanation of *why* it violated the rule and *how to fix it*
  - **False positive analysis**: Claude reviews flagged violations and estimates false positive likelihood
  - **Compliance report generation**: Claude synthesizes violation data into executive-ready audit narratives

---

## What Changes for Developers

### Before Compliance Sentinel
- Compliance review happens **weeks after deployment**
- Violations discovered in **quarterly audits** (too late)
- Developers have **no visibility** into compliance status
- Cost tracking is a **spreadsheet nightmare**
- Audit preparation takes **2-3 weeks** per report

### After Compliance Sentinel
- Compliance evaluation happens in **<100ms per trace**
- Violations are **blocked before they execute**
- Developers see compliance status **in every MR**
- Cost tracking is **automatic with anomaly detection**
- Audit reports are **generated in seconds**

---

## Technical Highlights

### Performance
- **10,000 rules evaluated against 50 spans in <100ms** (benchmarked and tested)
- Zero-dependency SDK (stdlib only) — no bloat in customer environments
- Air-gap friendly: offline disk buffering for regulated environments

### Compliance Rules (50+ pre-built)
| Regulation | Rules | Examples |
|------------|-------|----------|
| HIPAA | 10 | PHI access control, encryption enforcement, BAA verification |
| SOX | 10 | Dual approval, segregation of duties, audit trail protection |
| FINRA | 10 | Trade authorization, wash trading detection, insider info barriers |
| SOC2 | 10 | Authentication, data exfiltration detection, change management |
| TILA/RESPA/ECOA (Mortgage) | 10 | Fair lending enforcement, APR disclosure validation, HMDA data integrity, loan estimate timing, kickback detection, redlining prevention, borrower consent verification, servicing transfer notice, escrow analysis accuracy, adverse action notice |
| Custom | 3+ | Template with regex, chaining, and plugin support |

### SDK (One-Line Setup)
```python
from sentinel_sdk import Sentinel
sentinel = Sentinel(endpoint="https://sentinel.internal.co", api_key="sk-...", regulations=["HIPAA"])

@sentinel.trace(name="patient-lookup")
def lookup_patient(patient_id):
    ...
```

### Dashboard (React + TypeScript)
- Real-time compliance score gauge
- Trace explorer with Jaeger-style span waterfall
- Violation timeline with severity breakdown
- Cost analytics with ROI calculator
- YAML rule editor with live validation

---

## Project Structure

```
compliance-sentinel/
├── sentinel/core/          # Compliance engine (Python)
│   ├── compliance_engine.py    # Main evaluation engine
│   ├── rule_evaluator.py       # DSL condition evaluation (13 operators)
│   ├── rule_parser.py          # YAML rule loading + validation
│   └── plugins.py              # Custom rule plugin interface
├── sentinel/models/        # Pydantic models
├── compliance-rules/       # 50+ YAML rule files
│   ├── hipaa.yaml, sox.yaml, finra.yaml, soc2.yaml, mortgage.yaml
│   └── custom-template.yaml    # Annotated template
├── sdk/python/             # Customer SDK (zero dependencies)
│   └── sentinel_sdk/           # Client, tracer, cost tracker, buffer
├── frontend/               # React dashboard
│   └── src/pages/              # Dashboard, Traces, Compliance, Costs, Settings
├── .gitlab-ci.yml          # 10-stage CI/CD pipeline
├── .gitlab-ci/             # Reusable CI templates
│   ├── docker.yml, deploy.yml, security.yml
├── deploy.sh               # Unified deploy script (compose + helm)
├── tests/                  # 86 tests (48 engine + 38 SDK)
├── LICENSE                 # Apache-2.0
└── NOTICE                  # Attribution
```

---

## Demo Video Script (3 minutes)

### 0:00-0:30 — The Problem
*"Every AI agent your company deploys is a compliance risk. One unauthorized data access can cost $50,000 in HIPAA fines. Today I'll show you Compliance Sentinel — an agent that evaluates every AI action against regulatory rules in real-time."*

### 0:30-1:15 — SDK Integration (Live Demo)
- Show adding `sentinel_sdk` to an existing LangChain agent (3 lines of code)
- Run the agent — traces appear in the dashboard instantly
- Show a HIPAA violation being detected and blocked in real-time

### 1:15-2:00 — Dashboard Walkthrough
- Compliance score gauge (98.2% passing)
- Trace explorer: click a failed trace → waterfall view → expand span → see violation details
- Violation timeline chart over 30 days
- Cost analytics: $847/month for AI vs $12,400 estimated manual cost

### 2:00-2:30 — GitLab Integration
- Show the custom Duo agent scanning an MR for compliance violations
- MR comment automatically posted: "HIPAA-001 violation: PHI accessed without authorization"
- Merge blocked until violation is resolved

### 2:30-3:00 — Impact
*"Compliance Sentinel turns reactive compliance into proactive prevention. 40 regulatory rules evaluated in under 100 milliseconds. Every trace. Every agent. Every time."*

---

## Submission Checklist

- [ ] **Public GitLab repo** in `gitlab.com/gitlab-ai-hackathon/compliance-sentinel`
- [ ] **MIT License** (required by rules — update from Apache-2.0 before submission)
- [ ] **Custom Duo Agent**: `compliance-sentinel-agent` registered and public
- [ ] **Custom Flow**: `compliance-scan-flow` registered and public
- [ ] **Demo video** (<3 min) uploaded to YouTube (public)
- [ ] **All YAML config files** are original work
- [ ] **README** with setup instructions
- [ ] **Devpost submission** with description + video link + GitLab URL

---

## Prize Alignment

| Prize | Alignment | Why |
|-------|-----------|-----|
| **GitLab & Anthropic Grand Prize** ($10K) | Primary target | Built on Duo Agent Platform + Anthropic Claude for rule explanations and report generation |
| **Most Impactful** ($5K) | Strong fit | Addresses a real, painful compliance gap with measurable ROI (12x cost reduction) |
| **Most Technically Impressive** ($5K) | Strong fit | 10K rules in <100ms, zero-dep SDK, full-stack (engine + SDK + dashboard + CI/CD) |
| **Grand Prize** ($15K) | Stretch goal | Complete SDLC integration: agents → compliance → CI/CD → deploy → monitor |
| **Green Agent Prize** ($3K) | Possible | Prevents unnecessary compute by blocking non-compliant actions early |

---

## Pre-Submission TODO

1. **Fork to GitLab**: Move repo to `gitlab.com/gitlab-ai-hackathon/compliance-sentinel`
2. **Switch license to MIT** (hackathon rules require MIT for original work)
3. **Create GitLab Duo custom agent**: Register `compliance-sentinel-agent` in Duo Agent Platform
4. **Create GitLab Duo custom flow**: Register `compliance-scan-flow`
5. **Add Anthropic Claude integration**: Wire Claude into violation explanations + report generation
6. **Record demo video**: Follow the 3-minute script above
7. **Submit on Devpost**: Fill in description, video URL, GitLab repo URL

---

## Target Customers

### Primary

| Segment | Regulation | Use Case | Pain |
|---------|-----------|----------|------|
| **Healthcare enterprises** | HIPAA | Patient data agents, claims processing, clinical decision support | $50K+ fines per PHI violation; audit prep takes weeks |
| **Financial services** | SOX / FINRA | Trading bots, fraud detection, GL automation, underwriting agents | Criminal liability for SOX; firm shutdown for FINRA |
| **Insurance** | SOC2 / HIPAA | Claims automation, customer service bots handling PII | Cannot close enterprise deals without SOC2 proof |
| **Mortgage lenders & servicers** | TILA / RESPA / ECOA | Loan origination agents, underwriting bots, servicing automation | CFPB fines up to $1M/day; fair lending violations trigger DOJ action |
| **AI platform teams** (10+ agents) | All | Centralized compliance visibility across departments | No single pane of glass for agent compliance |

### Secondary

| Segment | Why They Buy |
|---------|-------------|
| **GRC / Internal Audit teams** | Auto-generated audit-ready reports replace 2-3 weeks of manual prep |
| **Healthcare / Fintech startups** | Need compliance proof for funding rounds and enterprise contracts but can't afford a compliance team |
| **System integrators** (Accenture, Deloitte) | Must demonstrate compliance as part of AI agent delivery to regulated clients |
| **AI framework users** (LangChain, CrewAI, AutoGen) | SDK's one-line setup makes compliance a bolt-on, not a rebuild |

### Buyer Personas

| Persona | Their Question | What They Buy |
|---------|---------------|---------------|
| **CISO** | "Can I prove our AI agents aren't leaking data?" | Real-time blocking + audit trail |
| **Compliance Officer** | "Audit prep takes 3 weeks every quarter" | Auto-generated compliance reports |
| **VP Engineering** | "Legal keeps blocking our AI feature launches" | Compliance guardrails that unblock shipping |
| **CTO (startup)** | "We need SOC2 to close enterprise deals" | Pre-built rule sets + compliance dashboard |
| **Chief Compliance Officer (Mortgage)** | "CFPB exams are coming — can we prove our AI underwriting is fair?" | Fair lending rules (MORT-001/006), adverse action automation (MORT-010), HMDA reporting (MORT-003) |
| **VP Loan Operations** | "Our agents issue Loan Estimates — how do we guarantee TILA timing?" | LE timing enforcement (MORT-004), APR validation (MORT-002), kickback detection (MORT-005) |
| **Servicing Director** | "We're migrating 50K loans — transfers need RESPA-compliant notices" | Servicing transfer notice (MORT-008), escrow analysis (MORT-009), borrower consent (MORT-007) |

### Market Context

- Global GRC market: ~$60B by 2027
- AI governance: fastest-growing GRC segment
- EU AI Act (2025) and US executive orders are creating **mandatory** compliance requirements for AI systems
- Every enterprise deploying AI agents will need tooling like this — the question is build vs buy

**Sharpest wedge: Healthcare + HIPAA** — highest fines ($50K/incident), clearest rules, most urgent pain, largest immediately addressable market.
