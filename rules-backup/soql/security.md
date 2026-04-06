---
paths:
  - "**/*.cls"
  - "**/*.trigger"
  - "**/*.apex"
---

# SOQL Security

## WITH SECURITY_ENFORCED

Enforces both CRUD and FLS. Throws `System.QueryException` if the user lacks read access to any referenced object or field.

```apex
// ✅ Good — enforced FLS on a read query
List<Account> accounts = [
    SELECT Id, Name, AnnualRevenue, Industry
    FROM Account
    WHERE Id IN :accountIds
    WITH SECURITY_ENFORCED
];
```

**When to use:** Standard read queries that surface data to the user. Use when you want a hard failure if access is missing.

**Limitations:** Cannot be used with aggregate queries, COUNT(), or polymorphic TYPEOF.

## WITH USER_MODE (Spring '23+, Most Secure)

Enforces sharing rules, CRUD, and FLS in a single declaration. The preferred approach for new code.

```apex
// ✅ Good — full security enforcement in one clause
List<Account> accounts = [
    SELECT Id, Name, AnnualRevenue
    FROM Account
    WHERE CreatedDate = THIS_YEAR
    WITH USER_MODE
];

// ✅ Good — USER_MODE with dynamic SOQL
List<Account> accounts = Database.query(
    'SELECT Id, Name FROM Account WHERE Industry = :industry',
    AccessLevel.USER_MODE
);

// ✅ Good — USER_MODE with DML
Database.insert(records, AccessLevel.USER_MODE);
Database.update(records, AccessLevel.USER_MODE);
```

**When to use:** All new development. Replaces `WITH SECURITY_ENFORCED` and manual CRUD checks. Works with both static and dynamic SOQL via `AccessLevel.USER_MODE`.

## stripInaccessible()

Silently removes fields the user cannot access instead of throwing an exception. Use when you want partial results.

```apex
// ✅ Good — strip before returning to the UI
List<Account> accounts = [SELECT Id, Name, AnnualRevenue FROM Account WHERE Id IN :ids];
SObjectAccessDecision decision = Security.stripInaccessible(AccessType.READABLE, accounts);
return decision.getRecords();
// AnnualRevenue is removed if user lacks FLS — no exception thrown

// ✅ Good — strip before DML to enforce FLS on write
SObjectAccessDecision decision = Security.stripInaccessible(AccessType.CREATABLE, newRecords);
insert decision.getRecords();

// Check which fields were removed
Set<String> removedFields = decision.getRemovedFields().get('Account');
if (removedFields != null && !removedFields.isEmpty()) {
    Logger.warn('Inaccessible fields removed: ' + removedFields);
}
```

**When to use:** When displaying data where missing fields are acceptable, or before DML with user-supplied data.

## Bind Variables Over String Concatenation

This is the single most important SOQL security rule. String concatenation creates SOQL injection vulnerabilities.

```apex
// ❌ Bad — SOQL injection attack surface
String userInput = ApexPages.currentPage().getParameters().get('search');
String query = 'SELECT Id, Name FROM Account WHERE Name = \'' + userInput + '\'';
List<Account> results = Database.query(query);
// Attacker sends: ' OR Name != '  → returns all records

// ✅ Good — bind variable, immune to injection
String userInput = ApexPages.currentPage().getParameters().get('search');
List<Account> results = [SELECT Id, Name FROM Account WHERE Name = :userInput];

// ✅ Good — Database.queryWithBinds for dynamic SOQL
String soql = 'SELECT Id, Name FROM Account WHERE Name = :searchTerm';
Map<String, Object> binds = new Map<String, Object>{ 'searchTerm' => userInput };
List<Account> results = Database.queryWithBinds(soql, binds, AccessLevel.USER_MODE);
```

## String.escapeSingleQuotes() — Last Resort

Only use when bind variables are impossible (e.g., dynamic field names in a LIKE clause).

```apex
// ✅ Acceptable — escapeSingleQuotes when binds are not possible
String safeTerm = String.escapeSingleQuotes(userInput);
String query = 'SELECT Id, Name FROM Account WHERE Name LIKE \'%' + safeTerm + '%\'';

// ✅ Better — use bind variable with LIKE
String searchTerm = '%' + userInput + '%';
List<Account> results = [SELECT Id, Name FROM Account WHERE Name LIKE :searchTerm];
```

## Never Use Database.query() with Raw User Input

Dynamic SOQL with unsanitized input is the most common Salesforce security vulnerability.

```apex
// ❌ Bad — user controls the entire query
String userQuery = request.getParameter('query');
List<SObject> results = Database.query(userQuery);

// ❌ Bad — user controls the WHERE clause
String filter = request.getParameter('filter');
String query = 'SELECT Id FROM Account WHERE ' + filter;
List<Account> results = Database.query(query);

// ✅ Good — parameterized dynamic SOQL
String field = allowedFieldsMap.get(request.getParameter('sortField'));
if (field == null) {
    throw new SecurityException('Invalid sort field.');
}
String query = 'SELECT Id, Name FROM Account ORDER BY ' + field + ' LIMIT 100';
List<Account> results = Database.query(query);
```

## Security Enforcement Comparison

| Method | CRUD | FLS | Sharing | Behavior on Violation |
|--------|------|-----|---------|----------------------|
| `WITH SECURITY_ENFORCED` | Yes | Yes | No | Throws QueryException |
| `WITH USER_MODE` | Yes | Yes | Yes | Throws QueryException |
| `stripInaccessible()` | No | Yes | No | Silently removes fields |
| `Schema.sObjectType` checks | Yes | Per-field | No | Manual handling |
| `AccessLevel.USER_MODE` (DML) | Yes | Yes | Yes | Throws DmlException |

## Security Decision Guide

- **New code:** Use `WITH USER_MODE` for queries and `AccessLevel.USER_MODE` for DML.
- **Existing code returning data to users:** Add `WITH SECURITY_ENFORCED`.
- **Existing code where partial data is acceptable:** Use `stripInaccessible()`.
- **System-context operations (batch, scheduled):** Document why `without sharing` is needed.
