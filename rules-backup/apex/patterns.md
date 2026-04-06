---
paths:
  - "**/*.cls"
  - "**/*.trigger"
  - "**/*.apex"
---

# Apex Design Patterns

## One Trigger Per Object

Each SObject gets exactly one trigger. The trigger delegates all logic to a handler class.

```apex
// ❌ Bad — logic in the trigger body
trigger AccountTrigger on Account (before insert) {
    for (Account acct : Trigger.new) {
        acct.Description = 'Updated by trigger';
        // 50 more lines of business logic...
    }
}

// ✅ Good — thin trigger, handler delegation
trigger AccountTrigger on Account (
    before insert, before update, before delete,
    after insert, after update, after delete, after undelete
) {
    AccountTriggerHandler handler = new AccountTriggerHandler();
    handler.run();
}
```

## Trigger Handler Pattern

Use a base handler class or interface for consistent trigger processing.

```apex
public with sharing class AccountTriggerHandler extends TriggerHandler {

    public override void beforeInsert() {
        AccountDomain.setDefaults((List<Account>) Trigger.new);
    }

    public override void afterUpdate() {
        Set<Id> changedIds = getChangedRecordIds('Industry');
        if (!changedIds.isEmpty()) {
            AccountService.syncIndustryToContacts(changedIds);
        }
    }

    private Set<Id> getChangedRecordIds(String fieldName) {
        Set<Id> changed = new Set<Id>();
        for (Account newAcct : (List<Account>) Trigger.new) {
            Account oldAcct = (Account) Trigger.oldMap.get(newAcct.Id);
            if (newAcct.get(fieldName) != oldAcct.get(fieldName)) {
                changed.add(newAcct.Id);
            }
        }
        return changed;
    }
}
```

## Service Layer

Services contain business logic and orchestration. They are the entry point for operations that span multiple objects or require complex coordination.

```apex
// ❌ Bad — business logic scattered in controller
public class OpportunityController {
    @AuraEnabled
    public static void closeOpportunity(Id oppId) {
        Opportunity opp = [SELECT Id, StageName, AccountId FROM Opportunity WHERE Id = :oppId];
        opp.StageName = 'Closed Won';
        update opp;
        Task t = new Task(WhatId = opp.Id, Subject = 'Follow up');
        insert t;
    }
}

// ✅ Good — controller delegates to service
public with sharing class OpportunityController {
    @AuraEnabled
    public static void closeOpportunity(Id oppId) {
        OpportunityService.closeAsWon(new Set<Id>{ oppId });
    }
}

public with sharing class OpportunityService {
    public static void closeAsWon(Set<Id> opportunityIds) {
        List<Opportunity> opps = OpportunitySelector.getByIds(opportunityIds);
        OpportunityDomain.markClosedWon(opps);
        update opps;
        TaskService.createFollowUps(opps);
    }
}
```

## Selector Layer

Selectors encapsulate all SOQL for an SObject. This centralizes query logic and makes it testable.

```apex
// ❌ Bad — queries inline everywhere
List<Account> accts = [SELECT Id, Name FROM Account WHERE Id IN :ids];

// ✅ Good — selector class
public inherited sharing class AccountSelector {

    public static List<Account> getByIds(Set<Id> accountIds) {
        return [
            SELECT Id, Name, Industry, BillingCity
            FROM Account
            WHERE Id IN :accountIds
            WITH SECURITY_ENFORCED
        ];
    }

    public static List<Account> getWithContacts(Set<Id> accountIds) {
        return [
            SELECT Id, Name,
                (SELECT Id, FirstName, LastName, Email FROM Contacts)
            FROM Account
            WHERE Id IN :accountIds
            WITH SECURITY_ENFORCED
        ];
    }
}
```

## Domain Layer

Domain classes encapsulate SObject-specific behavior, validation, and field defaulting.

```apex
public with sharing class OpportunityDomain {

    public static void setDefaults(List<Opportunity> opportunities) {
        for (Opportunity opp : opportunities) {
            if (opp.CloseDate == null) {
                opp.CloseDate = Date.today().addDays(30);
            }
            if (String.isBlank(opp.StageName)) {
                opp.StageName = 'Prospecting';
            }
        }
    }

    public static void markClosedWon(List<Opportunity> opportunities) {
        for (Opportunity opp : opportunities) {
            opp.StageName = 'Closed Won';
            opp.CloseDate = Date.today();
        }
    }

    public static void validate(List<Opportunity> opportunities) {
        for (Opportunity opp : opportunities) {
            if (opp.Amount == null || opp.Amount <= 0) {
                opp.Amount.addError('Amount must be greater than zero.');
            }
        }
    }
}
```

## Factory Pattern

Use factories to create test data or complex object graphs.

```apex
public with sharing class TestDataFactory {

    public static Account createAccount(String name) {
        return new Account(Name = name, Industry = 'Technology');
    }

    public static List<Account> createAccounts(Integer count) {
        List<Account> accounts = new List<Account>();
        for (Integer i = 0; i < count; i++) {
            accounts.add(createAccount('Test Account ' + i));
        }
        return accounts;
    }

    public static Opportunity createOpportunity(Id accountId) {
        return new Opportunity(
            Name = 'Test Opp',
            AccountId = accountId,
            StageName = 'Prospecting',
            CloseDate = Date.today().addDays(30),
            Amount = 10000
        );
    }
}
```

## Avoid God Classes

No class should exceed ~500 lines. If a service class grows too large, decompose by responsibility.

```apex
// ❌ Bad — one class handling everything for Accounts
public class AccountManager {
    // 800 lines: validation, defaulting, queries, DML, callouts, notifications
}

// ✅ Good — separated by concern
AccountDomain        // field defaults, validation
AccountSelector      // SOQL queries
AccountService       // business logic orchestration
AccountCalloutService // external API integration
AccountNotificationService // email and chatter notifications
```

## Separation of Concerns Summary

| Layer | Responsibility | Example Class |
|-------|---------------|---------------|
| Trigger | Entry point only | `AccountTrigger` |
| Handler | Route trigger events | `AccountTriggerHandler` |
| Domain | SObject behavior, validation | `AccountDomain` |
| Selector | SOQL queries | `AccountSelector` |
| Service | Business logic orchestration | `AccountService` |
| Controller | UI-facing, delegates to Service | `AccountController` |
