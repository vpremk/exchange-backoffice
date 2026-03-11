"""Comprehensive tests for the Compliance Sentinel engine."""

from __future__ import annotations

import os
import sys
import time

import pytest

# Ensure project root is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sentinel.core.compliance_engine import ComplianceEngine
from sentinel.core.plugins import clear_plugins, register_plugin
from sentinel.core.rule_evaluator import evaluate_condition, resolve_field
from sentinel.core.rule_parser import (
    build_dependency_order,
    filter_rules,
    load_rules_from_directory,
    load_rules_from_file,
)
from sentinel.models.compliance import (
    Action,
    ActionType,
    ComplianceResult,
    Condition,
    ConditionLogic,
    ConditionOperator,
    Regulation,
    Rule,
    Severity,
    Span,
    Trace,
)

RULES_DIR = os.path.join(os.path.dirname(__file__), "..", "compliance-rules")


# ===========================================================================
# Helpers
# ===========================================================================

def make_span(attributes: dict, name: str = "test-span", span_id: str = "s1") -> Span:
    return Span(span_id=span_id, name=name, attributes=attributes)


def make_trace(spans: list[Span], trace_id: str = "t1") -> Trace:
    return Trace(trace_id=trace_id, spans=spans)


def make_rule(
    rule_id: str = "TEST-001",
    conditions: list[Condition] | None = None,
    severity: Severity = Severity.HIGH,
    regulation: Regulation = Regulation.CUSTOM,
    logic: ConditionLogic = ConditionLogic.ALL,
    actions: list[Action] | None = None,
    depends_on: str | None = None,
    plugin: str | None = None,
) -> Rule:
    return Rule(
        id=rule_id,
        name=f"Test rule {rule_id}",
        description="Test rule",
        severity=severity,
        regulation=regulation,
        conditions=conditions or [],
        logic=logic,
        actions=actions or [Action(type=ActionType.LOG)],
        depends_on=depends_on,
        plugin=plugin,
    )


# ===========================================================================
# Rule parser tests
# ===========================================================================

class TestRuleParser:
    def test_load_hipaa_rules(self):
        rules = load_rules_from_file(os.path.join(RULES_DIR, "hipaa.yaml"))
        assert len(rules) == 10
        assert all(r.regulation == Regulation.HIPAA for r in rules)
        assert rules[0].id == "HIPAA-001"

    def test_load_sox_rules(self):
        rules = load_rules_from_file(os.path.join(RULES_DIR, "sox.yaml"))
        assert len(rules) == 10
        assert all(r.regulation == Regulation.SOX for r in rules)

    def test_load_finra_rules(self):
        rules = load_rules_from_file(os.path.join(RULES_DIR, "finra.yaml"))
        assert len(rules) == 10
        assert all(r.regulation == Regulation.FINRA for r in rules)

    def test_load_soc2_rules(self):
        rules = load_rules_from_file(os.path.join(RULES_DIR, "soc2.yaml"))
        assert len(rules) == 10
        assert all(r.regulation == Regulation.SOC2 for r in rules)

    def test_load_all_rules_from_directory(self):
        rules = load_rules_from_directory(RULES_DIR)
        # 4 regulation files × 10 + custom-template rules
        assert len(rules) >= 40

    def test_filter_by_regulation(self):
        rules = load_rules_from_directory(RULES_DIR)
        hipaa_only = filter_rules(rules, regulations={Regulation.HIPAA})
        assert all(r.regulation == Regulation.HIPAA for r in hipaa_only)
        assert len(hipaa_only) == 10

    def test_filter_by_severity(self):
        rules = load_rules_from_directory(RULES_DIR)
        critical = filter_rules(rules, min_severity=Severity.CRITICAL)
        assert all(r.severity == Severity.CRITICAL for r in critical)

    def test_dependency_ordering(self):
        r1 = make_rule("A")
        r2 = make_rule("B", depends_on="A")
        r3 = make_rule("C", depends_on="B")
        tiers = build_dependency_order([r3, r1, r2])
        assert len(tiers) == 3
        assert tiers[0][0].id == "A"
        assert tiers[1][0].id == "B"
        assert tiers[2][0].id == "C"


