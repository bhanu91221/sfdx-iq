# SOQL Performance

## Use Selective Filters

A query is selective when the filter matches less than 10% of total records (or fewer than 333,000 records for standard indexes). Non-selective queries on large objects cause full table scans and timeouts.

### Indexed Fields (Selective by Default)

These fields have standard indexes and should be preferred in WHERE clauses:

- `Id`
- `Name`
- `OwnerId`
- `CreatedDate`
- `SystemModstamp` / `LastModifiedDate`
- `RecordTypeId`
- Foreign key fields (lookups and master-detail)
- `ExternalId` fields

```apex
// ❌ Bad — non-selective filter on unindexed custom field
List<Account> accounts = [
    SELECT Id, Name
    FROM Account
    WHERE Custom_Category__c = 'Enterprise'
];

// ✅ Good — selective filter on indexed field
List<Account> accounts = [
    SELECT Id, Name
    FROM Account
    WHERE Id IN :accountIds
];

// ✅ Good — indexed field narrows results, then filter further
List<Account> accounts = [
    SELECT Id, Name, Custom_Category__c
    FROM Account
    WHERE OwnerId = :currentUserId
      AND Custom_Category__c = 'Enterprise'
];
```

## Always Use LIMIT

Every query that does not feed a batch process should have an explicit LIMIT to prevent runaway row consumption.

```apex
// ❌ Bad — unbounded query
List<Case> cases = [SELECT Id, Subject FROM Case WHERE Status = 'Open'];

// ✅ Good — bounded query
List<Case> cases = [
    SELECT Id, Subject
    FROM Case
    WHERE Status = 'Open'
    ORDER BY CreatedDate DESC
    LIMIT 200
];
```

## Avoid Leading Wildcards in LIKE

Leading wildcards (`%value`) prevent index usage and cause full table scans.

```apex
// ❌ Bad — leading wildcard, full table scan
List<Account> accounts = [
    SELECT Id, Name FROM Account WHERE Name LIKE '%Technologies'
];

// ✅ Good — trailing wildcard, can use index
List<Account> accounts = [
    SELECT Id, Name FROM Account WHERE Name LIKE 'Acme%'
];

// ✅ Better — use SOSL for full-text search
List<List<SObject>> results = [
    FIND 'Technologies' IN NAME FIELDS RETURNING Account(Id, Name)
];
```

## Avoid NOT and OR on Large Datasets

Negative operators and OR conditions can make queries non-selective.

```apex
// ❌ Bad — NOT operator, non-selective on large tables
List<Account> accounts = [
    SELECT Id FROM Account WHERE Industry != 'Technology'
];

// ❌ Bad — OR across unindexed fields
List<Account> accounts = [
    SELECT Id FROM Account
    WHERE Custom_Region__c = 'West' OR Custom_Segment__c = 'SMB'
];

// ✅ Good — positive filter on indexed fields
List<Account> accounts = [
    SELECT Id FROM Account
    WHERE Industry = 'Technology'
      AND OwnerId = :userId
    LIMIT 200
];
```

## Query Plan Tool

Use the Query Plan tool in Developer Console to analyze selectivity before deploying queries against large objects.

1. Open Developer Console
2. Navigate to **Query Editor** tab
3. Check **Use Tooling API**
4. Enter: `EXPLAIN SELECT Id FROM Account WHERE Custom_Field__c = 'value'`
5. Review the **Cost** column — values above 1.0 indicate non-selective queries

## Skinny Tables

For objects with 100K+ records and many fields, request skinny tables from Salesforce Support. Skinny tables contain a subset of fields for faster reads.

- Skinny tables are read-only materialized views maintained by the platform.
- They do not include formula fields, roll-up summaries, or system fields beyond Id.
- Request them for objects where you frequently query a small set of fields against large datasets.

## Date-Based Filtering

Use date literals and indexed date fields for efficient time-based queries.

```apex
// ✅ Good — date literal on indexed CreatedDate
List<Case> recentCases = [
    SELECT Id, Subject, Status
    FROM Case
    WHERE CreatedDate = LAST_N_DAYS:30
      AND Status = 'Open'
    ORDER BY CreatedDate DESC
    LIMIT 100
];

// ✅ Good — date range on SystemModstamp (always indexed)
List<Account> modified = [
    SELECT Id, Name
    FROM Account
    WHERE SystemModstamp >= :startDate
      AND SystemModstamp <= :endDate
    LIMIT 500
];
```

## COUNT() for Existence Checks

When you only need to know if records exist, use COUNT() instead of fetching full records.

```apex
// ❌ Bad — fetches all records just to check existence
List<Case> cases = [SELECT Id FROM Case WHERE AccountId = :acctId];
if (!cases.isEmpty()) { /* ... */ }

// ✅ Good — lightweight existence check
Integer caseCount = [SELECT COUNT() FROM Case WHERE AccountId = :acctId LIMIT 1];
if (caseCount > 0) { /* ... */ }
```

## Performance Checklist

- [ ] WHERE clause uses at least one indexed field
- [ ] No leading wildcards in LIKE expressions
- [ ] LIMIT present on all non-batch queries
- [ ] No NOT or != on large unindexed fields
- [ ] OR conditions are on indexed fields or replaced with IN
- [ ] Aggregate queries used instead of in-memory aggregation
- [ ] Query Plan tool run for queries on objects with 100K+ records
