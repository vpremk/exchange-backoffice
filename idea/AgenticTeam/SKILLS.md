# Agent Skills Reference

Each agent in the pipeline has specific skills, tools, and responsibilities.

---

## Research Agent

**Role:** Planner
**Stage:** 1 — Requirements Gathering

| Skill | Description |
|-------|-------------|
| Web Search | Searches for market data and competitor analysis |
| Market Analysis | Evaluates market fit and generates research notes |
| Requirements Generation | Produces a structured list of requirements |

**Inputs:** None (entry point)
**Outputs:** `requirements`, `research_notes`

**Config:** `agents/research_agent/config.yaml`
**Implementation:** `agents/research_agent/research_agent.py`

---

## Coding Agent

**Role:** Executor
**Stage:** 2 — Code Generation

| Skill | Description |
|-------|-------------|
| Code Generation | Generates source modules from requirements |
| Code Review | Reviews generated code for quality |
| LOC Estimation | Calculates lines of code per module |

**Inputs:** `requirements`
**Outputs:** `source_files`, `lines_of_code`

**Config:** `agents/coding_agent/config.yaml`
**Implementation:** `agents/coding_agent/coding_agent.py`

---

## Testing Agent

**Role:** Validator
**Stage:** 3 — BDD Testing

| Skill | Description |
|-------|-------------|
| Gherkin Test Execution | Runs `.feature` files using `behave` |
| Result Parsing | Extracts pass/fail/skip counts from behave output |
| Coverage Reporting | Reports test coverage metrics |

**Inputs:** `source_files`
**Outputs:** `test_results` (total, passed, failed, skipped, behave_output)

**Config:** `agents/testing_agent/config.yaml`
**Implementation:** `agents/testing_agent/testing_agent.py`

### Gherkin Features

**`tests/features/pipeline.feature`** — 7 scenarios:

```gherkin
Scenario: Full pipeline runs successfully
  Given the pipeline is initialized with all agents
  When the pipeline is executed
  Then all 6 agents should have run
  And every agent should report success

Scenario: Research agent produces requirements
Scenario: Coding agent generates source files
Scenario: Testing agent validates code
Scenario: Build agent creates artifact
Scenario: Deploy agent deploys to staging
Scenario: Observability agent monitors deployment
```

**`tests/features/hello_endpoint.feature`** — 2 scenarios:

```gherkin
Scenario: Hello endpoint returns Neo greeting
  Given the Express server is running on port 3000
  When I send a GET request to "/hello"
  Then the response should contain "Hello, Neo!"

Scenario: Root endpoint returns app status
  Given the Express server is running on port 3000
  When I send a GET request to "/"
  Then the response should contain "Agentic Team App is running"
```

---

## Build Agent

**Role:** Executor
**Stage:** 4 — Artifact Creation

| Skill | Description |
|-------|-------------|
| Build Runner | Compiles and bundles source files |
| Artifact Manager | Creates versioned, hashed build artifacts |
| Size Estimation | Calculates artifact size from LOC |

**Inputs:** `source_files`, `lines_of_code`
**Outputs:** `build_artifact` (name, size_kb, files_bundled)

**Config:** `agents/build_agent/config.yaml`
**Implementation:** `agents/build_agent/build_agent.py`

---

## Deploy Agent

**Role:** Executor
**Stage:** 5 — Deployment

| Skill | Description |
|-------|-------------|
| Deployment Manager | Deploys artifacts to target environments |
| Rollback Handler | Manages rollback on deployment failure |
| Health Verification | Confirms deployment health status |

**Inputs:** `build_artifact`
**Outputs:** `deployment_status` (environment, artifact, replicas, health)

**Config:** `agents/deploy_agent/config.yaml`
**Implementation:** `agents/deploy_agent/deploy_agent.py`

**Environments:**
- **Staging** (`deployment/staging.yaml`) — Rolling strategy, 2 replicas
- **Production** (`deployment/production.yaml`) — Blue-green strategy, 4 replicas

---

## Observability Agent

**Role:** Monitor
**Stage:** 6 — Monitoring

| Skill | Description |
|-------|-------------|
| Log Analyzer | Analyzes application logs for anomalies |
| Metrics Collector | Gathers CPU, memory, response time metrics |
| Uptime Monitor | Tracks availability and error rates |

**Inputs:** `deployment_status`
**Outputs:** `observability_report` (uptime, avg_response_ms, error_rate, cpu_usage, memory_usage)

**Config:** `agents/observability_agent/config.yaml`
**Implementation:** `agents/observability_agent/observability_agent.py`

---

## Pipeline Orchestrator

**Role:** Coordinator
**Implementation:** `orchestration/agent_orchestrator.py`

| Skill | Description |
|-------|-------------|
| Agent Registration | Registers agents in execution order |
| Sequential Execution | Runs agents stage-by-stage with shared context |
| Report Generation | Produces a summary report with per-agent status and timing |

**Workflow:** `orchestration/workflows/sdlc_pipeline.yaml`
**Permissions:** `orchestration/permissions.yaml`
