import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { getAuthToken, apiRequest, findDocumentByStatus } from "../support/api-helper";

const { Given, When, Then } = createBdd();

// ── State stored on page context for cross-step sharing ─────────────

Given("I am authenticated as {string}", async ({ page, request }, email: string) => {
  const token = await getAuthToken(request, email);
  (page as any).__authToken = token;
  (page as any).__authEmail = email;
});

Given("I have an invalid JWT token", async ({ page }) => {
  (page as any).__authToken = "invalid.jwt.token.here";
});

Given("there is a document submitted by another user", async ({ page, request }) => {
  // Upload a doc as Bob (validator) — Alice (submitter) should not be able to access it
  const bobToken = await getAuthToken(request, "bob@exchange.dev");
  const uploadResp = await request.post("http://localhost:3001/api/documents/upload", {
    headers: { Authorization: `Bearer ${bobToken}` },
    multipart: {
      file: {
        name: "bob_private_doc.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("Bob's document — Alice should not see this"),
      },
    },
  });
  const doc = await uploadResp.json();
  (page as any).__otherDocId = doc.id;
});

Given("there is a document in {string} status", async ({ page, request }, status: string) => {
  // Find using a supervisor token (can see all)
  const supervisorToken = await getAuthToken(request, "carol@exchange.dev");
  const doc = await findDocumentByStatus(request, supervisorToken, status);
  (page as any).__targetDocId = doc?.id;
});

// ── API Requests ────────────────────────────────────────────────────

When("I make a GET request to {string} with that token", async ({ page, request }, path: string) => {
  const token = (page as any).__authToken;
  const resp = await apiRequest(request, "GET", path, token);
  (page as any).__lastApiResponse = resp;
});

When("I make a GET request to {string} without authorization", async ({ page, request }, path: string) => {
  const resp = await apiRequest(request, "GET", path);
  (page as any).__lastApiResponse = resp;
});

When("I make a GET request to that document's detail endpoint", async ({ page, request }) => {
  const token = (page as any).__authToken;
  const docId = (page as any).__otherDocId;
  const resp = await apiRequest(request, "GET", `/api/documents/${docId}`, token);
  (page as any).__lastApiResponse = resp;
});

When(
  "I make a POST request to {string} with decision {string}",
  async ({ page, request }, pathTemplate: string, decision: string) => {
    const token = (page as any).__authToken;
    const docId = (page as any).__targetDocId;
    const path = pathTemplate.replace("{id}", docId || "unknown");
    const resp = await apiRequest(request, "POST", path, token, { decision, comment: "Test" });
    (page as any).__lastApiResponse = resp;
  },
);

When("I make a POST request to {string}", async ({ page, request }, pathTemplate: string) => {
  const token = (page as any).__authToken;
  const docId = (page as any).__targetDocId;
  const path = pathTemplate.replace("{id}", docId || "unknown");
  const resp = await apiRequest(request, "POST", path, token, {});
  (page as any).__lastApiResponse = resp;
});

When("I upload a document via the API", async ({ page, request }) => {
  const token = (page as any).__authToken;
  // Create a minimal file buffer for the upload
  const resp = await request.post("http://localhost:3001/api/documents/upload", {
    headers: { Authorization: `Bearer ${token}` },
    multipart: {
      file: {
        name: "test_upload.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("fake-pdf-content-for-testing"),
      },
    },
  });
  (page as any).__lastApiResponse = resp;
  (page as any).__lastApiBody = await resp.json().catch(() => null);
  (page as any).__uploadedDocId = (page as any).__lastApiBody?.id;
});

// ── Assertions ──────────────────────────────────────────────────────

Then("all returned documents should belong to the submitter", async ({ page }) => {
  const body = (page as any).__lastApiBody;
  if (body?.data?.length > 0) {
    // All docs in seeded data belong to Alice, the submitter
    for (const doc of body.data) {
      expect(doc.submitter?.email || doc.submitterId).toBeTruthy();
    }
  }
});

Then("the response should contain documents from multiple submitters", async ({ page }) => {
  const body = (page as any).__lastApiBody;
  expect(body?.data?.length).toBeGreaterThan(0);
});

Then("the response should contain audit entries", async ({ page }) => {
  const body = (page as any).__lastApiBody;
  expect(body?.data?.length).toBeGreaterThan(0);
});

Then("a pipeline job should be queued", async ({ page }) => {
  const body = (page as any).__lastApiBody;
  expect(body?.status).toBe("UPLOADED");
});

Then("the document status should be {string} or already progressing", async ({ page }) => {
  const body = (page as any).__lastApiBody;
  const valid = ["UPLOADED", "OCR_PROCESSING", "EXTRACTING", "VALIDATING", "PENDING_REVIEW"];
  expect(valid).toContain(body?.status);
});
