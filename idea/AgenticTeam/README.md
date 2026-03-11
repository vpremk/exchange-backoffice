# AgenticTeam

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

An agentic SDLC pipeline with specialized agents for research, coding, testing, building, deploying, and observability.

## Architecture

```
Research → Coding → Testing → Build → Deploy → Observability
```

Each agent receives a shared `context` dictionary from the previous stage, enriches it with its outputs, and passes it forward through the orchestrator.

## Project Structure

```
agents/
  research_agent/       # Gathers requirements and market analysis
  coding_agent/         # Generates source code from requirements
  testing_agent/        # Runs Gherkin BDD tests via behave
  build_agent/          # Packages build artifacts
  deploy_agent/         # Deploys to staging/production
  observability_agent/  # Monitors deployments and collects metrics
orchestration/
  agent_orchestrator.py # Coordinates agent execution
  permissions.yaml      # Agent read/write permissions
  workflows/
    sdlc_pipeline.yaml  # Pipeline stage definitions
tests/
  features/
    pipeline.feature        # 7 scenarios covering all agents
    hello_endpoint.feature  # 2 scenarios for the Express API
    steps/                  # Step definitions
ci/
  ci_pipeline.yaml      # CI configuration
deployment/
  staging.yaml          # Staging deploy config
  production.yaml       # Production deploy config
src/
  index.js              # Express server entry point
  routes/hello.js       # GET /hello endpoint
```

## Quick Start

### Run the Express Server

```bash
npm install
npm start
```

Endpoints:
- `GET /` — App status
- `GET /hello` — Returns `{"message": "Hello, Neo!"}`

### Run the Agent Pipeline

```bash
python3 run_agents.py
```

Runs all 6 agents sequentially through the SDLC pipeline and prints a report.

### Run the Gherkin Tests

```bash
pip install behave
python3 -m behave tests/features/
```

Runs 9 scenarios (39 steps) covering pipeline execution and API endpoints.

## Pipeline Stages

| Stage | Agent | Input | Output |
|-------|-------|-------|--------|
| Research | `research_agent` | — | Requirements list, research notes |
| Coding | `coding_agent` | Requirements | Source files, LOC count |
| Testing | `testing_agent` | Source files | Test results (via behave) |
| Build | `build_agent` | Source files, LOC | Versioned artifact |
| Deploy | `deploy_agent` | Build artifact | Deployment status |
| Observe | `observability_agent` | Deployment status | Uptime, error rate, resource usage |

## Further Reading

- [SKILLS.md](SKILLS.md) — Detailed agent skills, tools, inputs/outputs, and Gherkin test specs
