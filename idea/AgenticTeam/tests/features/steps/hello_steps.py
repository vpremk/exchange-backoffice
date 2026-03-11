"""Step definitions for the hello endpoint feature."""

import urllib.request
import json
from behave import given, when, then


@given('the Express server is running on port {port:d}')
def step_server_running(context, port):
    context.base_url = f"http://localhost:{port}"


@when('I send a GET request to "{path}"')
def step_send_get(context, path):
    url = f"{context.base_url}{path}"
    try:
        with urllib.request.urlopen(url) as resp:
            context.response_body = resp.read().decode("utf-8")
            context.response_code = resp.status
    except Exception as e:
        context.response_body = ""
        context.response_code = 0
        context.response_error = str(e)


@then('the response should contain "{text}"')
def step_response_contains(context, text):
    assert text in context.response_body, (
        f"Expected '{text}' in response, got: {context.response_body}"
    )
