import { Page, Locator, expect } from "@playwright/test";

export class InboxPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly documentsTable: Locator;
  readonly filterButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h2", { hasText: "Review Inbox" });
    this.documentsTable = page.locator("table");
    this.filterButtons = page.locator("button.rounded-full");
  }

  async goto() {
    await this.page.goto("/inbox");
    await expect(this.heading).toBeVisible();
  }

  filterButton(label: string): Locator {
    return this.page.locator("button.rounded-full", { hasText: label });
  }

  async clickFilter(label: string) {
    await this.filterButton(label).click();
    // Wait for data refresh
    await this.page.waitForTimeout(1000);
  }

  async expectTableColumns(columns: string[]) {
    for (const col of columns) {
      await expect(this.documentsTable.locator("thead th", { hasText: col })).toBeVisible();
    }
  }

  allStatusBadges(): Locator {
    return this.documentsTable.locator("tbody span.rounded-full");
  }

  firstDocumentLink(): Locator {
    return this.documentsTable.locator("tbody tr:first-child a");
  }

  slaIndicators(): Locator {
    return this.documentsTable.locator("tbody td:nth-child(4)");
  }

  async expectDocumentsVisible() {
    const rows = this.documentsTable.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
  }

  async expectNoDocuments() {
    await expect(this.page.getByText("No documents found")).toBeVisible();
  }

  async getDocumentCount(): Promise<number> {
    return this.documentsTable.locator("tbody tr").count();
  }
}
