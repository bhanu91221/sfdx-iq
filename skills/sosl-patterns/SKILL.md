---
name: sosl-patterns
description: SOSL search patterns including FIND syntax, RETURNING clauses, search groups, and SOSL vs SOQL decisions
origin: claude-sfdx-iq
---

# SOSL Patterns

## FIND Syntax

SOSL uses full-text search indexes for fast text searching across multiple objects.

### Basic FIND

```sql
FIND {Acme Corp} IN ALL FIELDS
RETURNING Account(Id, Name, Industry), Contact(Id, Name, Email)
```

### Search Term Syntax

```sql
-- Exact phrase
FIND {"Acme Corporation"} IN ALL FIELDS RETURNING Account(Id, Name)

-- Wildcard (trailing only, minimum 2 characters before *)
FIND {Acme*} IN ALL FIELDS RETURNING Account(Id, Name)

-- Logical operators
FIND {Acme AND Corp} IN ALL FIELDS RETURNING Account
FIND {Acme OR Corp} IN ALL FIELDS RETURNING Account
FIND {Acme AND NOT Test} IN ALL FIELDS RETURNING Account

-- Single character wildcard
FIND {Ac?e} IN ALL FIELDS RETURNING Account

-- Escape special characters: ? & | ! { } [ ] ( ) ^ ~ * : \ " ' + -
FIND {Acme \& Sons} IN ALL FIELDS RETURNING Account
```

## Search Groups

### Available Search Groups

| Search Group | Searches In |
|-------------|-------------|
| `ALL FIELDS` | All searchable fields (Name, custom text, email, phone, etc.) |
| `NAME FIELDS` | Name and Subject fields only |
| `EMAIL FIELDS` | Email fields only |
| `PHONE FIELDS` | Phone fields only |
| `SIDEBAR FIELDS` | Fields displayed in the sidebar search |

### Examples

```sql
-- Search only in name fields (fastest)
FIND {Smith} IN NAME FIELDS
RETURNING Contact(Id, Name, Email)

-- Search in email fields
FIND {smith@example.com} IN EMAIL FIELDS
RETURNING Contact(Id, Name, Email), Lead(Id, Name, Email)

-- Search in phone fields
FIND {415*} IN PHONE FIELDS
RETURNING Contact(Id, Name, Phone)

-- Default: ALL FIELDS
FIND {Acme} RETURNING Account(Id, Name)
-- Equivalent to:
FIND {Acme} IN ALL FIELDS RETURNING Account(Id, Name)
```

## RETURNING Clause with Field Lists

```sql
-- Multiple objects with specific fields
FIND {Cloud}
IN ALL FIELDS
RETURNING
    Account(Id, Name, Industry, AnnualRevenue ORDER BY Name LIMIT 10),
    Contact(Id, Name, Email, Account.Name ORDER BY Name LIMIT 10),
    Opportunity(Id, Name, Amount, StageName ORDER BY Amount DESC LIMIT 5)
```

### Field Selection in RETURNING

```sql
RETURNING Account(
    Id,
    Name,
    Industry,
    BillingCity,
    -- Relationship fields supported
    Owner.Name,
    -- Polymorphic fields
    CreatedBy.Name
    -- Aggregate fields NOT supported
    -- Subqueries NOT supported
)
```

## WHERE Filters in RETURNING

```sql
-- Filter results per object
FIND {Cloud Computing}
IN ALL FIELDS
RETURNING
    Account(Id, Name, Industry
            WHERE Industry = 'Technology'
            AND AnnualRevenue > 1000000
            ORDER BY Name
            LIMIT 20),
    Contact(Id, Name, Email
            WHERE MailingState = 'CA'
            LIMIT 10),
    Opportunity(Id, Name, Amount
                WHERE StageName != 'Closed Lost'
                AND Amount > 50000
                ORDER BY Amount DESC
                LIMIT 5)
```

### Supported WHERE Operators

```sql
-- Standard comparison
WHERE Industry = 'Technology'
WHERE Amount > 50000
WHERE CreatedDate = LAST_N_DAYS:30

-- IN clause
WHERE Industry IN ('Technology', 'Finance', 'Healthcare')

-- LIKE (for additional filtering after search)
WHERE Name LIKE 'Acme%'

-- Date literals
WHERE CreatedDate = THIS_YEAR
WHERE CloseDate = NEXT_N_MONTHS:3

-- Null checks
WHERE Email != null
```

## WITH Clauses

### WITH NETWORK

```sql
-- Filter by Experience Cloud network
FIND {Help}
IN ALL FIELDS
RETURNING KnowledgeArticleVersion(Id, Title)
WITH NETWORK = '0DB000000000001'
```

### WITH SNIPPET

```sql
-- Return text snippets showing where search matched
FIND {Cloud Computing Best Practices}
IN ALL FIELDS
RETURNING KnowledgeArticleVersion(Id, Title)
WITH SNIPPET (target_length=120)

-- snippet field in results shows match context with <mark> tags
```

### WITH DATA CATEGORY

```sql
-- Filter Knowledge articles by data category
FIND {installation guide}
RETURNING KnowledgeArticleVersion(Id, Title)
WITH DATA CATEGORY Products__c AT Laptops__c
```

### WITH METADATA

```sql
-- Include metadata about the search results
FIND {Acme}
RETURNING Account(Id, Name)
WITH METADATA = 'LABELS'
```