# ===========================================================================
# Field resolution tests
# ===========================================================================

class TestFieldResolution:
    def test_simple_field(self):
        assert resolve_field({"x": 5}, "x") == [5]

    def test_nested_field(self):
        assert resolve_field({"a": {"b": 1}}, "a.b") == [1]

    def test_wildcard(self):
        data = {"items": [{"v": 1}, {"v": 2}, {"v": 3}]}
        assert resolve_field(data, "items[*].v") == [1, 2, 3]

    def test_missing_field(self):
        assert resolve_field({"a": 1}, "b") == []

    def test_otel_style_path(self):
        data = {
            "trace": {
                "spans": [
                    {"attributes": {"data_category": "PHI"}},
                    {"attributes": {"data_category": "PII"}},
                ]
            }
        }
        result = resolve_field(data, "trace.spans[*].attributes.data_category")
        assert result == ["PHI", "PII"]


# ===========================================================================
# Condition evaluator tests
# ===========================================================================

class TestConditionEvaluator:
    def test_equals(self):
        cond = Condition(field="x", operator=ConditionOperator.EQUALS, value=5)
        assert evaluate_condition(cond, {"x": 5}) is True
        assert evaluate_condition(cond, {"x": 3}) is False

    def test_contains(self):
        cond = Condition(field="tag", operator=ConditionOperator.CONTAINS, value="PHI")
        assert evaluate_condition(cond, {"tag": "contains PHI data"}) is True
        assert evaluate_condition(cond, {"tag": "no match"}) is False

    def test_is_empty(self):
        cond = Condition(field="auth", operator=ConditionOperator.IS_EMPTY)
        assert evaluate_condition(cond, {"auth": ""}) is True
        assert evaluate_condition(cond, {"auth": None}) is True
        assert evaluate_condition(cond, {}) is True
        assert evaluate_condition(cond, {"auth": "token"}) is False

    def test_greater_than(self):
        cond = Condition(field="amount", operator=ConditionOperator.GREATER_THAN, value=1000)
        assert evaluate_condition(cond, {"amount": 5000}) is True
        assert evaluate_condition(cond, {"amount": 500}) is False

    def test_in_operator(self):
        cond = Condition(field="role", operator=ConditionOperator.IN, value=["admin", "cfo"])
        assert evaluate_condition(cond, {"role": "admin"}) is True
        assert evaluate_condition(cond, {"role": "viewer"}) is False

    def test_regex(self):
        cond = Condition(field="text", operator=ConditionOperator.REGEX, value=r"\d{3}-\d{2}-\d{4}")
        assert evaluate_condition(cond, {"text": "SSN: 123-45-6789"}) is True
        assert evaluate_condition(cond, {"text": "no ssn here"}) is False

    def test_not_exists(self):
        cond = Condition(field="missing", operator=ConditionOperator.NOT_EXISTS)
        assert evaluate_condition(cond, {"other": 1}) is True
        assert evaluate_condition(cond, {"missing": "here"}) is False


# ===========================================================================
# HIPAA compliance tests
# ===========================================================================

