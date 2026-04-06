---
paths:
  - "**/*.cls"
  - "**/*.trigger"
  - "**/*.apex"
---

# SOQL Anti-Patterns

## SOQL Inside For Loops

The most common governor limit violation. Each query in a loop counts toward the 100-query limit.

```apex
// ❌ Bad — query per iteration, hits limit at 100 records
for (Opportunity opp : opportunities) {
    Account acct = [SELECT Id, Name FROM Account WHERE Id = :opp.AccountId];
    opp.Description = acct.Name;
}

// ✅ Good — single query, map lookup
Set<Id> accountIds = new Set<Id>();
for (Opportunity opp : opportunities) {
    accountIds.add(opp.AccountId);
}
Map<Id, Account> accountMap = new Map<Id, Account>(
    [SELECT Id, Name FROM Account WHERE Id IN :accountIds]
);
for (Opportunity opp : opportunities) {
    Account acct = accountMap.get(opp.AccountId);
    if (acct != null) {
        opp.Description = acct.Name;
    }
}
```

## Querying All Fields

Retrieving every field wastes heap, CPU, and makes FLS enforcement harder. Query only what you use.

```apex
// ❌ Bad — "query everything" approach
List<Account> accounts = [
    SELECT Id, Name, Description, Phone, Fax, Website, Industry,
           AnnualRevenue, NumberOfEmployees, OwnerId, CreatedDate,
           BillingStreet, BillingCity, BillingState, BillingPostalCode,
           BillingCountry, ShippingStreet, ShippingCity, ShippingState,
           ShippingPostalCode, ShippingCountry, AccountSource, Rating,
           Type, Sic, SicDesc, Site, ParentId
    FROM Account
    WHERE Id IN :accountIds
];
// Only uses Name and Industry

// ✅ Good — only the fields you need
List<Account> accounts = [
    SELECT Id, Name, Industry
    FROM Account
    WHERE Id IN :accountIds
    WITH SECURITY_ENFORCED
];
```

## Non-Selective WHERE on Large Objects

On objects with 200,000+ records, non-selective queries time out or are rejected by the platform.

```apex
// ❌ Bad — non-selective filter on unindexed field with 500K records
List<Lead> leads = [
    SELECT Id, Name FROM Lead WHERE Custom_Score__c > 50
];

// ✅ Good — combine with indexed field to make selective
List<Lead> leads = [
    SELECT Id, Name
    FROM Lead
    WHERE CreatedDate = LAST_N_DAYS:90
      AND Custom_Score__c > 50
    LIMIT 200
];
```

## Missing LIMIT on Unbounded Queries

Without LIMIT, a query can return up to 50,000 rows and blow through your heap.

```apex
// ❌ Bad — could return 50,000 rows
List<Task> tasks = [SELECT Id, Subject FROM Task WHERE Status = 'Open'];

// ✅ Good — bounded with LIMIT
List<Task> tasks = [
    SELECT Id, Subject
    FROM Task
    WHERE Status = 'Open'
    ORDER BY CreatedDate DESC
    LIMIT 100
];
```

## Querying in Constructors or Static Initializers

Queries in constructors or static blocks run every time the class is instantiated or loaded, often unexpectedly consuming SOQL limits.

```apex
// ❌ Bad — query runs on every instantiation
public class AccountHelper {
    private List<RecordType> recordTypes;

    public AccountHelper() {
        this.recordTypes = [SELECT Id, DeveloperName FROM RecordType WHERE SObjectType = 'Account'];
    }
}

// ❌ Bad — static initializer runs on class load
public class AccountHelper {
    private static List<RecordType> recordTypes =
        [SELECT Id, DeveloperName FROM RecordType WHERE SObjectType = 'Account'];
}

// ✅ Good — lazy-loaded with caching
public class AccountHelper {
    private static Map<String, Id> recordTypeCache;

    public static Map<String, Id> getRecordTypeMap() {
        if (recordTypeCache == null) {
            recordTypeCache = new Map<String, Id>();
            for (RecordType rt : [
                SELECT Id, DeveloperName
                FROM RecordType
                WHERE SObjectType = 'Account'
            ]) {
                recordTypeCache.put(rt.DeveloperName, rt.Id);
            }
        }
        return recordTypeCache;
    }
}
```

## Parent-Child Queries Beyond Limits

Subqueries return a maximum of 200 child records per parent by default (configurable to 2,000 with `LIMIT` in the subquery). Exceeding this silently truncates results.

```apex
// ❌ Bad — may silently truncate if an Account has 200+ Contacts
List<Account> accounts = [
    SELECT Id, Name, (SELECT Id, Name FROM Contacts)
    FROM Account
    WHERE Id IN :accountIds
];

// ✅ Good — explicit limit and order
List<Account> accounts = [
    SELECT Id, Name,
        (SELECT Id, Name FROM Contacts ORDER BY LastName ASC LIMIT 200)
    FROM Account
    WHERE Id IN :accountIds
];

// ✅ Good — when you need ALL children, query separately
List<Contact> allContacts = [
    SELECT Id, Name, AccountId
    FROM Contact
    WHERE AccountId IN :accountIds
    WITH SECURITY_ENFORCED
];
Map<Id, List<Contact>> contactsByAccount = new Map<Id, List<Contact>>();
for (Contact con : allContacts) {
    if (!contactsByAccount.containsKey(con.AccountId)) {
        contactsByAccount.put(con.AccountId, new List<Contact>());
    }
    contactsByAccount.get(con.AccountId).add(con);
}
```

## Not Using @TestSetup for Test Queries

Without `@TestSetup`, every test method re-creates and re-queries data, wasting governor limits.

```apex
// ❌ Bad — every test method creates its own data
@IsTest
static void testOne() {
    Account acct = new Account(Name = 'Test');
    insert acct;
    // test logic
}

@IsTest
static void testTwo() {
    Account acct = new Account(Name = 'Test');
    insert acct;
    // different test logic
}

// ✅ Good — shared setup, each test gets a fresh copy
@TestSetup
static void setup() {
    List<Account> accounts = TestDataFactory.createAccounts(5);
    insert accounts;
    List<Contact> contacts = new List<Contact>();
    for (Account acct : accounts) {
        contacts.add(TestDataFactory.createContact(acct.Id));
    }
    insert contacts;
}

@IsTest
static void testOne() {
    List<Account> accounts = [SELECT Id, Name FROM Account];
    // test logic — data from @TestSetup is rolled back after this method
}

@IsTest
static void testTwo() {
    List<Account> accounts = [SELECT Id, Name FROM Account];
    // independent test — gets its own copy of @TestSetup data
}
```

## Anti-Pattern Quick Reference

| Anti-Pattern | Risk | Fix |
|-------------|------|-----|
| SOQL in loops | 100-query limit | Query before loop, use Map |
| All-field queries | Heap, CPU, FLS | Query only needed fields |
| Non-selective WHERE | Timeout on large objects | Filter on indexed fields |
| Missing LIMIT | 50K row limit, heap | Always add LIMIT |
| Constructor queries | Unexpected limit use | Lazy load with caching |
| Unbounded subqueries | Truncated results | Explicit LIMIT or separate query |
| No @TestSetup | Wasted test DML/SOQL | Centralize test data creation |
