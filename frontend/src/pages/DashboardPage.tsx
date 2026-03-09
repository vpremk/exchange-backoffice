import { useQuery } from "@tanstack/react-query";
import { getOverview, getValidatorProductivity, getSlaPerformance, getErrorReasons } from "../lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  UPLOADED: "#9ca3af",
  OCR_PROCESSING: "#60a5fa",
  EXTRACTING: "#60a5fa",
  VALIDATING: "#fbbf24",
  PENDING_REVIEW: "#fb923c",
  APPROVED: "#34d399",
  REJECTED: "#f87171",
  CHANGES_REQUESTED: "#a78bfa",
  ERROR: "#ef4444",
};

export default function DashboardPage() {
  const { data: overview } = useQuery({ queryKey: ["overview"], queryFn: getOverview, refetchInterval: 10000 });
  const { data: productivity } = useQuery({ queryKey: ["productivity"], queryFn: getValidatorProductivity });
  const { data: sla } = useQuery({ queryKey: ["sla"], queryFn: getSlaPerformance });
  const { data: errors } = useQuery({ queryKey: ["errors"], queryFn: getErrorReasons });

  const statusData = overview
    ? Object.entries(overview.statusCounts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value, fill: STATUS_COLORS[name] || "#ccc" }))
    : [];

  const typeData = overview
    ? Object.entries(overview.docTypeCounts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
    : [];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Dashboard</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Total Documents" value={overview?.totalDocuments ?? "—"} />
        <Card label="Pending Review" value={overview?.statusCounts?.PENDING_REVIEW ?? 0} />
        <Card
          label="SLA At Risk"
          value={overview?.slaAtRisk ?? 0}
          className={overview?.slaAtRisk > 0 ? "border-red-300 bg-red-50" : ""}
        />
        <Card
          label="SLA Adherence"
          value={sla ? `${(sla.adherenceRate * 100).toFixed(0)}%` : "—"}
          className={sla && sla.adherenceRate < 0.8 ? "border-orange-300 bg-orange-50" : ""}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status distribution */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium mb-3 text-sm">Documents by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* By doc type */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium mb-3 text-sm">Documents by Type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={typeData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#475569" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Validator productivity */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium mb-3 text-sm">Validator Productivity (7 days)</h3>
          {productivity && productivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={productivity}>
                <XAxis dataKey="reviewerName" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="reviewCount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400">No reviews in the last 7 days</p>
          )}
        </div>

        {/* Error reasons */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium mb-3 text-sm">Top Error Reasons</h3>
          {errors && errors.length > 0 ? (
            <div className="space-y-2">
              {errors.map((e: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700 truncate max-w-xs">{e.reason}</span>
                  <span className="font-mono text-red-600">{e.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No errors recorded</p>
          )}
        </div>
      </div>

      {/* Recent reviews */}
      {overview?.recentReviews?.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium mb-3 text-sm">Recent Reviews</h3>
          <div className="space-y-1 text-sm">
            {overview.recentReviews.map((r: any) => (
              <div key={r.id} className="flex gap-3 text-gray-600">
                <span className="text-gray-400">{new Date(r.createdAt).toLocaleString()}</span>
                <span className="font-medium">{r.reviewer.name}</span>
                <span>reviewed</span>
                <span className="font-medium">{r.document.fileName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, className = "" }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
