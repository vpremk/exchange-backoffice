import { Page, Locator, expect } from "@playwright/test";

export class DocumentReviewPage {
  readonly page: Page;
  readonly backButton: Locator;
  readonly fileName: Locator;
  readonly statusBadge: Locator;
  readonly docTypeLabel: Locator;
  readonly confidenceLabel: Locator;
  readonly downloadButton: Locator;
  readonly assignButton: Locator;
  readonly retryButton: Locator;
  readonly errorBanner: Locator;
  readonly extractedFieldsSection: Locator;
  readonly validationSection: Locator;
  readonly reviewSection: Locator;
  readonly reviewHistorySection: Locator;
  readonly commentInput: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly requestChangesButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.backButton = page.locator("button", { hasText: "Back" });
    this.fileName = page.locator("h2");
    this.statusBadge = page.locator("h2 + div span.rounded-full").first();
    this.docTypeLabel = page.locator("h2 + div span.text-sm");
    this.confidenceLabel = page.locator("h2 + div").getByText(/\d+(\.\d+)?%\s*confidence|%/);
    this.downloadButton = page.locator("button", { hasText: "Download" });
    this.assignButton = page.locator("button", { hasText: "Assign to Me" });
    this.retryButton = page.locator("button", { hasText: "Retry Pipeline" });
    this.errorBanner = page.locator(".bg-red-50.border-red-200");
    this.extractedFieldsSection = page.locator("div", { hasText: "Extracted Fields" }).first();
    this.validationSection = page.locator("h3", { hasText: "Validation Results" }).locator("..");
    this.reviewSection = page.locator("h3", { hasText: "Submit Review" }).locator("..");
    this.reviewHistorySection = page.locator("h3", { hasText: "Review History" }).locator("..");
    this.commentInput = page.locator("textarea");
    this.approveButton = page.locator("button", { hasText: "Approve" });
    this.rejectButton = page.locator("button", { hasText: /^Reject$/ });
    this.requestChangesButton = page.locator("button", { hasText: "Request Changes" });
  }

  async goto(id: string) {
    await this.page.goto(`/documents/${id}`);
  }

  async expectLoaded() {
    await expect(this.fileName).toBeVisible({ timeout: 10_000 });
  }

  extractedFieldEntries(): Locator {
    return this.page.locator(".border-b.pb-2");
  }

  validationErrorEntries(): Locator {
    return this.page.locator(".bg-red-50.text-red-700, .bg-yellow-50.text-yellow-700");
  }

  reviewHistoryEntries(): Locator {
    return this.reviewHistorySection.locator(".border-b.pb-2");
  }

  async enterComment(text: string) {
    await this.commentInput.fill(text);
  }

  async approve() {
    await this.approveButton.click();
  }

  async reject() {
    await this.rejectButton.click();
  }

  async requestChanges() {
    await this.requestChangesButton.click();
  }

  async clickBack() {
    await this.backButton.click();
  }

  async expectStatus(status: string) {
    await expect(this.page.locator("span.rounded-full", { hasText: status })).toBeVisible({ timeout: 10_000 });
  }
}
