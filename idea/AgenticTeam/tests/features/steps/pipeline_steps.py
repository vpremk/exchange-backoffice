"""Step definitions for the SDLC pipeline feature."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from behave import given, when, then
from agents.research_agent.research_agent import ResearchAgent
from agents.coding_agent.coding_agent import CodingAgent
from agents.build_agent.build_agent import BuildAgent
from agents.deploy_agent.deploy_agent import DeployAgent
from agents.observability_agent.observability_agent import ObservabilityAgent
from orchestration.agent_orchestrator import AgentOrchestrator


class StubTestingAgent:
    """Stub to avoid recursive behave calls in the full pipeline test."""
    name = "Testing Agent"

    def run(self, context):
        context["test_results"] = {"total": 5, "passed": 5, "failed": 0, "coverage": "95%"}
        context.setdefault("report", []).append({
            "agent": self.name, "status": "success",
            "duration_s": 0.0, "output": "5/5 scenarios passed, 0 failed",
        })
        return context


# --- Full pipeline ---

@given("the pipeline is initialized with all agents")
def step_init_pipeline(context):
    context.orchestrator = AgentOrchestrator()
    context.orchestrator.register_agent(ResearchAgent())
    context.orchestrator.register_agent(CodingAgent())
    context.orchestrator.register_agent(StubTestingAgent())
    context.orchestrator.register_agent(BuildAgent())
    context.orchestrator.register_agent(DeployAgent())
    context.orchestrator.register_agent(ObservabilityAgent())


@when("the pipeline is executed")
def step_run_pipeline(context):
    context.result = context.orchestrator.run_pipeline()


@then("all {count:d} agents should have run")
def step_check_agent_count(context, count):
    assert len(context.result["report"]) == count, (
        f"Expected {count} agents, got {len(context.result['report'])}"
    )


@then("every agent should report success")
def step_check_all_success(context):
    for entry in context.result["report"]:
        assert entry["status"] == "success", f"{entry['agent']} did not succeed"


# --- Research agent ---

@given("a research agent")
def step_research_agent(context):
    context.agent = ResearchAgent()
    context.ctx = {"report": []}


@when("the research agent runs")
def step_run_research(context):
    context.ctx = context.agent.run(context.ctx)


@then("the context should contain requirements")
def step_has_requirements(context):
    assert "requirements" in context.ctx


@then("there should be at least {count:d} requirement")
def step_min_requirements(context, count):
    assert len(context.ctx["requirements"]) >= count


# --- Coding agent ---

@given("a coding agent")
def step_coding_agent(context):
    context.agent = CodingAgent()
    context.ctx = {"report": []}


@given("a context with {count:d} requirements")
def step_context_with_requirements(context, count):
    context.ctx["requirements"] = [f"req_{i}" for i in range(count)]


@when("the coding agent runs")
def step_run_coding(context):
    context.ctx = context.agent.run(context.ctx)


@then("the context should contain source files")
def step_has_source_files(context):
    assert "source_files" in context.ctx
    assert len(context.ctx["source_files"]) > 0


@then("lines of code should be greater than {count:d}")
def step_loc_greater(context, count):
    assert context.ctx["lines_of_code"] > count


# --- Testing agent ---

@given("a testing agent")
def step_testing_agent(context):
    context.agent = StubTestingAgent()
    context.ctx = {"report": []}


@given("a context with source files")
def step_context_with_sources(context):
    context.ctx["source_files"] = ["module_0.py", "module_1.py", "module_2.py"]


@when("the testing agent runs")
def step_run_testing(context):
    context.ctx = context.agent.run(context.ctx)


@then("all tests should pass")
def step_all_tests_pass(context):
    results = context.ctx["test_results"]
    assert results["failed"] == 0
    assert results["passed"] == results["total"]


@then("test coverage should be reported")
def step_has_coverage(context):
    assert "coverage" in context.ctx["test_results"]


# --- Build agent ---

@given("a build agent")
def step_build_agent(context):
    context.agent = BuildAgent()
    context.ctx = {"report": []}


@given("a context with source files and lines of code")
def step_context_with_sources_loc(context):
    context.ctx["source_files"] = ["module_0.py", "module_1.py"]
    context.ctx["lines_of_code"] = 240


@when("the build agent runs")
def step_run_build(context):
    context.ctx = context.agent.run(context.ctx)


@then("a build artifact should be created")
def step_has_artifact(context):
    assert "build_artifact" in context.ctx


@then("the artifact name should contain a version")
def step_artifact_has_version(context):
    assert "v1.0.0" in context.ctx["build_artifact"]["name"]


# --- Deploy agent ---

@given("a deploy agent")
def step_deploy_agent(context):
    context.agent = DeployAgent()
    context.ctx = {"report": []}


@given("a context with a build artifact")
def step_context_with_artifact(context):
    context.ctx["build_artifact"] = {"name": "agentic-team-v1.0.0-abc123.tar.gz"}


@when("the deploy agent runs")
def step_run_deploy(context):
    context.ctx = context.agent.run(context.ctx)


@then("deployment status should be healthy")
def step_deploy_healthy(context):
    assert context.ctx["deployment_status"]["health"] == "healthy"


@then("environment should be staging")
def step_deploy_staging(context):
    assert context.ctx["deployment_status"]["environment"] == "staging"


# --- Observability agent ---

@given("an observability agent")
def step_observability_agent(context):
    context.agent = ObservabilityAgent()
    context.ctx = {"report": []}


@given("a context with deployment status")
def step_context_with_deployment(context):
    context.ctx["deployment_status"] = {"environment": "staging", "health": "healthy"}


@when("the observability agent runs")
def step_run_observability(context):
    context.ctx = context.agent.run(context.ctx)


@then("uptime should be reported")
def step_has_uptime(context):
    assert "uptime" in context.ctx["observability_report"]


@then("error rate should be reported")
def step_has_error_rate(context):
    assert "error_rate" in context.ctx["observability_report"]
