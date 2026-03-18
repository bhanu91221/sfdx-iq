# Apex Coding Style

## Naming Conventions

- **Classes**: PascalCase — `AccountService`, `OpportunityTriggerHandler`
- **Methods**: camelCase — `getActiveAccounts()`, `processLineItems()`
- **Variables**: camelCase — `accountList`, `totalAmount`
- **Constants**: UPPER_SNAKE_CASE — `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE`
- **Test classes**: suffix with `Test` — `AccountServiceTest`
- **Trigger handlers**: suffix with `TriggerHandler` — `ContactTriggerHandler`

```apex
// ❌ Bad
public class account_service {
    static final Integer max = 50;
    public void Process_Records(List<Account> ACCTS) { }
}

// ✅ Good
public with sharing class AccountService {
    private static final Integer MAX_BATCH_SIZE = 50;
    public void processRecords(List<Account> accounts) { }
}
```

## ApexDoc Comments

Add ApexDoc to every public and global method. Include `@description`, `@param`, and `@return`.

```apex
// ❌ Bad — no documentation
public static List<Account> get(Set<Id> ids) {
    return [SELECT Id, Name FROM Account WHERE Id IN :ids];
}

// ✅ Good
/**
 * @description Retrieves Accounts by a set of record IDs.
 * @param accountIds Set of Account IDs to query.
 * @return List of Account records with Id and Name fields.
 */
public static List<Account> getByIds(Set<Id> accountIds) {
    return [SELECT Id, Name FROM Account WHERE Id IN :accountIds];
}
```

## Method Length

- Keep methods at **50 lines or fewer**. Extract helper methods when a method grows beyond this.
- Each method should do one thing and do it well.

```apex
// ❌ Bad — method doing too many things
public void processOpportunities(List<Opportunity> opps) {
    // 80+ lines of validation, calculation, DML, and notifications
}

// ✅ Good — decomposed into focused methods
public void processOpportunities(List<Opportunity> opps) {
    List<Opportunity> valid = validateOpportunities(opps);
    Map<Id, Decimal> totals = calculateTotals(valid);
    updateOpportunityAmounts(valid, totals);
    sendNotifications(valid);
}
```

## Class Organization

Organize class members in this order:

1. Constants
2. Static variables
3. Instance variables
4. Constructors
5. Public methods
6. Private methods

```apex
// ✅ Good — consistent class structure
public with sharing class OpportunityService {
    // 1. Constants
    private static final Integer MAX_RECORDS = 200;
    private static final String DEFAULT_STAGE = 'Prospecting';

    // 2. Static variables
    private static Map<Id, Account> accountCache;

    // 3. Instance variables
    private List<Opportunity> opportunities;
    private Set<Id> accountIds;

    // 4. Constructors
    public OpportunityService(List<Opportunity> opportunities) {
        this.opportunities = opportunities;
        this.accountIds = new Set<Id>();
    }

    // 5. Public methods
    public List<Opportunity> filterByStage(String stage) {
        List<Opportunity> filtered = new List<Opportunity>();
        for (Opportunity opp : this.opportunities) {
            if (opp.StageName == stage) {
                filtered.add(opp);
            }
        }
        return filtered;
    }

    // 6. Private methods
    private void collectAccountIds() {
        for (Opportunity opp : this.opportunities) {
            if (opp.AccountId != null) {
                this.accountIds.add(opp.AccountId);
            }
        }
    }
}
```

## No Magic Numbers

Replace hard-coded values with named constants.

```apex
// ❌ Bad — magic numbers
if (opportunity.Amount > 100000) {
    opportunity.Priority__c = 'High';
}
if (retryCount > 3) {
    throw new RetryLimitException('Too many retries');
}

// ✅ Good — named constants
private static final Decimal HIGH_VALUE_THRESHOLD = 100000;
private static final Integer MAX_RETRY_ATTEMPTS = 3;

if (opportunity.Amount > HIGH_VALUE_THRESHOLD) {
    opportunity.Priority__c = 'High';
}
if (retryCount > MAX_RETRY_ATTEMPTS) {
    throw new RetryLimitException('Exceeded ' + MAX_RETRY_ATTEMPTS + ' retries');
}
```

## Miscellaneous Style Rules

- Use `final` for variables that should not be reassigned.
- Prefer `String.isBlank()` over `== null || == ''`.
- Use ternary expressions only for simple assignments; avoid nesting them.
- Avoid deep nesting (3+ levels) — extract methods or use early returns.

```apex
// ❌ Bad — deep nesting
public void process(Account acct) {
    if (acct != null) {
        if (acct.Industry != null) {
            if (acct.Industry == 'Technology') {
                // logic here
            }
        }
    }
}

// ✅ Good — early returns
public void process(Account acct) {
    if (acct == null || String.isBlank(acct.Industry)) {
        return;
    }
    if (acct.Industry == 'Technology') {
        // logic here
    }
}
```
