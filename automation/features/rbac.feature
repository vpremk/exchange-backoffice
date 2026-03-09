@rbac
Feature: Role-Based Access Control
  As the system
  I need to enforce role-based permissions
  So that users can only perform actions authorized for their role

  Background:
    Given the application is running
    And the database is seeded with test data

  # ── Submitter Restrictions ───────────────────────────────────────────

  Scenario: Submitter can only see their own documents via API
    Given I am authenticated as "alice@exchange.dev"
    When I make a GET request to "/api/documents"
    Then the API should respond with status 200
    And all returned documents should belong to the submitter

  Scenario: Submitter cannot access another user's document
    Given I am authenticated as "alice@exchange.dev"
    And there is a document submitted by another user
    When I make a GET request to that document's detail endpoint
    Then the API should respond with status 403

  Scenario: Submitter cannot submit a review via API
    Given I am authenticated as "alice@exchange.dev"
    And there is a document in "PENDING_REVIEW" status
    When I make a POST request to "/api/documents/{id}/review" with decision "APPROVED"
    Then the API should respond with status 403

  Scenario: Submitter cannot assign documents via API
    Given I am authenticated as "alice@exchange.dev"
    And there is a document in "PENDING_REVIEW" status
    When I make a POST request to "/api/documents/{id}/assign"
    Then the API should respond with status 403

  Scenario: Submitter cannot access metrics via API
    Given I am authenticated as "alice@exchange.dev"
    When I make a GET request to "/api/metrics/overview"
    Then the API should respond with status 403

  Scenario: Submitter cannot access audit log via API
    Given I am authenticated as "alice@exchange.dev"
    When I make a GET request to "/api/metrics/audit-log"
    Then the API should respond with status 403

  # ── Validator Permissions ────────────────────────────────────────────

  Scenario: Validator can see all documents
    Given I am authenticated as "bob@exchange.dev"
    When I make a GET request to "/api/documents"
    Then the API should respond with status 200
    And the response should contain documents from multiple submitters

  Scenario: Validator can submit reviews
    Given I am authenticated as "bob@exchange.dev"
    And there is a document in "PENDING_REVIEW" status
    When I make a POST request to "/api/documents/{id}/review" with decision "APPROVED"
    Then the API should respond with status 200

  Scenario: Validator can assign documents
    Given I am authenticated as "bob@exchange.dev"
    And there is a document in "PENDING_REVIEW" status
    When I make a POST request to "/api/documents/{id}/assign"
    Then the API should respond with status 200

  Scenario: Validator can access metrics overview
    Given I am authenticated as "bob@exchange.dev"
    When I make a GET request to "/api/metrics/overview"
    Then the API should respond with status 200

  Scenario: Validator cannot access audit log
    Given I am authenticated as "bob@exchange.dev"
    When I make a GET request to "/api/metrics/audit-log"
    Then the API should respond with status 403

  # ── Supervisor Permissions ───────────────────────────────────────────

  Scenario: Supervisor can access audit log
    Given I am authenticated as "carol@exchange.dev"
    When I make a GET request to "/api/metrics/audit-log"
    Then the API should respond with status 200
    And the response should contain audit entries

  Scenario: Supervisor can perform all validator actions
    Given I am authenticated as "carol@exchange.dev"
    And there is a document in "PENDING_REVIEW" status
    When I make a POST request to "/api/documents/{id}/review" with decision "REJECTED"
    Then the API should respond with status 200

  # ── Token Validation ─────────────────────────────────────────────────

  Scenario: Expired or invalid token is rejected
    Given I have an invalid JWT token
    When I make a GET request to "/api/documents" with that token
    Then the API should respond with status 401

  Scenario: Missing authorization header is rejected
    When I make a GET request to "/api/documents" without authorization
    Then the API should respond with status 401
