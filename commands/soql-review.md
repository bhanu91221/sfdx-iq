---
description: SOQL query optimization and best practices review
---

# /soql-review

Find and optimize all SOQL queries in the codebase for performance, security, and best practices.

## Workflow

1. **Discover all SOQL queries**
   - Scan all Apex classes and triggers for SOQL patterns (`[SELECT ...`, `Database.query(`)
   - Include both inline SOQL and dynamic SOQL
   - Record file, line number, and full query text for each

2. **Delegate to soql-optimizer agent**
   - Pass all discovered queries to the **soql-optimizer** agent

3. **Optimization checks**

   **Selectivity & Indexes (Critical)**
   - Queries on large objects without indexed fields in `WHERE` clause
   - Standard indexed fields: `Id`, `Name`, `OwnerId`, `CreatedDate`, `SystemModstamp`, `RecordTypeId`, lookup/master-detail fields
   - Flag `WHERE` clauses using non-selective filters on large objects (>100k records)
   - Suggest adding custom indexes for frequently queried fields

   **Missing LIMIT (High)**
   - Queries without `LIMIT` that could return large result sets
   - Queries in controllers or REST endpoints that should paginate
   - Exception: queries in batch `start` methods (QueryLocator)

   **Bind Variables (Critical)**
   - Dynamic SOQL using string concatenation instead of bind variables
   - SOQL injection vulnerability from user-controlled input
   - All dynamic SOQL must use `:variable` syntax or `String.escapeSingleQuotes()`

   **N+1 Query Pattern (Critical)**
   - SOQL inside loops (query per record)
   - Parent queries followed by child queries that could use relationship queries
   - Multiple queries that could be consolidated into one with subqueries

   **Relationship Query Depth (Medium)**
   - Queries exceeding 5 levels of parent relationships
   - Queries exceeding 1 level of child subqueries
   - Complex queries that should be split for readability

   **Field Selection (Medium)**
   - `SELECT *` equivalent patterns (selecting all fields unnecessarily)
   - Queries selecting fields not used in subsequent code
   - Large text/rich text fields fetched unnecessarily (heap impact)

   **Security (High)**
   - Missing `WITH SECURITY_ENFORCED` on queries
   - Dynamic SOQL without FLS checks
   - Queries in `without sharing` context without justification

   **Aggregate Queries (Medium)**
   - `GROUP BY` queries that could be optimized
   - Aggregate queries missing `HAVING` clause
   - COUNT queries that could use `Database.countQuery()`

4. **Output format**
   - Rank all queries by optimization priority (most impactful first)
   - For each query: file, line, current query, issues found, optimized query suggestion
   - Summary: total queries found, critical issues, estimated query savings

## Error Handling

- If dynamic SOQL cannot be fully resolved at static analysis, flag it for manual review
- If query references custom objects/fields not in local source, note the dependency

## Example Usage

```
/soql-review
/soql-review force-app/main/default/classes/AccountService.cls
```
