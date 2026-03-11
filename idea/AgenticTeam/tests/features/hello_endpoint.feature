Feature: Hello Endpoint
  As an API consumer
  I want to call the hello endpoint
  So that I receive a personalized greeting

  Scenario: Hello endpoint returns Neo greeting
    Given the Express server is running on port 3000
    When I send a GET request to "/hello"
    Then the response should contain "Hello, Neo!"

  Scenario: Root endpoint returns app status
    Given the Express server is running on port 3000
    When I send a GET request to "/"
    Then the response should contain "Agentic Team App is running"