## SOSL vs SOQL Decision

| Criteria | SOQL | SOSL |
|----------|------|------|
| Use case | Known field, exact/partial match | Full-text search across fields |
| Speed on text search | Slow (LIKE '%text%' = table scan) | Fast (uses search index) |
| Multiple objects | No (one object per query) | Yes (up to 20 objects) |
| Fields searched | Explicit in WHERE clause | All searchable or specific group |
| Wildcards | LIKE with % and _ | * and ? with min 2 char prefix |
| Indexing | Database index on field | Search index (separate) |
| Results per object | Up to 50,000 | Up to 2,000 |
| Aggregate queries | Yes (COUNT, SUM, etc.) | No |
| Relationship queries | Yes (subqueries, parent) | Fields only, no subqueries |
| Triggers | Available in triggers | NOT available in triggers |
| Index lag | Real-time | Near real-time (seconds delay) |
| DML context | Available | NOT available after DML in same transaction |

### When to Use SOSL

```
1. User is searching by keyword across multiple fields
2. Need to search across multiple objects simultaneously
3. Building a global search feature
4. SOQL with LIKE '%keyword%' is too slow
5. Searching Knowledge articles
6. Email field searches
7. Phone number searches
```

### When to Use SOQL

```
1. Exact match on known fields
2. Need aggregate results (COUNT, SUM, etc.)
3. Need subqueries or complex relationships
4. Need more than 2,000 results
5. Inside triggers (SOSL not allowed)
6. After DML in same transaction (SOSL not allowed)
7. Need FOR UPDATE locking
8. Filter by non-text fields (dates, numbers, booleans)
```

## SOSL Limits

| Limit | Value |
|-------|-------|
| Max results per object | 2,000 |
| Max objects in RETURNING | 20 |
| Search term minimum | 2 characters (before wildcard) |
| SOSL calls per transaction | 20 |
| Max search query length | 10,000 characters |

## SOSL in Apex Patterns

### Basic Apex SOSL

```apex
public with sharing class GlobalSearchController {

    @AuraEnabled(cacheable=true)
    public static List<List<SObject>> globalSearch(String searchTerm) {
        if (String.isBlank(searchTerm) || searchTerm.length() < 2) {
            return new List<List<SObject>>();
        }

        // Escape special characters
        String sanitized = String.escapeSingleQuotes(searchTerm);

        List<List<SObject>> results = [
            FIND :sanitized
            IN ALL FIELDS
            RETURNING
                Account(Id, Name, Industry, BillingCity
                        ORDER BY Name LIMIT 10),
                Contact(Id, Name, Email, Phone, Account.Name
                        ORDER BY Name LIMIT 10),
                Opportunity(Id, Name, Amount, StageName
                           ORDER BY Amount DESC LIMIT 5)
        ];

        return results;
    }
}
```

### Processing SOSL Results

```apex
List<List<SObject>> results = [FIND :searchTerm IN ALL FIELDS
    RETURNING Account(Id, Name), Contact(Id, Name)];

// Results are in the same order as RETURNING clause
List<Account> accounts = (List<Account>) results[0];
List<Contact> contacts = (List<Contact>) results[1];

// Build unified search results
List<SearchResult> unified = new List<SearchResult>();
for (Account a : accounts) {
    unified.add(new SearchResult('Account', a.Id, a.Name));
}
for (Contact c : contacts) {
    unified.add(new SearchResult('Contact', c.Id, c.Name));
}
```

### Dynamic SOSL

```apex
public static List<List<SObject>> dynamicSearch(
    String searchTerm,
    List<String> objectTypes,
    String searchGroup
) {
    String query = 'FIND \'' + String.escapeSingleQuotes(searchTerm) + '\'';
    query += ' IN ' + searchGroup + ' FIELDS';

    List<String> returningClauses = new List<String>();
    for (String objType : objectTypes) {
        returningClauses.add(objType + '(Id, Name LIMIT 10)');
    }
    query += ' RETURNING ' + String.join(returningClauses, ', ');

    return Search.query(query);
}
```

### Search with Highlighting

```apex
// Using WITH SNIPPET for Knowledge articles
List<List<SObject>> results = [
    FIND :searchTerm
    IN ALL FIELDS
    RETURNING KnowledgeArticleVersion(
        Id, Title, Summary
    )
    WITH SNIPPET (target_length=200)
];

// Access snippet via Search.SearchResult
Search.SearchResults searchResults = Search.find(
    'FIND \'' + searchTerm + '\' RETURNING KnowledgeArticleVersion(Id, Title) WITH SNIPPET'
);
List<Search.SearchResult> articleResults = searchResults.get('KnowledgeArticleVersion');
for (Search.SearchResult sr : articleResults) {
    String snippet = sr.getSnippet();  // Contains <mark> highlighted matches
}
```

## Anti-Patterns

```
1. SOSL in triggers (not allowed)
   Fix: Use SOQL in triggers or move to async context

2. SOSL after DML in same transaction
   Fix: Perform SOSL before DML or in separate transaction

3. Single-character search term
   Fix: Enforce minimum 2-character search

4. Not escaping user input
   Fix: Use String.escapeSingleQuotes() or bind variables

5. Expecting real-time index updates
   Fix: Allow seconds delay; use SOQL for immediate reads after DML

6. Using SOSL for exact ID lookups
   Fix: Use SOQL with WHERE Id = :recordId
```
