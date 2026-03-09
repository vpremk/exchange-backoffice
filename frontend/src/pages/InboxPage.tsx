import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listDocuments } from "../lib/api";
import { Link } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../lib/auth";

const STATUSES = [
  { value: "", label: "All" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CHANGES_REQUESTED", label: "Changes Requested" },
  { value: "ERROR", label: "Errors" },
];

export default function InboxPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [page, setPage] = useState(1);

  const params: Record<string, string> = { page: String(page), limit: "20" };
  if (status) params.status = status;

  const { data, isLoading } = useQuery({
    queryKey: ["inbox", status, page],
    queryFn: () => listDocuments(params),
    refetchInterval: 5000,
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  function slaIndicator(doc: any) {
    if (!doc.slaDeadline) return null;
    const remaining = new Date(doc.slaDeadline).getTime() - Date.now();
    const hours = remaining / (1000 * 60 * 60);
    if (hours < 0) return <span className="text-xs text-red-600 font-medium">SLA BREACHED</span>;
    if (hours < 1) return <span className="text-xs text-orange-600 font-medium">{"<1h left"}</span>;
    return <span className="text-xs text-gray-500">{hours.toFixed(1)}h left</span>;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Review Inbox</h2>

      {/* Filters */}
      <div className="flex gap-1 mb-4">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => { setStatus(s.value); setPage(1); }}
            className={`px-3 py-1 text-xs rounded-full border ${
              status === s.value
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">File</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">SLA</th>
                  <th className="pb-2 font-medium">Submitted By</th>
                  <th className="pb-2 font-medium">Assignee</th>
                  <th className="pb-2 font-medium">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((doc: any) => (
                  <tr key={doc.id} className="border-b hover:bg-gray-50">
                    <td className="py-2">
                      <Link to={`/documents/${doc.id}`} className="text-blue-600 hover:underline">
                        {doc.fileName}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-600">{doc.docType.replace(/_/g, " ")}</td>
                    <td className="py-2"><StatusBadge status={doc.status} /></td>
                    <td className="py-2">{slaIndicator(doc)}</td>
                    <td className="py-2 text-gray-600">{doc.submitter?.name}</td>
                    <td className="py-2 text-gray-600">{doc.assignee?.name || "—"}</td>
                    <td className="py-2 text-gray-500">{new Date(doc.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-gray-400">No documents found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex gap-2 mt-4 justify-center">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-sm border rounded disabled:opacity-30"
              >
                Prev
              </button>
              <span className="text-sm text-gray-500 py-1">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm border rounded disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
