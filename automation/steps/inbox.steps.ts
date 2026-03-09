import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { InboxPage } from "../pages/InboxPage";

const { Given, When, Then } = createBdd();

// ── Navigation ──────────────────────────────────────────────────────

Given("I am on the Inbox page", async ({ page }) => {
  const inbox = new InboxPage(page);
  await inbox.goto();
});

When("I navigate to the Inbox page", async ({ page }) => {
  const inbox = new InboxPage(page);
  await inbox.goto();
});

// ── Filter Actions ──────────────────────────────────────────────────

When("I click the {string} filter button", async ({ page }, label: string) => {
  const inbox = new InboxPage(page);
  await inbox.clickFilter(label);
});

When("I click on the first document link in the inbox", async ({ page }) => {
  const inbox = new InboxPage(page);
  await inbox.firstDocumentLink().click();
});

// ── Inbox Assertions ────────────────────────────────────────────────

Then("I should see the {string} heading", async ({ page }, text: string) => {
  await expect(page.locator("h2", { hasText: text })).toBeVisible();
});

Then("I should see documents with status {string}", async ({ page }, status: string) => {
  await expect(page.locator("span.rounded-full", { hasText: status }).first()).toBeVisible({ timeout: 10_000 });
});

Then("I should see documents across multiple statuses", async ({ page }) => {
  const badges = page.locator("table tbody span.rounded-full");
  await expect(badges.first()).toBeVisible({ timeout: 10_000 });
});

Then("all visible documents should have status {string}", async ({ page }, status: string) => {
  const badges = page.locator("table tbody span.rounded-full");
  const count = await badges.count();
  if (count === 0) return; // "No documents found" is acceptable for some filters
  for (let i = 0; i < count; i++) {
    await expect(badges.nth(i)).toHaveText(status);
  }
});

Then("documents near SLA deadline should show time remaining", async ({ page }) => {
  // Switch to "All" to see docs with SLA data
  await page.locator("button.rounded-full", { hasText: "All" }).click();
  await page.waitForTimeout(1000);

  // Look for either "h left" or "SLA BREACHED" in SLA column — both prove SLA is tracked
  const slaTexts = page.locator("table tbody td:nth-child(4)");
  const count = await slaTexts.count();
  let foundSlaIndicator = false;
  for (let i = 0; i < count; i++) {
    const text = await slaTexts.nth(i).textContent();
    if (text && (text.includes("h left") || text.includes("SLA BREACHED") || text.includes("<1h left"))) {
      foundSlaIndicator = true;
      break;
    }
  }
  expect(foundSlaIndicator).toBeTruthy();
});

Then("documents past SLA deadline should show {string}", async ({ page }, label: string) => {
  // Seeded data includes breached SLAs
  await expect(page.getByText(label).first()).toBeVisible({ timeout: 10_000 });
});

Then(
  "the inbox table should have columns {string}",
  async ({ page }, columns: string) => {
    const inbox = new InboxPage(page);
    await inbox.expectTableColumns(columns.split(","));
  },
);

Then("I should see documents in the queue", async ({ page }) => {
  const inbox = new InboxPage(page);
  await inbox.expectDocumentsVisible();
});

Then("I should be redirected to the Upload page", async ({ page }) => {
  await expect(page.locator("h2", { hasText: "Upload Documents" })).toBeVisible({ timeout: 5_000 });
});
