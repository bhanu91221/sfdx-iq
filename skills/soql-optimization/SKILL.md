---
name: soql-optimization
description: SOQL query optimization including query plans, selective filters, indexing, and bulk query patterns
origin: claude-sfdx-iq
tokens: 2310
domain: soql
---

# SOQL Optimization

## Query Plan Tool

Use the Query Plan tool in Developer Console to analyze query performance.

### Access

```
Developer Console → Query Editor → Check "Use Tooling API" → Click "Query Plan"
```

### Query Plan via Tooling API

```
GET /services/data/v59.0/query/?explain=SELECT+Id+FROM+Account+WHERE+Name='Acme'
```

### Reading the Plan

| Field | Description | Target |
|-------|-------------|--------|
| `cardinality` | Estimated rows returned | Lower is better |
| `fields` | Fields used in the filter | Should match index |
| `leadingOperationType` | How the query is executed | TableScan is worst |
| `relativeCost` | Relative cost (0-1) | Below 1.0 is good |
| `sobjectCardinality` | Total rows in table | Context for cardinality |
| `sobjectType` | Object being queried | - |

### Leading Operation Types

| Type | Meaning | Performance |
|------|---------|-------------|
| `Index` | Uses an indexed field | Best |
| `Other` | Uses special optimization | Good |
| `Sharing` | Uses sharing index | Good |
| `TableScan` | Full table scan | Worst - fix this |

## Selective vs Non-Selective Filters

A filter is selective when it returns less than a threshold of total records.

### Selectivity Thresholds

| Threshold | Condition |
|-----------|-----------|
| Standard index | < 30% of first million rows AND < 15% of remaining rows |
| Custom index | < 10% of total records |
| Standard index (null) | < 5% of total records have null |
| Two filters (AND) | Either filter is selective, or combined selectivity qualifies |
| Two filters (OR) | BOTH filters must be individually selective |

### Selective Query Examples

```sql
-- SELECTIVE: Id is always indexed
SELECT Id, Name FROM Account WHERE Id = '001xx000003DGb0AAG'

-- SELECTIVE: External ID fields are indexed
SELECT Id FROM Account WHERE External_Id__c = 'EXT-001'

-- SELECTIVE: Lookup fields are indexed
SELECT Id FROM Contact WHERE AccountId = '001xx000003DGb0AAG'

-- NON-SELECTIVE: unindexed field on large table
SELECT Id FROM Account WHERE Description LIKE '%important%'

-- NON-SELECTIVE: negative filter
SELECT Id FROM Account WHERE Name != 'Test'
```

## Indexed Fields

### Automatically Indexed Fields

| Field | Always Indexed |
|-------|---------------|
| Id | Yes |
| Name | Yes |
| OwnerId | Yes |
| CreatedDate | Yes |
| SystemModstamp / LastModifiedDate | Yes |
| RecordTypeId | Yes |
| Lookup / Master-Detail fields | Yes |
| External ID fields | Yes |
| Unique fields | Yes |

### Custom Indexes

Request custom indexes from Salesforce Support for frequently filtered custom fields.

```
When to request a custom index:
- Field is frequently used in WHERE clauses
- Table has 100,000+ records
- Query Plan shows TableScan
- Field has high selectivity (many unique values)

NOT indexable:
- Long Text Area
- Multi-select picklists
- Rich Text
- Encrypted fields (without deterministic encryption)
```

## Composite Indexes

Salesforce can create composite (two-column) indexes on request.

```sql
-- Benefits from composite index on (Status__c, Region__c)
SELECT Id, Name
FROM Account
WHERE Status__c = 'Active'
AND Region__c = 'West'

-- Request: Contact Salesforce Support with specific field combination
```

## LIMIT Always

Always include LIMIT to prevent runaway queries.

```sql
-- GOOD: explicit limit
SELECT Id, Name FROM Account WHERE Industry = 'Technology' LIMIT 200

-- GOOD: limit with ORDER BY for deterministic results
SELECT Id, Name, CreatedDate
FROM Account
WHERE Industry = 'Technology'
ORDER BY CreatedDate DESC
LIMIT 50

-- BAD: no limit on potentially large dataset
SELECT Id, Name FROM Account WHERE Industry = 'Technology'
```

## Avoid LIKE with Leading Wildcard

```sql
-- BAD: leading wildcard forces full table scan
SELECT Id FROM Account WHERE Name LIKE '%corp%'

-- GOOD: trailing wildcard can use index
SELECT Id FROM Account WHERE Name LIKE 'Acme%'

-- ALTERNATIVE: Use SOSL for full-text search
FIND {corp} IN NAME FIELDS RETURNING Account(Id, Name)
```

## Relationship Query Depth Limits

