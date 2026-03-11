# SPDX-License-Identifier: Apache-2.0
# Copyright 2025 Compliance Sentinel Contributors

"""Decorator-based tracing and compliance enforcement."""

from __future__ import annotations

import functools
from typing import Any, Callable, Dict, Optional, Sequence


def trace(
    sentinel: Any,
    name: Optional[str] = None,
    attributes: Optional[Dict[str, Any]] = None,
) -> Callable:
    """Decorator that wraps a function in a Sentinel trace.

    Usage::

        @sentinel.trace(name="my-agent")
        def run_agent():
            ...

    Or standalone::

        @trace(sentinel, name="my-agent")
        def run_agent():
            ...
    """

    def decorator(fn: Callable) -> Callable:
        span_name = name or fn.__qualname__

        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            tracer = sentinel._tracer
            tr = tracer.start_trace(span_name)
            span = tr.start_span(span_name, attributes=attributes)
            try:
                result = fn(*args, **kwargs)
                return result
            except Exception as exc:
                span.set_error(exc)
                raise
            finally:
                tr.end_span()
                sentinel.flush()

        return wrapper
    return decorator


def compliant(
    sentinel: Any,
    action: str,
    attributes: Optional[Dict[str, Any]] = None,
    regulations: Optional[Sequence[str]] = None,
) -> Callable:
    """Decorator that checks compliance BEFORE executing the function.

    Usage::

        @sentinel.compliant(action="access_phi", attributes={"data_category": "PHI"})
        def access_patient_data():
            ...

    Raises ``ComplianceBlockedError`` if the action is blocked.
    """

    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            check_attrs = dict(attributes or {})
            check_attrs["action"] = action
            result = sentinel.check_compliance(
                action=action,
                attributes=check_attrs,
            )
            if result.get("blocked"):
                from sentinel_sdk import ComplianceBlockedError
                raise ComplianceBlockedError(
                    result.get("block_messages", ["Action blocked by compliance policy"])
                )
            return fn(*args, **kwargs)
        return wrapper
    return decorator
