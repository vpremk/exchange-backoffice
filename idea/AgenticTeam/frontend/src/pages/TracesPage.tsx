import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTraces } from "@/hooks/useMockData";
import { cn, formatCost, formatDuration, SEVERITY_COLORS, STATUS_COLORS, timeAgo } from "@/lib/utils";
import type { Span, Trace } from "@/types";
import { ChevronDown, ChevronRight, Clock, Eye, EyeOff, Play, Search } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { pass: "Pass", warn: "Warn", fail: "Fail" };
  const colors: Record<string, string> = {
    pass: "bg-emerald-100 text-emerald-700",
    warn: "bg-yellow-100 text-yellow-700",
    fail: "bg-red-100 text-red-700",
  };
  return <Badge className={cn("text-[10px]", colors[status])}>{labels[status]}</Badge>;
}

// ── Span Waterfall ───────────────────────────────────────────────────

function SpanRow({ span, maxTime, depth = 0 }: { span: Span; maxTime: number; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showPii, setShowPii] = useState(false);
  const leftPct = maxTime > 0 ? (span.startTime / maxTime) * 100 : 0;
  const widthPct = maxTime > 0 ? Math.max((span.durationMs / maxTime) * 100, 1) : 100;
  const barColor = span.status === "fail" ? "bg-red-400" : span.status === "warn" ? "bg-yellow-400" : "bg-blue-400";

  return (
    <>
      <div
        className="flex items-center border-b hover:bg-muted/50 cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-[260px] shrink-0 flex items-center gap-1 px-2 py-1.5 text-sm" style={{ paddingLeft: depth * 16 + 8 }}>
          {span.children.length > 0 ? (
            expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          ) : <span className="w-3" />}
          <span className="truncate font-mono text-xs">{span.name}</span>
          <StatusBadge status={span.status} />
        </div>
        <div className="flex-1 relative h-6">
          <div
            className={cn("absolute h-4 top-1 rounded-sm", barColor)}
            style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 4 }}
          />
          <span className="absolute right-2 top-0.5 text-[10px] text-muted-foreground">
            {formatDuration(span.durationMs)}
          </span>
        </div>
        <div className="w-32 shrink-0 text-xs text-right px-2">
          {span.model && <span className="text-muted-foreground">{span.model}</span>}
        </div>
        <div className="w-20 shrink-0 text-xs text-right px-2">
          {span.cost != null && formatCost(span.cost)}
        </div>
      </div>

      {expanded && (
        <div className="border-b bg-muted/30 px-4 py-3 text-xs space-y-2" style={{ paddingLeft: depth * 16 + 32 }}>
          <div className="flex items-center gap-4">
            {span.inputTokens != null && <span>Input: {span.inputTokens} tokens</span>}
            {span.outputTokens != null && <span>Output: {span.outputTokens} tokens</span>}
            <button
              className="flex items-center gap-1 text-primary hover:underline"
              onClick={(e) => { e.stopPropagation(); setShowPii(!showPii); }}
            >
              {showPii ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showPii ? "Hide PII" : "Show PII"}
            </button>
          </div>
          <div className="font-mono bg-background rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">
            {Object.entries(span.attributes).map(([k, v]) => (
              <div key={k}>
                <span className="text-muted-foreground">{k}:</span>{" "}
                {showPii ? String(v) : String(v).replace(/\b\d{3}-\d{2}-\d{4}\b/g, "***-**-****")}
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && span.children.map((child) => (
        <SpanRow key={child.spanId} span={child} maxTime={maxTime} depth={depth + 1} />
      ))}
    </>
  );
}

function TraceWaterfall({ trace }: { trace: Trace }) {
  const rootSpans = trace.spans.filter((s) => s.parentId === null);
  const maxTime = Math.max(...trace.spans.map((s) => s.endTime), 1);

  return (
    <div className="border rounded-lg overflow-hidden text-sm">
      <div className="flex items-center bg-muted/50 border-b px-2 py-1 text-xs font-medium text-muted-foreground">
        <div className="w-[260px] shrink-0">Span</div>
        <div className="flex-1">Timeline</div>
        <div className="w-32 shrink-0 text-right">Model</div>
        <div className="w-20 shrink-0 text-right">Cost</div>
      </div>
      {rootSpans.map((span) => (
        <SpanRow key={span.spanId} span={span} maxTime={maxTime} />
      ))}
    </div>
  );
}

// ── Trace List ───────────────────────────────────────────────────────

export default function TracesPage() {
  const { data: traces } = useTraces(60);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [replayIdx, setReplayIdx] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (!traces) return [];
    return traces.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (search && !t.agentName.toLowerCase().includes(search.toLowerCase()) && !t.traceId.includes(search)) return false;
      return true;
    });
  }, [traces, search, statusFilter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trace Explorer</h1>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by agent name or trace ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {["all", "pass", "warn", "fail"].map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}>
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Trace list */}
        <div className="col-span-1 space-y-2 max-h-[calc(100vh-220px)] overflow-auto">
          {filtered.map((trace) => (
            <div
              key={trace.traceId}
              className={cn(
                "border rounded-lg p-3 cursor-pointer transition-colors",
                selectedTrace?.traceId === trace.traceId ? "border-primary bg-primary/5" : "hover:bg-muted/50",
              )}
              onClick={() => { setSelectedTrace(trace); setReplayIdx(null); }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{trace.agentName}</span>
                <StatusBadge status={trace.status} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(trace.durationMs)}</span>
                <span>{trace.spanCount} spans</span>
                <span>{formatCost(trace.totalCost)}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(trace.startTime)}</div>
              {trace.violations.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {trace.violations.map((v) => (
                    <Badge key={v.ruleId} className={cn("text-[10px]", SEVERITY_COLORS[v.severity])}>
                      {v.ruleId}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Trace detail */}
        <div className="col-span-2">
          {selectedTrace ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{selectedTrace.agentName}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Trace {selectedTrace.traceId.slice(0, 12)}... | {formatDuration(selectedTrace.durationMs)} | {selectedTrace.spanCount} spans
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (replayIdx === null) setReplayIdx(0);
                      else if (replayIdx < selectedTrace.spans.length - 1) setReplayIdx(replayIdx + 1);
                      else setReplayIdx(null);
                    }}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    {replayIdx !== null ? `Step ${replayIdx + 1}/${selectedTrace.spans.length}` : "Replay"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <TraceWaterfall trace={
                  replayIdx !== null
                    ? { ...selectedTrace, spans: selectedTrace.spans.slice(0, replayIdx + 1) }
                    : selectedTrace
                } />

                {selectedTrace.violations.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-semibold text-destructive">Violations</h4>
                    {selectedTrace.violations.map((v) => (
                      <div key={v.ruleId} className="border border-destructive/30 rounded-md p-3 bg-destructive/5">
                        <div className="flex items-center gap-2">
                          <Badge className={cn(SEVERITY_COLORS[v.severity])}>{v.severity}</Badge>
                          <span className="font-medium text-sm">{v.ruleId}: {v.ruleName}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{v.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Select a trace to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
