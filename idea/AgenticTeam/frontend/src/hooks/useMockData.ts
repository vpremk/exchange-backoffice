import { useQuery } from "@tanstack/react-query";
import {
  generateActivityFeed, generateAgentStats, generateBudgetAlerts,
  generateCostData, generateDashboardStats, generateRuleStats,
  generateTraces, generateViolationTimeline,
} from "@/mocks/generators";

export function useDashboardStats() {
  return useQuery({ queryKey: ["dashboardStats"], queryFn: () => generateDashboardStats() });
}

export function useTraces(count = 50) {
  return useQuery({ queryKey: ["traces", count], queryFn: () => generateTraces(count) });
}

export function useAgentStats() {
  return useQuery({ queryKey: ["agentStats"], queryFn: () => generateAgentStats() });
}

export function useRuleStats() {
  return useQuery({ queryKey: ["ruleStats"], queryFn: () => generateRuleStats() });
}

export function useActivityFeed(count = 20) {
  return useQuery({
    queryKey: ["activityFeed"],
    queryFn: () => generateActivityFeed(count),
    refetchInterval: 5_000,
  });
}

export function useCostData(days = 30) {
  return useQuery({ queryKey: ["costData", days], queryFn: () => generateCostData(days) });
}

export function useViolationTimeline(days = 30) {
  return useQuery({ queryKey: ["violationTimeline", days], queryFn: () => generateViolationTimeline(days) });
}

export function useBudgetAlerts() {
  return useQuery({ queryKey: ["budgetAlerts"], queryFn: () => generateBudgetAlerts() });
}
