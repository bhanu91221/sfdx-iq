# SOQL Query Patterns

## Always Specify Fields

Salesforce has no `SELECT *`. Explicitly list only the fields you need to minimize heap usage and respect FLS.

```apex
// ❌ Bad — querying fields you don't use
List<Account> accounts = [
    SELECT Id, Name, Industry, Description, Phone, Fax, Website,
           BillingStreet, BillingCity, BillingState, BillingPostalCode,
           ShippingStreet, ShippingCity, ShippingState, ShippingPostalCode,
           AnnualRevenue, NumberOfEmployees, OwnerId, CreatedDate
    FROM Account
    WHERE Id IN :accountIds
];
// Only using Name and Industry downstream

// ✅ Good — query only what you need
List<Account> accounts = [
    SELECT Id, Name, Industry
    FROM Account
    WHERE Id IN :accountIds
    WITH SECURITY_ENFORCED
];
```

## Relationship Queries

### Parent-to-Child (Subquery)

Up to 1 level of child relationship. Returns child records nested under each parent.

```apex
// ✅ Good — parent with child subquery
List<Account> accounts = [
    SELECT Id, Name,
        (SELECT Id, FirstName, LastName, Email
         FROM Contacts
         WHERE IsActive__c = true
         ORDER BY LastName ASC
         LIMIT 100)
    FROM Account
    WHERE Id IN :accountIds
    WITH SECURITY_ENFORCED
];

for (Account acct : accounts) {
    for (Contact con : acct.Contacts) {
        System.debug(con.LastName);
    }
}
```

### Child-to-Parent (Dot Notation)

Up to 5 levels of parent traversal.

```apex
// ✅ Good — traverse up to parent and grandparent
List<Contact> contacts = [
    SELECT Id, FirstName, LastName,
           Account.Name,
           Account.Owner.Name,
           Account.Parent.Name
    FROM Contact
    WHERE AccountId IN :accountIds
    WITH SECURITY_ENFORCED
];
```

## Aggregate Queries

Use aggregate functions to compute values at the database level instead of in Apex.

```apex
// ❌ Bad — aggregating in Apex
List<Opportunity> opps = [SELECT Amount, StageName FROM Opportunity];
Decimal total = 0;
for (Opportunity opp : opps) {
    if (opp.StageName == 'Closed Won') { total += opp.Amount; }
}

// ✅ Good — aggregate in SOQL
AggregateResult[] results = [
    SELECT StageName, COUNT(Id) cnt, SUM(Amount) total
    FROM Opportunity
    WHERE AccountId IN :accountIds
    GROUP BY StageName
    HAVING SUM(Amount) > 0
];

for (AggregateResult ar : results) {
    String stage = (String) ar.get('StageName');
    Integer count = (Integer) ar.get('cnt');
    Decimal total = (Decimal) ar.get('total');
}
```

## Bind Variables — Always

Never concatenate values into SOQL strings.

```apex
// ❌ Bad — string concatenation
String query = 'SELECT Id FROM Account WHERE Name = \'' + name + '\'';

// ✅ Good — bind variable in static SOQL
List<Account> accounts = [SELECT Id FROM Account WHERE Name = :name];

// ✅ Good — bind variable in dynamic SOQL
Map<String, Object> binds = new Map<String, Object>{ 'name' => name };
List<Account> accounts = Database.queryWithBinds(
    'SELECT Id FROM Account WHERE Name = :name', binds, AccessLevel.USER_MODE
);
```

## TYPEOF for Polymorphic Fields

Use `TYPEOF` when querying polymorphic lookup fields (e.g., `WhatId` on Task).

```apex
// ✅ Good — TYPEOF for polymorphic resolution
List<Event> events = [
    SELECT Id, Subject,
        TYPEOF What
            WHEN Account THEN Name, Industry
            WHEN Opportunity THEN Name, StageName, Amount
        END
    FROM Event
    WHERE WhatId != null
    WITH SECURITY_ENFORCED
    LIMIT 200
];
```

## OFFSET for Pagination

Use `LIMIT` and `OFFSET` together for paginated queries. Maximum OFFSET is 2,000.

```apex
// ✅ Good — paginated query
private static final Integer PAGE_SIZE = 20;

public static List<Account> getPage(Integer pageNumber) {
    Integer offset = (pageNumber - 1) * PAGE_SIZE;
    return [
        SELECT Id, Name, Industry
        FROM Account
        ORDER BY Name ASC
        LIMIT :PAGE_SIZE
        OFFSET :offset
    ];
}
```

For large datasets beyond OFFSET 2,000, use a keyset approach:

```apex
// ✅ Good — keyset pagination for large datasets
public static List<Account> getNextPage(String lastSeenName, Id lastSeenId) {
    return [
        SELECT Id, Name, Industry
        FROM Account
        WHERE (Name > :lastSeenName)
           OR (Name = :lastSeenName AND Id > :lastSeenId)
        ORDER BY Name ASC, Id ASC
        LIMIT 20
    ];
}
```

## FOR UPDATE

Lock records to prevent concurrent modifications in critical sections.

```apex
// ✅ Good — lock records before update
List<Account> accounts = [
    SELECT Id, Name, Balance__c
    FROM Account
    WHERE Id = :accountId
    FOR UPDATE
];
// Records are locked until the transaction completes
accounts[0].Balance__c -= amount;
update accounts;
```

## Query Pattern Reference

| Pattern | Use Case |
|---------|----------|
| Subquery | Fetch parent + children in one query |
| Dot notation | Access parent fields from child |
| Aggregate | COUNT, SUM, AVG, MIN, MAX, GROUP BY |
| Bind variables | All user-supplied filter values |
| TYPEOF | Polymorphic lookups (WhatId, WhoId) |
| OFFSET / keyset | Pagination |
| FOR UPDATE | Record locking for concurrency |
