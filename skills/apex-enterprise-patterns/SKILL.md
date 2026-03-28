---
name: apex-enterprise-patterns
description: fflib enterprise patterns including Application factory, UnitOfWork, Selector base, Domain base, and Service layer
origin: claude-sfdx-iq
user-invocable: false
tokens: 3311
domain: apex
---

# Apex Enterprise Patterns (fflib)

## Overview

The Apex Enterprise Patterns library (fflib) implements Martin Fowler's enterprise patterns adapted for the Salesforce platform. It provides four core layers: Service, Domain, Selector, and Unit of Work, wired together through an Application factory class.

## Architecture Diagram

```
Controller / Trigger / Batch / REST API
         |
    Service Layer         (orchestration, transaction boundary)
         |
    +----+----+
    |         |
Domain    Selector        (SObject behavior / centralized queries)
    |         |
    +----+----+
         |
    Unit of Work          (deferred DML, commit as a unit)
```

## Application Factory

The `Application.cls` class is the central registry that wires all layers together. It enables mocking in tests by allowing replacement of real implementations with stubs.

```apex
public class Application {

    public static final fflib_Application.UnitOfWorkFactory UnitOfWork =
        new fflib_Application.UnitOfWorkFactory(
            new List<SObjectType>{
                Account.SObjectType,
                Contact.SObjectType,
                Opportunity.SObjectType,
                OpportunityLineItem.SObjectType
            }
        );

    public static final fflib_Application.ServiceFactory Service =
        new fflib_Application.ServiceFactory(
            new Map<Type, Type>{
                IAccountService.class => AccountServiceImpl.class,
                IOpportunityService.class => OpportunityServiceImpl.class
            }
        );

    public static final fflib_Application.SelectorFactory Selector =
        new fflib_Application.SelectorFactory(
            new Map<SObjectType, Type>{
                Account.SObjectType => AccountsSelector.class,
                Contact.SObjectType => ContactsSelector.class,
                Opportunity.SObjectType => OpportunitiesSelector.class
            }
        );

    public static final fflib_Application.DomainFactory Domain =
        new fflib_Application.DomainFactory(
            Application.Selector,
            new Map<SObjectType, Type>{
                Account.SObjectType => Accounts.Constructor.class,
                Contact.SObjectType => Contacts.Constructor.class,
                Opportunity.SObjectType => Opportunities.Constructor.class
            }
        );
}
```

**Key points:**
- UnitOfWork SObject list defines DML commit order (parents before children)
- ServiceFactory maps interfaces to implementations for dependency injection
- SelectorFactory maps SObjectType to the Selector class
- DomainFactory maps SObjectType to the Domain constructor

## Unit of Work Pattern

UnitOfWork collects all DML operations and commits them in a single transaction. This ensures atomicity, minimizes DML statements, and respects governor limits.

```apex
public class OpportunityServiceImpl implements IOpportunityService {

    public void closeWonOpportunities(Set<Id> oppIds) {
        fflib_ISObjectUnitOfWork uow = Application.UnitOfWork.newInstance();

        List<Opportunity> opps =
            ((IOpportunitiesSelector) Application.Selector.newInstance(Opportunity.SObjectType))
                .selectById(oppIds);

        for (Opportunity opp : opps) {
            opp.StageName = 'Closed Won';
            opp.CloseDate = Date.today();
            uow.registerDirty(opp);

            // Create related record
            Task followUp = new Task(
                Subject = 'Post-Close Follow Up',
                WhatId = opp.Id,
                OwnerId = opp.OwnerId,
                ActivityDate = Date.today().addDays(7)
            );
            uow.registerNew(followUp);
        }

        uow.commitWork();
    }
}
```

**UnitOfWork API:**

| Method | Purpose |
|--------|---------|
| `registerNew(SObject)` | Insert |
| `registerNew(SObject, relField, parentSObject)` | Insert with parent relationship |
| `registerDirty(SObject)` | Update |
| `registerDeleted(SObject)` | Delete |
| `registerRelationship(child, field, parent)` | Set lookup before insert |
| `commitWork()` | Execute all registered DML in order |

**Benefits:**
- DML is batched by SObject type, reducing DML statements
- Commit order follows the SObject list in the factory (parent first)
- Transaction is all-or-nothing; partial commits do not happen
- Easy to mock for unit testing

