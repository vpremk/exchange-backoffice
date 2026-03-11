import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCostData, useBudgetAlerts } from "@/hooks/useMockData";
import { cn, formatCost, formatNumber } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { AlertCircle, DollarSign, TrendingUp, Calculator } from "lucide-react";

const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: "#d97706",
  OpenAI: "#10b981",
  Google: "#3b82f6",
};

export default function CostsPage() {
  const { data: costs } = useCostData(30);
  const { data: budgetAlerts } = useBudgetAlerts();
  const [period, setPeriod] = useState<"7" | "14" | "30">("30");

  // Aggregate by date + provider
  const dailyByProvider = useMemo(() => {
    if (!costs) return [];
    const days = parseInt(period);
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    const map = new Map<string, { date: string; Anthropic: number; OpenAI: number; Google: number; [k: string]: string | number }>();
    for (const c of costs) {
      if (c.date < cutoff) continue;
      const entry = map.get(c.date) || { date: c.date, Anthropic: 0, OpenAI: 0, Google: 0 };
      entry[c.provider] = ((entry[c.provider] as number) || 0) + c.cost;
      map.set(c.date, entry);
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [costs, period]);

  // Aggregate by agent
  const byAgent = useMemo(() => {
    if (!costs) return [];
    const map = new Map<string, number>();
    for (const c of costs) map.set(c.agent, (map.get(c.agent) || 0) + c.cost);
    return [...map.entries()]
      .map(([agent, cost]) => ({ agent, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8);
  }, [costs]);

  // Aggregate by model
  const byModel = useMemo(() => {
    if (!costs) return [];
    const map = new Map<string, number>();
    for (const c of costs) map.set(c.model, (map.get(c.model) || 0) + c.cost);
    return [...map.entries()]
      .map(([model, cost]) => ({ model, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [costs]);

  const totalSpend = costs?.reduce((s, c) => s + c.cost, 0) ?? 0;
  const totalTokens = costs?.reduce((s, c) => s + c.inputTokens + c.outputTokens, 0) ?? 0;
  const avgDaily = dailyByProvider.length > 0 ? totalSpend / dailyByProvider.length : 0;

  // Anomaly detection: flag days > 2x average
  const anomalies = dailyByProvider
    .map((d) => {
      const dayTotal = (d.Anthropic || 0) + (d.OpenAI || 0) + (d.Google || 0);
      return { date: d.date, total: dayTotal, isAnomaly: dayTotal > avgDaily * 2 };
    })
    .filter((d) => d.isAnomaly);

  const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#10b981", "#6366f1", "#d946ef", "#eab308"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cost Analytics</h1>
        <div className="flex gap-1">
          {(["7", "14", "30"] as const).map((p) => (
            <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
              {p}d
            </Button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Spend</p>
            <p className="text-2xl font-bold mt-1">{formatCost(totalSpend)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Avg Daily</p>
            <p className="text-2xl font-bold mt-1">{formatCost(avgDaily)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Tokens</p>
            <p className="text-2xl font-bold mt-1">{formatNumber(totalTokens)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Anomalies Detected</p>
            <p className={cn("text-2xl font-bold mt-1", anomalies.length > 0 ? "text-orange-500" : "text-emerald-500")}>
              {anomalies.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost by provider over time */}
      <Card>
        <CardHeader>
          <CardTitle>Cost by Provider</CardTitle>
          <CardDescription>Daily spend stacked by LLM provider</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyByProvider}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
              <Tooltip formatter={(v: number) => formatCost(v)} />
              <Legend />
              <Bar dataKey="Anthropic" stackId="1" fill={PROVIDER_COLORS.Anthropic} />
              <Bar dataKey="OpenAI" stackId="1" fill={PROVIDER_COLORS.OpenAI} />
              <Bar dataKey="Google" stackId="1" fill={PROVIDER_COLORS.Google} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* By Agent */}
        <Card>
          <CardHeader><CardTitle>Cost by Agent</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byAgent} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" tickFormatter={(v: number) => `$${v.toFixed(0)}`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="agent" tick={{ fontSize: 10 }} width={160} />
                <Tooltip formatter={(v: number) => formatCost(v)} />
                <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                  {byAgent.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Model */}
        <Card>
          <CardHeader><CardTitle>Cost by Model</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={byModel} dataKey="cost" nameKey="model" cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2}>
                  {byModel.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCost(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alerts + ROI Calculator */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Budget Alerts</CardTitle>
            <CardDescription>Configure spend thresholds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {budgetAlerts?.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">{alert.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCost(alert.threshold)} / {alert.period}</p>
                  </div>
                  <Badge variant={alert.enabled ? "default" : "secondary"}>
                    {alert.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full">+ Add Alert</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <CardTitle>ROI Calculator</CardTitle>
            </div>
            <CardDescription>Agent cost vs estimated manual effort</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">AI Agent Cost (30d)</p>
                  <p className="text-xl font-bold">{formatCost(totalSpend)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Est. Manual Cost</p>
                  <p className="text-xl font-bold">{formatCost(totalSpend * 12.5)}</p>
                  <p className="text-[10px] text-muted-foreground">Based on $75/hr avg analyst rate</p>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm text-muted-foreground">Estimated Savings</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCost(totalSpend * 11.5)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((1 - 1 / 12.5) * 100).toFixed(0)}% cost reduction vs manual processing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
