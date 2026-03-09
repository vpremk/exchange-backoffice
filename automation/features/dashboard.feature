@dashboard
Feature: Metrics Dashboard
  As a Supervisor or Validator
  I need a dashboard showing queue health, SLA risk, and team productivity
  So that I can monitor operations and intervene when needed

  Background:
    Given the application is running
    And the database is seeded with test data

  # ── KPI Cards ────────────────────────────────────────────────────────

  Scenario: Dashboard shows KPI summary cards
    Given I am logged in as "carol@exchange.dev"
    When I navigate to the Dashboard page
    Then I should see the "Total Documents" card with a numeric value
    And I should see the "Pending Review" card with a numeric value
    And I should see the "SLA At Risk" card
    And I should see the "SLA Adherence" card with a percentage

  Scenario: SLA At Risk card highlights when count is above zero
    Given I am logged in as "carol@exchange.dev"
    And there are documents at risk of SLA breach
    When I navigate to the Dashboard page
    Then the "SLA At Risk" card should be highlighted in red/orange

  # ── Charts ───────────────────────────────────────────────────────────

  Scenario: Dashboard shows documents by status pie chart
    Given I am logged in as "carol@exchange.dev"
    When I navigate to the Dashboard page
    Then I should see the "Documents by Status" chart section
    And the chart should render with data

  Scenario: Dashboard shows documents by type bar chart
    Given I am logged in as "carol@exchange.dev"
    When I navigate to the Dashboard page
    Then I should see the "Documents by Type" chart section

  Scenario: Dashboard shows validator productivity chart
    Given I am logged in as "carol@exchange.dev"
    When I navigate to the Dashboard page
    Then I should see the "Validator Productivity" section

  Scenario: Dashboard shows error reasons list
    Given I am logged in as "carol@exchange.dev"
    When I navigate to the Dashboard page
    Then I should see the "Top Error Reasons" section

  # ── Recent Activity ──────────────────────────────────────────────────

  Scenario: Dashboard shows recent review activity
    Given I am logged in as "carol@exchange.dev"
    When I navigate to the Dashboard page
    Then I should see the "Recent Reviews" section
    And each review entry should show reviewer name and document name

  # ── Auto Refresh ─────────────────────────────────────────────────────

  Scenario: Dashboard data refreshes automatically
    Given I am logged in as "carol@exchange.dev"
    And I am on the Dashboard page
    When I wait for 15 seconds
    Then the dashboard data should have been refreshed

  # ── Access Control ───────────────────────────────────────────────────

  Scenario: Submitter cannot access the dashboard
    Given I am logged in as "alice@exchange.dev"
    When I try to navigate to "/dashboard"
    Then I should be redirected to the Upload page
