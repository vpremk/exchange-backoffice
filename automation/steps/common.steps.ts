import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { LoginPage } from "../pages/LoginPage";
import { apiRequest } from "../support/api-helper";

const { Given, When, Then } = createBdd();

// ── Shared Background ──────────────────────────────────────────────

Given("the application is running", async ({ page }) => {
  // Health check
  const resp = await page.request.get("http://localhost:3001/health");
  expect(resp.ok()).toBeTruthy();
});

Given("the database is seeded with test data", async () => {
  // Handled by seed script before test run — no-op in step
});

Given("I am logged in as {string}", async ({ page }, email: string) => {
  const loginPage = new LoginPage(page);
  await loginPage.loginAs(email);
});

// ── Generic UI Actions ─────────────────────────────────────────────

When("I click the {string} button", async ({ page }, label: string) => {
  await page.locator("button", { hasText: label }).click();
});

// ── Generic Navigation ─────────────────────────────────────────────

When("I try to navigate to {string}", async ({ page }, path: string) => {
  await page.goto(path);
  await page.waitForTimeout(1_000);
});

// ── Generic Assertions ─────────────────────────────────────────────

Then("I should see the text {string}", async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible();
});

Then("I should see the {string} section", async ({ page }, title: string) => {
  await expect(page.locator("h3", { hasText: title })).toBeVisible();
});

// ── API Helpers ────────────────────────────────────────────────────

When("I make a GET request to {string}", async ({ page, request }, path: string) => {
  const token = (page as any).__authToken;
  const resp = await apiRequest(request, "GET", path, token);
  (page as any).__lastApiResponse = resp;
  (page as any).__lastApiBody = await resp.json().catch(() => null);
});

Then("the API should respond with status {int}", async ({ page }, status: number) => {
  const resp = (page as any).__lastApiResponse;
  expect(resp.status()).toBe(status);
});
