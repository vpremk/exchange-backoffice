/**
 * Mock data generators — produce realistic data so the dashboard is
 * fully interactive in dev mode without a backend.
 */

import type {
  ActivityEvent, AgentStats, BudgetAlert, CostEntry, DashboardStats,
  Regulation, RuleStats, Severity, Span, SpanStatus, Trace, Violation,
} from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────

let _id = 0;
const uid = () => `${Date.now().toString(36)}-${(++_id).toString(36)}`;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max));
const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

const AGENTS = [
  "patient-lookup-agent", "claims-processor", "fraud-detector",
  "trade-surveillance-bot", "document-analyzer", "customer-support-agent",
  "onboarding-assistant", "audit-trail-agent",
  "loan-underwriting-agent", "mortgage-servicing-bot", "loan-estimate-generator",
  "hmda-reporting-agent",
];
const MODELS = ["claude-sonnet-4", "gpt-4o", "claude-haiku-4", "gpt-4o-mini", "gemini-2.0-flash"];
const REGULATIONS: Regulation[] = ["HIPAA", "SOX", "FINRA", "SOC2", "Mortgage"];
const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
const PROVIDERS = ["Anthropic", "OpenAI", "Google"];
const RULE_NAMES = [
  "PHI Access Without Authorization", "Financial Data Without Dual Approval",
  "Unauthorized Trade Execution", "Data Exfiltration Pattern",
  "Audit Trail Tampered", "PHI Unencrypted Transport",
  "Segregation of Duties Violation", "Position Limit Exceeded",
  "PII Without Classification", "Logging Disabled",
  "Fair Lending Violation - Prohibited Factor", "APR Disclosure Missing",
  "HMDA Data Integrity Violation", "Loan Estimate Timing Violation",
  "Kickback or Referral Fee Detected", "Redlining - Geographic Discrimination",
  "Borrower Consent Not Verified", "Servicing Transfer Notice Timing",
  "Escrow Analysis Accuracy Violation", "Adverse Action Notice Missing",
];

// Map mortgage rule names to their MORT IDs and metadata
const MORTGAGE_RULES: Array<{ id: string; name: string; severity: Severity; description: string }> = [
  { id: "MORT-001", name: "Fair Lending Violation - Prohibited Factor", severity: "critical", description: "Loan decision used prohibited borrower characteristic (race, sex, age) — ECOA Reg B violation" },
  { id: "MORT-002", name: "APR Disclosure Missing", severity: "critical", description: "Loan Estimate generated without valid APR calculation — TILA Reg Z violation" },
  { id: "MORT-003", name: "HMDA Data Integrity Violation", severity: "high", description: "HMDA-reportable loan data submitted with missing required fields — Reg C violation" },
  { id: "MORT-004", name: "Loan Estimate Timing Violation", severity: "critical", description: "Loan Estimate not provided within 3 business days of application — TILA-RESPA violation" },
  { id: "MORT-005", name: "Kickback or Referral Fee Detected", severity: "critical", description: "Unearned referral fee processed without documented services — RESPA Section 8 violation" },
  { id: "MORT-006", name: "Redlining - Geographic Discrimination", severity: "critical", description: "Loan decisions show adverse pattern in majority-minority census tracts — ECOA/Fair Housing violation" },
  { id: "MORT-007", name: "Borrower Consent Not Verified", severity: "critical", description: "Credit pull or AUS submission without documented borrower consent — FCRA/ECOA violation" },
  { id: "MORT-008", name: "Servicing Transfer Notice Timing", severity: "high", description: "Servicing transfer without required 15-day advance borrower notice — RESPA Reg X violation" },
  { id: "MORT-009", name: "Escrow Analysis Accuracy Violation", severity: "high", description: "Escrow surplus >$50 not refunded within required timeframe — RESPA Reg X violation" },
  { id: "MORT-010", name: "Adverse Action Notice Missing", severity: "critical", description: "Loan denial issued without adverse action notice with specific reasons — ECOA/FCRA violation" },
];

const MORTGAGE_AGENTS = ["loan-underwriting-agent", "mortgage-servicing-bot", "loan-estimate-generator", "hmda-reporting-agent"];

// ── Span generator ───────────────────────────────────────────────────

