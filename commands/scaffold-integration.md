---
description: Generate integration boilerplate with callout service, mock, and test
---

# /scaffold-integration

Generate a complete HTTP integration boilerplate: Named Credential reference, callout service class, response wrapper, mock class for testing, and comprehensive test class.

## Workflow

1. **Gather requirements**
   - Ask for the external system name (e.g., `Stripe`, `Twilio`, `CustomERP`)
   - Ask for the endpoint base URL or Named Credential name
   - Ask for the HTTP methods needed: GET, POST, PUT, PATCH, DELETE
   - Ask for the authentication type: Named Credential (recommended), OAuth, API Key, Basic Auth
   - Ask for the request/response format: JSON (default) or XML
   - Ask for a brief description of what the integration does

2. **Generate Named Credential reference**
   - Document the Named Credential setup (cannot generate metadata directly):
     - Named Credential name: `<SystemName>_API`
     - URL: the base endpoint
     - Authentication Protocol: as specified
     - Include instructions for setting up the Named Credential in Setup
   - If the user prefers Custom Metadata or Custom Settings for configuration, generate those instead

3. **Generate callout service class**
   - File: `<SystemName>CalloutService.cls`
   - `with sharing` enforced
   - Private constant for the Named Credential endpoint: `private static final String ENDPOINT = 'callout:<NamedCredential>';`
   - For each HTTP method, generate a method:
     - `doGet(String path, Map<String, String> params)` — builds query string, sends GET
     - `doPost(String path, Object requestBody)` — serializes body, sends POST
     - `doPut(String path, Object requestBody)` — serializes body, sends PUT
     - `doDelete(String path)` — sends DELETE
   - Include a private `sendRequest` method that:
     - Builds `HttpRequest` with method, endpoint, headers
     - Sets `Content-Type` and `Accept` headers
     - Sets timeout (default 120000ms)
     - Sends via `new Http().send(request)`
     - Checks `HttpResponse.getStatusCode()` for success (200-299)
     - Throws `CalloutException` with details on non-success responses
     - Returns the `HttpResponse`
   - Include a custom exception inner class: `<SystemName>CalloutException`
   - Include retry logic for transient failures (503, 429) with configurable retry count

4. **Generate response wrapper class**
   - File: `<SystemName>Response.cls`
   - Inner classes representing the expected JSON response structure
   - Include a static `parse(String jsonString)` method using `JSON.deserialize()`
   - Include common fields: `success`, `message`, `data`, `errors`
   - Add null-safe getter methods for nested properties

5. **Generate mock class for testing**
   - File: `<SystemName>CalloutMock.cls`
   - Implements `HttpCalloutMock`
   - Constructor accepts: status code, status message, response body
   - `respond(HttpRequest req)` returns configured `HttpResponse`
   - Include static factory methods for common scenarios:
     - `successResponse(String body)` — 200 OK
     - `errorResponse(Integer statusCode, String message)` — error responses
     - `timeoutResponse()` — simulates timeout
   - Support multiple sequential responses using `MultiStaticResourceCalloutMock` pattern if needed

6. **Generate test class**
   - File: `<SystemName>CalloutServiceTest.cls`
   - `@isTest` annotation
   - Test every public method in the service:
     - Success scenario: mock returns 200, verify parsed response
     - Error scenario: mock returns 400/500, verify exception handling
     - Timeout scenario: verify timeout handling
     - Retry scenario: verify retry logic triggers on 503
   - Use `Test.setMock(HttpCalloutMock.class, mock)` in every test
   - Assert on request method, endpoint, headers, and body
   - Verify the response wrapper parses correctly

7. **Create Apex Classes**
   - Salesforce Cli Command `sf apex generate class --name <myClass> --output-dir force-app/main/default/classes`
   - Verify `.cls` and `.cls-meta.xml` for both class and test class
   - Report all created files

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--name` | External system name | Prompt user |
| `--endpoint` | Base URL or Named Credential | Prompt user |
| `--methods` | HTTP methods needed | `GET,POST` |
| `--auth` | Authentication type | `NamedCredential` |
| `--format` | Request/response format | `JSON` |
| `--output-dir` | Output directory | `force-app/main/default/classes` |

## Error Handling

- If the system name contains invalid characters for an Apex class name, sanitize it
- If the endpoint URL is malformed, warn and use a placeholder
- If the user requests XML format, generate XML parsing instead of JSON deserialization
- If any generated class name conflicts with existing classes, suggest alternative names

## Example Usage

```
/scaffold-integration
/scaffold-integration --name Stripe --endpoint https://api.stripe.com/v1 --methods GET,POST
/scaffold-integration --name InternalERP --auth NamedCredential --format JSON
/scaffold-integration --name Twilio --methods POST --endpoint https://api.twilio.com/2010-04-01
```
