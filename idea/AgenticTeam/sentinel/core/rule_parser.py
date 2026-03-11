# SPDX-License-Identifier: Apache-2.0
# Copyright 2025 Compliance Sentinel Contributors

"""YAML rule file loading and validation.

Loads ``.yaml`` / ``.yml`` files from a directory, parses them into validated
``Rule`` objects, and provides filtering by regulation and severity.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Sequence

import yaml

from sentinel.models.compliance import (
    Regulation,
    Rule,
    RuleSet,
    Severity,
)


class RuleParseError(Exception):
    """Raised when a rule file cannot be parsed or validated."""

    def __init__(self, path: str, detail: str):
        self.path = path
        self.detail = detail
        super().__init__(f"Error parsing {path}: {detail}")


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------

def load_rules_from_file(path: str | Path) -> list[Rule]:
    """Parse a single YAML rule file and return validated ``Rule`` objects."""
    path = Path(path)
    with open(path) as f:
        raw = yaml.safe_load(f)

    if not raw or "rules" not in raw:
        raise RuleParseError(str(path), "Missing top-level 'rules' key")

    try:
        rule_set = RuleSet.model_validate(raw)
    except Exception as exc:
        raise RuleParseError(str(path), str(exc)) from exc

    return rule_set.rules


def load_rules_from_directory(
    directory: str | Path,
    *,
    recursive: bool = False,
) -> list[Rule]:
    """Load all YAML rule files from a directory.

    Returns a flat list of rules from all files.  Raises ``RuleParseError``
    if any file is invalid.
    """
    directory = Path(directory)
    if not directory.is_dir():
        raise FileNotFoundError(f"Rule directory not found: {directory}")

    rules: list[Rule] = []
    pattern = "**/*.yaml" if recursive else "*.yaml"

    for fpath in sorted(directory.glob(pattern)):
        rules.extend(load_rules_from_file(fpath))

    # Also pick up .yml files
    pattern_yml = "**/*.yml" if recursive else "*.yml"
    for fpath in sorted(directory.glob(pattern_yml)):
        rules.extend(load_rules_from_file(fpath))

    return rules


# ---------------------------------------------------------------------------
# Filtering helpers
# ---------------------------------------------------------------------------

def filter_rules(
    rules: Sequence[Rule],
    *,
    regulations: set[Regulation] | None = None,
    min_severity: Severity | None = None,
    enabled_only: bool = True,
) -> list[Rule]:
    """Filter rules by regulation, severity, and enabled status."""
    severity_order = {
        Severity.LOW: 0,
        Severity.MEDIUM: 1,
        Severity.HIGH: 2,
        Severity.CRITICAL: 3,
    }
    min_level = severity_order.get(min_severity, 0) if min_severity else 0

    result: list[Rule] = []
    for rule in rules:
        if enabled_only and not rule.enabled:
            continue
        if regulations and rule.regulation not in regulations:
            continue
        if severity_order[rule.severity] < min_level:
            continue
        result.append(rule)
    return result


def build_dependency_order(rules: list[Rule]) -> list[list[Rule]]:
    """Topologically sort rules respecting ``depends_on`` chains.

    Returns a list of *tiers* — each tier can be evaluated in parallel,
    and all rules in tier N depend only on rules from earlier tiers.
    Rules without dependencies are placed in the first tier.
    """
    by_id: dict[str, Rule] = {r.id: r for r in rules}
    dep_map: dict[str, str | None] = {r.id: r.depends_on for r in rules}

    placed: set[str] = set()
    tiers: list[list[Rule]] = []

    remaining = set(by_id.keys())
    while remaining:
        tier: list[Rule] = []
        for rid in list(remaining):
            dep = dep_map[rid]
            if dep is None or dep in placed or dep not in by_id:
                tier.append(by_id[rid])
        if not tier:
            # Circular dependency — break by adding all remaining
            tier = [by_id[rid] for rid in remaining]
            tiers.append(tier)
            break
        for r in tier:
            placed.add(r.id)
            remaining.discard(r.id)
        tiers.append(tier)

    return tiers