function generateSpan(depth: number, parentId: string | null, traceStart: number): Span {
  const model = depth === 1 ? pick(MODELS) : undefined;
  const inputTokens = model ? randInt(200, 4000) : undefined;
  const outputTokens = model ? randInt(100, 2000) : undefined;
  const cost = inputTokens && outputTokens ? (inputTokens * 3 + outputTokens * 15) / 1_000_000 : undefined;
  const dur = rand(5, depth === 0 ? 800 : 400);
  const start = traceStart + rand(0, 200);
  const statuses: SpanStatus[] = ["pass", "pass", "pass", "pass", "warn", "fail"];
  const spanNames = depth === 0
    ? ["agent-run", "pipeline-execute", "task-dispatch"]
    : depth === 1
      ? ["llm-call", "embedding-call", "completion"]
      : ["db-query", "api-call", "cache-lookup", "tool:search", "tool:calculator"];

  const span: Span = {
    spanId: uid(),
    parentId,
    name: pick(spanNames),
    startTime: start,
    endTime: start + dur,
    durationMs: Math.round(dur),
    status: pick(statuses),
    attributes: {
      ...(model && { model, input_tokens: inputTokens, output_tokens: outputTokens }),
      ...(depth === 0 && { agent: pick(AGENTS) }),
    },
    model,
    inputTokens,
    outputTokens,
    cost,
    children: [],
  };

  if (depth < 2) {
    const childCount = randInt(1, depth === 0 ? 4 : 3);
    for (let i = 0; i < childCount; i++) {
      span.children.push(generateSpan(depth + 1, span.spanId, start));
    }
  }
  return span;
}

function flattenSpans(span: Span): Span[] {
  return [span, ...span.children.flatMap(flattenSpans)];
}

// ── Trace generator ──────────────────────────────────────────────────

export function generateTrace(minutesAgo?: number): Trace {
  const root = generateSpan(0, null, 0);
  const allSpans = flattenSpans(root);
  const maxEnd = Math.max(...allSpans.map((s) => s.endTime));
  const violations: Violation[] = [];
  const hasFail = allSpans.some((s) => s.status === "fail");
  const agentName = pick(AGENTS);
  const isMortgageAgent = MORTGAGE_AGENTS.includes(agentName);

  if (hasFail) {
    if (isMortgageAgent) {
      // Use mortgage-specific violation details
      const mortRule = pick(MORTGAGE_RULES);
      violations.push({
        ruleId: mortRule.id,
        ruleName: mortRule.name,
        severity: mortRule.severity,
        regulation: "Mortgage" as Regulation,
        description: mortRule.description,
        spanId: allSpans.find((s) => s.status === "fail")?.spanId ?? "",
        spanName: allSpans.find((s) => s.status === "fail")?.name ?? "",
        timestamp: ago(minutesAgo ?? randInt(1, 300)),
      });
    } else {
      violations.push({
        ruleId: `${pick(REGULATIONS)}-${String(randInt(1, 10)).padStart(3, "0")}`,
        ruleName: pick(RULE_NAMES),
        severity: pick(SEVERITIES),
        regulation: pick(REGULATIONS),
        description: "Compliance rule violated during agent execution",
        spanId: allSpans.find((s) => s.status === "fail")?.spanId ?? "",
        spanName: allSpans.find((s) => s.status === "fail")?.name ?? "",
        timestamp: ago(minutesAgo ?? randInt(1, 300)),
      });
    }
  }

  const totalCost = allSpans.reduce((sum, s) => sum + (s.cost ?? 0), 0);
  const regulation = isMortgageAgent ? "Mortgage" as Regulation : pick(REGULATIONS);

  return {
    traceId: uid(),
    name: root.name,
    agentName,
    startTime: ago(minutesAgo ?? randInt(1, 1440)),
    durationMs: Math.round(maxEnd),
    spanCount: allSpans.length,
    status: hasFail ? "fail" : allSpans.some((s) => s.status === "warn") ? "warn" : "pass",
    violations,
    spans: allSpans,
    totalCost,
    regulation,
  };
}

export function generateTraces(count: number): Trace[] {
  return Array.from({ length: count }, (_, i) => generateTrace(i * 2));
}

// ── Dashboard stats ──────────────────────────────────────────────────

