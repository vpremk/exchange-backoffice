"""Agent Orchestrator - Coordinates the execution of all agents in the SDLC pipeline."""

import time


class AgentOrchestrator:
    def __init__(self):
        self.agents = []

    def register_agent(self, agent):
        self.agents.append(agent)

    def run_pipeline(self):
        context = {"report": []}
        start = time.time()
        print("=" * 60)
        print("  AGENTIC TEAM — SDLC PIPELINE")
        print("=" * 60)
        for agent in self.agents:
            print(f"\n▶ Running {agent.name}...", flush=True)
            context = agent.run(context)
            entry = context["report"][-1]
            print(f"  ✔ {entry['output']} ({entry['duration_s']}s)", flush=True)

        total = round(time.time() - start, 3)

        # Print behave output if available
        if "test_results" in context and "behave_output" in context["test_results"]:
            print("\n" + "-" * 60)
            print("  GHERKIN TEST OUTPUT")
            print("-" * 60)
            print(context["test_results"]["behave_output"])

        print("=" * 60)
        print("  PIPELINE REPORT")
        print("=" * 60)
        for entry in context["report"]:
            print(f"  [{entry['status'].upper():>7}] {entry['agent']:<22} {entry['output']}")
        print(f"\n  Total pipeline time: {total}s")
        print(f"  Agents executed: {len(context['report'])}")
        print("=" * 60, flush=True)
        return context
