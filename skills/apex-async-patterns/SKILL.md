---
name: apex-async-patterns
description: Future methods, Queueable, Batch Apex, and Schedulable patterns with chaining and governor limit strategies
origin: claude-sfdx-iq
user-invocable: false
tokens: 3017
domain: apex
---

# Apex Async Patterns

## Overview

Salesforce provides four async execution contexts. Each has different governor limits, capabilities, and use cases. Choosing the right one is critical for scalability and reliability.

## Decision Matrix

| Feature | @future | Queueable | Batch | Schedulable |
|---------|---------|-----------|-------|-------------|
| Accepts complex types | No (primitives only) | Yes | Yes | N/A |
| Chainable | No | Yes (1 depth in trigger) | Yes (via finish) | Via Queueable |
| Return value / job ID | No | Yes (AsyncApexJob Id) | Yes (AsyncApexJob Id) | CronTrigger Id |
| Max records | Based on limits | Based on limits | 50M+ | N/A (launches other jobs) |
| Governor limits | Async (200 SOQL, 60s CPU) | Async | Async per execute | Sync for execute |
| Callouts | Yes (with annotation) | Yes (with interface) | Yes (with interface) | No (delegate) |
| Monitoring | Limited | AsyncApexJob | AsyncApexJob + batches | CronTrigger |
| Ideal for | Simple fire-and-forget | Medium complexity, chaining | Large data volumes | Time-based scheduling |

## @future Methods

The simplest async mechanism. Fire-and-forget with no job tracking.

```apex
public class AccountProcessor {

    @future
    public static void updateExternalSystem(Set<Id> accountIds) {
        List<Account> accounts = [
            SELECT Id, Name, External_Id__c
            FROM Account
            WHERE Id IN :accountIds
        ];

        for (Account acc : accounts) {
            // process each account
            acc.Last_Synced__c = DateTime.now();
        }
        update accounts;
    }

    @future(callout=true)
    public static void syncWithExternalApi(Set<Id> accountIds) {
        List<Account> accounts = [
            SELECT Id, Name
            FROM Account
            WHERE Id IN :accountIds
        ];

        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:External_API/accounts');
        req.setMethod('POST');
        req.setBody(JSON.serialize(accounts));

        Http http = new Http();
        HttpResponse res = http.send(req);
    }
}
```

**Rules:**
- Parameters must be primitive types or collections of primitives (no SObjects)
- Pass `Set<Id>` and re-query inside the future method
- Cannot call another `@future` from a `@future` context
- Max 50 future calls per transaction
- No guarantee on execution order or timing
- Use `(callout=true)` if making HTTP callouts

**When to use:**
- Simple async operations that do not need chaining
- Callouts from trigger context
- Mixed DML workarounds (setup + non-setup objects)

## Queueable Apex

More powerful than `@future`. Accepts complex types, is chainable, and returns a job ID.

```apex
public class AccountSyncQueueable implements Queueable, Database.AllowsCallouts {

    private List<Account> accounts;
    private Integer retryCount;
    private static final Integer MAX_RETRIES = 3;

    public AccountSyncQueueable(List<Account> accounts) {
        this(accounts, 0);
    }

    public AccountSyncQueueable(List<Account> accounts, Integer retryCount) {
        this.accounts = accounts;
        this.retryCount = retryCount;
    }

    public void execute(QueueableContext context) {
        try {
            ExternalApiService.syncAccounts(this.accounts);

            for (Account acc : this.accounts) {
                acc.Sync_Status__c = 'Synced';
                acc.Last_Synced__c = DateTime.now();
            }
            update this.accounts;

        } catch (CalloutException e) {
            if (retryCount < MAX_RETRIES) {
                System.enqueueJob(
                    new AccountSyncQueueable(this.accounts, retryCount + 1)
                );
            } else {
                LogService.error('AccountSync failed after retries', e);
            }
        }
    }
}
```

