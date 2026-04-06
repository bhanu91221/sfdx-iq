---
paths:
  - "**/*.cls"
  - "**/*.trigger"
  - "**/*Test.cls"
  - "**/*.test.js"
  - "**/*.spec.js"
  - "**/lwc/**/__tests__/**"
---

# Testing Requirements

## Coverage Requirements

- **75%** minimum code coverage is required by Salesforce for production deployment.
- **90%+** target coverage is required for all new Apex classes and triggers.
- Coverage must include meaningful assertions — lines executed without assertions do not count as properly tested.

## Test Class Structure

- Every Apex class MUST have a corresponding test class.
- Naming convention: `AccountService` -> `AccountServiceTest`.
- All test classes use the `@isTest` annotation.
- Every test class MUST include a `@TestSetup` method for shared test data.

```apex
@isTest
private class AccountServiceTest {

    @TestSetup
    static void setupTestData() {
        List<Account> accounts = TestDataFactory.createAccounts(5);
        insert accounts;
    }

    @isTest
    static void testGetAccountById_ReturnsAccount() {
        Account acct = [SELECT Id FROM Account LIMIT 1];
        Test.startTest();
        Account result = AccountService.getAccountById(acct.Id);
        Test.stopTest();
        System.assertNotEquals(null, result, 'Expected account to be returned');
        System.assertEquals(acct.Id, result.Id, 'Returned account Id should match');
    }
}
```

## Test Data Management

- **NEVER** use `@isTest(SeeAllData=true)` — tests must create their own data.
- Use a centralized `TestDataFactory` utility class for reusable test record creation.
- `TestDataFactory` methods should accept parameter counts and return inserted or uninserted records as needed.
- Use `Test.loadData()` with static resources for complex data setups.

```apex
@isTest
public class TestDataFactory {
    public static List<Account> createAccounts(Integer count) {
        List<Account> accounts = new List<Account>();
        for (Integer i = 0; i < count; i++) {
            accounts.add(new Account(Name = 'Test Account ' + i));
        }
        return accounts;
    }
}
```

## Governor Limit Isolation

- Use `Test.startTest()` and `Test.stopTest()` in every test method to reset governor limit counters.
- This ensures the code under test gets a fresh set of limits, separate from test setup.

## User Context Testing

- Use `System.runAs()` to test behavior under different user profiles and permission sets.
- Test that `with sharing` classes correctly restrict access for non-admin users.
- Verify field-level security enforcement by running as users without specific field permissions.

## Callout Testing

- Implement `HttpCalloutMock` for every class that makes external HTTP callouts.
- Register mocks with `Test.setMock(HttpCalloutMock.class, new MyMock())`.
- Test both success and error response scenarios.

## Bulk Testing

- Every trigger test MUST include a bulk scenario inserting **200+ records**.
- This verifies bulkification and catches governor limit violations.
- Test both single-record and bulk-record paths.

## LWC Testing

- Every LWC component MUST have a corresponding Jest test file.
- Test file location: `__tests__/componentName.test.js` inside the component directory.
- Mock all Apex method imports and wire adapters.
- Test user interactions, conditional rendering, and error states.

## Assertion Standards

- Every `System.assertEquals` and `System.assertNotEquals` MUST include a descriptive message as the third parameter.
- Test method names should describe the scenario and expected outcome: `testMethodName_Scenario_ExpectedResult`.
