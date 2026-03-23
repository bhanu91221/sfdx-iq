---
name: apex-patterns
description: Enterprise design patterns for Apex including Service, Selector, Domain, Factory, and Strategy patterns
origin: claude-sfdx-iq
user-invocable: false
tokens: 2227
domain: apex
---

# Apex Design Patterns

## Overview

Salesforce Apex development benefits from structured design patterns that enforce separation of concerns, improve testability, and respect governor limits. This skill covers the core architectural layers and behavioral patterns used in production Salesforce orgs.

## Architectural Layers

### Service Layer

The Service layer is the entry point for business logic. Controllers, triggers, batch jobs, and external integrations call Service methods. Services orchestrate Domain and Selector calls and manage Units of Work.

**When to use:** Any time business logic needs to be reusable across entry points (triggers, REST endpoints, LWC controllers, batch jobs).

```apex
public with sharing class AccountService {

    public static void activateAccounts(Set<Id> accountIds) {
        List<Account> accounts = AccountsSelector.newInstance().selectById(accountIds);
        Accounts domain = new Accounts(accounts);
        domain.activate();

        fflib_ISObjectUnitOfWork uow = Application.UnitOfWork.newInstance();
        uow.registerDirty(domain.getRecords());
        uow.commitWork();
    }
}
```

**Rules:**
- Service methods are always `public static`
- Accept IDs or primitives, not SObjects (keeps the API clean)
- Never contain SOQL or DML directly; delegate to Selector and UnitOfWork
- Use `with sharing` by default
- Each method represents a complete business operation

### Selector Layer

Selectors centralize all SOQL queries for an SObject. This ensures field access is consistent, security is enforced in one place, and queries are reusable.

```apex
public inherited sharing class AccountsSelector extends fflib_SObjectSelector {

    public List<Schema.SObjectField> getSObjectFieldList() {
        return new List<Schema.SObjectField>{
            Account.Id,
            Account.Name,
            Account.Status__c,
            Account.OwnerId
        };
    }

    public Schema.SObjectType getSObjectType() {
        return Account.SObjectType;
    }

    public List<Account> selectById(Set<Id> ids) {
        return (List<Account>) selectSObjectsById(ids);
    }

    public List<Account> selectActiveByOwner(Id ownerId) {
        return Database.query(
            newQueryFactory()
                .setCondition('OwnerId = :ownerId AND Status__c = \'Active\'')
                .toSOQL()
        );
    }
}
```

**Rules:**
- One Selector per SObject
- All SOQL for that object lives here
- Use `inherited sharing` so the calling context controls sharing
- Return typed lists, not generic `List<SObject>`
- Always include base fields via `getSObjectFieldList()`

### Domain Layer

The Domain layer encapsulates SObject-specific behavior: validation, field defaulting, calculations, and state transitions. Domain classes wrap a list of SObjects and operate on them in bulk.

```apex
public with sharing class Accounts extends fflib_SObjectDomain {

    public Accounts(List<Account> records) {
        super(records);
    }

    public void activate() {
        for (Account acc : (List<Account>) Records) {
            acc.Status__c = 'Active';
            acc.Activated_Date__c = Date.today();
        }
    }

    public override void onValidate() {
        for (Account acc : (List<Account>) Records) {
            if (String.isBlank(acc.Name)) {
                acc.Name.addError('Account Name is required.');
            }
        }
    }

    public class Constructor implements fflib_SObjectDomain.IConstructable {
        public fflib_SObjectDomain construct(List<SObject> records) {
            return new Accounts(records);
        }
    }
}
```

**Rules:**
- Accept `List<SObject>` in the constructor; always process in bulk
- Business rules that are intrinsic to the SObject live here
- Cross-object orchestration belongs in the Service layer
- Override `onValidate`, `onBeforeInsert`, etc. for trigger-driven behavior

## Behavioral Patterns

### Factory Pattern

Factories decouple code from concrete implementations and enable test mocking.

