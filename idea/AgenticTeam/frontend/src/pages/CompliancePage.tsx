import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useViolationTimeline, useRuleStats } from "@/hooks/useMockData";
import { cn, SEVERITY_COLORS } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Legend,
} from "recharts";
import { Download, FileText, Filter } from "lucide-react";

export default function CompliancePage() {
  const { data: timeline } = useViolationTimeline(30);
  const { data: rules } = useRuleStats();
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [regFilter, setRegFilter] = useState<string>("all");

  const filteredRules = useMemo(() => {
    if (!rules) return [];
    if (regFilter === "all") return rules;
    return rules.filter((r) => r.regulation === regFilter);
  }, [rules, regFilter]);

  const sortedByTrigger = useMemo(
    () => [...(filteredRules || [])].sort((a, b) => b.triggerCount - a.triggerCount),
    [filteredRules],
  );

  const ruleBarData = sortedByTrigger.slice(0, 8).map((r) => ({
    name: r.ruleId,
    triggers: r.triggerCount,
    falsePositives: Math.round(r.triggerCount * r.falsePositiveRate / 100),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compliance Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          <Button size="sm"><FileText className="h-4 w-4 mr-1" />Generate PDF Report</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="text-sm">From</span>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 h-8 text-sm" />
              <span className="text-sm">To</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 h-8 text-sm" />
            </div>
            <div className="flex gap-1">
              {["all", "HIPAA", "SOX", "FINRA", "SOC2", "Mortgage"].map((reg) => (
                <Button key={reg} size="sm" variant={regFilter === reg ? "default" : "outline"} onClick={() => setRegFilter(reg)}>
                  {reg === "all" ? "All" : reg}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Violation Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Violation Timeline</CardTitle>
          <CardDescription>Violations by severity over the past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="critical" stackId="1" stroke="#dc2626" fill="#dc2626" fillOpacity={0.8} />
              <Area type="monotone" dataKey="high" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.7} />
              <Area type="monotone" dataKey="medium" stackId="1" stroke="#eab308" fill="#eab308" fillOpacity={0.6} />
              <Area type="monotone" dataKey="low" stackId="1" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.5} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Rule Effectiveness */}
        <Card>
          <CardHeader>
            <CardTitle>Rule Effectiveness</CardTitle>
            <CardDescription>Trigger count vs false positives</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ruleBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="triggers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="falsePositives" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rule Table */}
        <Card>
          <CardHeader>
            <CardTitle>Rule Details</CardTitle>
            <CardDescription>{filteredRules.length} rules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[340px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b sticky top-0 bg-card">
                  <tr>
                    <th className="text-left py-2 px-2">Rule</th>
                    <th className="text-left py-2 px-2">Reg</th>
                    <th className="text-left py-2 px-2">Severity</th>
                    <th className="text-right py-2 px-2">Triggers</th>
                    <th className="text-right py-2 px-2">FP Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByTrigger.map((r) => (
                    <tr key={r.ruleId} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">
                        <div className="font-medium">{r.ruleId}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{r.ruleName}</div>
                      </td>
                      <td className="py-2 px-2"><Badge variant="outline" className="text-[10px]">{r.regulation}</Badge></td>
                      <td className="py-2 px-2"><Badge className={cn("text-[10px]", SEVERITY_COLORS[r.severity])}>{r.severity}</Badge></td>
                      <td className="py-2 px-2 text-right font-medium">{r.triggerCount}</td>
                      <td className="py-2 px-2 text-right">{r.falsePositiveRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
