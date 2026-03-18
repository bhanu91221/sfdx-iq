---
name: data-modeling
description: Master-Detail vs Lookup, junction objects, external IDs, record types, big objects, data skew prevention
origin: claude-sfdx-iq
---

# Data Modeling

## Relationship Types

### Master-Detail vs Lookup Decision Matrix

| Criteria | Master-Detail | Lookup |
|----------|--------------|--------|
| Parent required? | Yes (always) | No (optional) |
| Cascade delete? | Yes (delete parent deletes children) | No (child becomes orphan) |
| Reparenting? | No by default (configurable) | Yes |
| Roll-up summaries? | Yes (native) | No (use Apex or DLRS) |
| Sharing inheritance? | Yes (child inherits parent sharing) | No (independent sharing) |
| Owner field on child? | No (inherited from parent) | Yes (independent owner) |
| Max per object | 2 | 40 (including master-detail) |
| OWD on child | Controlled by parent | Independent |

### When to Use Master-Detail

- The child record has no meaning without the parent (e.g., Order Line Item without Order)
- You need native roll-up summary fields
- You want sharing to cascade from parent to child
- Cascade delete is the desired behavior
- The child should not exist independently

```
Order__c (Master)
   |-- Order_Line_Item__c (Detail)  -- meaningless without Order
   |-- Order_Line_Item__c (Detail)
```

### When to Use Lookup

- The child can exist independently (e.g., Contact can exist without Account)
- You need to reparent records
- You need independent sharing rules on the child
- The relationship is optional
- You have already used 2 master-detail relationships on the child

```
Contact (Lookup to Account)  -- Contact can exist without Account
Case (Lookup to Contact)     -- Case can exist without Contact
```

## Junction Objects (Many-to-Many)

For M:M relationships, create a junction object with two master-detail relationships.

```
Course__c ----< Course_Enrollment__c >---- Student__c
  (Master)       (Junction / Detail)         (Master)
```

```apex
// Junction object
Course_Enrollment__c enrollment = new Course_Enrollment__c(
    Course__c = courseId,           // Master-Detail 1
    Student__c = studentId,        // Master-Detail 2
    Enrollment_Date__c = Date.today(),
    Status__c = 'Active'
);
insert enrollment;
```

**Rules:**
- The junction object has two master-detail fields
- The first master-detail determines the primary relationship (for sharing and deletion)
- The junction object can have its own custom fields (attributes of the relationship)
- Roll-up summaries are available on both parent objects
- Deleting either parent deletes the junction record

**Junction object naming convention:** Use the relationship name, not "Junction" (e.g., `Course_Enrollment__c` not `Course_Student_Junction__c`).

## External IDs

External IDs enable upsert operations and are essential for data integration.

### When to Use External IDs

- Integration with external systems (ERP, billing, legacy databases)
- Data migration (maintain original system IDs)
- Upsert operations (insert or update based on external key)
- Cross-org data synchronization

### Configuration

- Mark a field as "External ID" in field settings
- Set it as "Unique" to prevent duplicates
- Text, Number, or Email fields can be External IDs
- Maximum 25 External ID fields per object (including standard fields like `Id`)

### Upsert with External ID

```apex
// Upsert using external ID
List<Account> accounts = new List<Account>();
accounts.add(new Account(
    ERP_Id__c = 'ERP-001',   // External ID field
    Name = 'Acme Corp',
    BillingCity = 'San Francisco'
));
accounts.add(new Account(
    ERP_Id__c = 'ERP-002',
    Name = 'Globex Inc',
    BillingCity = 'New York'
));

// Inserts new records or updates existing ones matched by ERP_Id__c
Database.UpsertResult[] results = Database.upsert(accounts, Account.ERP_Id__c, false);
```

### Relationship Resolution by External ID

Set lookup/master-detail relationships using the parent's external ID instead of Salesforce ID.