```apex
public class NotificationFactory {

    private static final Map<String, Type> HANDLERS = new Map<String, Type>{
        'Email'    => EmailNotification.class,
        'SMS'      => SmsNotification.class,
        'Platform' => PlatformEventNotification.class
    };

    public static INotification create(String channel) {
        Type handlerType = HANDLERS.get(channel);
        if (handlerType == null) {
            throw new NotificationException('Unknown channel: ' + channel);
        }
        return (INotification) handlerType.newInstance();
    }
}
```

**When to use:**
- Multiple implementations of the same interface
- Need to swap implementations in tests
- Configuration-driven behavior selection

### Strategy Pattern

Strategy encapsulates interchangeable algorithms behind a common interface. Unlike Factory (which creates objects), Strategy focuses on selecting behavior at runtime.

```apex
public interface IDiscountStrategy {
    Decimal calculateDiscount(Opportunity opp);
}

public class VolumeDiscount implements IDiscountStrategy {
    public Decimal calculateDiscount(Opportunity opp) {
        return opp.Amount > 100000 ? 0.15 : 0.05;
    }
}

public class LoyaltyDiscount implements IDiscountStrategy {
    public Decimal calculateDiscount(Opportunity opp) {
        return opp.Account.Years_as_Customer__c > 5 ? 0.10 : 0.03;
    }
}

public class DiscountService {
    public static Decimal applyDiscount(Opportunity opp, IDiscountStrategy strategy) {
        Decimal rate = strategy.calculateDiscount(opp);
        return opp.Amount * (1 - rate);
    }
}
```

**When to use:**
- Multiple algorithms for the same task (pricing, routing, scoring)
- Behavior varies by record type, custom setting, or user input
- Need to add new strategies without modifying existing code

### Dependency Injection

Apex does not have a DI container, but you can achieve DI through constructor injection and the Application factory pattern.

```apex
public class OpportunityService {

    private IOpportunitySelector selector;

    // Production constructor
    public OpportunityService() {
        this.selector = new OpportunitySelector();
    }

    // Test constructor with injection
    @TestVisible
    private OpportunityService(IOpportunitySelector selector) {
        this.selector = selector;
    }

    public List<Opportunity> getHighValue() {
        return selector.selectHighValue();
    }
}
```

**When to use:**
- Isolating external dependencies (callouts, selectors) in unit tests
- Swapping implementations between orgs (ISV packages)
- Reducing tight coupling between layers

## Decision Matrix: When to Use Each Layer

| Scenario | Layer |
|----------|-------|
| Reusable business operation | Service |
| SOQL query | Selector |
| SObject validation/defaulting | Domain |
| Object creation with multiple types | Factory |
| Interchangeable algorithm | Strategy |
| Test isolation | Dependency Injection |
| Trigger logic routing | Domain (via framework) |
| Cross-object orchestration | Service |
| Field-level calculations | Domain |
| External API call | Service + named interface |

## Lightweight vs Full Enterprise Pattern

Not every org needs full fflib. Here is the decision guide:

| Factor | Lightweight (Service + Selector) | Full fflib |
|--------|----------------------------------|------------|
| Team size | 1-3 developers | 4+ developers |
| Codebase | < 50 classes | 50+ classes |
| ISV / Managed Package | No | Yes |
| Complex domain logic | Minimal | Significant |
| Test isolation needs | Basic | Advanced mocking |
| Long-term maintenance | Medium priority | High priority |

For smaller projects, use the Service and Selector layers without Domain or UnitOfWork. Add those layers when the codebase grows or test isolation becomes painful.

## Anti-Patterns to Avoid

1. **God Service** -- Services with 1000+ lines. Split by functional area.
2. **Selector bypass** -- Writing SOQL directly in a Service or Controller. Always go through Selectors.
3. **Anemic Domain** -- Domain classes that only wrap records with no behavior. If there is no behavior, skip the Domain layer.
4. **Over-engineering** -- Using Strategy pattern for a single implementation. Start simple; refactor to patterns when a second variant appears.
5. **Leaking layers** -- Returning UnitOfWork or Selector instances to callers. Each layer should expose only its own API.
