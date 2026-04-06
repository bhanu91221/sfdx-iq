---
paths:
  - "**/*.cls"
  - "**/*.trigger"
  - "**/*.apex"
---

# Apex Security

## with sharing by Default

All Apex classes MUST declare `with sharing` unless there is a documented business justification. Use `inherited sharing` for utility classes that should respect the caller's context.

```apex
// ❌ Bad — no sharing declaration (runs as without sharing implicitly)
public class AccountService {
    public List<Account> getAll() {
        return [SELECT Id, Name FROM Account];
    }
}

// ✅ Good — explicit sharing
public with sharing class AccountService {
    public List<Account> getAll() {
        return [SELECT Id, Name FROM Account WITH SECURITY_ENFORCED];
    }
}

// ✅ Good — inherited sharing for reusable utility
public inherited sharing class QueryUtils {
    public static List<SObject> executeQuery(String query) {
        return Database.query(query);
    }
}

// ✅ Justified without sharing — documented reason
// JUSTIFICATION: Scheduled job aggregates data across all accounts
// regardless of running user's sharing rules for org-wide reporting.
public without sharing class AccountAggregationBatch implements Database.Batchable<SObject> {
    // ...
}
```

## CRUD Checks

Before performing DML, verify the running user has the required object-level permission.

```apex
// ❌ Bad — no CRUD check
insert new Account(Name = 'Test');

// ✅ Good — check before DML
if (!Schema.sObjectType.Account.isCreateable()) {
    throw new SecurityException('Insufficient privileges to create Account records.');
}
insert new Account(Name = 'Test');

// ✅ Good — full CRUD check examples
Schema.sObjectType.Account.isAccessible()   // READ
Schema.sObjectType.Account.isCreateable()   // CREATE
Schema.sObjectType.Account.isUpdateable()   // UPDATE
Schema.sObjectType.Account.isDeletable()    // DELETE
```

## Field-Level Security (FLS)

### WITH SECURITY_ENFORCED

Throws an exception if the user lacks access to any queried field. Use for reads that surface data to the user.

```apex
// ✅ Good — FLS enforced on query
List<Account> accounts = [
    SELECT Id, Name, AnnualRevenue, Industry
    FROM Account
    WHERE Id IN :accountIds
    WITH SECURITY_ENFORCED
];
```

### stripInaccessible()

Silently removes fields the user cannot access. Use when you need partial results rather than an exception.

```apex
// ✅ Good — strip inaccessible fields before returning to UI
List<Account> accounts = [SELECT Id, Name, AnnualRevenue FROM Account];
SObjectAccessDecision decision = Security.stripInaccessible(AccessType.READABLE, accounts);
List<Account> safeAccounts = decision.getRecords();

// ✅ Good — strip before DML to prevent FLS violations on write
SObjectAccessDecision decision = Security.stripInaccessible(AccessType.CREATABLE, recordsToInsert);
insert decision.getRecords();
```

### WITH USER_MODE (Spring '23+)

The most secure option. Enforces both CRUD and FLS automatically.

```apex
// ✅ Good — USER_MODE enforces sharing, CRUD, and FLS
List<Account> accounts = [
    SELECT Id, Name, Industry
    FROM Account
    WHERE CreatedDate = THIS_YEAR
    WITH USER_MODE
];

// ✅ Good — USER_MODE with Database methods
List<Account> accounts = Database.query(
    'SELECT Id, Name FROM Account WHERE Industry = :industry',
    AccessLevel.USER_MODE
);

Database.insert(records, AccessLevel.USER_MODE);
```

## SOQL Injection Prevention

NEVER concatenate user input into SOQL strings.

```apex
// ❌ Bad — SOQL injection vulnerability
String searchTerm = ApexPages.currentPage().getParameters().get('name');
String query = 'SELECT Id FROM Account WHERE Name = \'' + searchTerm + '\'';
List<Account> accounts = Database.query(query);

// ✅ Good — bind variables (static SOQL)
String searchTerm = ApexPages.currentPage().getParameters().get('name');
List<Account> accounts = [SELECT Id FROM Account WHERE Name = :searchTerm];

// ✅ Good — Database.queryWithBinds for dynamic SOQL
String query = 'SELECT Id FROM Account WHERE Name = :searchTerm';
Map<String, Object> binds = new Map<String, Object>{ 'searchTerm' => searchTerm };
List<Account> accounts = Database.queryWithBinds(query, binds, AccessLevel.USER_MODE);

// ✅ Acceptable — escapeSingleQuotes as last resort
String safeTerm = String.escapeSingleQuotes(userInput);
String query = 'SELECT Id FROM Account WHERE Name LIKE \'%' + safeTerm + '%\'';
```

## Secure Apex Controller Methods

All `@AuraEnabled` methods must validate input and enforce security.

```apex
// ❌ Bad — no validation, no security
@AuraEnabled
public static List<Account> search(String term) {
    return Database.query('SELECT Id, Name FROM Account WHERE Name LIKE \'%' + term + '%\'');
}

// ✅ Good — input validation + USER_MODE
@AuraEnabled(cacheable=true)
public static List<Account> search(String term) {
    if (String.isBlank(term) || term.length() < 2) {
        throw new AuraHandledException('Search term must be at least 2 characters.');
    }
    String safeTerm = '%' + String.escapeSingleQuotes(term.trim()) + '%';
    return [
        SELECT Id, Name, Industry
        FROM Account
        WHERE Name LIKE :safeTerm
        WITH USER_MODE
        LIMIT 50
    ];
}
```

## Credential and Secret Management

- NEVER hardcode API keys, tokens, passwords, or secrets in Apex.
- Use Named Credentials for all external callouts.
- Store configuration in Custom Metadata Types or Protected Custom Settings.

```apex
// ❌ Bad — hardcoded secret
HttpRequest req = new HttpRequest();
req.setHeader('Authorization', 'Bearer sk_live_abc123xyz');

// ✅ Good — Named Credential
HttpRequest req = new HttpRequest();
req.setEndpoint('callout:My_External_API/v1/accounts');
req.setMethod('GET');
// Authorization header is set automatically by the Named Credential
```

## Security Checklist

- [ ] Every class declares `with sharing`, `without sharing` (with justification), or `inherited sharing`
- [ ] CRUD checked before DML via `Schema.sObjectType`
- [ ] FLS enforced via `WITH SECURITY_ENFORCED`, `WITH USER_MODE`, or `stripInaccessible()`
- [ ] No string concatenation in SOQL — bind variables or `escapeSingleQuotes()` only
- [ ] All `@AuraEnabled` methods validate input and enforce security
- [ ] No hardcoded credentials — Named Credentials for callouts
