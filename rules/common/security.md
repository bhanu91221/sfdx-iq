# Security Rules for Salesforce Development

## Sharing Model Enforcement

- All Apex classes MUST use `with sharing` by default.
- Any use of `without sharing` MUST include a comment explaining the business justification.
- Inner classes inherit the sharing context of their outer class — be explicit when this matters.

```apex
public with sharing class AccountService {
    // Business logic respects org sharing rules
}

// JUSTIFIED: Runs in system context to aggregate data across all accounts
// for a scheduled reporting job where the running user lacks full visibility.
public without sharing class AccountAggregationService {
}
```

## SOQL Injection Prevention

- All SOQL queries MUST use bind variables (`:variableName`) for user-supplied input.
- NEVER build SOQL by concatenating user input strings.
- If dynamic SOQL is unavoidable, use `String.escapeSingleQuotes()` on all inputs.
- Prefer `Database.queryWithBinds()` for dynamic queries with variable binding.

```apex
// CORRECT
List<Account> accts = [SELECT Id FROM Account WHERE Name = :userInput];

// WRONG — SQL injection risk
String q = 'SELECT Id FROM Account WHERE Name = \'' + userInput + '\'';
```

## Field-Level Security

- Use `WITH SECURITY_ENFORCED` on SOQL queries that return data to users.
- Use `Security.stripInaccessible(AccessType.READABLE, records)` before returning query results.
- Use `Security.stripInaccessible(AccessType.CREATABLE, records)` before DML insert with user-supplied data.

```apex
List<Account> accts = [SELECT Id, Name, Revenue__c FROM Account WITH SECURITY_ENFORCED];

SObjectAccessDecision decision = Security.stripInaccessible(AccessType.UPDATABLE, records);
update decision.getRecords();
```

## Credential Management

- NEVER hardcode credentials, API keys, tokens, or secrets in Apex, LWC, or metadata.
- Use Named Credentials for all external HTTP callouts.
- Store configuration values in Custom Metadata Types or Protected Custom Settings.
- Use certificates stored in Certificate and Key Management for signing operations.

## CSRF and UI Security

- Use standard Salesforce UI frameworks (LWC, Aura) which include built-in CSRF protection.
- Never disable CSRF tokens on Visualforce pages.
- Validate all URL parameters and redirect targets.

## Experience Cloud / Guest User

- Guest user profiles MUST have minimal object and field access.
- Never grant guest users Modify All Data or View All Data.
- Validate record ownership and sharing in Apex before returning data to guest contexts.
- Review all `@AuraEnabled` methods for guest user exposure.

## Shield Platform Encryption

- Identify fields containing PII or sensitive data and mark them for Shield encryption.
- Use `WITH SECURITY_ENFORCED` to respect encryption policies in queries.
- Test that encrypted fields work correctly with formula fields and reports.

## Security Response Protocol

When a security issue is detected:

1. **STOP** — Do not proceed with the current operation.
2. **Delegate** — Invoke the `security-reviewer` agent for assessment.
3. **Fix** — Apply the recommended remediation.
4. **Review** — Confirm the fix passes security review before continuing.