```apex
Contact con = new Contact(
    FirstName = 'John',
    LastName = 'Smith',
    External_Contact_Id__c = 'CON-001'
);

// Set Account relationship via external ID (no query needed)
Account accRef = new Account(ERP_Id__c = 'ERP-001');
con.Account = accRef;

upsert con Contact.External_Contact_Id__c;
```

This avoids querying for the parent's Salesforce ID during data loads.

## Record Types vs Separate Objects

### Use Record Types When

- Same fields, different picklist values
- Same page layout structure with minor differences
- Same automation with conditional branches
- Need to report across all variants together
- Differences are primarily in process, not structure

```
Case (Record Types: Support, Billing, Returns)
  -- Same base fields
  -- Different picklist values for Status, Priority
  -- Different page layouts
  -- Same reporting object
```

### Use Separate Objects When

- Fundamentally different field sets (>50% unique fields)
- Different security models (different OWD, sharing rules)
- Different compliance or audit requirements
- Significantly different automation
- No need to report across variants

```
Employee__c (internal HR data)
Contractor__c (vendor management data)
  -- Very different fields, security, and processes
  -- Separate reporting needs
```

### Decision Criteria

| Factor | Record Types | Separate Objects |
|--------|-------------|-----------------|
| Shared fields | > 50% | < 50% |
| Unified reporting | Yes | No |
| Security model | Same | Different |
| Page layouts | Similar | Very different |
| Automation | Similar with branching | Completely different |
| Volume | Combined volume manageable | Need separate scaling |

## Big Objects

Big objects store massive volumes of data (billions of records) for archival and historical analytics. They have limited query capabilities but virtually unlimited storage.

### When to Use

- Archiving historical data (audit logs, transaction history)
- Storing high-volume event data
- Data that is written frequently but queried infrequently
- Records older than a retention threshold

### Limitations

- No triggers
- No standard UI (query via Apex or Async SOQL)
- Limited query filters (only indexed fields, only `=` and `>` on first fields)
- No record-level sharing
- Insert only (no update or delete via standard DML)

```apex
// Define via metadata (CustomBigObject)
// Fields: Account_Id__c, Transaction_Date__c, Amount__c, Type__c

// Insert into big object
List<Transaction_Archive__b> archives = new List<Transaction_Archive__b>();
for (Transaction__c txn : oldTransactions) {
    archives.add(new Transaction_Archive__b(
        Account_Id__c = txn.Account__c,
        Transaction_Date__c = txn.Date__c,
        Amount__c = txn.Amount__c,
        Type__c = txn.Type__c
    ));
}
Database.insertImmediate(archives);
```

### Querying Big Objects

```apex
// SOQL on Big Objects (limited operators)
List<Transaction_Archive__b> results = [
    SELECT Account_Id__c, Transaction_Date__c, Amount__c
    FROM Transaction_Archive__b
    WHERE Account_Id__c = :accountId
    AND Transaction_Date__c > :startDate
];
```

## Polymorphic Lookups

Polymorphic lookups (like `WhatId` on Task, `ParentId` on FeedItem) point to multiple object types.

### Standard Polymorphic Fields

| Field | Object | Points To |
|-------|--------|-----------|
| `WhoId` | Task, Event | Contact, Lead |
| `WhatId` | Task, Event | Account, Opportunity, Custom Objects |
| `OwnerId` | Any | User, Group, Queue |
| `ParentId` | FeedItem | Multiple objects |

### Querying Polymorphic Relationships

```apex
// Using TYPEOF in SOQL
List<Event> events = [
    SELECT Id, Subject,
        TYPEOF What
            WHEN Account THEN Name, Industry
            WHEN Opportunity THEN Name, StageName, Amount
        END
    FROM Event
    WHERE CreatedDate = THIS_MONTH
];

// Checking the type at runtime
for (Event evt : events) {
    if (evt.WhatId != null) {
        String objectType = evt.WhatId.getSObjectType().getDescribe().getName();
        if (objectType == 'Account') {
            // handle account-related event
        }
    }
}
```

## Rollup Summary Patterns

### Native Roll-Up (Master-Detail Only)

Available operations: COUNT, SUM, MIN, MAX with optional filter criteria.

