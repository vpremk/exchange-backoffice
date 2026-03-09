const BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(init?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Auth
export const login = (email: string) =>
  request<{ token: string; user: any }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

// Documents
export const uploadDocument = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return request<any>("/documents/upload", { method: "POST", body: form });
};

export const listDocuments = (params?: Record<string, string>) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<{ data: any[]; total: number; page: number; limit: number }>(`/documents${qs}`);
};

export const getDocument = (id: string) => request<any>(`/documents/${id}`);

export const getDownloadUrl = (id: string) =>
  request<{ url: string }>(`/documents/${id}/download`);

export const assignDocument = (id: string, assigneeId?: string) =>
  request<any>(`/documents/${id}/assign`, {
    method: "POST",
    body: JSON.stringify({ assigneeId }),
  });

export const reviewDocument = (id: string, decision: string, comment?: string) =>
  request<any>(`/documents/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ decision, comment }),
  });

export const retryDocument = (id: string) =>
  request<any>(`/documents/${id}/retry`, { method: "POST" });

// Metrics
export const getOverview = () => request<any>("/metrics/overview");
export const getValidatorProductivity = () => request<any[]>("/metrics/validator-productivity");
export const getErrorReasons = () => request<any[]>("/metrics/error-reasons");
export const getSlaPerformance = () => request<any>("/metrics/sla-performance");
export const getAuditLog = (params?: Record<string, string>) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<{ data: any[]; total: number }>(`/metrics/audit-log${qs}`);
};
