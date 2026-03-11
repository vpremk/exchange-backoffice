# SPDX-License-Identifier: Apache-2.0
# Copyright 2025 Compliance Sentinel Contributors

"""LLM cost tracking with a built-in model pricing database.

Auto-detects pricing for major model families.  Costs are accumulated
per-trace and flushed with the trace batch.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Pricing DB — USD per 1M tokens (input / output)
# Updated as of 2025-Q4.  Override with Sentinel.set_pricing().
# ---------------------------------------------------------------------------

MODEL_PRICING: Dict[str, Dict[str, float]] = {
    # Anthropic
    "claude-opus-4": {"input": 15.00, "output": 75.00},
    "claude-sonnet-4": {"input": 3.00, "output": 15.00},
    "claude-haiku-4": {"input": 0.80, "output": 4.00},
    # OpenAI
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4-turbo": {"input": 10.00, "output": 30.00},
    "gpt-4": {"input": 30.00, "output": 60.00},
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    "o1": {"input": 15.00, "output": 60.00},
    "o1-mini": {"input": 3.00, "output": 12.00},
    "o3-mini": {"input": 1.10, "output": 4.40},
    # Google
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    # Meta (hosted)
    "llama-3.1-405b": {"input": 3.00, "output": 3.00},
    "llama-3.1-70b": {"input": 0.80, "output": 0.80},
    "llama-3.1-8b": {"input": 0.10, "output": 0.10},
    # Mistral
    "mistral-large": {"input": 2.00, "output": 6.00},
    "mistral-small": {"input": 0.20, "output": 0.60},
}


def _resolve_model(model: str) -> Optional[Dict[str, float]]:
    """Look up pricing, trying exact match first then prefix match."""
    if model in MODEL_PRICING:
        return MODEL_PRICING[model]
    # Prefix match (e.g. "claude-sonnet-4-20250514" → "claude-sonnet-4")
    for key in MODEL_PRICING:
        if model.startswith(key):
            return MODEL_PRICING[key]
    return None


class CostEvent:
    """A single LLM invocation cost record."""

    def __init__(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        pricing: Optional[Dict[str, float]] = None,
    ):
        self.model = model
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens
        self.timestamp = time.time()

        p = pricing or _resolve_model(model) or {"input": 0.0, "output": 0.0}
        self.input_cost = (input_tokens / 1_000_000) * p["input"]
        self.output_cost = (output_tokens / 1_000_000) * p["output"]
        self.total_cost = self.input_cost + self.output_cost

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model": self.model,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "input_cost_usd": round(self.input_cost, 6),
            "output_cost_usd": round(self.output_cost, 6),
            "total_cost_usd": round(self.total_cost, 6),
            "timestamp": self.timestamp,
        }


class CostTracker:
    """Accumulates cost events for batch flushing."""

    def __init__(self):
        self._events: List[CostEvent] = []
        self._custom_pricing: Dict[str, Dict[str, float]] = {}
        self._cumulative_cost: float = 0.0
        self._cumulative_tokens: int = 0

    def set_pricing(self, model: str, input_per_1m: float, output_per_1m: float) -> None:
        """Override or add pricing for a model."""
        self._custom_pricing[model] = {"input": input_per_1m, "output": output_per_1m}
        MODEL_PRICING[model] = {"input": input_per_1m, "output": output_per_1m}

    def track(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
    ) -> CostEvent:
        pricing = self._custom_pricing.get(model)
        event = CostEvent(model, input_tokens, output_tokens, pricing)
        self._events.append(event)
        self._cumulative_cost += event.total_cost
        self._cumulative_tokens += input_tokens + output_tokens
        return event

    @property
    def total_cost(self) -> float:
        """Cumulative cost across all tracked events (survives collect_and_reset)."""
        return self._cumulative_cost

    @property
    def total_tokens(self) -> int:
        """Cumulative tokens across all tracked events (survives collect_and_reset)."""
        return self._cumulative_tokens

    def collect_and_reset(self) -> List[Dict[str, Any]]:
        result = [e.to_dict() for e in self._events]
        self._events = []
        return result
