---
name: security-patterns
description: CRUD/FLS enforcement, sharing keywords, security-enforced SOQL, permission checks, and credential management
origin: claude-sfdx-iq
user-invocable: false
tokens: 2788
domain: security
---

# Security Patterns

## Overview

Salesforce security operates on multiple layers: object-level (CRUD), field-level (FLS), record-level (sharing), and feature-level (permissions). Every Apex class must explicitly enforce the appropriate security checks.

## SOQL Security Enforcement

### WITH SECURITY_ENFORCED

Throws an exception if the user lacks read access to any field or object in the query.

```apex
List<Account> accounts = [
    SELECT Id, Name, AnnualRevenue, Custom_Field__c
    FROM Account
    WHERE Status__c = 'Active'
    WITH SECURITY_ENFORCED
];
```

**Behavior:**
- Checks CRUD (read) on the object
- Checks FLS (read) on every field in SELECT and WHERE
- Throws `System.QueryException` if any check fails
- All-or-nothing: if one field fails, the entire query fails

**When to use:** Standard queries where you want strict enforcement and can handle the exception.

### WITH USER_MODE

Introduced in Spring 2023. Enforces CRUD, FLS, and sharing rules. Unlike `SECURITY_ENFORCED`, it strips inaccessible fields instead of throwing.

```apex
List<Account> accounts = [
    SELECT Id, Name, AnnualRevenue, Custom_Field__c
    FROM Account
    WHERE Status__c = 'Active'
    WITH USER_MODE
];
```

**Behavior:**
- Enforces CRUD, FLS, and record-level sharing
- Inaccessible fields return null instead of throwing
- Inaccessible records are excluded from results
- Works with both SOQL and DML

```apex
// DML with USER_MODE
Database.insert(accounts, AccessLevel.USER_MODE);
Database.update(accounts, AccessLevel.USER_MODE);
```

**When to use:** Preferred for most user-facing queries. Graceful handling of mixed field access.

### WITH SYSTEM_MODE

Bypasses all security checks. Use only for system operations where the code must access all data regardless of user permissions.

```apex
// Only in without sharing classes for system operations
List<Account> accounts = [
    SELECT Id, Name FROM Account
    WITH SYSTEM_MODE
];
```

**When to use:** Background jobs, system integrations, and administrative operations where user context is irrelevant.

### Security.stripInaccessible()

Programmatically removes inaccessible fields from SObject records. Useful when you need to check before DML or serialize for API responses.

```apex
// Strip fields the user cannot read
List<Account> accounts = [SELECT Id, Name, AnnualRevenue, Secret_Field__c FROM Account];
SObjectAccessDecision decision = Security.stripInaccessible(AccessType.READABLE, accounts);
List<Account> sanitized = (List<Account>) decision.getRecords();
// Secret_Field__c is null if user lacks FLS read access

// Strip before update (remove fields user cannot edit)
SObjectAccessDecision updateDecision = Security.stripInaccessible(AccessType.UPDATABLE, accountsToUpdate);
update updateDecision.getRecords();

// Check which fields were removed
Set<String> removedFields = decision.getRemovedFields().get('Account');
```

**AccessType values:**
- `READABLE` -- check FLS read
- `CREATABLE` -- check FLS create
- `UPDATABLE` -- check FLS update
- `UPSERTABLE` -- check FLS create and update

**When to use:**
- Building API responses where you want to include accessible fields only
- Before DML when you receive data from an external source
- When you need to know which specific fields were stripped

## Sharing Keywords

### with sharing (Default)

Enforces the current user's record-level sharing rules (OWD, sharing rules, role hierarchy, manual shares).

```apex
public with sharing class AccountService {
    // Queries and DML respect the running user's sharing rules
    public List<Account> getMyAccounts() {
        return [SELECT Id, Name FROM Account]; // Only returns records user can see
    }
}
```

**Rule:** Use `with sharing` by default for all classes unless there is a specific, documented reason not to.

### without sharing

Bypasses record-level sharing. The class can access all records regardless of OWD, sharing rules, or role hierarchy.

```apex
public without sharing class SystemAccountService {
    // Can see ALL accounts regardless of sharing rules
    public List<Account> getAllAccounts() {
        return [SELECT Id, Name FROM Account];
    }
}
```

**When to use:**
- Background system operations (batch cleanup, data migration)
- Operations that must see all records (rollup calculations, aggregate reports)
- Platform Event subscribers
- Must include a comment justifying the elevated access

### inherited sharing

Inherits the sharing context from the calling class. If called from `with sharing`, it runs with sharing. If called from `without sharing`, it runs without.

```apex
public inherited sharing class AccountsSelector {
    // Sharing depends on who calls this selector
    public List<Account> selectById(Set<Id> ids) {
        return [SELECT Id, Name FROM Account WHERE Id IN :ids];
    }
}
```

**When to use:**
- Utility classes and selectors that are called from multiple contexts
- Library code that should not impose its own sharing policy
- fflib Selector classes

### Sharing Decision Matrix

| Scenario | Keyword | Reason |
|----------|---------|--------|
| User-facing Service | `with sharing` | Respect user's data access |
| LWC/Aura Controller | `with sharing` | UI respects sharing |
| REST API endpoint | `with sharing` | API caller sees only their data |
| Selector / Utility | `inherited sharing` | Inherit caller's context |
| Batch Apex | `without sharing` (usually) | System operation on all records |
| Platform Event handler | `without sharing` | No user context |
| System integration | `without sharing` | Must access all data |
| Trigger handler | `with sharing` | Default; override only if justified |

