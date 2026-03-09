import { Page, Locator, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly subtitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h1", { hasText: "Exchange Back-Office" });
    this.subtitle = page.getByText("Document Validation Workflow");
  }

  async goto() {
    await this.page.goto("/");
  }

  async isVisible() {
    await expect(this.subtitle).toBeVisible();
  }

  userButton(email: string): Locator {
    return this.page.locator("button", { hasText: email });
  }

  async loginAs(email: string) {
    await this.goto();
    await this.userButton(email).click();
    // Wait for navigation away from login
    await this.page.waitForSelector("header", { timeout: 10_000 });
  }
}
