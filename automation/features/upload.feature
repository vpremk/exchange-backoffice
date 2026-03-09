@upload
Feature: Document Upload
  As a Submitter
  I need to upload documents for validation
  So that they enter the automated processing pipeline

  Background:
    Given the application is running
    And I am logged in as "alice@exchange.dev"

  Scenario: Upload a PDF document via file picker
    Given I am on the Upload page
    When I upload the file "trade_confirmation_sample.pdf"
    Then I should see "Uploading..." indicator
    And the document "trade_confirmation_sample.pdf" should appear in "My Recent Documents"
    And the document status should be one of "UPLOADED,OCR_PROCESSING,EXTRACTING,VALIDATING,PENDING_REVIEW"

  Scenario: Upload a PNG image document
    Given I am on the Upload page
    When I upload the file "settlement_instruction_scan.png"
    Then the document "settlement_instruction_scan.png" should appear in "My Recent Documents"

  Scenario: Upload a DOCX document
    Given I am on the Upload page
    When I upload the file "kyc_entity_verification.docx"
    Then the document "kyc_entity_verification.docx" should appear in "My Recent Documents"

  Scenario: Document progresses through pipeline automatically
    Given I am on the Upload page
    When I upload the file "trade_confirmation_sample.pdf"
    And I wait for the pipeline to complete
    Then the document status should eventually become "PENDING_REVIEW"

  Scenario: Uploaded document is clickable and navigates to detail
    Given I am on the Upload page
    And there is at least one uploaded document
    When I click on the first document name link
    Then I should be on a document detail page
    And I should see the document file name in the header

  Scenario: Multiple files can be uploaded in sequence
    Given I am on the Upload page
    When I upload the file "trade_confirmation_sample.pdf"
    And I upload the file "settlement_instruction_scan.png"
    Then I should see at least 2 documents in "My Recent Documents"

  Scenario: Upload page shows correct columns
    Given I am on the Upload page
    Then the documents table should have columns "File,Type,Status,Uploaded"
