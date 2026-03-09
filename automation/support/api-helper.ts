import { APIRequestContext } from "@playwright/test";

const API_BASE = "http://localhost:3001";

/**
 * Helper to get a JWT token for a test user by calling the login endpoint.
 */
export async function getAuthToken(request: APIRequestContext, email: string): Promise<string> {
  const resp = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email },
  });
  const body = await resp.json();
  return body.token;
}

/**
 * Authenticated API request helper.
 * Paths should include /api prefix, e.g. "/api/documents"
 */
export async function apiRequest(
  request: APIRequestContext,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  token?: string,
  data?: unknown,
) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const options: any = { headers };
  if (data) options.data = data;

  switch (method) {
    case "GET":
      return request.get(url, options);
    case "POST":
      return request.post(url, options);
    case "PUT":
      return request.put(url, options);
    case "DELETE":
      return request.delete(url, options);
  }
}

/**
 * Find a document in a specific status via the API.
 */
export async function findDocumentByStatus(
  request: APIRequestContext,
  token: string,
  status: string,
): Promise<any | null> {
  const resp = await apiRequest(request, "GET", `/api/documents?status=${status}&limit=1`, token);
  const body = await resp.json();
  return body.data?.[0] || null;
}

/**
 * Find a document that has been reviewed (has review history).
 */
export async function findReviewedDocument(
  request: APIRequestContext,
  token: string,
): Promise<any | null> {
  for (const status of ["APPROVED", "REJECTED", "CHANGES_REQUESTED"]) {
    const doc = await findDocumentByStatus(request, token, status);
    if (doc) {
      const detail = await apiRequest(request, "GET", `/api/documents/${doc.id}`, token);
      return detail.json();
    }
  }
  return null;
}

/**
 * Upload a fresh document via API and wait for it to reach a target status.
 */
export async function uploadAndWaitForStatus(
  request: APIRequestContext,
  token: string,
  targetStatus: string = "PENDING_REVIEW",
  timeoutMs: number = 15000,
): Promise<any> {
  const uploadResp = await request.post(`${API_BASE}/api/documents/upload`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: {
      file: {
        name: `test_${Date.now()}.pdf`,
        mimeType: "application/pdf",
        buffer: Buffer.from("TRADE CONFIRMATION\nCounterparty: Goldman Sachs\nQuantity: 100\nPrice: 50.00"),
      },
    },
  });
  const doc = await uploadResp.json();

  // Poll until target status
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const resp = await apiRequest(request, "GET", `/api/documents/${doc.id}`, token);
    const current = await resp.json();
    if (current.status === targetStatus || current.status === "ERROR") {
      return current;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  const resp = await apiRequest(request, "GET", `/api/documents/${doc.id}`, token);
  return resp.json();
}
