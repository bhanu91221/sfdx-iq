---
paths:
  - "**/*.cls"
  - "**/*.trigger"
  - "**/*.apex"
---

# Apex Governor Limits

## Limits Reference Table

| Limit | Synchronous | Asynchronous |
|-------|-------------|--------------|
| SOQL Queries | 100 | 200 |
| SOQL Rows Retrieved | 50,000 | 50,000 |
| DML Statements | 150 | 150 |
| DML Rows | 10,000 | 10,000 |
| CPU Time | 10,000 ms | 60,000 ms |
| Heap Size | 6 MB | 12 MB |
| Callouts | 100 | 100 |
| Future Calls | 50 | 0 (in future) |
| Queueable Jobs | 50 | 1 |
| Email Invocations | 10 | 10 |
| SOSL Queries | 20 | 20 |

## Using the Limits Class

Check consumption at runtime to avoid hitting ceilings.

```apex
// ❌ Bad — blind to limit consumption
for (Account acct : accounts) {
    List<Contact> contacts = [SELECT Id FROM Contact WHERE AccountId = :acct.Id];
}

// ✅ Good — monitor limits proactively
System.debug('SOQL queries used: ' + Limits.getQueries() + ' / ' + Limits.getLimitQueries());
System.debug('DML statements used: ' + Limits.getDmlStatements() + ' / ' + Limits.getLimitDmlStatements());
System.debug('CPU time used: ' + Limits.getCpuTime() + ' ms / ' + Limits.getLimitCpuTime() + ' ms');
System.debug('Heap size used: ' + Limits.getHeapSize() + ' / ' + Limits.getLimitHeapSize());
```

## When to Use Asynchronous Processing

### @future — Simple Fire-and-Forget

Use for callouts or operations that don't need chaining. Accepts only primitive types.

```apex
// ✅ Good — callout after DML
@future(callout=true)
public static void sendToExternalSystem(Set<Id> accountIds) {
    List<Account> accounts = [SELECT Id, Name FROM Account WHERE Id IN :accountIds];
    // HTTP callout logic
}
```

### Queueable — Complex Async with Chaining

Use when you need to pass complex types or chain jobs.

```apex
// ✅ Good — queueable with chaining
public class AccountSyncJob implements Queueable, Database.AllowsCallouts {
    private List<Account> accounts;

    public AccountSyncJob(List<Account> accounts) {
        this.accounts = accounts;
    }

    public void execute(QueueableContext ctx) {
        List<Account> batch = new List<Account>();
        List<Account> remaining = new List<Account>();

        for (Integer i = 0; i < this.accounts.size(); i++) {
            if (i < 100) {
                batch.add(this.accounts[i]);
            } else {
                remaining.add(this.accounts[i]);
            }
        }

        // Process current batch
        ExternalService.sync(batch);

        // Chain next batch
        if (!remaining.isEmpty() && !Test.isRunningTest()) {
            System.enqueueJob(new AccountSyncJob(remaining));
        }
    }
}
```

### Batch Apex — Large Data Volumes

Use when processing thousands to millions of records.

```apex
// ✅ Good — batch for large data cleanup
public class InactiveAccountBatch implements Database.Batchable<SObject> {

    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator(
            'SELECT Id FROM Account WHERE LastActivityDate < LAST_N_YEARS:2'
        );
    }

    public void execute(Database.BatchableContext bc, List<Account> scope) {
        for (Account acct : scope) {
            acct.Status__c = 'Inactive';
        }
        update scope;
    }

    public void finish(Database.BatchableContext bc) {
        System.debug('Batch complete.');
    }
}
```

### Schedulable — Recurring Jobs

```apex
public class WeeklyCleanupScheduler implements Schedulable {
    public void execute(SchedulableContext sc) {
        Database.executeBatch(new InactiveAccountBatch(), 200);
    }
}
// Schedule: System.schedule('Weekly Cleanup', '0 0 2 ? * SAT', new WeeklyCleanupScheduler());
```

## Platform Events for Decoupling

Use Platform Events to break out of the current transaction's governor limits.

```apex
// ✅ Good — publish event to process asynchronously
Order_Event__e evt = new Order_Event__e(
    Order_Id__c = order.Id,
    Action__c = 'FULFILLMENT'
);
EventBus.publish(evt);

// Subscriber trigger gets its own governor limits
trigger OrderEventTrigger on Order_Event__e (after insert) {
    Set<Id> orderIds = new Set<Id>();
    for (Order_Event__e evt : Trigger.new) {
        orderIds.add(evt.Order_Id__c);
    }
    OrderFulfillmentService.process(orderIds);
}
```

## Efficient Collection Usage

```apex
// ❌ Bad — List.contains() is O(n)
List<Id> processedIds = new List<Id>();
for (Account acct : accounts) {
    if (!processedIds.contains(acct.Id)) {
        processedIds.add(acct.Id);
    }
}

// ✅ Good — Set for O(1) lookup
Set<Id> processedIds = new Set<Id>();
for (Account acct : accounts) {
    processedIds.add(acct.Id); // duplicates ignored automatically
}
```

## System.enqueueJob Patterns

```apex
// ❌ Bad — enqueue inside a loop
for (Account acct : accounts) {
    System.enqueueJob(new AccountProcessJob(acct));
}

// ✅ Good — enqueue once with all data
System.enqueueJob(new AccountProcessJob(accounts));
```

## Decision Guide

| Scenario | Use |
|----------|-----|
| Callout after DML | `@future(callout=true)` |
| Pass complex objects async | `Queueable` |
| Chain multiple async steps | `Queueable` with chaining |
| Process 10K–50M records | `Batch Apex` |
| Recurring scheduled work | `Schedulable` + Batch |
| Decouple from transaction | Platform Events |
| Near-real-time processing | Change Data Capture or Platform Events |
