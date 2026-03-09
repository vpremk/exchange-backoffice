const colors: Record<string, string> = {
  UPLOADED: "bg-gray-100 text-gray-700",
  OCR_PROCESSING: "bg-blue-100 text-blue-700",
  EXTRACTING: "bg-blue-100 text-blue-700",
  VALIDATING: "bg-yellow-100 text-yellow-700",
  PENDING_REVIEW: "bg-orange-100 text-orange-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CHANGES_REQUESTED: "bg-purple-100 text-purple-700",
  ERROR: "bg-red-200 text-red-800",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || "bg-gray-100"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
