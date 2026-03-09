@review
Feature: Document Review Workflow
  As a Validator or Supervisor
  I need to review documents with extracted data and validation results
  So that I can approve, reject, or request changes with an audit trail

  Background:
    Given the application is running
    And the database is seeded with test data

  # ── Document Detail View ─────────────────────────────────────────────

  Scenario: View document detail with extracted fields
    Given I am logged in as "bob@exchange.dev"
    When I open a document in "PENDING_REVIEW" status
    Then I should see the "Extracted Fields" section
    And each extracted field should show a value
    And each extracted field should show a confidence percentage
    And each extracted field should show provenance text

  Scenario: View document validation results - passed
    Given I am logged in as "bob@exchange.dev"
    When I open a document with no validation errors
    Then the validation section should show "All validation rules passed"

  Scenario: View document validation results - with errors
    Given I am logged in as "bob@exchange.dev"
    When I open a document with validation errors
    Then I should see validation error entries
    And each error should display the field name
    And each error should display the rule name
    And errors should be color-coded by severity

  Scenario: View document classification confidence
    Given I am logged in as "bob@exchange.dev"
    When I open a document in "PENDING_REVIEW" status
    Then I should see the document type label
    And I should see the classification confidence percentage

  # ── Assign ───────────────────────────────────────────────────────────

  Scenario: Validator assigns document to themselves
    Given I am logged in as "bob@exchange.dev"
    And I open an unassigned document in "PENDING_REVIEW" status
    When I click the "Assign to Me" button
    Then the document should be assigned to "Bob Martinez"
    And the "Assign to Me" button should disappear

  # ── Approve ──────────────────────────────────────────────────────────

  Scenario: Approve a document with a comment
    Given I am logged in as "bob@exchange.dev"
    And I open a document in "PENDING_REVIEW" status
    When I enter the review comment "All fields verified against source system."
    And I click the "Approve" button
    Then the document status should change to "APPROVED"
    And the review history should show the approval
    And the review comment should be visible in history

  Scenario: Approve a document without a comment
    Given I am logged in as "bob@exchange.dev"
    And I open a document in "PENDING_REVIEW" status
    When I click the "Approve" button
    Then the document status should change to "APPROVED"

  # ── Reject ───────────────────────────────────────────────────────────

  Scenario: Reject a document with a reason
    Given I am logged in as "bob@exchange.dev"
    And I open a document in "PENDING_REVIEW" status
    When I enter the review comment "Counterparty not in our approved list. Please verify."
    And I click the "Reject" button
    Then the document status should change to "REJECTED"
    And the review history should show the rejection with comment

  # ── Request Changes ──────────────────────────────────────────────────

  Scenario: Request changes on a document
    Given I am logged in as "bob@exchange.dev"
    And I open a document in "PENDING_REVIEW" status
    When I enter the review comment "Settlement date is ambiguous. Please resubmit clearer scan."
    And I click the "Request Changes" button
    Then the document status should change to "CHANGES REQUESTED"
    And the review history should show the changes request

  # ── Review Controls Visibility ───────────────────────────────────────

  Scenario: Review buttons are only visible for PENDING_REVIEW documents
    Given I am logged in as "bob@exchange.dev"
    When I open a document in "APPROVED" status
    Then I should not see the "Submit Review" section
    And I should not see "Approve" button
    And I should not see "Reject" button

  Scenario: Submitter cannot see review controls
    Given I am logged in as "alice@exchange.dev"
    When I open a document in "PENDING_REVIEW" status
    Then I should not see the "Submit Review" section

  # ── Error Handling ───────────────────────────────────────────────────

  Scenario: View error details on a failed document
    Given I am logged in as "bob@exchange.dev"
    When I open a document in "ERROR" status
    Then I should see the error banner with the failure reason
    And I should see the "Retry Pipeline" button

  Scenario: Retry a failed document
    Given I am logged in as "bob@exchange.dev"
    When I open a document in "ERROR" status
    And I click the "Retry Pipeline" button
    Then the document status should change away from "ERROR"

  # ── Download ─────────────────────────────────────────────────────────

  Scenario: Download original document
    Given I am logged in as "bob@exchange.dev"
    When I open a document in "PENDING_REVIEW" status
    Then I should see the "Download" button

  # ── Review History ───────────────────────────────────────────────────

  Scenario: Review history shows chronological entries
    Given I am logged in as "bob@exchange.dev"
    When I open a document that has been reviewed
    Then the "Review History" section should be visible
    And reviews should show reviewer name and timestamp
    And reviews should show the decision badge

  # ── Back Navigation ──────────────────────────────────────────────────

  Scenario: Back button returns to previous page
    Given I am logged in as "bob@exchange.dev"
    And I am on the Inbox page
    When I click on the first document link in the inbox
    And I click the back button
    Then I should be on the Inbox page
