# SPDX-License-Identifier: Apache-2.0
# Copyright 2025 Compliance Sentinel Contributors

"""Compliance Sentinel Python SDK — one-line setup for AI agent compliance.

Usage::

    from sentinel_sdk import Sentinel

    sentinel = Sentinel(
        endpoint="https://sentinel.internal.company.com",
        api_key="sk-...",
        tenant="healthcare-division",
        regulations=["HIPAA", "SOC2"],
    )

    @sentinel.trace(name="patient-lookup-agent")
    def lookup_patient(patient_id: str):
        ...

    with sentinel.span("llm-call", attributes={"model": "claude-sonnet-4"}):
        response = client.messages.create(...)
"""

from __future__ import annotations

import atexit
import logging
import threading
import time
from contextlib import contextmanager
from typing import Any, Callable, Dict, List, Optional, Sequence

from sentinel_sdk.buffer import DiskBuffer
from sentinel_sdk.client import SentinelClient
from sentinel_sdk.cost import CostTracker
from sentinel_sdk.tracer import SentinelTracer

__version__ = "0.1.0"
__all__ = ["Sentinel", "ComplianceBlockedError"]

logger = logging.getLogger("sentinel_sdk")


class ComplianceBlockedError(Exception):
    """Raised when an agent action is blocked by compliance policy."""

    def __init__(self, messages: List[str]):
        self.messages = messages
        super().__init__("; ".join(messages))


