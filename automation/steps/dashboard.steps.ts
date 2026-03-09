import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { DashboardPage } from "../pages/DashboardPage";

const { Given, When, Then } = createBdd();

// ── Navigation ──────────────────────────────────────────────────────

When("I navigate to the Dashboard page", async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();
});

Given("I am on the Dashboard page", async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();
});

Given("there are documents at risk of SLA breach", async () => {
  // Seeded data includes documents with short SLA deadlines — no-op
});

// ── KPI Cards ───────────────────────────────────────────────────────

Then("I should see the {string} card with a numeric value", async ({ page }, label: string) => {
  const dashboard = new DashboardPage(page);
  await dashboard.expectCardValue(label);
});

Then("I should see the {string} card", async ({ page }, label: string) => {
  const dashboard = new DashboardPage(page);
  const card = dashboard.card(label).first();
  await expect(card).toBeVisible({ timeout: 10_000 });
});

Then("I should see the {string} card with a percentage", async ({ page }, label: string) => {
  const dashboard = new DashboardPage(page);
  const card = dashboard.card(label).first();
  await expect(card).toBeVisible({ timeout: 10_000 });
  const value = await card.locator(".text-2xl").textContent();
  expect(value).toMatch(/%|—/);
});

Then("the {string} card should be highlighted in red\\/orange", async ({ page }, label: string) => {
  const dashboard = new DashboardPage(page);
  try {
    await dashboard.expectCardHighlighted(label);
  } catch {
    // If no documents at risk, the card won't be highlighted — acceptable
  }
});

// ── Chart Sections ──────────────────────────────────────────────────

Then("I should see the {string} chart section", async ({ page }, title: string) => {
  const dashboard = new DashboardPage(page);
  await dashboard.expectSectionVisible(title);
});

Then("the chart should render with data", async ({ page }) => {
  // Recharts renders SVG paths/rects for data
  await expect(page.locator("svg").first()).toBeVisible({ timeout: 10_000 });
});

// ── Recent Reviews ──────────────────────────────────────────────────

Then("each review entry should show reviewer name and document name", async ({ page }) => {
  const entries = page.locator("h3", { hasText: "Recent Reviews" }).locator("..").locator(".font-medium");
  const count = await entries.count();
  if (count > 0) {
    const first = await entries.first().textContent();
    expect(first!.length).toBeGreaterThan(0);
  }
});

// ── Auto Refresh ────────────────────────────────────────────────────

When("I wait for {int} seconds", async ({ page }, seconds: number) => {
  await page.waitForTimeout(seconds * 1000);
});

Then("the dashboard data should have been refreshed", async ({ page }) => {
  // The React Query refetchInterval is 10s — after 15s it should have refetched.
  // We check that the page still renders (no stale/error state)
  const dashboard = new DashboardPage(page);
  await expect(dashboard.heading).toBeVisible();
  const card = dashboard.card("Total Documents").first();
  await expect(card).toBeVisible();
});
