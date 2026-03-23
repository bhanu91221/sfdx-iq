---
name: apex-testing
description: Apex test class patterns, TestDataFactory, assertion methods, and coverage strategies
origin: claude-sfdx-iq
tokens: 2991
domain: apex
---

# Apex Testing

## Fundamentals

Every Apex test class must be annotated with `@isTest` and must never use `SeeAllData=true`. Tests run in an isolated data context; create all data within the test or via `@TestSetup`.

```apex
@isTest
private class AccountServiceTest {

    @TestSetup
    static void setupData() {
        List<Account> accounts = TestDataFactory.createAccounts(5);
        insert accounts;
    }

    @isTest
    static void activateAccounts_WithValidIds_ShouldSetStatusActive() {
        // Arrange
        List<Account> accounts = [SELECT Id FROM Account];
        Set<Id> accountIds = new Map<Id, Account>(accounts).keySet();

        // Act
        Test.startTest();
        AccountService.activateAccounts(accountIds);
        Test.stopTest();

        // Assert
        List<Account> updated = [SELECT Status__c FROM Account WHERE Id IN :accountIds];
        for (Account acc : updated) {
            System.assertEquals('Active', acc.Status__c, 'Account should be activated');
        }
    }
}
```

## Test Naming Convention

Use the pattern: `testMethod_Scenario_ExpectedResult`

```
activateAccounts_WithValidIds_ShouldSetStatusActive
activateAccounts_WithNullIds_ShouldThrowException
calculateDiscount_VolumeOver100K_ShouldReturn15Percent
validateContact_MissingEmail_ShouldAddError
```

This convention makes test failures self-documenting. The method name tells you what was tested, under what conditions, and what was expected.

## TestDataFactory Pattern

Create a dedicated `TestDataFactory` class for all test data. Never create records inline in test methods.

```apex
@isTest
public class TestDataFactory {

    public static List<Account> createAccounts(Integer count) {
        List<Account> accounts = new List<Account>();
        for (Integer i = 0; i < count; i++) {
            accounts.add(new Account(
                Name = 'Test Account ' + i,
                BillingCountry = 'US',
                Industry = 'Technology'
            ));
        }
        return accounts;
    }

    public static List<Contact> createContacts(Integer count, Id accountId) {
        List<Contact> contacts = new List<Contact>();
        for (Integer i = 0; i < count; i++) {
            contacts.add(new Contact(
                FirstName = 'Test',
                LastName = 'Contact ' + i,
                AccountId = accountId,
                Email = 'test' + i + '@example.com'
            ));
        }
        return contacts;
    }

    public static List<Opportunity> createOpportunities(Integer count, Id accountId) {
        List<Opportunity> opps = new List<Opportunity>();
        for (Integer i = 0; i < count; i++) {
            opps.add(new Opportunity(
                Name = 'Test Opp ' + i,
                AccountId = accountId,
                StageName = 'Prospecting',
                CloseDate = Date.today().addDays(30),
                Amount = 10000
            ));
        }
        return opps;
    }

    public static User createStandardUser() {
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        return new User(
            FirstName = 'Test',
            LastName = 'User',
            Email = 'testuser@example.com',
            Username = 'testuser' + DateTime.now().getTime() + '@example.com',
            Alias = 'tuser',
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = p.Id
        );
    }
}
```

**Rules:**
- The factory returns records but does **not** insert them (caller decides)
- Use method overloading for variations (e.g., `createAccounts(count)` and `createAccounts(count, recordTypeId)`)
- Never reference org data (no hardcoded IDs, no record type names without query)
- Keep factories simple; avoid business logic in test data creation

## @TestSetup

Use `@TestSetup` to create shared test data once for the entire test class. Each test method gets its own copy (rolled back after each test).

```apex
@TestSetup
static void setupData() {
    Account acc = TestDataFactory.createAccounts(1)[0];
    insert acc;

    List<Contact> contacts = TestDataFactory.createContacts(3, acc.Id);
    insert contacts;

    List<Opportunity> opps = TestDataFactory.createOpportunities(2, acc.Id);
    insert opps;
}
```

**When to use:** When multiple test methods need the same base records.
**When to skip:** When each test needs unique data or when testing insert triggers (the insert in setup already fires the trigger).

## Test.startTest() and Test.stopTest()

These methods reset governor limits, giving the code under test a fresh set of limits. They also force async operations (future, queueable, batch) to execute synchronously.

```apex
@isTest
static void batchProcessing_LargeDataset_ShouldComplete() {
    // Arrange -- uses setup limits
    List<Account> accounts = TestDataFactory.createAccounts(200);
    insert accounts;

    // Act -- fresh governor limits
    Test.startTest();
    Database.executeBatch(new CleanupAccountBatch(), 200);
    Test.stopTest();

    // Assert -- batch has completed
    List<Account> results = [SELECT Status__c FROM Account];
    System.assertEquals(200, results.size());
}
```

**Rules:**
- Always place the code under test between `startTest()` and `stopTest()`
- Put data setup (Arrange) before `startTest()`
- Put assertions (Assert) after `stopTest()`
- Only one `startTest()`/`stopTest()` pair per test method

## Assertion Methods

Use the most specific assertion available and always include a message.

```apex
// Equality
System.assertEquals(expected, actual, 'Description of what failed');
System.assertNotEquals(unexpectedValue, actual, 'Should not be equal');

// Boolean
System.assert(condition, 'Condition should be true');

// Exception testing
try {
    AccountService.activateAccounts(null);
    System.assert(false, 'Expected exception was not thrown');
} catch (AccountServiceException e) {
    System.assert(e.getMessage().contains('cannot be null'),
        'Exception message should mention null');
}

// Collection assertions
System.assertEquals(5, results.size(), 'Should return 5 records');
System.assert(!results.isEmpty(), 'Results should not be empty');
```

