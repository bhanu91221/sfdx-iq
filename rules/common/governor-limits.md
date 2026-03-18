# Governor Limits — Universal Rules

## Core Principle

Every line of code runs within a governor-limited transaction. Budget limits before writing code, not after.

## Synchronous vs Asynchronous Limits

| Limit | Synchronous | Asynchronous |
|-------|-------------|--------------|
| SOQL Queries | 100 | 200 |
| DML Statements | 150 | 150 |
| CPU Time | 10,000 ms | 60,000 ms |
| Heap Size | 6 MB | 12 MB |
| Callouts | 100 | 100 |
| Future Calls | 50 | 0 (in future) |
| SOQL Rows | 50,000 | 50,000 |
| DML Rows | 10,000 | 10,000 |
| Query Locator Rows | 10,000 | 50,000,000 (Batch) |

## Absolute Prohibitions

- **No SOQL inside for loops** — ever. Collect IDs, query once outside the loop.
- **No DML inside for loops** — ever. Collect records in a list, perform one DML.
- **No unbounded queries** — always use LIMIT unless in Batch start().
- **No large heap allocations** — avoid loading 50K+ records into memory in one query.

## Limits Budgeting

Before implementing any transaction path, estimate:

1. How many SOQL queries will this use? (Budget ≤50 for safety in sync)
2. How many DML statements? (Budget ≤75)
3. Could this run in a trigger context with 200 records? Multiply per-record operations × 200.
4. Are there automations (flows, process builders, other triggers) that share the budget?

## Monitoring in Code

```apex
// Check remaining limits at runtime
System.debug('SOQL queries used: ' + Limits.getQueries() + '/' + Limits.getLimitQueries());
System.debug('DML statements used: ' + Limits.getDmlStatements() + '/' + Limits.getLimitDmlStatements());
System.debug('CPU time used: ' + Limits.getCpuTime() + '/' + Limits.getLimitCpuTime());
```

## When to Go Asynchronous

- **@future** — Simple fire-and-forget (callouts, mixed DML workaround)
- **Queueable** — Needs complex types, chaining, or return monitoring
- **Batch** — Processing >50,000 records
- **Schedulable** — Recurring operations on a cron schedule
- **Platform Events** — Decoupling from the current transaction entirely

## Shared Transaction Budget

Remember that triggers, flows, validation rules, and process builders share the same governor limits within a transaction. A trigger using 80 SOQL queries leaves only 20 for flows and other automation.

## Response Protocol

When governor limit risk is detected:
1. **Delegate** to the `governor-limits-checker` agent
2. **Refactor** to bulkified patterns
3. **Offload** heavy processing to async if sync limits are insufficient