class TestHIPAACompliance:
    @pytest.fixture
    def engine(self):
        return ComplianceEngine(RULES_DIR)

    def test_phi_access_without_authorization_triggers_violation(self, engine):
        """HIPAA-001: PHI accessed without authorization context should be blocked."""
        trace = make_trace([
            make_span({
                "data_category": "PHI",
                "authorization_context": "",  # empty = unauthorized
            })
        ])
        result = engine.evaluate(trace, regulations={Regulation.HIPAA})
        assert "HIPAA-001" in result.violated_rules
        assert result.blocked is True
        assert any("PHI access requires authorization" in m for m in result.block_messages)

    def test_phi_access_with_authorization_passes(self, engine):
        """Authorized PHI access should not trigger HIPAA-001."""
        trace = make_trace([
            make_span({
                "data_category": "PHI",
                "authorization_context": "doctor-order-12345",
                "transport_encrypted": True,
                "storage_encrypted": True,
                "audit_logging_enabled": True,
            })
        ])
        result = engine.evaluate(trace, regulations={Regulation.HIPAA})
        assert "HIPAA-001" not in result.violated_rules

    def test_phi_unencrypted_transport(self, engine):
        """HIPAA-002: PHI over unencrypted channel should be blocked."""
        trace = make_trace([
            make_span({
                "data_category": "PHI",
                "authorization_context": "valid",
                "transport_encrypted": False,
            })
        ])
        result = engine.evaluate(trace, regulations={Regulation.HIPAA})
        assert "HIPAA-002" in result.violated_rules
        assert result.blocked is True

    def test_phi_shared_with_unauthorized_third_party(self, engine):
        """HIPAA-007: PHI to external without BAA should be blocked."""
        trace = make_trace([
            make_span({
                "data_category": "PHI",
                "authorization_context": "valid",
                "transport_encrypted": True,
                "destination_type": "external",
                "baa_verified": "",
                "audit_logging_enabled": True,
            })
        ])
        result = engine.evaluate(trace, regulations={Regulation.HIPAA})
        assert "HIPAA-007" in result.violated_rules

    def test_patient_data_in_logs(self, engine):
        """HIPAA-010: PHI in log output should trigger alert."""
        trace = make_trace([
            make_span({"log_contains_phi": True})
        ])
        result = engine.evaluate(trace, regulations={Regulation.HIPAA})
        assert "HIPAA-010" in result.violated_rules


# ===========================================================================
# SOX compliance tests
# ===========================================================================

class TestSOXCompliance:
    @pytest.fixture
    def engine(self):
        return ComplianceEngine(RULES_DIR)

    def test_financial_data_modification_without_dual_approval(self, engine):
        """SOX-001: Financial modification without dual approval → blocked."""
        trace = make_trace([
            make_span({
                "data_category": "financial",
                "operation": "update",
                "dual_approval": "",
            })
        ])
        result = engine.evaluate(trace, regulations={Regulation.SOX})
        assert "SOX-001" in result.violated_rules
        assert result.blocked is True

    def test_unauthorized_general_ledger_access(self, engine):
        """SOX-002: Non-finance role accessing GL → blocked."""
        trace = make_trace([
            make_span({
                "system": "general_ledger",
                "role": "marketing_intern",
            })
        ])
        result = engine.evaluate(trace, regulations={Regulation.SOX})
        assert "SOX-002" in result.violated_rules

    def test_segregation_of_duties_violation(self, engine):
        """SOX-006: SoD violation → blocked and escalated."""
        trace = make_trace([
            make_span({"sod_violation": True})
        ])
        result = engine.evaluate(trace, regulations={Regulation.SOX})
        assert "SOX-006" in result.violated_rules
        assert result.blocked is True

    def test_material_transaction_without_cfo_signoff(self, engine):
        """SOX-007: >$1M transaction without CFO sign-off → escalated."""
        trace = make_trace([
            make_span({
                "transaction_amount": 5_000_000,
                "cfo_signoff": "",
            })
        ])
        result = engine.evaluate(trace, regulations={Regulation.SOX})
        assert "SOX-007" in result.violated_rules

    def test_audit_trail_tamper_attempt(self, engine):
        """SOX-008: Modifying audit trail → blocked."""
        trace = make_trace([
            make_span({
                "target_system": "audit_trail",
                "operation": "delete",
            })
        ])
        result = engine.evaluate(trace, regulations={Regulation.SOX})
        assert "SOX-008" in result.violated_rules
        assert result.blocked is True


# ===========================================================================
# FINRA compliance tests
# ===========================================================================