**Enqueuing:**

```apex
Id jobId = System.enqueueJob(new AccountSyncQueueable(accounts));
```

**Chaining:**

```apex
public void execute(QueueableContext context) {
    // Process first batch
    processAccounts(this.accounts);

    // Chain to next step
    if (!this.contacts.isEmpty()) {
        System.enqueueJob(new ContactSyncQueueable(this.contacts));
    }
}
```

**Rules:**
- Can chain one Queueable from another (depth limit of 1 in trigger context; no limit from anonymous/scheduled)
- Implement `Database.AllowsCallouts` for HTTP callouts
- Max 50 `System.enqueueJob()` calls per transaction
- Job ID returned for monitoring via `AsyncApexJob`
- Instance variables maintain state between construction and execution

**When to use:**
- Need to pass SObjects or complex types
- Need chaining (step 1 then step 2)
- Need a job ID for monitoring
- Callouts with retry logic

## Batch Apex

For processing large datasets (thousands to millions of records). Executes in chunks.

```apex
public class AccountCleanupBatch implements
    Database.Batchable<SObject>,
    Database.Stateful,
    Database.AllowsCallouts {

    private Integer totalProcessed = 0;
    private Integer totalErrors = 0;
    private List<String> errorMessages = new List<String>();

    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([
            SELECT Id, Name, Last_Activity_Date__c, Status__c
            FROM Account
            WHERE Status__c = 'Inactive'
            AND Last_Activity_Date__c < :Date.today().addYears(-2)
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Account> scope) {
        List<Account> toUpdate = new List<Account>();

        for (Account acc : scope) {
            acc.Status__c = 'Archived';
            acc.Archived_Date__c = Date.today();
            toUpdate.add(acc);
        }

        List<Database.SaveResult> results = Database.update(toUpdate, false);

        for (Database.SaveResult sr : results) {
            if (sr.isSuccess()) {
                totalProcessed++;
            } else {
                totalErrors++;
                for (Database.Error err : sr.getErrors()) {
                    errorMessages.add(err.getMessage());
                }
            }
        }
    }

    public void finish(Database.BatchableContext bc) {
        LogService.info('AccountCleanupBatch complete. Processed: '
            + totalProcessed + ', Errors: ' + totalErrors);

        if (!errorMessages.isEmpty()) {
            // Send error notification or chain a follow-up batch
        }

        // Optionally chain another batch
        // Database.executeBatch(new RelatedContactCleanupBatch(), 200);
    }
}
```

**Execution:**

```apex
// Default batch size: 200
Id jobId = Database.executeBatch(new AccountCleanupBatch());

// Custom batch size (max 2000, use smaller for callout-heavy batches)
Id jobId = Database.executeBatch(new AccountCleanupBatch(), 50);
```

**Rules:**
- `start()` returns `QueryLocator` (max 50M records) or `Iterable` (max 50K)
- `execute()` receives a chunk (default 200 records)
- Each `execute()` gets its own governor limits
- `Database.Stateful` preserves instance variables across executions
- Without `Stateful`, instance variables reset between chunks
- Max 5 active batch jobs at once (use Flex Queue for more)
- `finish()` runs after all chunks complete; use it for cleanup or chaining

**When to use:**
- Processing more records than fit in a single transaction
- Nightly/weekly data cleanup
- Data migration or transformation
- Any operation on 10,000+ records

## Schedulable Apex

Schedule jobs to run at specific times using cron expressions.

```apex
public class WeeklyAccountCleanupScheduler implements Schedulable {

    public void execute(SchedulableContext sc) {
        Database.executeBatch(new AccountCleanupBatch(), 200);
    }
}
```

**Scheduling:**

```apex
// Every weekday at 6 AM
String cronExp = '0 0 6 ? * MON-FRI';
Id jobId = System.schedule('Weekly Account Cleanup', cronExp, new WeeklyAccountCleanupScheduler());
```

