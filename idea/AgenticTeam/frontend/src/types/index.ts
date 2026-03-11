export type Severity = "critical" | "high" | "medium" | "low";
export type Regulation = "HIPAA" | "SOX" | "FINRA" | "SOC2" | "custom";
export type SpanStatus = "pass" | "warn" | "fail";

export interface Span {
  spanId: string;
  parentId: string | null;
  name: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  status: SpanStatus;
  attributes: Record<string, unknown>;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  children: Span[];
}

export interface Trace {
  traceId: string;
  name: string;
  agentName: string;
  startTime: string;
  durationMs: number;
  spanCount: number;
  status: SpanStatus;
  violations: Violation[];
  spans: Span[];
  totalCost: number;
  regulation: Regulation;
}

export interface Violation {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  regulation: Regulation;
  description: string;
  spanId: string;
  spanName: string;
  timestamp: string;
}

export interface RuleStats {
  ruleId: string;
  ruleName: string;
  regulation: Regulation;
  severity: Severity;
  triggerCount: number;
  falsePositiveRate: number;
}

export interface AgentStats {
  agentName: string;
  traceCount: number;
  avgDuration: number;
  complianceRate: number;
  totalCost: number;
}

export interface CostEntry {
  date: string;
  agent: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface BudgetAlert {
  id: string;
  name: string;
  threshold: number;
  period: "daily" | "weekly" | "monthly";
  enabled: boolean;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  status: SpanStatus;
  detail: string;
}

export interface DashboardStats {
  complianceScore: number;
  totalTraces: number;
  activeAgents: number;
  costPerHour: number;
  violationsBySeverity: Record<Severity, number>;
}
