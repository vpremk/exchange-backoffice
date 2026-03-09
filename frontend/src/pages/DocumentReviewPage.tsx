import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocument, reviewDocument, assignDocument, retryDocument, getDownloadUrl } from "../lib/api";
import { useAuth } from "../lib/auth";
import StatusBadge from "../components/StatusBadge";

export default function DocumentReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: () => getDocument(id!),
    refetchInterval: 3000,
  });

  const review = useMutation({
    mutationFn: ({ decision }: { decision: string }) => reviewDocument(id!, decision, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", id] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });

  const assign = useMutation({
    mutationFn: () => assignDocument(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["document", id] }),
  });

  const retry = useMutation({
    mutationFn: () => retryDocument(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["document", id] }),
  });

  async function handleDownload() {
    const { url } = await getDownloadUrl(id!);
    window.open(url, "_blank");
  }

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (!doc) return <p className="text-red-500">Document not found</p>;

  const fields = doc.extractedFields || {};
  const validationErrors = doc.validationErrors || [];
  const canReview = ["VALIDATOR", "SUPERVISOR"].includes(user?.role || "") && doc.status === "PENDING_REVIEW";
  const canRetry = ["VALIDATOR", "SUPERVISOR"].includes(user?.role || "") && doc.status === "ERROR";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
            &larr; Back
          </button>
          <h2 className="text-lg font-semibold">{doc.fileName}</h2>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={doc.status} />
            <span className="text-sm text-gray-500">{doc.docType.replace(/_/g, " ")}</span>
            {doc.classConfidence && (
              <span className="text-xs text-gray-400">({(doc.classConfidence * 100).toFixed(0)}% confidence)</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
            Download
          </button>
          {canReview && !doc.assigneeId && (
            <button
              onClick={() => assign.mutate()}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Assign to Me
            </button>
          )}
          {canRetry && (
            <button
              onClick={() => retry.mutate()}
              className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Retry Pipeline
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {doc.errorReason && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          <strong>Error:</strong> {doc.errorReason}
        </div>
      )}

      {/* SLA info */}
      {doc.slaDeadline && (
        <div className="text-sm text-gray-500">
          SLA deadline: {new Date(doc.slaDeadline).toLocaleString()}
          {new Date(doc.slaDeadline) < new Date() && (
            <span className="ml-2 text-red-600 font-medium">BREACHED</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Extracted Fields */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium mb-3">Extracted Fields</h3>
          {Object.keys(fields).length === 0 ? (
            <p className="text-sm text-gray-400">No fields extracted yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(fields).map(([key, val]: [string, any]) => (
                <div key={key} className="border-b pb-2 last:border-0">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500 uppercase">{key.replace(/_/g, " ")}</span>
                    <span className="text-xs text-gray-400">{(val.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-sm font-medium">{val.value}</div>
                  <div className="text-xs text-gray-400 truncate" title={val.provenance}>
                    {val.provenance}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Validation Errors */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium mb-3">
            Validation Results
            {validationErrors.length > 0 && (
              <span className="ml-2 text-xs text-red-600">({validationErrors.length} issues)</span>
            )}
          </h3>
          {validationErrors.length === 0 ? (
            <p className="text-sm text-green-600">All validation rules passed</p>
          ) : (
            <div className="space-y-2">
              {validationErrors.map((err: any, i: number) => (
                <div
                  key={i}
                  className={`text-sm p-2 rounded ${
                    err.severity === "error" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"
                  }`}
                >
                  <span className="font-medium">{err.field}</span>: {err.message}
                  <span className="block text-xs opacity-75">Rule: {err.rule}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review section */}
      {canReview && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium mb-3">Submit Review</h3>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comment..."
            className="w-full border rounded p-2 text-sm mb-3 h-20 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => review.mutate({ decision: "APPROVED" })}
              disabled={review.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => review.mutate({ decision: "REJECTED" })}
              disabled={review.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => review.mutate({ decision: "CHANGES_REQUESTED" })}
              disabled={review.isPending}
              className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
            >
              Request Changes
            </button>
          </div>
          {review.isError && <p className="text-sm text-red-500 mt-2">{(review.error as Error).message}</p>}
        </div>
      )}

      {/* Review history */}
      {doc.reviews?.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium mb-3">Review History</h3>
          <div className="space-y-2">
            {doc.reviews.map((r: any) => (
              <div key={r.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                <StatusBadge status={r.decision} />
                <div>
                  <span className="font-medium">{r.reviewer.name}</span>
                  <span className="text-gray-400 ml-2">{new Date(r.createdAt).toLocaleString()}</span>
                  {r.comment && <p className="text-gray-600 mt-0.5">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
