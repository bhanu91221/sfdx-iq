---
description: Governor limit risk analysis for Apex code
---

# /governor-check

Analyze Apex code for governor limit risks and estimate resource consumption per transaction.

## Workflow

1. **Identify code to analyze**
   - If specific files are provided, analyze those
   - Otherwise, analyze all Apex classes and triggers in the project
   - Include trigger handlers, service classes, and batch classes

2. **Delegate to governor-limits-checker agent**
   - Pass identified files to the **governor-limits-checker** agent

3. **Analysis checks**

   **SOQL in Loops (Critical)**
   - Direct SOQL queries inside `for`, `while`, or `do-while` loops
   - SOQL in methods called from within loops
   - Trigger handler methods that query per record instead of bulk
   - Limit: 100 queries (sync) / 200 queries (async)

   **DML in Loops (Critical)**
   - Direct DML statements inside loops
   - DML in methods called from within loops
   - Individual record updates instead of collection DML
   - Limit: 150 DML statements

   **Unbounded Queries (High)**
   - SOQL without `LIMIT` clause on large objects
   - Queries that could return 50,000+ rows
   - Missing `WHERE` clause filtering
   - Limit: 50,000 rows per transaction

   **CPU Time Risks (High)**
   - Deeply nested loops (O(n^2) or worse)
   - String concatenation in loops (use `String.join` or `List`)
   - Complex JSON/XML parsing on large payloads
   - Regular expression usage on large strings
   - Limit: 10,000ms (sync) / 60,000ms (async)

   **Heap Size Risks (Medium)**
   - Loading large collections into memory
   - Unbounded `Map` or `List` growth
   - Large string building
   - Deserializing large JSON/XML responses
   - Limit: 6MB (sync) / 12MB (async)

   **Callout Limits (Medium)**
   - Multiple callouts in a single transaction
   - Callouts inside loops
   - Limit: 100 callouts per transaction

   **Future / Queueable Limits (Medium)**
   - `@future` calls inside loops
   - Chained queueable depth
   - Limit: 50 future calls per transaction

4. **Limits budget estimation**
   - For each transaction entry point (trigger, controller action, REST endpoint):
     - Estimate SOQL query count per trigger execution with N records
     - Estimate DML statement count
     - Flag if any limit exceeds 50% of maximum
   - Present as a table: Limit | Estimated Usage | Maximum | Risk Level

5. **Optimization suggestions**
   - For each violation, provide a specific refactoring suggestion with code
   - Prioritize by risk: Critical items first
   - Suggest patterns: collection-based DML, Map-based lookups, query consolidation

## Error Handling

- If code has recursive patterns, flag them as potential infinite loop risks
- If batch Apex is detected, analyze both `start`, `execute`, and `finish` methods separately

## Example Usage

```
/governor-check
/governor-check force-app/main/default/classes/AccountTriggerHandler.cls
```
