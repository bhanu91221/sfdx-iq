---
name: governor-limits
description: Complete governor limits reference, Limits class usage, budgeting techniques, and async offloading strategies
origin: claude-sfdx-iq
user-invocable: false
tokens: 2644
domain: apex
---

# Governor Limits

## Complete Limits Reference

### Per-Transaction Limits

| Limit | Synchronous | Asynchronous |
|-------|-------------|--------------|
| SOQL queries | 100 | 200 |
| SOQL rows returned | 50,000 | 50,000 |
| SOSL searches | 20 | 20 |
| DML statements | 150 | 150 |
| DML rows processed | 10,000 | 10,000 |
| CPU time | 10,000 ms | 60,000 ms |
| Heap size | 6 MB | 12 MB |
| Callouts | 100 | 100 |
| Callout timeout | 120 seconds total | 120 seconds total |
| Single callout timeout | 60 seconds | 60 seconds |
| Future calls | 50 | 0 (in future context) |
| Queueable jobs | 50 | 1 (from Queueable) |
| sendEmail invocations | 10 | 10 |
| Email recipients | 5,000/day | 5,000/day |
| Describe calls | 100 | 100 |
| QueryLocator rows (Batch) | N/A | 50,000,000 |

### Per-Org Limits

| Limit | Value |
|-------|-------|
| Active batch jobs | 5 (overflow to Flex Queue, max 100) |
| Scheduled Apex jobs | 100 |
| Data storage | Varies by edition |
| File storage | Varies by edition |
| API requests per 24 hours | Varies by edition |
| Platform Events published per hour | Varies by edition |

## Limits Class Usage

The `Limits` class provides runtime inspection of current consumption versus maximums.

```apex
public class LimitsMonitor {

    public static void logCurrentUsage() {
        System.debug('SOQL Queries: ' + Limits.getQueries() + ' / ' + Limits.getLimitQueries());
        System.debug('SOQL Rows: ' + Limits.getQueryRows() + ' / ' + Limits.getLimitQueryRows());
        System.debug('DML Statements: ' + Limits.getDmlStatements() + ' / ' + Limits.getLimitDmlStatements());
        System.debug('DML Rows: ' + Limits.getDmlRows() + ' / ' + Limits.getLimitDmlRows());
        System.debug('CPU Time: ' + Limits.getCpuTime() + ' / ' + Limits.getLimitCpuTime());
        System.debug('Heap Size: ' + Limits.getHeapSize() + ' / ' + Limits.getLimitHeapSize());
        System.debug('Callouts: ' + Limits.getCallouts() + ' / ' + Limits.getLimitCallouts());
        System.debug('Future Calls: ' + Limits.getFutureCalls() + ' / ' + Limits.getLimitFutureCalls());
    }

    public static Boolean isApproachingSOQLLimit(Decimal threshold) {
        Decimal usage = (Decimal) Limits.getQueries() / Limits.getLimitQueries();
        return usage >= threshold;
    }

    public static Boolean hasSufficientDML(Integer needed) {
        return (Limits.getLimitDmlStatements() - Limits.getDmlStatements()) >= needed;
    }
}
```

### Limits Methods Reference

| Method | Returns |
|--------|---------|
| `Limits.getQueries()` | SOQL queries used |
| `Limits.getLimitQueries()` | SOQL query limit |
| `Limits.getQueryRows()` | SOQL rows returned |
| `Limits.getLimitQueryRows()` | SOQL row limit |
| `Limits.getDmlStatements()` | DML statements used |
| `Limits.getLimitDmlStatements()` | DML statement limit |
| `Limits.getDmlRows()` | DML rows processed |
| `Limits.getLimitDmlRows()` | DML row limit |
| `Limits.getCpuTime()` | CPU time in ms |
| `Limits.getLimitCpuTime()` | CPU time limit |
| `Limits.getHeapSize()` | Heap bytes used |
| `Limits.getLimitHeapSize()` | Heap byte limit |
| `Limits.getCallouts()` | Callouts made |
| `Limits.getLimitCallouts()` | Callout limit |
| `Limits.getFutureCalls()` | Future calls made |
| `Limits.getLimitFutureCalls()` | Future call limit |

## Limit Budgeting Technique

Before executing an operation, check if sufficient limits remain. This is critical in triggers that share a transaction with other automations.

```apex
public class LimitsBudget {

    public static void assertSOQLBudget(Integer needed) {
        Integer remaining = Limits.getLimitQueries() - Limits.getQueries();
        if (remaining < needed) {
            throw new LimitsBudgetException(
                'Insufficient SOQL budget. Need: ' + needed + ', Remaining: ' + remaining
            );
        }
    }

    public static void assertDMLBudget(Integer needed) {
        Integer remaining = Limits.getLimitDmlStatements() - Limits.getDmlStatements();
        if (remaining < needed) {
            throw new LimitsBudgetException(
                'Insufficient DML budget. Need: ' + needed + ', Remaining: ' + remaining
            );
        }
    }

    public static Boolean canMakeCallout() {
        return Limits.getCallouts() < Limits.getLimitCallouts();
    }

    public class LimitsBudgetException extends Exception { }
}
```

**Usage in a trigger handler:**

```apex
protected override void afterInsert(List<SObject> newRecords, Map<Id, SObject> newMap) {
    // Budget: 1 SOQL for related query, 1 DML for insert
    if (LimitsBudget.canExecute(1, 1)) {
        createRelatedRecords((List<Account>) newRecords);
    } else {
        // Offload to async
        System.enqueueJob(new CreateRelatedRecordsQueueable(newMap.keySet()));
    }
}
```

## Common Violations and Fixes

### SOQL in a Loop