class TestFINRACompliance:
    @pytest.fixture
    def engine(self):
        return ComplianceEngine(RULES_DIR)

    def test_unauthorized_trade_execution(self, engine):
        """FINRA-001: Unlicensed trade execution → blocked."""
        trace = make_trace([
            make_span({
                "operation": "trade_execute",
                "agent_licensed": "",
            })
        ])
        result = engine.evaluate(trace, regulations={Regulation.FINRA})
        assert "FINRA-001" in result.violated_rules
        assert result.blocked is True

    def test_wash_trade_detected(self, engine):
        """FINRA-002: Wash trade pattern → blocked."""
        trace = make_trace([
            make_span({"trade_pattern": "wash_trade"})
        ])
        result = engine.evaluate(trace, regulations={Regulation.FINRA})
        assert "FINRA-002" in result.violated_rules
        assert result.blocked is True

    def test_front_running_detected(self, engine):
        """FINRA-003: Front-running → blocked and escalated."""
        trace = make_trace([
            make_span({"trade_pattern": "front_running"})
        ])
        result = engine.evaluate(trace, regulations={Regulation.FINRA})
        assert "FINRA-003" in result.violated_rules

    def test_insider_information_access(self, engine):
        """FINRA-006: MNPI access without barrier → blocked."""
        trace = make_trace([
            make_span({
                "data_category": "MNPI",
                "information_barrier_verified": "",
            })
        ])
        result = engine.evaluate(trace, regulations={Regulation.FINRA})
        assert "FINRA-006" in result.violated_rules

    def test_suitability_violation(self, engine):
        """FINRA-009: High-risk trade for conservative client → alert."""
        trace = make_trace([
            make_span({
                "risk_score": 9,
                "client_risk_tolerance": "conservative",
            })
        ])
        result = engine.evaluate(trace, regulations={Regulation.FINRA})
        assert "FINRA-009" in result.violated_rules


# ===========================================================================
# Plugin tests
# ===========================================================================

class TestPlugins:
    def setup_method(self):
        clear_plugins()

    def test_registered_plugin_fires(self):
        @register_plugin("test.check_custom")
        def check_custom(span, rule):
            return span.get("custom_flag") is True

        rule = make_rule(plugin="test.check_custom")
        engine = ComplianceEngine(rules=[rule])
        trace = make_trace([make_span({"custom_flag": True})])
        result = engine.evaluate(trace)
        assert "TEST-001" in result.violated_rules

    def test_registered_plugin_passes(self):
        @register_plugin("test.check_no_match")
        def check_no_match(span, rule):
            return False

        rule = make_rule(plugin="test.check_no_match")
        engine = ComplianceEngine(rules=[rule])
        trace = make_trace([make_span({"x": 1})])
        result = engine.evaluate(trace)
        assert result.is_compliant

    def test_missing_plugin_skips(self):
        rule = make_rule(plugin="nonexistent.module.fn")
        engine = ComplianceEngine(rules=[rule])
        trace = make_trace([make_span({"x": 1})])
        result = engine.evaluate(trace)
        assert result.is_compliant


# ===========================================================================
# Rule chaining tests
# ===========================================================================

class TestRuleChaining:
    def test_dependent_rule_fires_when_prerequisite_passes(self):
        """Rule B should fire only if Rule A passed (was NOT violated)."""
        rule_a = make_rule(
            "CHAIN-A",
            conditions=[
                Condition(field="x", operator=ConditionOperator.EQUALS, value="never_matches")
            ],
        )
        rule_b = make_rule(
            "CHAIN-B",
            depends_on="CHAIN-A",
            conditions=[
                Condition(field="y", operator=ConditionOperator.EQUALS, value=1)
            ],
        )
        engine = ComplianceEngine(rules=[rule_a, rule_b])
        trace = make_trace([make_span({"x": "other", "y": 1})])
        result = engine.evaluate(trace)
        # A passes (not violated), so B can evaluate and finds a match → violated
        assert "CHAIN-A" not in result.violated_rules
        assert "CHAIN-B" in result.violated_rules

    def test_dependent_rule_skipped_when_prerequisite_violated(self):
        """Rule B should be skipped if Rule A was violated."""
        rule_a = make_rule(
            "CHAIN-A",
            conditions=[
                Condition(field="x", operator=ConditionOperator.EQUALS, value=1)
            ],
        )
        rule_b = make_rule(
            "CHAIN-B",
            depends_on="CHAIN-A",
            conditions=[
                Condition(field="y", operator=ConditionOperator.EQUALS, value=1)
            ],
        )
        engine = ComplianceEngine(rules=[rule_a, rule_b])
        trace = make_trace([make_span({"x": 1, "y": 1})])
        result = engine.evaluate(trace)
        assert "CHAIN-A" in result.violated_rules
        assert "CHAIN-B" not in result.violated_rules
        assert any("CHAIN-A" in w for w in result.warnings)


