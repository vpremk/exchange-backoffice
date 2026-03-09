@validation
Feature: Document Validation Rules
  As the validation engine
  I need to apply business rules per document type
  So that invalid documents are flagged before human review

  Background:
    Given the application is running

  # ── Trade Confirmation Rules ─────────────────────────────────────────

  Scenario: Valid trade confirmation passes all rules
    Given a Trade Confirmation with fields:
      | field           | value                      |
      | counterparty    | Goldman Sachs International |
      | quantity        | 10,000                     |
      | price           | 185.50                     |
      | trade_date      | 2025-01-15                 |
      | settlement_date | 2025-01-17                 |
    When the validation rules are applied
    Then there should be 0 errors with severity "error"

  Scenario: Trade confirmation with zero quantity fails validation
    Given a Trade Confirmation with fields:
      | field    | value |
      | quantity | 0     |
      | price    | 50.00 |
    When the validation rules are applied
    Then there should be an error on field "quantity" with rule "POSITIVE_NUMBER"

  Scenario: Trade confirmation with negative price fails validation
    Given a Trade Confirmation with fields:
      | field    | value  |
      | quantity | 100    |
      | price    | -10.00 |
    When the validation rules are applied
    Then there should be an error on field "price" with rule "POSITIVE_NUMBER"

  Scenario: Trade confirmation with unknown counterparty gets warning
    Given a Trade Confirmation with fields:
      | field        | value                |
      | counterparty | Unknown Trading Corp |
      | quantity     | 100                  |
      | price        | 50.00                |
    When the validation rules are applied
    Then there should be a warning on field "counterparty" with rule "KNOWN_COUNTERPARTY"

  Scenario: Trade confirmation with settlement outside T+1/T+2 gets warning
    Given a Trade Confirmation with fields:
      | field           | value      |
      | quantity        | 100        |
      | price           | 50.00      |
      | trade_date      | 2025-01-15 |
      | settlement_date | 2025-01-25 |
    When the validation rules are applied
    Then there should be a warning on field "settlement_date" with rule "T_PLUS_RANGE"

  # ── Settlement Instruction Rules ─────────────────────────────────────

  Scenario: Valid settlement instruction passes rules
    Given a Settlement Instruction with fields:
      | field      | value       |
      | bic        | CHASUS33XXX |
      | value_date | 2027-06-15  |
    When the validation rules are applied
    Then there should be 0 errors with severity "error"

  Scenario: Settlement instruction with invalid BIC length fails
    Given a Settlement Instruction with fields:
      | field | value   |
      | bic   | CHAS123 |
    When the validation rules are applied
    Then there should be an error on field "bic" with rule "BIC_FORMAT"

  Scenario: Settlement instruction without BIC fails
    Given a Settlement Instruction with fields:
      | field      | value      |
      | value_date | 2027-06-15 |
    When the validation rules are applied
    Then there should be an error on field "bic" with rule "REQUIRED"

  Scenario: Settlement instruction with past value date fails
    Given a Settlement Instruction with fields:
      | field      | value       |
      | bic        | CHASUS33XXX |
      | value_date | 2020-01-01  |
    When the validation rules are applied
    Then there should be an error on field "value_date" with rule "FUTURE_DATE"

  # ── KYC Document Rules ──────────────────────────────────────────────

  Scenario: Valid KYC document passes rules
    Given a KYC Document with fields:
      | field           | value                    |
      | document_expiry | 2027-12-31               |
      | jurisdiction    | United States - Delaware |
    When the validation rules are applied
    Then there should be 0 errors with severity "error"

  Scenario: KYC document with expired date fails
    Given a KYC Document with fields:
      | field           | value      |
      | document_expiry | 2020-01-01 |
    When the validation rules are applied
    Then there should be an error on field "document_expiry" with rule "NOT_EXPIRED"

  Scenario: KYC document with disallowed jurisdiction gets warning
    Given a KYC Document with fields:
      | field           | value      |
      | document_expiry | 2027-12-31 |
      | jurisdiction    | North Korea|
    When the validation rules are applied
    Then there should be a warning on field "jurisdiction" with rule "ALLOWED_JURISDICTION"

  # ── Regulatory Filing Rules ──────────────────────────────────────────

  Scenario: Valid regulatory filing passes rules
    Given a Regulatory Filing with fields:
      | field               | value            |
      | submission_deadline | 2027-06-30       |
      | reference_number    | RF-2025-Q1-0042  |
    When the validation rules are applied
    Then there should be 0 errors with severity "error"

  Scenario: Regulatory filing with past deadline fails
    Given a Regulatory Filing with fields:
      | field               | value      |
      | submission_deadline | 2020-01-01 |
    When the validation rules are applied
    Then there should be an error on field "submission_deadline" with rule "FUTURE_DEADLINE"

  Scenario: Regulatory filing with bad reference number format gets warning
    Given a Regulatory Filing with fields:
      | field            | value   |
      | reference_number | BADREF1 |
    When the validation rules are applied
    Then there should be a warning on field "reference_number" with rule "REF_FORMAT"

  # ── Low Confidence Warning ──────────────────────────────────────────

  Scenario: Low confidence field generates a warning
    Given any document with a field extracted at confidence 0.45
    When the validation rules are applied
    Then there should be a warning with rule "LOW_CONFIDENCE"
