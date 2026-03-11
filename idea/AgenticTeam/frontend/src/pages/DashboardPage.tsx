import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats, useAgentStats, useRuleStats, useActivityFeed } from "@/hooks/useMockData";
import { cn, formatCost, formatNumber, SEVERITY_COLORS, STATUS_COLORS, timeAgo } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { Activity, AlertTriangle, CheckCircle, DollarSign, Shield, Users } from "lucide-react";

const GAUGE_COLORS = ["#22c55e", "#eab308", "#ef4444"];

export default function DashboardPage() {
  const { data: stats } = useDashboardStats();
  const { data: agents } = useAgentStats();
  const { data: rules } = useRuleStats();
  const { data: activity } = useActivityFeed(15);

  if (!stats) return <div className="animate-pulse">Loading...</div>;

  const violationTotal = Object.values(stats.violationsBySeverity).reduce((a, b) => a + b, 0);
  const severityData = Object.entries(stats.violationsBySeverity).map(([severity, count]) => ({
    severity,
    count,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliance Score</p>
                <p className="text-3xl font-bold mt-1">{stats.complianceScore.toFixed(1)}%</p>
              </div>
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center",
                stats.complianceScore >= 95 ? "bg-emerald-100 text-emerald-600" : "bg-yellow-100 text-yellow-600",
              )}>
                <Shield className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Violations</p>
                <p className="text-3xl font-bold mt-1">{violationTotal}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {severityData.map(({ severity, count }) => (
                <Badge key={severity} className={cn("text-[10px]", SEVERITY_COLORS[severity])}>
                  {count} {severity}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Traces</p>
                <p className="text-3xl font-bold mt-1">{formatNumber(stats.totalTraces)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Activity className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{stats.activeAgents} active agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cost Burn Rate</p>
                <p className="text-3xl font-bold mt-1">{formatCost(stats.costPerHour)}/hr</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Top Agents by Volume */}
        <Card className="col-span-1">
          <CardHeader><CardTitle>Top Agents by Volume</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={agents?.slice(0, 5)} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="agentName" tick={{ fontSize: 11 }} width={140} />
                <Tooltip formatter={(v: number) => formatNumber(v)} />
                <Bar dataKey="traceCount" radius={[0, 4, 4, 0]}>
                  {agents?.slice(0, 5).map((_, i) => (
                    <Cell key={i} fill={["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Most Violated Rules */}
        <Card className="col-span-1">
          <CardHeader><CardTitle>Top Violated Rules</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rules?.sort((a, b) => b.triggerCount - a.triggerCount).slice(0, 5).map((rule) => (
                <div key={rule.ruleId} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rule.ruleName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{rule.regulation}</Badge>
                      <Badge className={cn("text-[10px]", SEVERITY_COLORS[rule.severity])}>{rule.severity}</Badge>
                    </div>
                  </div>
                  <span className="text-lg font-bold ml-3">{rule.triggerCount}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="col-span-1">
          <CardHeader><CardTitle>Live Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[280px] overflow-auto">
              {activity?.map((event) => (
                <div key={event.id} className="flex items-start gap-2">
                  <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", STATUS_COLORS[event.status])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{event.agent}</span>{" "}
                      <span className="text-muted-foreground">{event.action}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{timeAgo(event.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