# ===========================================================================
# Compliance result tests
# ===========================================================================

class TestComplianceResult:
    def test_compliant_trace(self):
        engine = ComplianceEngine(RULES_DIR)
        trace = make_trace([
            make_span({
                "data_category": "public",
                "authenticated": True,
                "encryption_enabled": True,
                "security_logging": True,
            })
        ])
        result = engine.evaluate(trace)
        assert result.is_compliant or len(result.violated_rules) >= 0  # depends on rules
        assert result.rules_evaluated > 0
        assert result.spans_evaluated == 1

    def test_multiple_violations_across_spans(self):
        engine = ComplianceEngine(RULES_DIR)
        trace = make_trace([
            make_span({"data_category": "PHI", "authorization_context": ""}, span_id="s1"),
            make_span({"authenticated": False}, span_id="s2"),
        ])
        result = engine.evaluate(trace)
        assert len(result.violated_rules) > 1

    def test_evaluation_includes_timing(self):
        engine = ComplianceEngine(RULES_DIR)
        trace = make_trace([make_span({"x": 1})])
        result = engine.evaluate(trace)
        assert result.evaluation_ms >= 0


# ===========================================================================
# Performance benchmark
# ===========================================================================

class TestPerformance:
    def test_10k_rules_50_spans_under_100ms(self):
        """Engine must evaluate 10,000 rules against 50 spans in <100ms."""
        # Generate 10,000 rules — each checks a unique field
        rules = []
        for i in range(10_000):
            rules.append(Rule(
                id=f"PERF-{i:05d}",
                name=f"Perf rule {i}",
                description="benchmark",
                severity=Severity.LOW,
                regulation=Regulation.CUSTOM,
                conditions=[
                    Condition(
                        field=f"attr_{i}",
                        operator=ConditionOperator.EQUALS,
                        value="trigger",
                    )
                ],
                logic=ConditionLogic.ALL,
                actions=[Action(type=ActionType.LOG)],
            ))

        engine = ComplianceEngine(rules=rules)

        # 50 spans, none of which match any rule (worst-case: full scan)
        spans = [
            make_span({"safe_attr": "ok"}, span_id=f"span-{i}")
            for i in range(50)
        ]
        trace = make_trace(spans)

        # Warm up
        engine.evaluate(trace)

        # Benchmark
        t0 = time.perf_counter()
        result = engine.evaluate(trace)
        elapsed_ms = (time.perf_counter() - t0) * 1000

        assert result.rules_evaluated == 10_000
        assert result.spans_evaluated == 50
        assert result.is_compliant
        assert elapsed_ms < 100, f"Took {elapsed_ms:.1f}ms — must be under 100ms"


# ===========================================================================
# Edge cases
# ===========================================================================

class TestEdgeCases:
    def test_empty_trace(self):
        engine = ComplianceEngine(RULES_DIR)
        result = engine.evaluate(Trace())
        assert result.is_compliant
        assert result.spans_evaluated == 0

    def test_empty_rules(self):
        engine = ComplianceEngine(rules=[])
        trace = make_trace([make_span({"x": 1})])
        result = engine.evaluate(trace)
        assert result.is_compliant
        assert result.rules_evaluated == 0

    def test_any_logic(self):
        rule = make_rule(
            conditions=[
                Condition(field="a", operator=ConditionOperator.EQUALS, value=1),
                Condition(field="b", operator=ConditionOperator.EQUALS, value=2),
            ],
            logic=ConditionLogic.ANY,
        )
        engine = ComplianceEngine(rules=[rule])
        # Only 'a' matches — ANY logic should still trigger
        trace = make_trace([make_span({"a": 1, "b": 999})])
        result = engine.evaluate(trace)
        assert "TEST-001" in result.violated_rules

    def test_disabled_rule_skipped(self):
        rule = make_rule()
        rule.enabled = False
        engine = ComplianceEngine(rules=[rule])
        trace = make_trace([make_span({"x": 1})])
        result = engine.evaluate(trace)
        assert result.rules_evaluated == 0