### Apex Roll-Up (Any Relationship)

```apex
// Trigger-based rollup on lookup relationship
public class ContactRollupHandler {

    public static void rollupContactCount(List<Contact> contacts, Map<Id, Contact> oldMap) {
        Set<Id> accountIds = new Set<Id>();

        for (Contact con : contacts) {
            if (con.AccountId != null) {
                accountIds.add(con.AccountId);
            }
            if (oldMap != null && oldMap.get(con.Id).AccountId != null) {
                accountIds.add(oldMap.get(con.Id).AccountId);
            }
        }

        if (accountIds.isEmpty()) return;

        List<AggregateResult> counts = [
            SELECT AccountId, COUNT(Id) cnt
            FROM Contact
            WHERE AccountId IN :accountIds
            GROUP BY AccountId
        ];

        Map<Id, Integer> countMap = new Map<Id, Integer>();
        for (AggregateResult ar : counts) {
            countMap.put((Id) ar.get('AccountId'), (Integer) ar.get('cnt'));
        }

        List<Account> toUpdate = new List<Account>();
        for (Id accId : accountIds) {
            toUpdate.add(new Account(
                Id = accId,
                Contact_Count__c = countMap.containsKey(accId) ? countMap.get(accId) : 0
            ));
        }

        update toUpdate;
    }
}
```

### Declarative Lookup Rollup Summaries (DLRS)

For complex rollups without code, use the open-source DLRS package. It supports:
- Lookup relationships
- Multiple aggregate functions
- Complex filter criteria
- Scheduled recalculation

## Data Skew Prevention

Data skew occurs when a single parent record has an excessive number of child records (>10,000). This causes lock contention, slow queries, and sharing calculation issues.

### Types of Skew

| Type | Description | Threshold |
|------|-------------|-----------|
| Account data skew | Too many child records (Contacts, Opportunities) | > 10,000 children |
| Ownership skew | One user owns too many records | > 10,000 records |
| Lookup skew | Too many records pointing to one parent | > 10,000 lookups |

### Prevention Strategies

**Redistribute ownership:**

```apex
// BAD -- single integration user owns millions of records
// Causes ownership skew and sharing calculation delays

// GOOD -- distribute across multiple users or a queue
Id queueId = [SELECT Id FROM Group WHERE Type = 'Queue' AND DeveloperName = 'Integration_Queue'].Id;
```

**Avoid hot parent records:**

```apex
// BAD -- all contacts point to one "General" account
// Creates severe lookup skew on the Account record

// GOOD -- use null lookups or distribute across multiple umbrella accounts
```

**Design for scale:**

- Limit child records per parent to under 10,000
- Use skinny tables for frequently queried large objects
- Archive old records to Big Objects
- Partition data using record types or custom fields
- Use indexed fields in WHERE clauses for large tables

### Monitoring Skew

```sql
-- Find accounts with excessive contacts
SELECT AccountId, COUNT(Id) cnt
FROM Contact
GROUP BY AccountId
HAVING COUNT(Id) > 10000
ORDER BY COUNT(Id) DESC

-- Find users with excessive record ownership
SELECT OwnerId, COUNT(Id) cnt
FROM Account
GROUP BY OwnerId
HAVING COUNT(Id) > 10000
```

## Best Practices Summary

1. **Choose Master-Detail when the child is meaningless without the parent.** Otherwise use Lookup.
2. **Use junction objects for M:M relationships.** Name them after the relationship, not "Junction".
3. **Add External IDs for every integrated object.** Mark them Unique.
4. **Prefer Record Types over separate objects** when fields overlap >50%.
5. **Archive to Big Objects** when historical data exceeds millions of records.
6. **Monitor and prevent data skew.** Keep child counts under 10,000 per parent.
7. **Use indexed fields in queries.** External IDs are automatically indexed.
8. **Design for bulkification.** Data model choices affect how triggers and batch jobs perform.
9. **Document relationships.** Maintain an ERD for every functional area.
10. **Plan for deletion.** Understand cascade behavior before choosing relationship types.