## Selector Base

Selectors inherit from `fflib_SObjectSelector` and centralize all SOQL for an SObject.

```apex
public inherited sharing class AccountsSelector extends fflib_SObjectSelector {

    public static IAccountsSelector newInstance() {
        return (IAccountsSelector) Application.Selector.newInstance(Account.SObjectType);
    }

    public List<Schema.SObjectField> getSObjectFieldList() {
        return new List<Schema.SObjectField>{
            Account.Id,
            Account.Name,
            Account.Status__c,
            Account.OwnerId,
            Account.Industry,
            Account.AnnualRevenue,
            Account.BillingCountry
        };
    }

    public Schema.SObjectType getSObjectType() {
        return Account.SObjectType;
    }

    public List<Account> selectById(Set<Id> ids) {
        return (List<Account>) selectSObjectsById(ids);
    }

    public List<Account> selectByIdWithContacts(Set<Id> ids) {
        fflib_QueryFactory query = newQueryFactory();
        query.setCondition('Id IN :ids');

        // Subselect for related contacts
        fflib_QueryFactory contactSubQuery = query.subselectQuery(Contact.SObjectType);
        contactSubQuery.selectField(Contact.FirstName);
        contactSubQuery.selectField(Contact.LastName);
        contactSubQuery.selectField(Contact.Email);

        return Database.query(query.toSOQL());
    }

    public List<Account> selectActiveByIndustry(String industry) {
        return Database.query(
            newQueryFactory()
                .setCondition('Status__c = \'Active\' AND Industry = :industry')
                .toSOQL()
        );
    }
}
```

**Rules:**
- Use `inherited sharing` so the caller's sharing context is respected
- Define base fields in `getSObjectFieldList()` -- included in all queries
- Use `fflib_QueryFactory` for consistent query building
- Return typed lists, never `List<SObject>`
- All SOQL for the SObject lives in its Selector

## Domain Base

Domain classes inherit from `fflib_SObjectDomain` and encapsulate SObject-specific behavior: validation, defaulting, and calculations.

```apex
public with sharing class Accounts extends fflib_SObjectDomain {

    public Accounts(List<Account> records) {
        super(records);
    }

    // Trigger-driven: runs on before insert
    public override void onBeforeInsert() {
        for (Account acc : (List<Account>) Records) {
            if (String.isBlank(acc.BillingCountry)) {
                acc.BillingCountry = 'US';
            }
        }
    }

    // Trigger-driven: validation on insert and update
    public override void onValidate() {
        for (Account acc : (List<Account>) Records) {
            if (acc.AnnualRevenue != null && acc.AnnualRevenue < 0) {
                acc.AnnualRevenue.addError('Annual revenue cannot be negative.');
            }
        }
    }

    // Trigger-driven: validation with old values on update
    public override void onValidate(Map<Id, SObject> existingRecords) {
        for (Account acc : (List<Account>) Records) {
            Account oldAcc = (Account) existingRecords.get(acc.Id);
            if (oldAcc.Status__c == 'Closed' && acc.Status__c != 'Closed') {
                acc.addError('Cannot reopen a closed account.');
            }
        }
    }

    // Business method callable from Service layer
    public void activate() {
        for (Account acc : (List<Account>) Records) {
            acc.Status__c = 'Active';
            acc.Activated_Date__c = Date.today();
        }
    }

    public void deactivate(String reason) {
        for (Account acc : (List<Account>) Records) {
            acc.Status__c = 'Inactive';
            acc.Deactivation_Reason__c = reason;
        }
    }

    // Required inner class for factory registration
    public class Constructor implements fflib_SObjectDomain.IConstructable {
        public fflib_SObjectDomain construct(List<SObject> records) {
            return new Accounts(records);
        }
    }
}
```

**Trigger handler overrides:**

| Method | Fires On |
|--------|----------|
| `onBeforeInsert()` | Before Insert |
| `onBeforeUpdate(existingRecords)` | Before Update |
| `onBeforeDelete()` | Before Delete |
| `onAfterInsert()` | After Insert |
| `onAfterUpdate(existingRecords)` | After Update |
| `onAfterDelete()` | After Delete |
| `onAfterUndelete()` | After Undelete |
| `onValidate()` | Before Insert and Update |
| `onValidate(existingRecords)` | Before Update (with old values) |

