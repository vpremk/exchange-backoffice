"""Comprehensive tests for the Compliance Sentinel Python SDK."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sentinel_sdk import ComplianceBlockedError, Sentinel
from sentinel_sdk.buffer import DiskBuffer
from sentinel_sdk.client import SentinelClient
from sentinel_sdk.cost import CostEvent, CostTracker, MODEL_PRICING
from sentinel_sdk.tracer import SentinelSpan, SentinelTrace, SentinelTracer


# ===========================================================================
# Sentinel (main entry point)
# ===========================================================================

class TestSentinel:
    def test_init_minimal(self):
        s = Sentinel(enabled=False)
        assert s.enabled is False
        assert s.tenant == "default"

    def test_init_full(self):
        s = Sentinel(
            endpoint="https://sentinel.test",
            api_key="sk-test",
            tenant="test-tenant",
            regulations=["HIPAA", "SOC2"],
            flush_interval=0,
        )
        assert s.endpoint == "https://sentinel.test"
        assert s.tenant == "test-tenant"
        assert s.regulations == ["HIPAA", "SOC2"]

    def test_noop_mode(self):
        s = Sentinel(enabled=False)
        result = s.flush()
        assert result["status"] == "disabled"

        check = s.check_compliance(action="test")
        assert check["blocked"] is False

        with s.span("test") as span:
            assert span is None

    def test_trace_decorator(self):
        s = Sentinel(enabled=True, flush_interval=0)

        @s.trace(name="test-agent")
        def my_agent():
            return 42

        result = my_agent()
        assert result == 42

    def test_span_context_manager(self):
        s = Sentinel(enabled=True, flush_interval=0)
        with s.span("test-span", attributes={"key": "value"}) as span:
            assert span is not None
            assert span.name == "test-span"
            assert span.attributes["key"] == "value"

    def test_nested_spans(self):
        s = Sentinel(enabled=True, flush_interval=0)
        with s.span("outer") as outer:
            with s.span("inner", attributes={"depth": 1}) as inner:
                assert inner.parent_id == outer.span_id

    def test_cost_tracking(self):
        s = Sentinel(enabled=True, flush_interval=0)
        event = s.track_cost(model="claude-sonnet-4", input_tokens=1000, output_tokens=500)
        assert event["model"] == "claude-sonnet-4"
        assert event["total_cost_usd"] > 0
        assert s.total_cost > 0

    def test_flush_collects_traces(self):
        s = Sentinel(enabled=True, flush_interval=0)
        with s.span("test"):
            pass
        result = s.flush()
        # No client configured → buffered
        assert result["status"] == "buffered"


# ===========================================================================
# Tracer
# ===========================================================================

class TestTracer:
    def test_start_trace(self):
        tracer = SentinelTracer()
        trace = tracer.start_trace("test")
        assert trace.name == "test"
        assert len(trace.trace_id) > 0

    def test_span_lifecycle(self):
        tracer = SentinelTracer()
        trace = tracer.start_trace("test")
        span = trace.start_span("operation")
        assert span.name == "operation"
        assert span.end_time is None
        trace.end_span()
        assert span.end_time is not None

    def test_nested_spans(self):
        tracer = SentinelTracer()
        trace = tracer.start_trace("test")
        parent = trace.start_span("parent")
        child = trace.start_span("child")
        assert child.parent_id == parent.span_id
        trace.end_span()  # ends child
        trace.end_span()  # ends parent

    def test_context_manager_span(self):
        tracer = SentinelTracer()
        trace = tracer.start_trace("test")
        with trace.span("ctx-span", attributes={"x": 1}) as s:
            assert s.attributes["x"] == 1
        assert s.end_time is not None

    def test_error_recording(self):
        tracer = SentinelTracer()
        trace = tracer.start_trace("test")
        with pytest.raises(ValueError):
            with trace.span("failing") as s:
                raise ValueError("boom")
        assert s.status == "ERROR"
        assert s.attributes["error.type"] == "ValueError"
        assert s.attributes["error.message"] == "boom"

    def test_collect_and_reset(self):
        tracer = SentinelTracer()
        t = tracer.start_trace("test")
        t.start_span("op")
        t.end_span()
        data = tracer.collect_and_reset()
        assert len(data) == 1
        assert data[0]["name"] == "test"
        assert len(data[0]["spans"]) == 1
        # After reset
        assert tracer.collect_and_reset() == []

    def test_to_dict(self):
        tracer = SentinelTracer()
        trace = tracer.start_trace("test")
        span = trace.start_span("op", attributes={"model": "gpt-4o"})
        span.add_event("token_usage", {"tokens": 100})
        trace.end_span()
        d = trace.to_dict()
        assert d["trace_id"] == trace.trace_id
        assert d["spans"][0]["name"] == "op"
        assert d["spans"][0]["attributes"]["model"] == "gpt-4o"
        assert len(d["spans"][0]["events"]) == 1


# ===========================================================================
# Cost tracker
# ===========================================================================

class TestCostTracker:
    def test_known_model_pricing(self):
        event = CostEvent("claude-sonnet-4", input_tokens=1_000_000, output_tokens=1_000_000)
        assert event.input_cost == 3.00
        assert event.output_cost == 15.00
        assert event.total_cost == 18.00

    def test_prefix_match(self):
        event = CostEvent("claude-sonnet-4-20250514", input_tokens=1_000_000, output_tokens=0)
        assert event.input_cost == 3.00

    def test_unknown_model_zero_cost(self):
        event = CostEvent("my-custom-model", input_tokens=1000, output_tokens=500)
        assert event.total_cost == 0.0

    def test_custom_pricing(self):
        tracker = CostTracker()
        tracker.set_pricing("my-model", input_per_1m=10.0, output_per_1m=20.0)
        event = tracker.track("my-model", input_tokens=500_000, output_tokens=250_000)
        assert event.input_cost == 5.0
        assert event.output_cost == 5.0

    def test_tracker_accumulation(self):
        tracker = CostTracker()
        tracker.track("gpt-4o", input_tokens=1000, output_tokens=500)
        tracker.track("gpt-4o", input_tokens=2000, output_tokens=1000)
        assert tracker.total_tokens == 4500
        assert tracker.total_cost > 0

    def test_collect_and_reset(self):
        tracker = CostTracker()
        tracker.track("gpt-4o", input_tokens=1000, output_tokens=500)
        events = tracker.collect_and_reset()
        assert len(events) == 1
        assert events[0]["model"] == "gpt-4o"
        assert tracker.collect_and_reset() == []

    def test_all_major_models_have_pricing(self):
        required = [
            "claude-opus-4", "claude-sonnet-4", "claude-haiku-4",
            "gpt-4o", "gpt-4o-mini", "gpt-4-turbo",
            "gemini-2.0-flash", "gemini-1.5-pro",
        ]
        for model in required:
            assert model in MODEL_PRICING, f"Missing pricing for {model}"


# ===========================================================================
# Disk buffer
# ===========================================================================

class TestDiskBuffer:
    def test_append_and_drain(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            buf = DiskBuffer(tmpdir)
            buf.append({"trace": "t1"})
            buf.append({"trace": "t2"})
            assert buf.size == 2
            items = buf.drain(batch_size=1)
            assert len(items) == 1
            assert buf.size == 1
            items = buf.drain()
            assert len(items) == 1
            assert buf.is_empty

    def test_peek_does_not_remove(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            buf = DiskBuffer(tmpdir)
            buf.append({"x": 1})
            items = buf.peek()
            assert len(items) == 1
            assert buf.size == 1

    def test_clear(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            buf = DiskBuffer(tmpdir)
            buf.append({"x": 1})
            buf.append({"x": 2})
            removed = buf.clear()
            assert removed == 2
            assert buf.is_empty

    def test_max_files_eviction(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            buf = DiskBuffer(tmpdir, max_files=3)
            for i in range(5):
                buf.append({"i": i})
            assert buf.size <= 3

    def test_ordering(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            buf = DiskBuffer(tmpdir)
            buf.append({"order": 1})
            time.sleep(0.01)
            buf.append({"order": 2})
            items = buf.drain()
            assert items[0]["order"] == 1
            assert items[1]["order"] == 2


# ===========================================================================
# Client (unit tests — no real HTTP)
# ===========================================================================

class TestClient:
    def test_headers(self):
        c = SentinelClient("https://sentinel.test", "sk-abc", "my-tenant")
        headers = c._headers()
        assert headers["Authorization"] == "Bearer sk-abc"
        assert headers["X-Sentinel-Tenant"] == "my-tenant"
        assert headers["Content-Type"] == "application/json"

    def test_unreachable_endpoint_returns_error(self):
        c = SentinelClient("http://localhost:19999", "sk-x", "t")
        result = c.send_traces([{"test": True}])
        assert "error" in result

    def test_health_unreachable(self):
        c = SentinelClient("http://localhost:19999", "sk-x", "t")
        result = c.health()
        assert "error" in result


# ===========================================================================
# Integration stubs (no real frameworks needed)
# ===========================================================================

class TestLangChainIntegration:
    def test_import_without_langchain(self):
        """SentinelLangChainCallback should be importable even without langchain."""
        from sentinel_sdk.integrations.langchain import SentinelLangChainCallback
        s = Sentinel(enabled=True, flush_interval=0)
        cb = SentinelLangChainCallback(s)
        assert cb.sentinel is s

    def test_llm_lifecycle(self):
        from sentinel_sdk.integrations.langchain import SentinelLangChainCallback
        s = Sentinel(enabled=True, flush_interval=0)
        cb = SentinelLangChainCallback(s)
        cb.on_llm_start({"kwargs": {"model_name": "gpt-4o"}}, ["Hello"])
        assert cb._trace is not None
        cb.on_llm_end(type("Resp", (), {"llm_output": None})())
        # Trace should have spans
        data = s._tracer.collect_and_reset()
        assert len(data) == 1


class TestCrewAIIntegration:
    def test_import_without_crewai(self):
        from sentinel_sdk.integrations.crewai import SentinelCrewAIHandler
        s = Sentinel(enabled=True, flush_interval=0)
        h = SentinelCrewAIHandler(s)
        assert h.sentinel is s

    def test_crew_lifecycle(self):
        from sentinel_sdk.integrations.crewai import SentinelCrewAIHandler
        s = Sentinel(enabled=True, flush_interval=0)
        h = SentinelCrewAIHandler(s)
        h.on_crew_start("test-crew")
        h.on_task_start("research", agent_name="researcher")
        h.on_task_end("research", output="findings")
        h.on_crew_end("done")
        # Data should have been flushed
        assert s._tracer.collect_and_reset() == []


# ===========================================================================
# Decorators
# ===========================================================================

class TestDecorators:
    def test_trace_decorator_returns_value(self):
        s = Sentinel(enabled=True, flush_interval=0)

        @s.trace(name="add-agent")
        def add(a, b):
            return a + b

        assert add(2, 3) == 5

    def test_trace_decorator_captures_error(self):
        s = Sentinel(enabled=True, flush_interval=0)

        @s.trace(name="fail-agent")
        def fail():
            raise RuntimeError("oops")

        with pytest.raises(RuntimeError, match="oops"):
            fail()

    def test_trace_decorator_with_attributes(self):
        s = Sentinel(enabled=True, flush_interval=0)

        @s.trace(name="attr-agent", attributes={"env": "test"})
        def agent():
            return "ok"

        assert agent() == "ok"


# ===========================================================================
# End-to-end scenario
# ===========================================================================

class TestEndToEnd:
    def test_full_workflow(self):
        """Simulate a complete agent workflow with tracing + cost tracking."""
        with tempfile.TemporaryDirectory() as tmpdir:
            s = Sentinel(
                enabled=True,
                flush_interval=0,
                buffer_dir=tmpdir,
            )

            # Start a traced agent
            with s.span("agent-run", attributes={"agent": "patient-lookup"}) as root:
                root.set_attribute("patient_id", "P-12345")

                # LLM call
                with s.span("llm-call", attributes={
                    "model": "claude-sonnet-4",
                    "data_category": "PHI",
                }) as llm:
                    llm.set_attribute("input_tokens", 1500)
                    llm.set_attribute("output_tokens", 800)
                    s.track_cost("claude-sonnet-4", 1500, 800)

                # Tool call
                with s.span("db-query", attributes={
                    "query": "SELECT * FROM patients WHERE id = ?",
                }) as db:
                    db.add_event("query_executed", {"rows": 1})

            # Flush to buffer (no backend configured)
            result = s.flush()
            assert result["status"] == "buffered"

            # Verify cost tracking
            assert s.total_cost > 0

            # Verify buffer has data
            buf = DiskBuffer(tmpdir)
            assert not buf.is_empty
            items = buf.peek()
            assert len(items) >= 1
            traces = items[0].get("traces", [])
            assert len(traces) == 1
            assert len(traces[0]["spans"]) == 3  # root + llm + db
