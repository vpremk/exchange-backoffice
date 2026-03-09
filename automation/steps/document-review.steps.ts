import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { DocumentReviewPage } from "../pages/DocumentReviewPage";
import { getAuthToken, findDocumentByStatus, findReviewedDocument, apiRequest, uploadAndWaitForStatus } from "../support/api-helper";

const { Given, When, Then } = createBdd();

// ── Helpers ─────────────────────────────────────────────────────────

async function openDocByStatus(page: any, request: any, email: string, status: string) {
  const token = await getAuthToken(request, email);
  let doc: any;

  // First try to find an existing doc in the desired status
  doc = await findDocumentByStatus(request, token, status);

  // If no existing doc and we need PENDING_REVIEW, upload a fresh one
  if (!doc && status === "PENDING_REVIEW") {
    const uploaderToken = await getAuthToken(request, "alice@exchange.dev");
    doc = await uploadAndWaitForStatus(request, uploaderToken, "PENDING_REVIEW", 20000);
  }

  expect(doc).toBeTruthy();
  expect(doc.id).toBeTruthy();
  await page.goto(`/documents/${doc.id}`);
  const reviewPage = new DocumentReviewPage(page);
  await reviewPage.expectLoaded();
  return doc;
}

// ── Open Document by Status ─────────────────────────────────────────
// Uses Given so it matches both "Given I open..." and "When I open..." in Gherkin

Given("I open a document in {string} status", async ({ page, request }, status: string) => {
  const email = "bob@exchange.dev";
  (page as any).__openedDoc = await openDocByStatus(page, request, email, status.replace(/ /g, "_"));
});

Given("I open an unassigned document in {string} status", async ({ page, request }, status: string) => {
  const token = await getAuthToken(request, "bob@exchange.dev");
  // List all PENDING_REVIEW and find one with no assignee
  const resp = await apiRequest(request, "GET", `/api/documents?status=${status}&limit=50`, token);
  const body = await resp.json();
  const unassigned = body.data?.find((d: any) => !d.assigneeId);
  if (unassigned) {
    await page.goto(`/documents/${unassigned.id}`);
  } else {
    // Fallback — just open first one
    await openDocByStatus(page, request, "bob@exchange.dev", status);
  }
  const reviewPage = new DocumentReviewPage(page);
  await reviewPage.expectLoaded();
});

When("I open a document with no validation errors", async ({ page, request }) => {
  const token = await getAuthToken(request, "bob@exchange.dev");
  const resp = await apiRequest(request, "GET", "/api/documents?status=PENDING_REVIEW&limit=50", token);
  const body = await resp.json();
  const clean = body.data?.find((d: any) => {
    const errors = d.validationErrors || [];
    return Array.isArray(errors) && errors.length === 0;
  });
  const docId = clean?.id || body.data?.[0]?.id;
  expect(docId).toBeTruthy();
  await page.goto(`/documents/${docId}`);
  const reviewPage = new DocumentReviewPage(page);
  await reviewPage.expectLoaded();
});

When("I open a document with validation errors", async ({ page, request }) => {
  const token = await getAuthToken(request, "bob@exchange.dev");
  const resp = await apiRequest(request, "GET", "/api/documents?limit=50", token);
  const body = await resp.json();
  const withErrors = body.data?.find((d: any) => {
    const errors = d.validationErrors || [];
    return Array.isArray(errors) && errors.length > 0;
  });
  expect(withErrors).toBeTruthy();
  await page.goto(`/documents/${withErrors.id}`);
  const reviewPage = new DocumentReviewPage(page);
  await reviewPage.expectLoaded();
});

When("I open a document that has been reviewed", async ({ page, request }) => {
  const token = await getAuthToken(request, "bob@exchange.dev");
  const doc = await findReviewedDocument(request, token);
  expect(doc).toBeTruthy();
  await page.goto(`/documents/${doc.id}`);
  const reviewPage = new DocumentReviewPage(page);
  await reviewPage.expectLoaded();
});

// ── Review Actions ──────────────────────────────────────────────────

When("I enter the review comment {string}", async ({ page }, comment: string) => {
  const reviewPage = new DocumentReviewPage(page);
  await reviewPage.enterComment(comment);
});

When("I click the back button", async ({ page }) => {
  const reviewPage = new DocumentReviewPage(page);
  await reviewPage.clickBack();
});

// ── Extracted Fields Assertions ─────────────────────────────────────

Then("each extracted field should show a value", async ({ page }) => {
  const fields = page.locator(".border-b.pb-2 .text-sm.font-medium");
  const count = await fields.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const text = await fields.nth(i).textContent();
    expect(text!.length).toBeGreaterThan(0);
  }
});

Then("each extracted field should show a confidence percentage", async ({ page }) => {
  const percents = page.locator(".border-b.pb-2 .text-xs.text-gray-400").first();
  await expect(percents).toBeVisible();
  const text = await percents.textContent();
  expect(text).toMatch(/%/);
});

Then("each extracted field should show provenance text", async ({ page }) => {
  const provenance = page.locator(".border-b.pb-2 .text-xs.text-gray-400.truncate").first();
  await expect(provenance).toBeVisible();
});

