# SPDX-License-Identifier: Apache-2.0
# Copyright 2025 Compliance Sentinel Contributors

"""Compliance Engine — evaluates OpenTelemetry traces against regulatory rules.

This is the central orchestrator.  Usage::

    engine = ComplianceEngine("compliance-rules/")
    result = engine.evaluate(trace, regulations={Regulation.HIPAA})

"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Sequence

from sentinel.core.plugins import get_plugin
from sentinel.core.rule_evaluator import evaluate_condition, evaluate_conditions
from sentinel.core.rule_parser import (
    build_dependency_order,
    filter_rules,
    load_rules_from_directory,
    load_rules_from_file,
)
from sentinel.models.compliance import (
    ActionType,
    ComplianceResult,
    ConditionLogic,
    Regulation,
    Rule,
    Severity,
    Span,
    Trace,
    Violation,
)


class ComplianceEngine:
    """Stateless evaluation engine.

    Loads rules at init and exposes ``evaluate()`` for per-trace assessment.
    Thread-safe: the engine holds no mutable per-request state.
    """

    def __init__(
        self,
        rules_dir: str | Path | None = None,
        *,
        rules: list[Rule] | None = None,
    ):
        self._rules: list[Rule] = []
        if rules_dir:
            self._rules = load_rules_from_directory(rules_dir)
        if rules:
            self._rules.extend(rules)

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    @property
    def rule_count(self) -> int:
        return len(self._rules)

    def add_rules_from_file(self, path: str | Path) -> None:
        self._rules.extend(load_rules_from_file(path))

    def add_rules(self, rules: list[Rule]) -> None:
        self._rules.extend(rules)

    # ------------------------------------------------------------------
    # Core evaluation
    # ------------------------------------------------------------------

    def evaluate(
        self,
        trace: Trace,
        *,
        regulations: set[Regulation] | None = None,
        min_severity: Severity | None = None,
    ) -> ComplianceResult:
        """Evaluate a trace against all applicable rules.

        Parameters
        ----------
        trace:
            The OpenTelemetry trace to evaluate.
        regulations:
            If given, only evaluate rules matching these regulations.
        min_severity:
            If given, skip rules below this severity.

        Returns
        -------
        ComplianceResult
        """
        t0 = time.perf_counter()

        # 1. Filter applicable rules
        applicable = filter_rules(
            self._rules,
            regulations=regulations,
            min_severity=min_severity,
        )

        # 2. Build evaluation order (skip topo sort if no deps)
        has_deps = any(r.depends_on for r in applicable)
        tiers = build_dependency_order(applicable) if has_deps else [applicable]

        # 3. Pre-compute span dicts once (avoids per-rule allocation)
        spans = trace.spans
        span_dicts = [self._span_to_eval_dict(s) for s in spans]

        # 4. Evaluate tier-by-tier
        passed: set[str] = set()
        violated: set[str] = set()
        warnings: list[str] = []
        violations: list[Violation] = []
        blocked = False
        block_messages: list[str] = []

        for tier in tiers:
            for rule in tier:
                # Check dependency: skip if prerequisite failed
                if rule.depends_on and rule.depends_on not in passed:
                    warnings.append(
                        f"Skipped {rule.id}: dependency {rule.depends_on} did not pass"
                    )
                    continue

                rule_violated = self._evaluate_rule(
                    rule, spans, span_dicts, violations
                )

                if rule_violated:
                    violated.add(rule.id)
                    # Process actions
                    for action in rule.actions:
                        if action.type == ActionType.BLOCK:
                            blocked = True
                            block_messages.append(
                                action.message or f"Blocked by {rule.id}"
                            )
                else:
                    passed.add(rule.id)

        elapsed_ms = (time.perf_counter() - t0) * 1000

        return ComplianceResult(
            trace_id=trace.trace_id,
            passed_rules=sorted(passed),
            violated_rules=sorted(violated),
            warnings=warnings,
            violations=violations,
            rules_evaluated=len(applicable),
            spans_evaluated=len(trace.spans),
            evaluation_ms=round(elapsed_ms, 3),
            blocked=blocked,
            block_messages=block_messages,
        )

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _evaluate_rule(
        self,
        rule: Rule,
        spans: Sequence[Span],
        span_dicts: list[dict],
        violations: list[Violation],
    ) -> bool:
        """Evaluate a single rule against all spans.

        Returns True if the rule was *violated* (conditions matched).
        """
        # Plugin-based evaluation
        if rule.plugin:
            plugin_fn = get_plugin(rule.plugin)
            if plugin_fn:
                for span, sd in zip(spans, span_dicts):
                    if plugin_fn(sd, rule):
                        violations.append(self._make_violation(rule, span, ["plugin match"]))
                        return True
            return False

        # DSL condition evaluation
        conditions = rule.conditions
        logic = rule.logic

        # Fast path: single condition with ALL logic (most common case)
        if len(conditions) == 1 and logic == ConditionLogic.ALL:
            cond = conditions[0]
            for span, sd in zip(spans, span_dicts):
                if evaluate_condition(cond, sd):
                    desc = f"{cond.field} {cond.operator.value} {cond.value!r}"
                    violations.append(self._make_violation(rule, span, [desc]))
                    return True
        else:
            for span, sd in zip(spans, span_dicts):
                matched, descriptions = evaluate_conditions(conditions, logic, sd)
                if matched:
                    violations.append(self._make_violation(rule, span, descriptions))
                    return True

        return False

    @staticmethod
    def _span_to_eval_dict(span: Span) -> dict[str, Any]:
        """Flatten a Span into a dict suitable for field resolution.

        The evaluator expects paths like ``trace.spans[*].attributes.X``,
        but since we evaluate per-span we expose the attributes directly
        *and* nest them under ``trace.spans[*]`` for compatibility.
        """
        attrs = span.attributes
        return {
            **attrs,
            "span": {
                "name": span.name,
                "span_id": span.span_id,
                "status": span.status,
                "attributes": attrs,
            },
            "trace": {
                "spans": [
                    {"attributes": attrs, "name": span.name}
                ],
            },
        }

    @staticmethod
    def _make_violation(
        rule: Rule,
        span: Span,
        matched_conditions: list[str],
    ) -> Violation:
        return Violation(
            rule_id=rule.id,
            rule_name=rule.name,
            severity=rule.severity,
            regulation=rule.regulation,
            description=rule.description,
            span_id=span.span_id,
            span_name=span.name,
            matched_conditions=matched_conditions,
            actions=rule.actions,
        )