```sql
-- Parent-to-child: up to 20 subqueries, 1 level deep
SELECT Id, Name,
    (SELECT Id, Name FROM Contacts),          -- Subquery 1
    (SELECT Id, Amount FROM Opportunities)     -- Subquery 2
FROM Account
WHERE Id = '001xx000003DGb0AAG'

-- Child-to-parent: up to 5 levels of parent relationships
SELECT Id, Name,
    Account.Name,                              -- Level 1
    Account.Owner.Name,                        -- Level 2
    Account.Owner.Profile.Name                 -- Level 3
FROM Contact

-- LIMIT: Max 20 parent-to-child subqueries per query
-- LIMIT: Max 5 levels in child-to-parent traversal
```

## Aggregate SOQL Patterns

```sql
-- COUNT
SELECT COUNT() FROM Opportunity WHERE StageName = 'Closed Won'
-- Returns integer, not queryable rows

-- GROUP BY with aggregate functions
SELECT StageName, COUNT(Id) cnt, SUM(Amount) total, AVG(Amount) avg_amt
FROM Opportunity
WHERE CloseDate = THIS_YEAR
GROUP BY StageName
HAVING COUNT(Id) > 5
ORDER BY SUM(Amount) DESC

-- COUNT DISTINCT (limited to one field)
SELECT COUNT_DISTINCT(AccountId) FROM Contact WHERE MailingState = 'CA'
```

### Aggregate Result Access in Apex

```apex
List<AggregateResult> results = [
    SELECT StageName, COUNT(Id) cnt, SUM(Amount) total
    FROM Opportunity
    GROUP BY StageName
];

for (AggregateResult ar : results) {
    String stage = (String) ar.get('StageName');
    Integer count = (Integer) ar.get('cnt');
    Decimal total = (Decimal) ar.get('total');
}
```

## Skinny Tables

Skinny tables are custom indexes that contain a subset of fields from a standard or custom object. Created by Salesforce Support.

```
When to use Skinny Tables:
- Table has millions of records
- Queries consistently access a small subset of fields
- Query Plan shows high cost

How they work:
- Salesforce creates a denormalized copy with only specified fields
- Queries automatically use skinny table when all fields are present
- Maintained in sync by the platform
- Only available in production (not sandbox)

Limitations:
- Max 100 columns per skinny table
- Cannot include: formula fields, long text, rich text, encrypted
- Must be requested through Salesforce Support
```

## FOR UPDATE / FOR REFERENCE

```sql
-- FOR UPDATE: locks records to prevent concurrent modification
SELECT Id, Name, Status__c
FROM Account
WHERE Id = '001xx000003DGb0AAG'
FOR UPDATE
-- Holds lock until transaction completes
-- Timeout: 10 seconds (throws QueryException if lock unavailable)
-- Use sparingly: can cause deadlocks

-- FOR REFERENCE: extends sharing access for referenced records
SELECT Id, Name
FROM Account
WHERE Id IN (SELECT AccountId FROM Contact WHERE Id = :contactId)
FOR REFERENCE
-- Used when accessing records through relationship for read-only
```

## Query Locators for Batch

```apex
public class LargeDataBatch implements Database.Batchable<SObject> {

    public Database.QueryLocator start(Database.BatchableContext bc) {
        // QueryLocator can return up to 50 MILLION rows
        return Database.getQueryLocator([
            SELECT Id, Name, Industry, AnnualRevenue
            FROM Account
            WHERE CreatedDate >= :Date.today().addYears(-1)
            ORDER BY CreatedDate
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Account> scope) {
        // Process batch of records (default 200)
    }

    public void finish(Database.BatchableContext bc) {
        // Post-processing
    }
}
```

### QueryLocator vs Iterable

| Feature | Database.QueryLocator | Iterable<SObject> |
|---------|----------------------|-------------------|
| Max rows | 50,000,000 | 50,000 (governor limit) |
| Query type | Simple SOQL only | Any logic |
| Dynamic SOQL | No | Yes |
| Multiple objects | No | Yes |
| Typical use | Large single-object queries | Complex multi-object logic |

## Performance Optimization Checklist

| Rule | Priority | Description |
|------|----------|-------------|
| Use indexed fields in WHERE | Critical | Prevents table scans |
| Always include LIMIT | High | Prevents runaway queries |
| Avoid LIKE '%text%' | High | Use SOSL for full-text search |
| Select only needed fields | Medium | Reduces data transfer |
| Use bind variables | Critical | Prevents SOQL injection + enables plan cache |
| No SOQL in loops | Critical | Hits 100 query governor limit |
| Use relationship queries | Medium | Reduces number of queries |
| Filter early, filter often | High | Reduce result set size |
| ORDER BY indexed field | Medium | Better query plan |
| Avoid OR on non-indexed fields | High | Both sides must be selective |
| Use aggregate queries | Medium | Avoid loading all rows for counts |
| QueryLocator for batch | High | 50M row support |
