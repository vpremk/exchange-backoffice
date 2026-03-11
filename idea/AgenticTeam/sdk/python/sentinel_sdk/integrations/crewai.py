"""CrewAI event handler for Compliance Sentinel.

Usage::

    from sentinel_sdk.integrations import SentinelCrewAIHandler
    handler = SentinelCrewAIHandler(sentinel)

    # Manually instrument CrewAI tasks
    handler.on_task_start(task_name="research", agent_name="researcher")
    # ... task runs ...
    handler.on_task_end(task_name="research", output="research results")

Works with CrewAI v0.28+ and any version that exposes task lifecycle events.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("sentinel_sdk.integrations.crewai")


class SentinelCrewAIHandler:
    """Instruments CrewAI crew/task execution with Sentinel tracing."""

    def __init__(self, sentinel: Any, trace_name: str = "crewai"):
        self.sentinel = sentinel
        self.trace_name = trace_name
        self._trace = None

    # ── Crew lifecycle ────────────────────────────────────────────────

    def on_crew_start(self, crew_name: str, attributes: Optional[Dict[str, Any]] = None) -> None:
        self._trace = self.sentinel._tracer.start_trace(self.trace_name)
        self._trace.start_span(f"crew:{crew_name}", attributes={
            "framework": "crewai",
            "crew_name": crew_name,
            **(attributes or {}),
        })

    def on_crew_end(self, output: Optional[str] = None) -> None:
        if self._trace:
            if output and self._trace.current_span:
                self._trace.current_span.set_attribute("output_preview", output[:500])
            self._trace.end_span()
            self.sentinel.flush()
            self._trace = None

    # ── Task lifecycle ────────────────────────────────────────────────

    def on_task_start(
        self,
        task_name: str,
        agent_name: str = "",
        attributes: Optional[Dict[str, Any]] = None,
    ) -> None:
        if self._trace is None:
            self._trace = self.sentinel._tracer.start_trace(self.trace_name)
        self._trace.start_span(f"task:{task_name}", attributes={
            "framework": "crewai",
            "task_name": task_name,
            "agent_name": agent_name,
            **(attributes or {}),
        })

    def on_task_end(
        self,
        task_name: str,
        output: Optional[str] = None,
    ) -> None:
        if self._trace:
            if output and self._trace.current_span:
                self._trace.current_span.set_attribute("output_preview", output[:500])
            self._trace.end_span()

    def on_task_error(self, task_name: str, error: Exception) -> None:
        if self._trace and self._trace.current_span:
            self._trace.current_span.set_error(error)
            self._trace.end_span()

    # ── LLM call tracking ─────────────────────────────────────────────

    def on_llm_call(
        self,
        model: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        attributes: Optional[Dict[str, Any]] = None,
    ) -> None:
        if self._trace:
            with self._trace.span("llm-call", attributes={
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "framework": "crewai",
                **(attributes or {}),
            }):
                self.sentinel.track_cost(
                    model=model,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                )