export function generateDashboardStats(): DashboardStats {
  return {
    complianceScore: rand(88, 99.5),
    totalTraces: randInt(12000, 50000),
    activeAgents: randInt(6, 15),
    costPerHour: rand(2.5, 18.0),
    violationsBySeverity: {
      critical: randInt(0, 5),
      high: randInt(3, 15),
      medium: randInt(10, 40),
      low: randInt(20, 80),
    },
  };
}

// ── Agent stats ──────────────────────────────────────────────────────

export function generateAgentStats(): AgentStats[] {
  return AGENTS.slice(0, 6).map((name) => ({
    agentName: name,
    traceCount: randInt(200, 5000),
    avgDuration: rand(100, 2000),
    complianceRate: rand(85, 100),
    totalCost: rand(5, 500),
  }));
}

// ── Rule stats ───────────────────────────────────────────────────────

export function generateRuleStats(): RuleStats[] {
  const NON_MORTGAGE_REGULATIONS: Regulation[] = ["HIPAA", "SOX", "FINRA", "SOC2"];
  // Non-mortgage rules (first 10)
  const baseRules = RULE_NAMES.slice(0, 10).map((name, i) => ({
    ruleId: `${pick(NON_MORTGAGE_REGULATIONS)}-${String(i + 1).padStart(3, "0")}`,
    ruleName: name,
    regulation: pick(NON_MORTGAGE_REGULATIONS),
    severity: pick(SEVERITIES),
    triggerCount: randInt(1, 200),
    falsePositiveRate: rand(0, 15),
  }));
  // Mortgage rules (MORT-001 through MORT-010)
  const mortgageRules = MORTGAGE_RULES.map((rule) => ({
    ruleId: rule.id,
    ruleName: rule.name,
    regulation: "Mortgage" as Regulation,
    severity: rule.severity,
    triggerCount: randInt(5, 150),
    falsePositiveRate: rand(0, 8),
  }));
  return [...baseRules, ...mortgageRules];
}

// ── Activity feed ────────────────────────────────────────────────────

export function generateActivityFeed(count: number): ActivityEvent[] {
  const actions = [
    "executed trace", "compliance check passed", "compliance violation detected",
    "cost threshold alert", "agent started", "agent completed", "rule evaluated",
    "MORT-001 fair lending check blocked", "loan estimate timing validated",
    "HMDA submission verified", "borrower consent confirmed",
    "MORT-006 redlining pattern flagged", "adverse action notice enforced",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: uid(),
    timestamp: ago(i * rand(0.5, 3)),
    agent: pick(AGENTS),
    action: pick(actions),
    status: pick(["pass", "pass", "pass", "warn", "fail"] as SpanStatus[]),
    detail: `Trace ${uid().slice(0, 8)} processed`,
  }));
}

// ── Cost data ────────────────────────────────────────────────────────

export function generateCostData(days: number): CostEntry[] {
  const entries: CostEntry[] = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
    for (let j = 0; j < randInt(3, 8); j++) {
      const model = pick(MODELS);
      const provider = model.startsWith("claude") ? "Anthropic" : model.startsWith("gpt") ? "OpenAI" : "Google";
      entries.push({
        date,
        agent: pick(AGENTS),
        model,
        provider,
        inputTokens: randInt(10000, 500000),
        outputTokens: randInt(5000, 200000),
        cost: rand(0.01, 25),
      });
    }
  }
  return entries;
}

// ── Violation timeline ───────────────────────────────────────────────

export function generateViolationTimeline(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - i - 1) * 86_400_000).toISOString().slice(0, 10);
    return {
      date,
      critical: randInt(0, 3),
      high: randInt(1, 8),
      medium: randInt(3, 15),
      low: randInt(5, 25),
    };
  });
}

// ── Budget alerts ────────────────────────────────────────────────────

export function generateBudgetAlerts(): BudgetAlert[] {
  return [
    { id: "1", name: "Daily spend limit", threshold: 100, period: "daily", enabled: true },
    { id: "2", name: "Weekly team budget", threshold: 500, period: "weekly", enabled: true },
    { id: "3", name: "Monthly org budget", threshold: 5000, period: "monthly", enabled: false },
    { id: "4", name: "Mortgage underwriting agents", threshold: 200, period: "daily", enabled: true },
    { id: "5", name: "HMDA reporting batch limit", threshold: 150, period: "weekly", enabled: true },
  ];
}
