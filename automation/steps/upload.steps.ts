import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { UploadPage } from "../pages/UploadPage";

const { Given, When, Then } = createBdd();

// ── Navigation ──────────────────────────────────────────────────────

Given("I am on the Upload page", async ({ page }) => {
  const uploadPage = new UploadPage(page);
  await uploadPage.goto();
});

Given("there is at least one uploaded document", async ({ page }) => {
  const uploadPage = new UploadPage(page);
  // Seeded data ensures there are documents
  await expect(uploadPage.documentsTable.locator("tbody tr").first()).toBeVisible({ timeout: 10_000 });
});

// ── Upload Actions ──────────────────────────────────────────────────

When("I upload the file {string}", async ({ page }, fileName: string) => {
  const uploadPage = new UploadPage(page);
  await uploadPage.uploadFile(fileName);
});

When("I wait for the pipeline to complete", async ({ page }) => {
  // Poll until the status changes from processing states
  await page.waitForTimeout(8_000);
});

When("I click on the first document name link", async ({ page }) => {
  const uploadPage = new UploadPage(page);
  await uploadPage.firstDocumentLink().click();
});

// ── Upload Assertions ───────────────────────────────────────────────

Then("I should see {string} indicator", async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible({ timeout: 5_000 });
});

Then("the document {string} should appear in {string}", async ({ page }, fileName: string) => {
  const uploadPage = new UploadPage(page);
  await uploadPage.expectDocumentInTable(fileName);
});

Then(
  "the document status should be one of {string}",
  async ({ page }, statusList: string) => {
    const statuses = statusList.split(",").map((s) => s.trim().replace(/_/g, " "));
    const badge = page.locator("table tbody tr:first-child span.rounded-full");
    await expect(badge).toBeVisible({ timeout: 15_000 });
    const text = await badge.textContent();
    const match = statuses.some((s) => text?.includes(s));
    expect(match).toBeTruthy();
  },
);

Then("the document status should eventually become {string}", async ({ page }, status: string) => {
  const displayStatus = status.replace(/_/g, " ");
  await expect(
    page.locator("table tbody tr:first-child span.rounded-full", { hasText: displayStatus }),
  ).toBeVisible({ timeout: 30_000 });
});

Then("I should be on a document detail page", async ({ page }) => {
  await expect(page).toHaveURL(/\/documents\//, { timeout: 5_000 });
});

Then("I should see the document file name in the header", async ({ page }) => {
  await expect(page.locator("h2")).toBeVisible();
  const text = await page.locator("h2").textContent();
  expect(text!.length).toBeGreaterThan(0);
});

Then("I should see at least {int} documents in {string}", async ({ page }, count: number) => {
  const uploadPage = new UploadPage(page);
  const rows = uploadPage.documentsTable.locator("tbody tr");
  const actual = await rows.count();
  expect(actual).toBeGreaterThanOrEqual(count);
});

Then("the documents table should have columns {string}", async ({ page }, columns: string) => {
  const uploadPage = new UploadPage(page);
  await uploadPage.expectTableColumns(columns.split(","));
});
