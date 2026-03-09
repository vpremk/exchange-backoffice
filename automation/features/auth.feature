@auth
Feature: Authentication and Session Management
  As a back-office user
  I need to authenticate with my role
  So that I can access the appropriate features

  Background:
    Given the application is running

  Scenario: Submitter can log in successfully
    Given I am on the login page
    When I click the login button for "alice@exchange.dev"
    Then I should be logged in as "Alice Chen"
    And I should see my role as "SUBMITTER"
    And I should see the "Upload" nav link
    And I should not see the "Inbox" nav link
    And I should not see the "Dashboard" nav link

  Scenario: Validator can log in and see review features
    Given I am on the login page
    When I click the login button for "bob@exchange.dev"
    Then I should be logged in as "Bob Martinez"
    And I should see my role as "VALIDATOR"
    And I should see the "Upload" nav link
    And I should see the "Inbox" nav link
    And I should see the "Dashboard" nav link

  Scenario: Supervisor has full access
    Given I am on the login page
    When I click the login button for "carol@exchange.dev"
    Then I should be logged in as "Carol Johnson"
    And I should see my role as "SUPERVISOR"
    And I should see the "Upload" nav link
    And I should see the "Inbox" nav link
    And I should see the "Dashboard" nav link

  Scenario: User can log out
    Given I am logged in as "bob@exchange.dev"
    When I click the "Logout" button
    Then I should be on the login page
    And I should see the text "Document Validation Workflow"

  Scenario: Unauthenticated API calls are rejected
    Given I am not authenticated
    When I make a GET request to "/api/documents"
    Then the API should respond with status 401
