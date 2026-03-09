import { Page, Locator, expect } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h2", { hasText: "Dashboard" });
  }

  async goto() {
    await this.page.goto("/dashboard");
    await expect(this.heading).toBeVisible();
  }

  card(label: string): Locator {
    // KPI cards have a .text-xs label and a .text-2xl value
    return this.page.locator(".bg-white.border.rounded-lg.p-4").filter({
      has: this.page.locator(".text-xs", { hasText: label }),
    });
  }

  async expectCardValue(label: string) {
    const card = this.card(label).first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    const value = card.locator(".text-2xl");
    await expect(value).toBeVisible();
  }

  async expectCardHighlighted(label: string) {
    const card = this.card(label).first();
    const classes = await card.getAttribute("class");
    expect(classes).toMatch(/border-red|border-orange|bg-red|bg-orange/);
  }

  section(title: string): Locator {
    return this.page.locator("h3", { hasText: title }).locator("..");
  }

  async expectSectionVisible(title: string) {
    await expect(this.section(title)).toBeVisible();
  }

  async expectChartRendered(sectionTitle: string) {
    const section = this.section(sectionTitle);
    await expect(section.locator("svg").first()).toBeVisible({ timeout: 10_000 });
  }
}
