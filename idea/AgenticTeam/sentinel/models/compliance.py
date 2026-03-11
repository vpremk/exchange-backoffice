# SPDX-License-Identifier: Apache-2.0
# Copyright 2025 Compliance Sentinel Contributors

"""Pydantic models for compliance rules, traces, and evaluation results."""

from datetime import date
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Regulation(str, Enum):
    SOX = "SOX"
    HIPAA = "HIPAA"
    FINRA = "FINRA"
    SOC2 = "SOC2"
    CUSTOM = "custom"


class ActionType(str, Enum):
    ALERT = "alert"
    BLOCK = "block"
    LOG = "log"
    ESCALATE = "escalate"


class ConditionOperator(str, Enum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    IN = "in"
    NOT_IN = "not_in"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    REGEX = "regex"
    IS_EMPTY = "is_empty"
    IS_NOT_EMPTY = "is_not_empty"
    EXISTS = "exists"
    NOT_EXISTS = "not_exists"


class ConditionLogic(str, Enum):
    ALL = "all"
    ANY = "any"


# ---------------------------------------------------------------------------
# Rule models
# ---------------------------------------------------------------------------

class Condition(BaseModel):
    field: str
    operator: ConditionOperator
    value: Any = None


class Action(BaseModel):
    type: ActionType
    channel: Optional[str] = None
    priority: Optional[str] = None
    message: Optional[str] = None
    retention: Optional[str] = None
    target: Optional[str] = None


class RuleMetadata(BaseModel):
    effective_date: Optional[date] = None
    review_date: Optional[date] = None
    owner: Optional[str] = None
    version: str = "1.0"


class Rule(BaseModel):
    id: str
    name: str
    description: str = ""
    severity: Severity
    regulation: Regulation
    conditions: List[Condition]
    logic: ConditionLogic = ConditionLogic.ALL
    actions: List[Action]
    metadata: RuleMetadata = Field(default_factory=RuleMetadata)
    depends_on: Optional[str] = None
    plugin: Optional[str] = None
    enabled: bool = True


class RuleSet(BaseModel):
    rules: List[Rule]


# ---------------------------------------------------------------------------
# Trace / span models (OpenTelemetry-compatible)
# ---------------------------------------------------------------------------

class SpanAttributes(BaseModel, extra="allow"):
    """Open-ended attributes dict — any key is allowed."""
    pass


class Span(BaseModel):
    trace_id: str = ""
    span_id: str = ""
    name: str = ""
    attributes: Dict[str, Any] = Field(default_factory=dict)
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: str = "OK"


class Trace(BaseModel):
    trace_id: str = ""
    spans: List[Span] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Evaluation result models
# ---------------------------------------------------------------------------

class Violation(BaseModel):
    rule_id: str
    rule_name: str
    severity: Severity
    regulation: Regulation
    description: str
    span_id: str = ""
    span_name: str = ""
    matched_conditions: List[str] = Field(default_factory=list)
    actions: List[Action] = Field(default_factory=list)


class ComplianceResult(BaseModel):
    trace_id: str = ""
    passed_rules: List[str] = Field(default_factory=list)
    violated_rules: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    violations: List[Violation] = Field(default_factory=list)
    rules_evaluated: int = 0
    spans_evaluated: int = 0
    evaluation_ms: float = 0.0
    blocked: bool = False
    block_messages: List[str] = Field(default_factory=list)

    @property
    def is_compliant(self) -> bool:
        return len(self.violated_rules) == 0