class Sentinel:
    """Main entry point for the Compliance Sentinel SDK.

    Parameters
    ----------
    endpoint : str
        URL of the Sentinel backend (e.g. ``https://sentinel.internal.co``).
    api_key : str
        API key for authentication.
    tenant : str
        Tenant / org identifier.
    regulations : list of str, optional
        Which regulatory rule sets to evaluate (e.g. ``["HIPAA", "SOC2"]``).
    buffer_dir : str, optional
        Directory for offline disk buffering.  Defaults to a temp directory.
    flush_interval : float
        Seconds between automatic background flushes.  0 = manual only.
    enabled : bool
        Set to False to disable all SDK behaviour (no-op mode).
    """

    def __init__(
        self,
        endpoint: str = "",
        api_key: str = "",
        tenant: str = "default",
        regulations: Optional[List[str]] = None,
        buffer_dir: Optional[str] = None,
        flush_interval: float = 30.0,
        enabled: bool = True,
    ):
        self.endpoint = endpoint
        self.tenant = tenant
        self.regulations = regulations or []
        self.enabled = enabled

        self._client = SentinelClient(endpoint, api_key, tenant) if endpoint else None
        self._tracer = SentinelTracer()
        self._cost_tracker = CostTracker()
        self._buffer = DiskBuffer(buffer_dir)
        self._lock = threading.Lock()
        self._flush_interval = flush_interval
        self._bg_thread: Optional[threading.Thread] = None

        if enabled and flush_interval > 0 and endpoint:
            self._start_background_flush()
            atexit.register(self.shutdown)

    # ------------------------------------------------------------------
    # Tracing: decorator
    # ------------------------------------------------------------------

    def trace(
        self,
        name: Optional[str] = None,
        attributes: Optional[Dict[str, Any]] = None,
    ) -> Callable:
        """Decorator that wraps a function in a Sentinel trace.

        ::

            @sentinel.trace(name="my-agent")
            def my_agent():
                ...
        """
        from sentinel_sdk.decorators import trace as _trace
        return _trace(self, name=name, attributes=attributes)

    # ------------------------------------------------------------------
    # Tracing: context manager
    # ------------------------------------------------------------------

    @contextmanager
    def span(
        self,
        name: str,
        attributes: Optional[Dict[str, Any]] = None,
    ):
        """Context manager that creates a span within the active trace.

        ::

            with sentinel.span("llm-call", attributes={"model": "claude-sonnet-4"}):
                ...
        """
        if not self.enabled:
            yield None
            return

        tr = self._tracer.active_trace
        if tr is None:
            tr = self._tracer.start_trace(name)

        with tr.span(name, attributes=attributes) as s:
            yield s

    # ------------------------------------------------------------------
    # Compliance check
    # ------------------------------------------------------------------

    def check_compliance(
        self,
        action: str,
        attributes: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Run a real-time compliance check before performing an action.

        Returns a dict with ``blocked``, ``violations``, ``block_messages``.
        """
        if not self.enabled or not self._client:
            return {"blocked": False, "violations": [], "block_messages": []}

        attrs = dict(attributes or {})
        attrs["action"] = action
        if self.regulations:
            attrs["regulations"] = self.regulations
        return self._client.check_compliance(attrs)

    # ------------------------------------------------------------------
    # Compliant decorator
    # ------------------------------------------------------------------

    def compliant(
        self,
        action: str,
        attributes: Optional[Dict[str, Any]] = None,
    ) -> Callable:
        """Decorator that checks compliance before executing.

        ::

            @sentinel.compliant(action="access_phi", attributes={"data_category": "PHI"})
            def read_patient():
                ...
        """
        from sentinel_sdk.decorators import compliant as _compliant
        return _compliant(self, action=action, attributes=attributes)

    # ------------------------------------------------------------------
    # Cost tracking
    # ------------------------------------------------------------------

    def track_cost(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
    ) -> Dict[str, Any]:
        """Record an LLM invocation cost.  Returns the cost event dict."""
        event = self._cost_tracker.track(model, input_tokens, output_tokens)
        return event.to_dict()

    def set_pricing(self, model: str, input_per_1m: float, output_per_1m: float) -> None:
        """Override or add pricing for a model."""
        self._cost_tracker.set_pricing(model, input_per_1m, output_per_1m)

    @property
    def total_cost(self) -> float:
        return self._cost_tracker.total_cost

    # ------------------------------------------------------------------
    # Flush / buffer
    # ------------------------------------------------------------------

    def flush(self) -> Dict[str, Any]:
        """Send all pending traces and cost events to the backend.

        If the backend is unreachable, data is buffered to disk.
        """
        if not self.enabled:
            return {"status": "disabled"}

        with self._lock:
            traces = self._tracer.collect_and_reset()
            costs = self._cost_tracker.collect_and_reset()

        if not traces and not costs:
            return {"status": "empty"}

        # Try sending to backend
        if self._client:
            result = self._client.send_traces(traces)
            if result.get("error"):
                # Buffer to disk for later retry
                self._buffer.append({"traces": traces, "costs": costs})
                return {"status": "buffered", "error": result["error"]}

            if costs:
                self._client.send_cost_events(costs)

            return {"status": "sent", "traces": len(traces), "costs": len(costs)}
        else:
            self._buffer.append({"traces": traces, "costs": costs})
            return {"status": "buffered"}

    def flush_buffer(self) -> Dict[str, Any]:
        """Retry sending all disk-buffered data to the backend."""
        if not self._client:
            return {"status": "no_client"}

        items = self._buffer.drain()
        if not items:
            return {"status": "empty"}

        sent = 0
        failed = 0
        for item in items:
            result = self._client.send_traces(item.get("traces", []))
            if result.get("error"):
                self._buffer.append(item)
                failed += 1
            else:
                sent += 1
                costs = item.get("costs", [])
                if costs:
                    self._client.send_cost_events(costs)

        return {"status": "flushed", "sent": sent, "failed": failed}

    # ------------------------------------------------------------------
    # Background flush
    # ------------------------------------------------------------------

    def _start_background_flush(self) -> None:
        self._stop_event = threading.Event()

        def _worker():
            while not self._stop_event.wait(self._flush_interval):
                try:
                    self.flush()
                    if not self._buffer.is_empty:
                        self.flush_buffer()
                except Exception as exc:
                    logger.debug("Background flush error: %s", exc)

        self._bg_thread = threading.Thread(target=_worker, daemon=True, name="sentinel-flush")
        self._bg_thread.start()

    def shutdown(self) -> None:
        """Flush remaining data and stop the background thread."""
        if hasattr(self, "_stop_event"):
            self._stop_event.set()
        self.flush()
        if self._bg_thread and self._bg_thread.is_alive():
            self._bg_thread.join(timeout=5)
