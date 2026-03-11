# SPDX-License-Identifier: Apache-2.0
# Copyright 2025 Compliance Sentinel Contributors

"""OpenTelemetry-based tracing for Compliance Sentinel.

Provides lightweight span creation that collects attributes, timing, and
nesting, then serialises to the Sentinel trace format for batch submission.
"""

from __future__ import annotations

import time
import uuid
from contextlib import contextmanager
from typing import Any, Dict, List, Optional


class SentinelSpan:
    """A single span within a trace."""

    def __init__(
        self,
        name: str,
        trace_id: str,
        parent_id: Optional[str] = None,
        attributes: Optional[Dict[str, Any]] = None,
    ):
        self.span_id: str = uuid.uuid4().hex[:16]
        self.trace_id: str = trace_id
        self.parent_id: Optional[str] = parent_id
        self.name: str = name
        self.attributes: Dict[str, Any] = dict(attributes or {})
        self.start_time: float = time.time()
        self.end_time: Optional[float] = None
        self.status: str = "OK"
        self.events: List[Dict[str, Any]] = []
        self.children: List[SentinelSpan] = []

    def set_attribute(self, key: str, value: Any) -> None:
        self.attributes[key] = value

    def add_event(self, name: str, attributes: Optional[Dict[str, Any]] = None) -> None:
        self.events.append({
            "name": name,
            "timestamp": time.time(),
            "attributes": attributes or {},
        })

    def set_error(self, error: Exception) -> None:
        self.status = "ERROR"
        self.attributes["error.type"] = type(error).__name__
        self.attributes["error.message"] = str(error)

    def end(self) -> None:
        if self.end_time is None:
            self.end_time = time.time()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "span_id": self.span_id,
            "trace_id": self.trace_id,
            "parent_id": self.parent_id,
            "name": self.name,
            "attributes": self.attributes,
            "start_time": self.start_time,
            "end_time": self.end_time or time.time(),
            "duration_ms": round(((self.end_time or time.time()) - self.start_time) * 1000, 3),
            "status": self.status,
            "events": self.events,
        }


class SentinelTrace:
    """A collection of spans representing one agent execution."""

    def __init__(self, name: str, trace_id: Optional[str] = None):
        self.trace_id: str = trace_id or uuid.uuid4().hex
        self.name: str = name
        self.spans: List[SentinelSpan] = []
        self._span_stack: List[SentinelSpan] = []

    @property
    def current_span(self) -> Optional[SentinelSpan]:
        return self._span_stack[-1] if self._span_stack else None

    def start_span(
        self,
        name: str,
        attributes: Optional[Dict[str, Any]] = None,
    ) -> SentinelSpan:
        parent = self.current_span
        span = SentinelSpan(
            name=name,
            trace_id=self.trace_id,
            parent_id=parent.span_id if parent else None,
            attributes=attributes,
        )
        if parent:
            parent.children.append(span)
        self.spans.append(span)
        self._span_stack.append(span)
        return span

    def end_span(self) -> Optional[SentinelSpan]:
        if self._span_stack:
            span = self._span_stack.pop()
            span.end()
            return span
        return None

    @contextmanager
    def span(self, name: str, attributes: Optional[Dict[str, Any]] = None):
        """Context manager that auto-starts and ends a span."""
        s = self.start_span(name, attributes)
        try:
            yield s
        except Exception as exc:
            s.set_error(exc)
            raise
        finally:
            self.end_span()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "name": self.name,
            "spans": [s.to_dict() for s in self.spans],
        }


class SentinelTracer:
    """Manages traces and pending span data for batch flushing."""

    def __init__(self):
        self._traces: List[SentinelTrace] = []
        self._active_trace: Optional[SentinelTrace] = None

    def start_trace(self, name: str) -> SentinelTrace:
        trace = SentinelTrace(name)
        self._traces.append(trace)
        self._active_trace = trace
        return trace

    @property
    def active_trace(self) -> Optional[SentinelTrace]:
        return self._active_trace

    def collect_and_reset(self) -> List[Dict[str, Any]]:
        """Return all completed traces as dicts and reset the buffer."""
        result = [t.to_dict() for t in self._traces]
        self._traces = []
        self._active_trace = None
        return result