## CRUD Checks

### Schema Describe Approach

```apex
public class CrudChecker {

    public static void checkCreateable(SObjectType sObjectType) {
        if (!sObjectType.getDescribe().isCreateable()) {
            throw new SecurityException('No create access on ' + sObjectType);
        }
    }

    public static void checkReadable(SObjectType sObjectType) {
        if (!sObjectType.getDescribe().isAccessible()) {
            throw new SecurityException('No read access on ' + sObjectType);
        }
    }

    public static void checkUpdateable(SObjectType sObjectType) {
        if (!sObjectType.getDescribe().isUpdateable()) {
            throw new SecurityException('No update access on ' + sObjectType);
        }
    }

    public static void checkDeletable(SObjectType sObjectType) {
        if (!sObjectType.getDescribe().isDeletable()) {
            throw new SecurityException('No delete access on ' + sObjectType);
        }
    }
}
```

### FLS Check

```apex
public static void checkFieldReadable(SObjectField field) {
    if (!field.getDescribe().isAccessible()) {
        throw new SecurityException('No read access on field: ' + field);
    }
}

public static void checkFieldCreateable(SObjectField field) {
    if (!field.getDescribe().isCreateable()) {
        throw new SecurityException('No create access on field: ' + field);
    }
}
```

## Custom Permission Checks

Use Custom Permissions for feature-gating. Check with `FeatureManagement.checkPermission()`.

```apex
public class FeatureGate {

    public static Boolean canAccessAdvancedReporting() {
        return FeatureManagement.checkPermission('Advanced_Reporting');
    }

    public static void requirePermission(String permissionName) {
        if (!FeatureManagement.checkPermission(permissionName)) {
            throw new InsufficientAccessException(
                'Missing custom permission: ' + permissionName
            );
        }
    }
}

// Usage
public class ReportService {
    public static List<Report__c> getAdvancedReports() {
        FeatureGate.requirePermission('Advanced_Reporting');
        return [SELECT Id, Name FROM Report__c WITH SECURITY_ENFORCED];
    }
}
```

**Custom Permissions are assigned via Permission Sets.** This is the recommended approach over profile-based checks.

## Connected App Security

When building integrations, use Named Credentials instead of storing credentials in Custom Settings or code.

```apex
// BAD -- credentials in code or custom settings
HttpRequest req = new HttpRequest();
req.setEndpoint('https://api.example.com/data');
req.setHeader('Authorization', 'Bearer ' + Custom_Setting__c.getInstance().API_Key__c);

// GOOD -- Named Credential manages auth
HttpRequest req = new HttpRequest();
req.setEndpoint('callout:My_External_API/data');
req.setMethod('GET');
// Authentication header is added automatically
```

**Named Credential benefits:**
- Credentials stored securely by the platform
- Admin-configurable without code changes
- Supports OAuth 2.0, JWT, password, and custom auth
- Per-user or per-org authentication
- Credential rotation without deployment

## SOQL Injection Prevention

Never concatenate user input into SOQL strings. Use bind variables or `String.escapeSingleQuotes()`.

```apex
// BAD -- SOQL injection vulnerable
String query = 'SELECT Id FROM Account WHERE Name = \'' + userInput + '\'';
List<Account> accounts = Database.query(query);

// GOOD -- bind variable (preferred)
String accountName = userInput;
List<Account> accounts = [SELECT Id FROM Account WHERE Name = :accountName];

// GOOD -- escaped dynamic SOQL (when dynamic query is unavoidable)
String safeName = String.escapeSingleQuotes(userInput);
String query = 'SELECT Id FROM Account WHERE Name = \'' + safeName + '\'';
List<Account> accounts = Database.query(query);
```

## Security Review Checklist

Before deploying code to production, verify:

- [ ] Every class has a sharing keyword (`with sharing`, `without sharing`, or `inherited sharing`)
- [ ] `without sharing` classes have a comment justifying the elevated access
- [ ] All user-facing SOQL uses `WITH SECURITY_ENFORCED` or `WITH USER_MODE`
- [ ] No SOQL injection (dynamic SOQL uses bind variables or `escapeSingleQuotes`)
- [ ] No hardcoded credentials, API keys, or tokens
- [ ] External callouts use Named Credentials
- [ ] Custom Permissions used for feature gating (not profile name checks)
- [ ] `stripInaccessible()` used before returning data to LWC/API
- [ ] DML operations check CRUD where appropriate
- [ ] Test classes verify security enforcement with restricted users
- [ ] No `SeeAllData=true` in tests
- [ ] Platform Event fields do not contain sensitive data in plain text

## Anti-Patterns

1. **Checking profile name instead of permission:** Profiles change; permissions are portable.
2. **Hardcoding credentials in Custom Settings:** Use Named Credentials.
3. **Omitting sharing keyword:** Defaults to `without sharing` in some contexts (ambiguous behavior).
4. **Running all code without sharing "for simplicity":** Bypasses a core security layer.
5. **Using SYSTEM_MODE in user-facing code:** Defeats the purpose of FLS/CRUD.
6. **Catching and hiding security exceptions:** If a user lacks access, they should know.
