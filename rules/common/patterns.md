# Design Patterns — Universal Rules

## Separation of Concerns

Every Salesforce project MUST follow layered architecture:

| Layer | Responsibility | Example |
|-------|---------------|---------|
| **Trigger** | Event routing only — no logic | `AccountTrigger.trigger` |
| **Handler** | Context routing (before/after insert/update/delete) | `AccountTriggerHandler.cls` |
| **Service** | Business logic, orchestration | `AccountService.cls` |
| **Selector** | All SOQL queries, encapsulated | `AccountSelector.cls` |
| **Domain** | SObject validation, field defaults, derived values | `Accounts.cls` |

## One Trigger Per Object

- Each SObject has exactly ONE trigger that fires for all events.
- The trigger body delegates immediately to a handler class.
- No business logic in the trigger file — zero lines of logic.

```apex
// ✅ Correct — pure delegation
trigger AccountTrigger on Account (before insert, before update, after insert, after update) {
    new AccountTriggerHandler().run();
}

// ❌ Wrong — logic in trigger body
trigger AccountTrigger on Account (before insert) {
    for (Account a : Trigger.new) {
        if (a.Name == null) a.addError('Name required');
    }
}
```

## Bulkification Pattern

All code MUST handle collections, never single records:

```apex
// ❌ Single-record thinking
public void processAccount(Account acct) {
    Contact c = [SELECT Id FROM Contact WHERE AccountId = :acct.Id LIMIT 1];
}

// ✅ Bulk-safe
public void processAccounts(List<Account> accounts) {
    Set<Id> accountIds = new Map<Id, Account>(accounts).keySet();
    Map<Id, Contact> contactsByAccountId = new Map<Id, Contact>();
    for (Contact c : [SELECT Id, AccountId FROM Contact WHERE AccountId IN :accountIds]) {
        contactsByAccountId.put(c.AccountId, c);
    }
}
```

## Map-Based Lookups

Replace nested loops with Map lookups for O(1) access:

```apex
Map<Id, Account> accountMap = new Map<Id, Account>(
    [SELECT Id, Name FROM Account WHERE Id IN :accountIds]
);
for (Contact c : contacts) {
    Account parentAcct = accountMap.get(c.AccountId);
}
```

## Error Handling Boundaries

- Catch exceptions at service boundaries (the entry point), not in every method.
- Use `addError()` on trigger records to show user-facing errors.
- Log unexpected exceptions via Platform Events (not `System.debug`).

## Dependency Direction

Dependencies flow inward: Trigger → Handler → Service → Selector/Domain. Never the reverse. Selectors and Domain classes must not call Services.
