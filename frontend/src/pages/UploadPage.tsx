import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadDocument, listDocuments } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import { Link } from "react-router-dom";

export default function UploadPage() {
  const queryClient = useQueryClient();
  const [dragActive, setDragActive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-documents"],
    queryFn: () => listDocuments({ page: "1", limit: "20" }),
    refetchInterval: 5000,
  });

  const upload = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-documents"] }),
  });

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach((f) => upload.mutate(f));
    },
    [upload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Upload Documents</h2>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
          dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300"
        }`}
      >
        <p className="text-gray-500 mb-2">Drag & drop files here, or</p>
        <label className="cursor-pointer inline-block px-4 py-2 bg-slate-900 text-white rounded text-sm hover:bg-slate-800">
          Browse Files
          <input
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
        <p className="text-xs text-gray-400 mt-2">PDF, PNG, JPG, DOCX up to 50 MB</p>
      </div>

      {upload.isPending && (
        <div className="mt-4 text-sm text-blue-600">Uploading...</div>
      )}
      {upload.isError && (
        <div className="mt-4 text-sm text-red-600">{(upload.error as Error).message}</div>
      )}

      {/* Recent uploads */}
      <h3 className="text-sm font-medium text-gray-500 mt-8 mb-3">My Recent Documents</h3>
      {isLoading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">File</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Status</th>
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
                  <td className="py-2 text-gray-500">{new Date(doc.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-gray-400">No documents yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
