"""LangChain callback handler for Compliance Sentinel.

Usage::

    from sentinel_sdk.integrations import SentinelLangChainCallback
    callback = SentinelLangChainCallback(sentinel)
    chain.invoke(input, config={"callbacks": [callback]})

Compatible with LangChain v0.2+ callback protocol.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger("sentinel_sdk.integrations.langchain")

try:
    from langchain_core.callbacks import BaseCallbackHandler
except ImportError:
    # Provide a stub so the module can be imported without langchain installed
    class BaseCallbackHandler:  # type: ignore[no-redef]
        pass


class SentinelLangChainCallback(BaseCallbackHandler):
    """Instruments LangChain runs with Sentinel tracing and compliance."""

    def __init__(self, sentinel: Any, trace_name: str = "langchain"):
        self.sentinel = sentinel
        self.trace_name = trace_name
        self._trace = None

    # ── LLM events ────────────────────────────────────────────────────

    def on_llm_start(
        self,
        serialized: Dict[str, Any],
        prompts: List[str],
        *,
        run_id: Any = None,
        **kwargs: Any,
    ) -> None:
        if self._trace is None:
            self._trace = self.sentinel._tracer.start_trace(self.trace_name)
        model = serialized.get("kwargs", {}).get("model_name", "unknown")
        self._trace.start_span("llm-call", attributes={
            "model": model,
            "prompt_count": len(prompts),
            "framework": "langchain",
        })

    def on_llm_end(self, response: Any, **kwargs: Any) -> None:
        if self._trace:
            span = self._trace.current_span
            if span and hasattr(response, "llm_output") and response.llm_output:
                usage = response.llm_output.get("token_usage", {})
                if usage:
                    span.set_attribute("input_tokens", usage.get("prompt_tokens", 0))
                    span.set_attribute("output_tokens", usage.get("completion_tokens", 0))
                    model = span.attributes.get("model", "unknown")
                    self.sentinel.track_cost(
                        model=model,
                        input_tokens=usage.get("prompt_tokens", 0),
                        output_tokens=usage.get("completion_tokens", 0),
                    )
            self._trace.end_span()

    def on_llm_error(self, error: Union[Exception, KeyboardInterrupt], **kwargs: Any) -> None:
        if self._trace and self._trace.current_span:
            if isinstance(error, Exception):
                self._trace.current_span.set_error(error)
            self._trace.end_span()

    # ── Chain events ──────────────────────────────────────────────────

    def on_chain_start(
        self,
        serialized: Dict[str, Any],
        inputs: Dict[str, Any],
        **kwargs: Any,
    ) -> None:
        if self._trace is None:
            self._trace = self.sentinel._tracer.start_trace(self.trace_name)
        chain_name = serialized.get("name", serialized.get("id", ["chain"])[-1])
        self._trace.start_span(f"chain:{chain_name}", attributes={
            "framework": "langchain",
            "chain_type": chain_name,
        })

    def on_chain_end(self, outputs: Dict[str, Any], **kwargs: Any) -> None:
        if self._trace:
            self._trace.end_span()

    def on_chain_error(self, error: Union[Exception, KeyboardInterrupt], **kwargs: Any) -> None:
        if self._trace and self._trace.current_span:
            if isinstance(error, Exception):
                self._trace.current_span.set_error(error)
            self._trace.end_span()

    # ── Tool events ───────────────────────────────────────────────────

    def on_tool_start(
        self,
        serialized: Dict[str, Any],
        input_str: str,
        **kwargs: Any,
    ) -> None:
        if self._trace is None:
            self._trace = self.sentinel._tracer.start_trace(self.trace_name)
        tool_name = serialized.get("name", "tool")
        self._trace.start_span(f"tool:{tool_name}", attributes={
            "framework": "langchain",
            "tool_name": tool_name,
        })

    def on_tool_end(self, output: str, **kwargs: Any) -> None:
        if self._trace:
            self._trace.end_span()

    def on_tool_error(self, error: Union[Exception, KeyboardInterrupt], **kwargs: Any) -> None:
        if self._trace and self._trace.current_span:
            if isinstance(error, Exception):
                self._trace.current_span.set_error(error)
            self._trace.end_span()

    # ── Flush ─────────────────────────────────────────────────────────

    def flush(self) -> None:
        """Manually flush traces to the Sentinel backend."""
        self.sentinel.flush()
        self._trace = None
