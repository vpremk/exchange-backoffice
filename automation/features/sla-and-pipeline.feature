@sla @pipeline
Feature: SLA Tracking and Document Pipeline
  As the system
  I need to track SLA deadlines and process documents through the pipeline
  So that operations meet regulatory timelines

  Background:
    Given the application is running
    And the database is seeded with test data

  # ── Pipeline Processing ──────────────────────────────────────────────

  Scenario: Newly uploaded document enters OCR processing
    Given I am authenticated as "alice@exchange.dev"
    When I upload a document via the API
    Then the document status should be "UPLOADED" or already progressing
    And a pipeline job should be queued

  Scenario: Pipeline classifies document type correctly
    Given a document has been processed through OCR and extraction
    Then the document should have a docType other than "UNKNOWN"
    And the classification confidence should be above 0.5

  Scenario: Pipeline extracts fields with provenance
    Given a document has been processed through extraction
    Then the extractedFields should not be empty
    And each field should have "value", "provenance", and "confidence" keys

  Scenario: Pipeline runs validation rules after extraction
    Given a document has completed the validation step
    Then the document should have a validationErrors array
    And the document status should be "PENDING_REVIEW"

  Scenario: Pipeline sets SLA deadline based on document type
    Given a document has been classified as "TRADE_CONFIRMATION"
    Then the SLA deadline should be approximately 2 hours from upload time

  Scenario: Pipeline sets SLA deadline for Settlement Instruction
    Given a document has been classified as "SETTLEMENT_INSTRUCTION"
    Then the SLA deadline should be approximately 4 hours from upload time

  Scenario: Pipeline handles OCR failure gracefully
    Given a document that will fail OCR processing
    Then the document status should be "ERROR"
    And the errorReason should be set

  # ── SLA Metrics ──────────────────────────────────────────────────────

  Scenario: SLA performance endpoint returns adherence data
    Given I am authenticated as "carol@exchange.dev"
    When I make a GET request to "/api/metrics/sla-performance"
    Then the API should respond with status 200
    And the response should include "metSla" and "missedSla" counts
    And the response should include "adherenceRate"
    And the response should include "byType" breakdown

  Scenario: SLA at risk count reflects documents near deadline
    Given I am authenticated as "carol@exchange.dev"
    When I make a GET request to "/api/metrics/overview"
    Then the response "slaAtRisk" should count documents within 1 hour of deadline

  # ── Audit Trail ──────────────────────────────────────────────────────

  Scenario: Status changes are recorded in audit log
    Given I am authenticated as "carol@exchange.dev"
    And a document has been processed through the pipeline
    When I fetch the audit log for that document
    Then I should see "STATUS_CHANGED" entries
    And each entry should have oldValue and newValue

  Scenario: Reviews are recorded in audit log
    Given I am authenticated as "carol@exchange.dev"
    And a document has been reviewed
    When I fetch the audit log for that document
    Then I should see a "REVIEW_SUBMITTED" entry
    And the entry should include the decision and reviewer

  Scenario: Document upload is recorded in audit log
    Given I am authenticated as "carol@exchange.dev"
    When I fetch the audit log
    Then I should see "DOCUMENT_UPLOADED" entries
    And each entry should include the file name