## Service Layer

Services implement a public interface and are registered in the Application factory. They orchestrate Domain, Selector, and UnitOfWork.

```apex
// Interface
public interface IAccountService {
    void activateAccounts(Set<Id> accountIds);
    void mergeAccounts(Id masterId, Set<Id> duplicateIds);
}

// Implementation
public with sharing class AccountServiceImpl implements IAccountService {

    public void activateAccounts(Set<Id> accountIds) {
        fflib_ISObjectUnitOfWork uow = Application.UnitOfWork.newInstance();

        List<Account> accounts =
            ((IAccountsSelector) Application.Selector.newInstance(Account.SObjectType))
                .selectById(accountIds);

        Accounts domain = new Accounts(accounts);
        domain.activate();

        uow.registerDirty(domain.getRecords());
        uow.commitWork();
    }

    public void mergeAccounts(Id masterId, Set<Id> duplicateIds) {
        // complex orchestration across multiple domains
    }
}
```

**Calling a Service:**

```apex
// From a controller, trigger, or batch
((IAccountService) Application.Service.newInstance(IAccountService.class))
    .activateAccounts(accountIds);
```

## Testing with Mocks

The Application factory enables replacing real implementations with mocks using `fflib_ApexMocks`.

```apex
@isTest
static void activateAccounts_ShouldCallDomainActivate() {
    // Setup mocks
    fflib_ApexMocks mocks = new fflib_ApexMocks();
    IAccountsSelector selectorMock =
        (IAccountsSelector) mocks.mock(AccountsSelector.class);
    fflib_ISObjectUnitOfWork uowMock =
        (fflib_ISObjectUnitOfWork) mocks.mock(fflib_SObjectUnitOfWork.class);

    // Stub selector
    List<Account> testAccounts = new List<Account>{
        new Account(Id = fflib_IDGenerator.generate(Account.SObjectType), Name = 'Test')
    };
    mocks.startStubbing();
    mocks.when(selectorMock.sObjectType()).thenReturn(Account.SObjectType);
    mocks.when(selectorMock.selectById(
        (Set<Id>) fflib_Match.anyObject()
    )).thenReturn(testAccounts);
    mocks.stopStubbing();

    // Inject mocks
    Application.Selector.setMock(selectorMock);
    Application.UnitOfWork.setMock(uowMock);

    // Execute
    Test.startTest();
    AccountServiceImpl service = new AccountServiceImpl();
    service.activateAccounts(new Set<Id>{ testAccounts[0].Id });
    Test.stopTest();

    // Verify UoW interactions
    ((fflib_ISObjectUnitOfWork) mocks.verify(uowMock))
        .registerDirty((SObject) fflib_Match.anyObject());
    ((fflib_ISObjectUnitOfWork) mocks.verify(uowMock))
        .commitWork();
}
```

## When to Use Full fflib vs Lightweight Patterns

| Criteria | Lightweight | Full fflib |
|----------|-------------|------------|
| Team size | 1-3 devs | 4+ devs |
| Managed package / ISV | No | Yes |
| Need mocked unit tests | No | Yes |
| Complex domain logic | Minimal | Significant |
| Multiple entry points for same logic | Few | Many |
| Long-term codebase (3+ years) | Maybe | Yes |
| Rapid prototyping | Yes | No |

**Lightweight approach:** Use Service + Selector layers without Domain or UnitOfWork. DML happens directly in the Service. Good for smaller teams and simpler logic.

**Full fflib approach:** Use all four layers with Application factory. Provides maximum testability, separation of concerns, and scalability. Requires more boilerplate but pays off in large codebases.

## Common Pitfalls

1. **Skipping the interface** -- Services without interfaces cannot be mocked via the Application factory.
2. **Business logic in Service** -- Logic intrinsic to an SObject belongs in the Domain, not the Service.
3. **Querying in Domain** -- Domains should not query; they receive data from Selectors via the Service.
4. **Wrong UnitOfWork order** -- SObjects must be listed parent-first in the factory. Child records inserted before parents will fail.
5. **Overusing mocks** -- Mocks verify interactions, not correctness. Combine with integration tests that use real DML.
6. **Ignoring the Constructor inner class** -- Domain classes must have the `Constructor` inner class for the factory to instantiate them.
