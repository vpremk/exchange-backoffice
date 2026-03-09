import { Page, Locator, expect } from "@playwright/test";
import path from "path";

export class UploadPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly fileInput: Locator;
  readonly uploadingIndicator: Locator;
  readonly documentsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h2", { hasText: "Upload Documents" });
    this.fileInput = page.locator('input[type="file"]');
    this.uploadingIndicator = page.getByText("Uploading...");
    this.documentsTable = page.locator("table");
  }

  async goto() {
    await this.page.goto("/");
    await expect(this.heading).toBeVisible();
  }

  async uploadFile(fileName: string) {
    const filePath = path.resolve(__dirname, "..", "fixtures", "files", fileName);
    await this.fileInput.setInputFiles(filePath);
  }

  async expectDocumentInTable(fileName: string) {
    await expect(this.documentsTable.locator(`text=${fileName}`)).toBeVisible({ timeout: 15_000 });
  }

  async expectMinDocumentCount(count: number) {
    const rows = this.documentsTable.locator("tbody tr");
    await expect(rows).toHaveCount(count, { timeout: 15_000 });
  }

  async expectTableColumns(columns: string[]) {
    for (const col of columns) {
      await expect(this.documentsTable.locator("thead th", { hasText: col })).toBeVisible();
    }
  }

  firstDocumentLink(): Locator {
    return this.documentsTable.locator("tbody tr:first-child a");
  }

  documentStatusCell(fileName: string): Locator {
    return this.documentsTable.locator("tr", { hasText: fileName }).locator("span");
  }
}