**Cron expression format:** `Seconds Minutes Hours Day_of_Month Month Day_of_Week [Optional_Year]`

| Field | Values |
|-------|--------|
| Seconds | 0-59 |
| Minutes | 0-59 |
| Hours | 0-23 |
| Day of Month | 1-31, `?`, `L`, `W` |
| Month | 1-12 or JAN-DEC |
| Day of Week | 1-7 (SUN=1) or SUN-SAT, `?`, `L`, `#` |

**Common expressions:**

```
0 0 6 ? * MON-FRI        -- Weekdays at 6:00 AM
0 0 0 1 * ?              -- First day of each month at midnight
0 0 */4 ? * *            -- Every 4 hours
0 30 8 ? * 2             -- Every Monday at 8:30 AM
0 0 22 ? * 6L            -- Last Friday of each month at 10 PM
```

**Rules:**
- Schedulable methods run in synchronous context; offload heavy work to Batch or Queueable
- Max 100 scheduled jobs per org
- Cannot make callouts directly; enqueue a Queueable with `AllowsCallouts`
- Monitor via `CronTrigger` and `CronJobDetail`

## Mixed DML Workaround

You cannot perform DML on setup objects (User, Group, PermissionSetAssignment) and non-setup objects in the same transaction. Use `@future` or `System.runAs()` to separate them.

```apex
// In trigger or service:
public static void assignPermissionSet(Id userId, Id permSetId) {
    assignPermissionSetAsync(userId, permSetId);
}

@future
private static void assignPermissionSetAsync(Id userId, Id permSetId) {
    insert new PermissionSetAssignment(
        AssigneeId = userId,
        PermissionSetId = permSetId
    );
}
```

In tests, use `System.runAs()`:

```apex
@isTest
static void createUserAndAccount() {
    User u = TestDataFactory.createStandardUser();
    insert u; // setup DML

    System.runAs(u) {
        Account acc = new Account(Name = 'Test');
        insert acc; // non-setup DML in separate context
    }
}
```

## Chaining Patterns

### Sequential Processing Pipeline

```apex
// Step 1: Sync accounts
public class AccountSyncQueueable implements Queueable {
    public void execute(QueueableContext ctx) {
        // sync accounts
        System.enqueueJob(new ContactSyncQueueable(accountIds));
    }
}

// Step 2: Sync contacts
public class ContactSyncQueueable implements Queueable {
    public void execute(QueueableContext ctx) {
        // sync contacts
        System.enqueueJob(new NotificationQueueable(results));
    }
}

// Step 3: Send notifications
public class NotificationQueueable implements Queueable {
    public void execute(QueueableContext ctx) {
        // send notifications
    }
}
```

### Batch Chaining

```apex
public void finish(Database.BatchableContext bc) {
    // Chain next batch from finish method
    Database.executeBatch(new Step2Batch(), 200);
}
```

## Governor Limits by Async Context

| Limit | Synchronous | @future / Queueable / Batch execute |
|-------|-------------|--------------------------------------|
| SOQL Queries | 100 | 200 |
| DML Statements | 150 | 150 |
| CPU Time | 10,000 ms | 60,000 ms |
| Heap Size | 6 MB | 12 MB |
| Callouts | 100 | 100 |
| SOQL Rows | 50,000 | 50,000 |

## Anti-Patterns

1. **Using @future when you need chaining** -- Switch to Queueable.
2. **Batch size too large with callouts** -- Use batch size of 1-10 for callout-heavy batches.
3. **Not using Database.Stateful when tracking state** -- Variables reset between execute calls without it.
4. **Scheduling heavy logic directly** -- Schedulable should only enqueue work, not process data.
5. **Ignoring Flex Queue** -- When hitting the 5-batch limit, jobs go to Flex Queue; design for it.
6. **Fire-and-forget without logging** -- Always log async job outcomes for debugging.
