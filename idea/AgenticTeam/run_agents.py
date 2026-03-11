"""Run the full agentic SDLC pipeline."""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from agents.research_agent.research_agent import ResearchAgent
from agents.coding_agent.coding_agent import CodingAgent
from agents.testing_agent.testing_agent import TestingAgent
from agents.build_agent.build_agent import BuildAgent
from agents.deploy_agent.deploy_agent import DeployAgent
from agents.observability_agent.observability_agent import ObservabilityAgent
from orchestration.agent_orchestrator import AgentOrchestrator


def main():
    orchestrator = AgentOrchestrator()
    orchestrator.register_agent(ResearchAgent())
    orchestrator.register_agent(CodingAgent())
    orchestrator.register_agent(TestingAgent())
    orchestrator.register_agent(BuildAgent())
    orchestrator.register_agent(DeployAgent())
    orchestrator.register_agent(ObservabilityAgent())
    orchestrator.run_pipeline()


if __name__ == "__main__":
    main()
