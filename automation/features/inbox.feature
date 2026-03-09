@inbox
Feature: Review Inbox and Queue Management
  As a Validator or Supervisor
  I need to view and filter the document review queue
  So that I can prioritize and manage my review workload

  Background:
    Given the application is running
    And the database is seeded with test data

  Scenario: Validator sees the review inbox with pending documents
    Given I am logged in as "bob@exchange.dev"
    When I navigate to the Inbox page
    Then I should see the "Review Inbox" heading
    And I should see documents with status "PENDING REVIEW"

  Scenario: Filter inbox by status - All
    Given I am logged in as "bob@exchange.dev"
    And I am on the Inbox page
    When I click the "All" filter button
    Then I should see documents across multiple statuses

  Scenario: Filter inbox by status - Approved
    Given I am logged in as "bob@exchange.dev"
    And I am on the Inbox page
    When I click the "Approved" filter button
    Then all visible documents should have status "APPROVED"

  Scenario: Filter inbox by status - Errors
    Given I am logged in as "bob@exchange.dev"
    And I am on the Inbox page
    When I click the "Errors" filter button
    Then all visible documents should have status "ERROR"

  Scenario: Inbox shows SLA countdown indicators
    Given I am logged in as "bob@exchange.dev"
    And I am on the Inbox page
    Then documents near SLA deadline should show time remaining
    And documents past SLA deadline should show "SLA BREACHED"

  Scenario: Inbox table has all required columns
    Given I am logged in as "bob@exchange.dev"
    When I navigate to the Inbox page
    Then the inbox table should have columns "File,Type,Status,SLA,Submitted By,Assignee,Uploaded"

  Scenario: Clicking a document in inbox navigates to review page
    Given I am logged in as "bob@exchange.dev"
    And I am on the Inbox page
    When I click on the first document link in the inbox
    Then I should be on a document detail page

  Scenario: Submitter cannot access the inbox
    Given I am logged in as "alice@exchange.dev"
    When I try to navigate to "/inbox"
    Then I should be redirected to the Upload page

  Scenario: Supervisor can see the full inbox
    Given I am logged in as "carol@exchange.dev"
    When I navigate to the Inbox page
    Then I should see the "Review Inbox" heading
    And I should see documents in the queue