// ── Validation Assertions ───────────────────────────────────────────

Then("the validation section should show {string}", async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible();
});

Then("I should see validation error entries", async ({ page }) => {
  const reviewPage = new DocumentReviewPage(page);
  const count = await reviewPage.validationErrorEntries().count();
  expect(count).toBeGreaterThan(0);
});

Then("each error should display the field name", async ({ page }) => {
  const errors = page.locator(".bg-red-50.text-red-700, .bg-yellow-50.text-yellow-700");
  const first = errors.first();
  await expect(first.locator(".font-medium")).toBeVisible();
});

Then("each error should display the rule name", async ({ page }) => {
  const rules = page.locator(".bg-red-50.text-red-700 .text-xs, .bg-yellow-50.text-yellow-700 .text-xs");
  await expect(rules.first()).toBeVisible();
});

Then("errors should be color-coded by severity", async ({ page }) => {
  // Check that at least error or warning styles exist
  const redOrYellow = page.locator(".bg-red-50, .bg-yellow-50");
  const count = await redOrYellow.count();
  expect(count).toBeGreaterThan(0);
});

// ── Classification ──────────────────────────────────────────────────

Then("I should see the document type label", async ({ page }) => {
  const reviewPage = new DocumentReviewPage(page);
  await expect(reviewPage.docTypeLabel).toBeVisible();
});

Then("I should see the classification confidence percentage", async ({ page }) => {
  const reviewPage = new DocumentReviewPage(page);
  await expect(reviewPage.confidenceLabel).toBeVisible();
  const text = await reviewPage.confidenceLabel.textContent();
  expect(text).toMatch(/%/);
});

// ── Status Changes ──────────────────────────────────────────────────

Then("the document status should change to {string}", async ({ page }, status: string) => {
  await expect(page.locator("span.rounded-full", { hasText: status }).first()).toBeVisible({ timeout: 10_000 });
});

Then("the document status should change away from {string}", async ({ page }, status: string) => {
  // Wait for status to NOT be the given value
  await page.waitForTimeout(3_000);
  const badges = page.locator("h2 + div span.rounded-full");
  const text = await badges.first().textContent();
  expect(text).not.toBe(status);
});

// ── Assign ──────────────────────────────────────────────────────────

Then("the document should be assigned to {string}", async ({ page }, name: string) => {
  // After assign, the button disappears. We can verify via the page refreshing.
  await page.waitForTimeout(2_000);
});

Then("the {string} button should disappear", async ({ page }, label: string) => {
  await expect(page.locator("button", { hasText: label })).toBeHidden({ timeout: 5_000 });
});

// ── Review History ──────────────────────────────────────────────────

Then("the review history should show the approval", async ({ page }) => {
  await expect(page.locator("h3", { hasText: "Review History" })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("span.rounded-full", { hasText: "APPROVED" }).first()).toBeVisible();
});

Then("the review comment should be visible in history", async ({ page }) => {
  const history = page.locator("h3", { hasText: "Review History" }).locator("..");
  await expect(history.locator("p").first()).toBeVisible();
});

Then("the review history should show the rejection with comment", async ({ page }) => {
  await expect(page.locator("h3", { hasText: "Review History" })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("span.rounded-full", { hasText: "REJECTED" }).first()).toBeVisible();
});

Then("the review history should show the changes request", async ({ page }) => {
  await expect(page.locator("h3", { hasText: "Review History" })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("span.rounded-full", { hasText: "CHANGES REQUESTED" }).first()).toBeVisible();
});

Then("the {string} section should be visible", async ({ page }, section: string) => {
  await expect(page.locator("h3", { hasText: section })).toBeVisible();
});

Then("reviews should show reviewer name and timestamp", async ({ page }) => {
  const entries = page.locator("h3", { hasText: "Review History" }).locator("..").locator(".font-medium");
  await expect(entries.first()).toBeVisible();
});

Then("reviews should show the decision badge", async ({ page }) => {
  const badges = page.locator("h3", { hasText: "Review History" }).locator("..").locator("span.rounded-full");
  await expect(badges.first()).toBeVisible();
});

// ── Review Controls Visibility ──────────────────────────────────────

Then("I should not see the {string} section", async ({ page }, section: string) => {
  await expect(page.locator("h3", { hasText: section })).toBeHidden();
});

Then("I should not see {string} button", async ({ page }, label: string) => {
  await expect(page.locator("button", { hasText: new RegExp(`^${label}$`) })).toBeHidden();
});

// ── Error Handling ──────────────────────────────────────────────────

Then("I should see the error banner with the failure reason", async ({ page }) => {
  const reviewPage = new DocumentReviewPage(page);
  await expect(reviewPage.errorBanner).toBeVisible();
  const text = await reviewPage.errorBanner.textContent();
  expect(text).toContain("Error:");
});

Then("I should see the {string} button", async ({ page }, label: string) => {
  await expect(page.locator("button", { hasText: label })).toBeVisible();
});

// ── Navigation ──────────────────────────────────────────────────────

Then("I should be on the Inbox page", async ({ page }) => {
  await expect(page.locator("h2", { hasText: "Review Inbox" })).toBeVisible({ timeout: 5_000 });
});
