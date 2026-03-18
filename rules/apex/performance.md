# Apex Performance Rules

## CPU Time Optimization

- Synchronous limit: 10,000 ms. Asynchronous: 60,000 ms.
- Avoid nested loops — use Map-based lookups for O(1) access.
- Minimize string concatenation in loops — use `String.join()` or `List<String>`.
- Avoid unnecessary type casting and serialization/deserialization.

```apex
// ❌ Bad — O(n²) nested loop
for (Contact c : contacts) {
    for (Account a : accounts) {
        if (c.AccountId == a.Id) { /* process */ }
    }
}

// ✅ Good — O(n) with Map lookup
Map<Id, Account> accountMap = new Map<Id, Account>(accounts);
for (Contact c : contacts) {
    Account a = accountMap.get(c.AccountId);
    if (a != null) { /* process */ }
}
```

## Collection Efficiency

- Use `Set<Id>` for uniqueness checks, not `List.contains()`.
- Pre-size lists when count is known: `new List<Account>(expectedSize)` is not available — but avoid unnecessary resizing by collecting data before building final lists.
- Use `Map<Id, SObject>` constructor shortcut: `new Map<Id, Account>(accountList)`.

```apex
// ❌ Bad — List.contains() is O(n) per call
List<Id> processedIds = new List<Id>();
if (!processedIds.contains(recordId)) { }

// ✅ Good — Set.contains() is O(1)
Set<Id> processedIds = new Set<Id>();
if (!processedIds.contains(recordId)) { }
```

## Heap Size Management

- Synchronous limit: 6 MB. Asynchronous: 12 MB.
- Avoid loading large result sets into memory — use SOQL `FOR` loops for streaming.
- Clear large collections when no longer needed.
- Use `Limits.getHeapSize()` to monitor.

```apex
// ❌ Bad — loads all records into heap at once
List<Account> allAccounts = [SELECT Id, Name FROM Account];

// ✅ Good — streams records, processes in chunks
for (List<Account> batch : [SELECT Id, Name FROM Account]) {
    processAccounts(batch);
}
```

## Query Performance

- Query only the fields you need — don't `SELECT Id, Name, ...all 50 fields`.
- Use selective filters on indexed fields (Id, Name, CreatedDate, foreign keys).
- Add `LIMIT` to all queries except Batch `start()` and intentional full scans.
- Use `COUNT()` instead of querying records just to check existence.

## Lazy Loading

- Don't query data until it's needed.
- Avoid queries in constructors and static initializers.
- Use caching patterns for frequently accessed reference data.

```apex
// ❌ Bad — queries in constructor even if data isn't used
public class MyController {
    public List<Account> accounts;
    public MyController() {
        accounts = [SELECT Id FROM Account LIMIT 1000];
    }
}

// ✅ Good — query only when accessed
public class MyController {
    private List<Account> accounts;
    public List<Account> getAccounts() {
        if (accounts == null) {
            accounts = [SELECT Id FROM Account LIMIT 1000];
        }
        return accounts;
    }
}
```

## Async Offloading

When synchronous limits are insufficient:
- **@future** — Simple callouts, mixed DML workarounds
- **Queueable** — Complex types, chaining, monitoring
- **Batch** — Processing >10K records
- **Platform Events** — Fully decoupled processing

## Recursion Prevention

- Use static variables to prevent re-entry in trigger handlers.
- Use `Set<Id>` to track already-processed record IDs.
- Check `Trigger.isExecuting` before recursive calls.
