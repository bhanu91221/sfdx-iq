# Apex Bulkification

## Core Principle

All Apex code MUST handle collections of records. Trigger.new and Trigger.old are always lists, even when a single record fires the trigger. Code that works for 1 record but fails for 200 is a production bug waiting to happen.

## Never Process Single Records

```apex
// ❌ Bad — assumes single record
trigger OpportunityTrigger on Opportunity (after insert) {
    Opportunity opp = Trigger.new[0];
    Account acct = [SELECT Id, Name FROM Account WHERE Id = :opp.AccountId];
    Task t = new Task(WhatId = opp.Id, Subject = 'Follow up with ' + acct.Name);
    insert t;
}

// ✅ Good — handles any number of records
trigger OpportunityTrigger on Opportunity (after insert) {
    OpportunityTriggerHandler handler = new OpportunityTriggerHandler();
    handler.run();
}

// In the handler:
public void afterInsert() {
    Set<Id> accountIds = new Set<Id>();
    for (Opportunity opp : (List<Opportunity>) Trigger.new) {
        if (opp.AccountId != null) {
            accountIds.add(opp.AccountId);
        }
    }

    Map<Id, Account> accountMap = new Map<Id, Account>(
        [SELECT Id, Name FROM Account WHERE Id IN :accountIds]
    );

    List<Task> tasks = new List<Task>();
    for (Opportunity opp : (List<Opportunity>) Trigger.new) {
        Account acct = accountMap.get(opp.AccountId);
        if (acct != null) {
            tasks.add(new Task(
                WhatId = opp.Id,
                Subject = 'Follow up with ' + acct.Name
            ));
        }
    }

    if (!tasks.isEmpty()) {
        insert tasks;
    }
}
```

## Use Map<Id, SObject> Patterns

Collect IDs first, query once, then use a Map for lookups.

```apex
// ❌ Bad — query per record
for (Contact con : contacts) {
    Account acct = [SELECT Id, Name FROM Account WHERE Id = :con.AccountId];
    con.Description = 'Account: ' + acct.Name;
}

// ✅ Good — single query, map lookup
Set<Id> accountIds = new Set<Id>();
for (Contact con : contacts) {
    accountIds.add(con.AccountId);
}
Map<Id, Account> accountMap = new Map<Id, Account>(
    [SELECT Id, Name FROM Account WHERE Id IN :accountIds]
);
for (Contact con : contacts) {
    Account acct = accountMap.get(con.AccountId);
    if (acct != null) {
        con.Description = 'Account: ' + acct.Name;
    }
}
```

## No SOQL in Loops

Every SOQL query inside a loop consumes a governor limit count per iteration.

```apex
// ❌ Bad — SOQL in loop (100 limit hit with 100+ records)
for (Opportunity opp : Trigger.new) {
    List<Task> tasks = [SELECT Id FROM Task WHERE WhatId = :opp.Id];
    opp.Task_Count__c = tasks.size();
}

// ✅ Good — aggregate query outside loop
Map<Id, Integer> taskCounts = new Map<Id, Integer>();
for (AggregateResult ar : [
    SELECT WhatId, COUNT(Id) cnt
    FROM Task
    WHERE WhatId IN :Trigger.newMap.keySet()
    GROUP BY WhatId
]) {
    taskCounts.put((Id) ar.get('WhatId'), (Integer) ar.get('cnt'));
}
for (Opportunity opp : Trigger.new) {
    opp.Task_Count__c = taskCounts.containsKey(opp.Id)
        ? taskCounts.get(opp.Id) : 0;
}
```

## No DML in Loops

Collect records into a list, then perform a single DML operation.

```apex
// ❌ Bad — DML in loop (150 limit hit quickly)
for (Account acct : accounts) {
    Contact con = new Contact(
        LastName = acct.Name + ' Primary',
        AccountId = acct.Id
    );
    insert con;
}

// ✅ Good — bulk DML
List<Contact> contactsToInsert = new List<Contact>();
for (Account acct : accounts) {
    contactsToInsert.add(new Contact(
        LastName = acct.Name + ' Primary',
        AccountId = acct.Id
    ));
}
if (!contactsToInsert.isEmpty()) {
    insert contactsToInsert;
}
```

## Use Database Methods with allOrNone=false

For operations where partial success is acceptable, use Database methods to handle individual failures gracefully.

```apex
// ❌ Bad — all-or-nothing, one bad record kills the batch
insert records;

// ✅ Good — partial success with error handling
Database.SaveResult[] results = Database.insert(records, false);
for (Integer i = 0; i < results.size(); i++) {
    if (!results[i].isSuccess()) {
        for (Database.Error err : results[i].getErrors()) {
            System.debug(LoggingLevel.ERROR,
                'Insert failed for record ' + i + ': ' + err.getMessage());
        }
    }
}
```

## Trigger.new and Trigger.old Are Lists

Always iterate. Never index directly unless you have a specific reason.

```apex
// ❌ Bad — only handles first record
Account acct = (Account) Trigger.new[0];

// ✅ Good — iterates all records
for (Account acct : (List<Account>) Trigger.new) {
    // process each record
}

// ✅ Good — use Trigger.oldMap for field change detection
for (Account newAcct : (List<Account>) Trigger.new) {
    Account oldAcct = (Account) Trigger.oldMap.get(newAcct.Id);
    if (newAcct.Industry != oldAcct.Industry) {
        // field changed — act on it
    }
}
```

## Test with 200+ Records

Every test class must include at least one bulk test with 200 records to verify governor limits are not breached.

```apex
@IsTest
static void testBulkInsert() {
    List<Account> accounts = TestDataFactory.createAccounts(200);
    insert accounts;

    List<Opportunity> opps = new List<Opportunity>();
    for (Account acct : accounts) {
        opps.add(TestDataFactory.createOpportunity(acct.Id));
    }

    Test.startTest();
    insert opps; // trigger fires for 200 records
    Test.stopTest();

    List<Task> tasks = [SELECT Id FROM Task WHERE WhatId IN :opps];
    System.assertEquals(200, tasks.size(), 'Expected one task per opportunity');
}
```

## Quick Reference Checklist

- [ ] No SOQL inside any `for` loop
- [ ] No DML inside any `for` loop
- [ ] All queries use collection filters (`WHERE Id IN :idSet`)
- [ ] Results are stored in `Map<Id, SObject>` for O(1) lookups
- [ ] DML operates on `List<SObject>`, not individual records
- [ ] Tests include a 200-record scenario
