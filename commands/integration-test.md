---
description: Run integration tests against a connected Salesforce org
---

# /integration-test

Run Apex tests that validate integration with a live Salesforce org, including DML operations, callout mocks, and cross-object workflows.

## Workflow

1. **Identify integration test classes**
   - Scan for test classes with integration test indicators:
     - Class name contains `Integration` (e.g., `AccountServiceIntegrationTest`)
     - Test methods using `Test.startTest()`/`Test.stopTest()` with DML
     - Test classes with `@TestSetup` creating cross-object data
   - If no integration tests found, suggest creating them

2. **Validate target org**
   - Confirm a scratch org or sandbox is connected (never run against production)
   - Verify source has been pushed: `sf project deploy preview`
   - If source is not current, push first

3. **Run integration tests**
   ```bash
   sf apex run test \
     --class-names <IntegrationTestClass1,IntegrationTestClass2> \
     --result-format human \
     --code-coverage \
     --wait 10 \
     --target-org <org-alias>
   ```

4. **Parse results**
   - Pass/fail count per test method
   - Failure details: assertion messages, stack traces
   - Code coverage per class tested
   - Governor limit consumption per test

5. **Callout integration tests**
   For tests involving external callouts:
   - Verify `HttpCalloutMock` is implemented
   - Check that `Test.setMock()` is called before `Test.startTest()`
   - Report mock coverage: which endpoints are tested

6. **Cross-object validation**
   Verify integration tests cover:
   - Trigger cascades (insert parent → trigger creates child)
   - Roll-up summaries and formula fields
   - Sharing and visibility across user contexts
   - Workflow and flow interactions

7. **Report**
   ```
   Integration Test Results:
     ✅ 12/14 tests passed
     ❌ 2 tests failed

   Failures:
     testAccountCreation_WithContacts_CascadeTrigger
       → System.AssertException: Expected 3 contacts, got 2

   Coverage:
     AccountService: 92%
     ContactTriggerHandler: 88%
   ```

## Flags

| Flag | Description |
|------|-------------|
| `--class-names` | Specific test class names (comma-separated) |
| `--target-org` | Org to run tests against |
| `--suite` | Test suite name |
| `--fail-fast` | Stop on first failure |

## Example

```
/integration-test
/integration-test --class-names AccountServiceIntegrationTest,ContactFlowIntegrationTest
```
