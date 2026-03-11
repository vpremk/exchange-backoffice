# SPDX-License-Identifier: Apache-2.0
# Copyright 2025 Compliance Sentinel Contributors

"""Condition evaluation DSL — resolves field paths and evaluates operators.

Optimised for throughput: field resolution is kept as simple dict/list traversal,
operator dispatch uses a pre-built lookup table, and regex patterns are compiled
once and cached.
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Any

from sentinel.models.compliance import Condition, ConditionLogic, ConditionOperator


# ---------------------------------------------------------------------------
# Regex cache
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1024)
def _compile_re(pattern: str) -> re.Pattern:
    return re.compile(pattern)


# ---------------------------------------------------------------------------
# Field resolution
# ---------------------------------------------------------------------------

def resolve_field(data: dict[str, Any], field_path: str) -> list[Any]:
    """Resolve a dotted field path against a nested dict.

    Supports wildcard segments ``[*]`` which expand across list elements,
    returning *all* matching leaf values.

    Examples
    --------
    >>> resolve_field({"a": {"b": [1, 2]}}, "a.b[*]")
    [1, 2]
    >>> resolve_field({"x": 5}, "x")
    [5]
    """
    segments = _split_field(field_path)
    current: list[Any] = [data]

    for seg in segments:
        nxt: list[Any] = []
        if seg == "[*]":
            for item in current:
                if isinstance(item, list):
                    nxt.extend(item)
                elif isinstance(item, dict):
                    nxt.extend(item.values())
        else:
            for item in current:
                if isinstance(item, dict) and seg in item:
                    nxt.append(item[seg])
        current = nxt
        if not current:
            break

    return current


def _split_field(path: str) -> list[str]:
    """Split ``'a.b[*].c'`` into ``['a', 'b', '[*]', 'c']``."""
    parts: list[str] = []
    for segment in path.split("."):
        if "[*]" in segment:
            prefix = segment.replace("[*]", "")
            if prefix:
                parts.append(prefix)
            parts.append("[*]")
        else:
            parts.append(segment)
    return parts


# ---------------------------------------------------------------------------
# Operator dispatch
# ---------------------------------------------------------------------------

def _op_equals(values: list[Any], target: Any) -> bool:
    return any(v == target for v in values)


def _op_not_equals(values: list[Any], target: Any) -> bool:
    return all(v != target for v in values)


def _op_contains(values: list[Any], target: Any) -> bool:
    for v in values:
        if isinstance(v, str) and isinstance(target, str) and target in v:
            return True
        if isinstance(v, list) and target in v:
            return True
        if v == target:
            return True
    return False


def _op_not_contains(values: list[Any], target: Any) -> bool:
    return not _op_contains(values, target)


def _op_in(values: list[Any], target: Any) -> bool:
    if not isinstance(target, list):
        return False
    return any(v in target for v in values)


def _op_not_in(values: list[Any], target: Any) -> bool:
    if not isinstance(target, list):
        return True
    return all(v not in target for v in values)


def _op_greater_than(values: list[Any], target: Any) -> bool:
    return any(v > target for v in values if isinstance(v, (int, float)))


def _op_less_than(values: list[Any], target: Any) -> bool:
    return any(v < target for v in values if isinstance(v, (int, float)))


def _op_regex(values: list[Any], target: Any) -> bool:
    pattern = _compile_re(str(target))
    return any(pattern.search(str(v)) for v in values)


def _op_is_empty(values: list[Any], _target: Any) -> bool:
    if not values:
        return True
    return all(
        v is None or v == "" or v == [] or v == {}
        for v in values
    )


def _op_is_not_empty(values: list[Any], target: Any) -> bool:
    return not _op_is_empty(values, target)


def _op_exists(values: list[Any], _target: Any) -> bool:
    return len(values) > 0


def _op_not_exists(values: list[Any], _target: Any) -> bool:
    return len(values) == 0


_OPERATOR_TABLE: dict[ConditionOperator, Any] = {
    ConditionOperator.EQUALS: _op_equals,
    ConditionOperator.NOT_EQUALS: _op_not_equals,
    ConditionOperator.CONTAINS: _op_contains,
    ConditionOperator.NOT_CONTAINS: _op_not_contains,
    ConditionOperator.IN: _op_in,
    ConditionOperator.NOT_IN: _op_not_in,
    ConditionOperator.GREATER_THAN: _op_greater_than,
    ConditionOperator.LESS_THAN: _op_less_than,
    ConditionOperator.REGEX: _op_regex,
    ConditionOperator.IS_EMPTY: _op_is_empty,
    ConditionOperator.IS_NOT_EMPTY: _op_is_not_empty,
    ConditionOperator.EXISTS: _op_exists,
    ConditionOperator.NOT_EXISTS: _op_not_exists,
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

_EMPTY_TRUE_OPS = frozenset({
    ConditionOperator.IS_EMPTY,
    ConditionOperator.NOT_EXISTS,
    ConditionOperator.NOT_CONTAINS,
    ConditionOperator.NOT_IN,
    ConditionOperator.NOT_EQUALS,
})

_EMPTY_FALSE_OPS = frozenset({
    ConditionOperator.EQUALS,
    ConditionOperator.CONTAINS,
    ConditionOperator.IN,
    ConditionOperator.GREATER_THAN,
    ConditionOperator.LESS_THAN,
    ConditionOperator.REGEX,
    ConditionOperator.IS_NOT_EMPTY,
    ConditionOperator.EXISTS,
})


def evaluate_condition(condition: Condition, data: dict[str, Any]) -> bool:
    """Evaluate a single condition against a data dict."""
    field = condition.field
    op = condition.operator

    # Fast path for simple top-level field (no dots, no wildcards)
    if "." not in field and "[" not in field:
        if field in data:
            values = [data[field]]
        else:
            values = []
    else:
        values = resolve_field(data, field)

    # Short-circuit on empty values
    if not values:
        if op in _EMPTY_TRUE_OPS:
            return True
        if op in _EMPTY_FALSE_OPS:
            return False

    return _OPERATOR_TABLE[op](values, condition.value)


def evaluate_conditions(
    conditions: list[Condition],
    logic: ConditionLogic,
    data: dict[str, Any],
) -> tuple[bool, list[str]]:
    """Evaluate a list of conditions with the given logic (all/any).

    Returns ``(matched, list_of_matched_condition_descriptions)``.
    """
    matched_descriptions: list[str] = []
    results: list[bool] = []

    for cond in conditions:
        result = evaluate_condition(cond, data)
        results.append(result)
        if result:
            matched_descriptions.append(
                f"{cond.field} {cond.operator.value} {cond.value!r}"
            )

    if logic == ConditionLogic.ALL:
        return all(results), matched_descriptions
    else:
        return any(results), matched_descriptions