```apex
// BAD -- N queries for N records
for (Account acc : accounts) {
    List<Contact> contacts = [SELECT Id FROM Contact WHERE AccountId = :acc.Id];
}

// GOOD -- 1 query for all records
Map<Id, List<Contact>> contactsByAccountId = new Map<Id, List<Contact>>();
for (Contact con : [SELECT Id, AccountId FROM Contact WHERE AccountId IN :accountIds]) {
    if (!contactsByAccountId.containsKey(con.AccountId)) {
        contactsByAccountId.put(con.AccountId, new List<Contact>());
    }
    contactsByAccountId.get(con.AccountId).add(con);
}
```

### DML in a Loop

```apex
// BAD -- N DML statements
for (Account acc : accounts) {
    acc.Status__c = 'Active';
    update acc;
}

// GOOD -- 1 DML statement
for (Account acc : accounts) {
    acc.Status__c = 'Active';
}
update accounts;
```

### Unbounded Queries

```apex
// BAD -- could return 50,000+ rows and hit limit
List<Account> allAccounts = [SELECT Id FROM Account];

// GOOD -- filter and limit
List<Account> activeAccounts = [
    SELECT Id FROM Account
    WHERE Status__c = 'Active'
    AND CreatedDate = LAST_N_DAYS:30
    LIMIT 10000
];
```

### CPU Time Exhaustion

```apex
// BAD -- O(n*m) nested loops
for (Account acc : accounts) {
    for (Contact con : allContacts) {
        if (con.AccountId == acc.Id) {
            // process
        }
    }
}

// GOOD -- O(n+m) with Map
Map<Id, List<Contact>> contactMap = groupContactsByAccountId(allContacts);
for (Account acc : accounts) {
    List<Contact> related = contactMap.get(acc.Id);
    if (related != null) {
        // process
    }
}
```

### Heap Size Overflow

```apex
// BAD -- loading entire result into memory
List<Account> allAccounts = [SELECT Id, Name, Description FROM Account];

// GOOD -- use Database.QueryLocator in batch
// Or process in chunks:
for (List<Account> chunk : [SELECT Id, Name FROM Account LIMIT 50000]) {
    processChunk(chunk);
}
```

## Async Offloading Strategies

When a synchronous transaction cannot complete within limits, offload to async.

### Pattern: Conditional Async

```apex
public class OrderProcessor {

    public static void processOrders(List<Order__c> orders) {
        if (orders.size() > 50 || Limits.getQueries() > 70) {
            // Too many records or too little SOQL budget -- go async
            System.enqueueJob(new OrderProcessorQueueable(orders));
        } else {
            processOrdersSync(orders);
        }
    }
}
```

### Pattern: Platform Event Decoupling

When a trigger needs to perform work that would exceed limits, publish a Platform Event and let a subscriber handle it asynchronously.

```apex
// In the trigger handler
protected override void afterInsert(List<SObject> newRecords, Map<Id, SObject> newMap) {
    List<Order_Processing_Event__e> events = new List<Order_Processing_Event__e>();
    for (SObject record : newRecords) {
        events.add(new Order_Processing_Event__e(
            Record_Id__c = record.Id,
            Action__c = 'PROCESS_NEW'
        ));
    }
    EventBus.publish(events);
}

// Subscriber trigger (runs in its own transaction with fresh limits)
trigger OrderProcessingEventTrigger on Order_Processing_Event__e (after insert) {
    new OrderProcessingEventHandler().run(Trigger.new);
}
```

### Pattern: Batch for Large Volumes

```apex
// When processing exceeds 10,000 DML rows
if (recordCount > 10000) {
    Database.executeBatch(new LargeVolumeProcessorBatch(criteria), 200);
} else {
    processInline(records);
}
```

## Limits Monitoring in Production

### Custom Object Approach

Create a `Limit_Usage_Log__c` custom object to track limit consumption in critical transactions.

```apex
public class LimitsLogger {

    public static void logUsage(String context) {
        Limit_Usage_Log__c log = new Limit_Usage_Log__c(
            Context__c = context,
            SOQL_Queries__c = Limits.getQueries(),
            SOQL_Rows__c = Limits.getQueryRows(),
            DML_Statements__c = Limits.getDmlStatements(),
            DML_Rows__c = Limits.getDmlRows(),
            CPU_Time__c = Limits.getCpuTime(),
            Heap_Size__c = Limits.getHeapSize(),
            Timestamp__c = DateTime.now()
        );
        // Use Platform Event to avoid consuming a DML statement
        Database.insert(log, false);
    }
}
```

### Debug Log Analysis

Use the `LIMIT_USAGE_FOR_NS` debug log line to analyze production limit usage:

```
Number of SOQL queries: 15 out of 100
Number of query rows: 342 out of 50000
Number of DML statements: 4 out of 150
Number of DML rows: 23 out of 10000
Maximum CPU time: 1243 out of 10000
Maximum heap size: 234521 out of 6000000
```

## Best Practices Summary

1. **Never put SOQL or DML in loops.** This is the number one cause of limit failures.
2. **Use Maps for relationship traversal.** Replace nested loops with Map-based lookups.
3. **Query only what you need.** Select specific fields, use WHERE clauses, add LIMIT.
4. **Budget limits in shared transactions.** Triggers share limits with other automations.
5. **Offload to async when approaching limits.** Use Queueable or Platform Events.
6. **Test with bulk data (200+ records).** Limits failures only appear at scale.
7. **Monitor production usage.** Log limit consumption in critical paths.
8. **Use Database.Stateful in Batch.** Track state across execute chunks.
9. **Avoid unbounded recursion.** Use static variables to prevent re-entrant trigger loops.
10. **Profile before optimizing.** Use Limits class to identify actual bottlenecks.
