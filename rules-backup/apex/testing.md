---
paths:
  - "**/*.cls"
  - "**/*.trigger"
  - "**/*.apex"
---

# Apex Testing Rules

## Coverage Requirements

- **75%** minimum for production deployment (Salesforce enforced).
- **90%+** target for all new and modified classes.
- Coverage must include meaningful assertions — executed lines without assertions are not properly tested.

## Test Class Standards

- Every Apex class MUST have a corresponding test class.
- Test classes use `@isTest` annotation (not `testMethod` keyword).
- Test class naming: `ClassNameTest` (e.g., `AccountService` → `AccountServiceTest`).
- Test method naming: `testMethodName_Scenario_ExpectedResult`.

```apex
@isTest
static void testGetAccounts_WithActiveFilter_ReturnsOnlyActive() {
    // Arrange — setup is in @TestSetup
    // Act
    Test.startTest();
    List<Account> result = AccountService.getActiveAccounts();
    Test.stopTest();
    // Assert
    System.assertEquals(3, result.size(), 'Should return 3 active accounts');
}
```

## Test Data Patterns

- **NEVER** use `@isTest(SeeAllData=true)` — tests must be hermetic.
- Use `@TestSetup` for shared data across test methods in a class.
- Use `TestDataFactory` (centralized utility) for reusable record creation.
- Factory methods should return unsaved records — let the test decide when to insert.

```apex
// ❌ Bad — SeeAllData exposes test to org data changes
@isTest(SeeAllData=true)
static void testWithOrgData() { }

// ✅ Good — isolated test data
@TestSetup
static void setupTestData() {
    List<Account> accounts = TestDataFactory.createAccounts(200);
    insert accounts;
}
```

## Governor Limit Isolation

- Every test method MUST use `Test.startTest()` / `Test.stopTest()`.
- This resets governor limit counters so the code under test gets a fresh budget.
- Place test setup (queries, DML) BEFORE `startTest()`.

## Bulk Testing

- Every trigger handler test MUST include a **200+ record** scenario.
- This verifies bulkification and catches SOQL/DML-in-loop violations.

```apex
@isTest
static void testBulkInsert_200Accounts_NoGovernorViolation() {
    List<Account> accounts = TestDataFactory.createAccounts(200);
    Test.startTest();
    insert accounts; // Fires trigger with 200 records
    Test.stopTest();
    System.assertEquals(200, [SELECT COUNT() FROM Account]);
}
```

## Negative Testing

- Test error paths: invalid input, missing required fields, insufficient permissions.
- Use `try/catch` with `System.assert` to verify expected exceptions.
- Test `addError()` messages on trigger records.

## Callout Mocking

- Implement `HttpCalloutMock` for every class making external callouts.
- Test both success (200) and error (400, 500) response scenarios.
- Use `Test.setMock()` before `Test.startTest()`.

## Assertion Standards

- Every assertion MUST include a descriptive message (third parameter).
- Use `System.assertEquals`, `System.assertNotEquals`, `System.assert` — never rely on implicit pass.
- Assert specific values, not just non-null.
