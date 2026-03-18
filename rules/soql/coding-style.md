# SOQL Coding Style Rules

## Query Formatting

Format SOQL queries for readability — one clause per line for multi-line queries:

```apex
// ❌ Bad — hard to read, hard to review
List<Account> accts = [SELECT Id,Name,Industry,CreatedDate FROM Account WHERE Industry = 'Technology' AND CreatedDate = LAST_N_DAYS:30 ORDER BY Name LIMIT 100];

// ✅ Good — one clause per line
List<Account> accts = [
    SELECT Id, Name, Industry, CreatedDate
    FROM Account
    WHERE Industry = :targetIndustry
        AND CreatedDate = LAST_N_DAYS:30
    ORDER BY Name
    LIMIT 100
];
```

## Field Ordering

Order fields consistently within SELECT:
1. `Id` first (always)
2. Standard fields alphabetically
3. Custom fields alphabetically
4. Relationship fields last

```apex
SELECT Id, CreatedDate, Industry, Name, OwnerId,
       Custom_Field__c, Revenue__c,
       Owner.Name, Parent.Name
FROM Account
```

## Alias Conventions

- Use aliases for aggregate queries — always alias the aggregate function.
- Use meaningful aliases, not single letters.

```apex
// ❌ Bad
SELECT COUNT(Id) FROM Account GROUP BY Industry

// ✅ Good
SELECT Industry, COUNT(Id) accountCount
FROM Account
GROUP BY Industry
```

## Bind Variables

- ALWAYS use bind variables (`:variableName`) for filter values.
- NEVER concatenate strings into SOQL.
- For dynamic SOQL, use `Database.queryWithBinds()`.

```apex
// ❌ Bad — injection risk
String query = 'SELECT Id FROM Account WHERE Name = \'' + name + '\'';

// ✅ Good — bind variable
List<Account> accts = [SELECT Id FROM Account WHERE Name = :name];
```

## Query Placement

- Encapsulate all SOQL in Selector classes (one per SObject).
- Never inline SOQL in trigger handlers, controllers, or service classes.
- Selector methods should accept filter parameters and return typed lists.

```apex
// ❌ Bad — SOQL scattered in service
public class AccountService {
    public void process() {
        List<Account> accts = [SELECT Id FROM Account WHERE Industry = 'Tech'];
    }
}

// ✅ Good — SOQL in Selector
public class AccountSelector {
    public List<Account> selectByIndustry(String industry) {
        return [SELECT Id, Name FROM Account WHERE Industry = :industry];
    }
}
```

## Commenting Queries

Add a comment explaining WHY a query filters the way it does when the business reason isn't obvious:

```apex
// Only active accounts that haven't been contacted in 90 days
// for the re-engagement campaign batch job
List<Account> staleAccounts = [
    SELECT Id, Name, Last_Contact_Date__c
    FROM Account
    WHERE IsActive__c = true
        AND Last_Contact_Date__c < :ninetyDaysAgo
    LIMIT 50000
];
```