**Always include the third parameter (message).** Without it, a failure gives no context about what went wrong.

## System.runAs()

Use `System.runAs()` to test record sharing, profile-based access, and permission enforcement.

```apex
@isTest
static void viewAccount_AsStandardUser_ShouldRespectSharing() {
    User stdUser = TestDataFactory.createStandardUser();
    insert stdUser;

    Account privateAccount = TestDataFactory.createAccounts(1)[0];
    privateAccount.OwnerId = UserInfo.getUserId();
    insert privateAccount;

    System.runAs(stdUser) {
        Test.startTest();
        List<Account> visible = [SELECT Id FROM Account WHERE Id = :privateAccount.Id];
        Test.stopTest();

        System.assertEquals(0, visible.size(),
            'Standard user should not see private account');
    }
}
```

**When to use:**
- Testing `with sharing` enforcement
- Testing profile/permission set restrictions
- Mixed DML workarounds (setup + non-setup objects)

## HttpCalloutMock

Mock all HTTP callouts. Real callouts are not allowed in tests.

```apex
@isTest
public class ExternalApiMock implements HttpCalloutMock {

    private Integer statusCode;
    private String body;

    public ExternalApiMock(Integer statusCode, String body) {
        this.statusCode = statusCode;
        this.body = body;
    }

    public HTTPResponse respond(HTTPRequest req) {
        HttpResponse res = new HttpResponse();
        res.setStatusCode(this.statusCode);
        res.setBody(this.body);
        res.setHeader('Content-Type', 'application/json');
        return res;
    }
}

@isTest
static void callExternalApi_Success_ShouldReturnParsedData() {
    String mockBody = '{"status":"ok","count":5}';
    Test.setMock(HttpCalloutMock.class, new ExternalApiMock(200, mockBody));

    Test.startTest();
    ApiResponse result = ExternalApiService.fetchData();
    Test.stopTest();

    System.assertEquals('ok', result.status);
    System.assertEquals(5, result.count);
}
```

For multi-request scenarios, implement routing logic in the mock:

```apex
public HTTPResponse respond(HTTPRequest req) {
    if (req.getEndpoint().contains('/accounts')) {
        return buildResponse(200, '{"accounts":[]}');
    } else if (req.getEndpoint().contains('/contacts')) {
        return buildResponse(200, '{"contacts":[]}');
    }
    return buildResponse(404, '{"error":"not found"}');
}
```

## Coverage Targets

| Target | Minimum | Recommended |
|--------|---------|-------------|
| Org-wide | 75% | 85%+ |
| Per class | 75% | 90%+ |
| Service classes | 90% | 95%+ |
| Trigger handlers | 90% | 95%+ |
| Utility classes | 85% | 95%+ |

**Coverage is a floor, not a goal.** Focus on testing behavior, not just covering lines. A test that covers 100% of lines but asserts nothing is worse than a test that covers 80% with thorough assertions.

## Anti-Patterns

### Never use SeeAllData=true

```apex
// NEVER DO THIS
@isTest(SeeAllData=true)
private class BadTest { }
```

Exceptions: Testing with ContentVersion or ConnectApi where isolation is not possible. Even then, isolate the `SeeAllData=true` to a single method, not the class.

### Never hardcode IDs

```apex
// BAD
Account acc = [SELECT Id FROM Account WHERE Id = '001000000000001'];

// GOOD
Account acc = [SELECT Id FROM Account LIMIT 1]; // from @TestSetup
```

### Never skip assertions

```apex
// BAD -- covers code but proves nothing
@isTest
static void testSomething() {
    MyClass.doSomething();
}

// GOOD
@isTest
static void doSomething_ValidInput_ShouldUpdateRecord() {
    MyClass.doSomething();
    Account result = [SELECT Status__c FROM Account LIMIT 1];
    System.assertEquals('Processed', result.Status__c, 'Record should be processed');
}
```

### Never rely on record order

```apex
// BAD -- order not guaranteed
List<Account> accs = [SELECT Name FROM Account];
System.assertEquals('First', accs[0].Name);

// GOOD -- query with ORDER BY or use Map
List<Account> accs = [SELECT Name FROM Account ORDER BY Name ASC];
```

## Testing Triggers with Bulk Data

Always test triggers with 200+ records to verify bulkification.

```apex
@isTest
static void accountTrigger_Insert200Records_ShouldNotExceedLimits() {
    List<Account> accounts = TestDataFactory.createAccounts(200);

    Test.startTest();
    insert accounts;
    Test.stopTest();

    System.assertEquals(200,
        [SELECT COUNT() FROM Account],
        'All 200 accounts should be inserted');
}
```

## Negative Testing

Test error paths and boundary conditions, not just the happy path.

```apex
@isTest
static void activateAccounts_EmptySet_ShouldReturnEarly() {
    Test.startTest();
    AccountService.activateAccounts(new Set<Id>());
    Test.stopTest();
    // No exception means it handled empty input gracefully
}

@isTest
static void activateAccounts_NullInput_ShouldThrowException() {
    Boolean exceptionThrown = false;
    try {
        AccountService.activateAccounts(null);
    } catch (IllegalArgumentException e) {
        exceptionThrown = true;
    }
    System.assert(exceptionThrown, 'Should throw exception for null input');
}
```
