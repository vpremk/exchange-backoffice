import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { LoginPage } from "../pages/LoginPage";
import { LayoutPage } from "../pages/LayoutPage";

const { Given, When, Then } = createBdd();

// ── Background ──────────────────────────────────────────────────────

Given("I am on the login page", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.isVisible();
});

Given("I am not authenticated", async () => {
  // No-op — just don't log in
});

// ── Login Actions ───────────────────────────────────────────────────

When("I click the login button for {string}", async ({ page }, email: string) => {
  const loginPage = new LoginPage(page);
  await loginPage.userButton(email).click();
  await page.waitForSelector("header", { timeout: 10_000 });
});

// ── Login Assertions ────────────────────────────────────────────────

Then("I should be logged in as {string}", async ({ page }, name: string) => {
  const layout = new LayoutPage(page);
  await layout.expectLoggedInAs(name);
});

Then("I should see my role as {string}", async ({ page }, role: string) => {
  const layout = new LayoutPage(page);
  await layout.expectRole(role);
});

Then("I should see the {string} nav link", async ({ page }, label: string) => {
  const layout = new LayoutPage(page);
  await layout.expectNavVisible(label);
});

Then("I should not see the {string} nav link", async ({ page }, label: string) => {
  const layout = new LayoutPage(page);
  await layout.expectNavHidden(label);
});

Then("I should be on the login page", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.isVisible();
});
