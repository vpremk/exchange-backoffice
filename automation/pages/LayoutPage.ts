import { Page, Locator, expect } from "@playwright/test";

export class LayoutPage {
  readonly page: Page;
  readonly header: Locator;
  readonly userName: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator("header");
    this.userName = page.locator("header span.text-slate-300");
    this.logoutButton = page.locator("button", { hasText: "Logout" });
  }

  navLink(label: string): Locator {
    return this.header.locator("a", { hasText: label });
  }

  async expectNavVisible(label: string) {
    await expect(this.navLink(label)).toBeVisible();
  }

  async expectNavHidden(label: string) {
    await expect(this.navLink(label)).toBeHidden();
  }

  async expectLoggedInAs(name: string) {
    await expect(this.userName).toContainText(name);
  }

  async expectRole(role: string) {
    await expect(this.header.locator(`text=${role}`)).toBeVisible();
  }

  async navigateTo(label: string) {
    await this.navLink(label).click();
  }

  async logout() {
    await this.logoutButton.click();
  }
}
