---
name: tdd-workflow
description: Test-Driven Development workflow for Apex and LWC using Red-Green-Refactor cycle
origin: claude-sfdx-iq
user-invocable: false
tokens: 3049
domain: apex
---

# TDD Workflow

## Overview

Test-Driven Development (TDD) in Salesforce follows the Red-Green-Refactor cycle: write a failing test first, implement the minimum code to pass, then refactor. Coverage is a side effect of good TDD, never the goal.

## The Red-Green-Refactor Cycle

1. **Red** -- Write a test that describes the desired behavior. Run it. It must fail.
2. **Green** -- Write the minimum production code to make the test pass. Nothing more.
3. **Refactor** -- Clean up the production code and the test. Remove duplication, improve naming, extract methods. All tests must stay green.

Repeat for each new behavior or requirement.

## Concrete Example: AccountService.getActiveAccounts()

### Requirement

Build a service method that returns all Accounts with `Status__c = 'Active'`, ordered by Name ascending. The method must enforce CRUD/FLS and handle the case where no active accounts exist.

### Step 1: Red -- Write the Failing Test

```apex
@isTest
private class AccountServiceTest {

    @isTest
    static void getActiveAccounts_WithActiveAccounts_ShouldReturnOnlyActive() {
        // Arrange
        Account active1 = new Account(Name = 'Alpha Corp', Status__c = 'Active');
        Account active2 = new Account(Name = 'Beta Inc', Status__c = 'Active');
        Account inactive = new Account(Name = 'Gamma LLC', Status__c = 'Inactive');
        insert new List<Account>{ active1, active2, inactive };

        // Act
        Test.startTest();
        List<Account> results = AccountService.getActiveAccounts();
        Test.stopTest();

        // Assert
        System.assertEquals(2, results.size(), 'Should return only active accounts');
        System.assertEquals('Alpha Corp', results[0].Name, 'Results should be ordered by Name ASC');
        System.assertEquals('Beta Inc', results[1].Name, 'Second result should be Beta Inc');
    }
}
```

Run the test. It fails because `AccountService` does not exist. This is the **Red** phase.

### Step 2: Green -- Minimum Code to Pass

```apex
public with sharing class AccountService {

    public static List<Account> getActiveAccounts() {
        return [
            SELECT Id, Name, Status__c
            FROM Account
            WHERE Status__c = 'Active'
            WITH SECURITY_ENFORCED
            ORDER BY Name ASC
        ];
    }
}
```

Run the test. It passes. This is the **Green** phase. Do not add any code beyond what the test requires.

### Step 3: Red -- Add the Empty Result Test

```apex
@isTest
static void getActiveAccounts_WithNoActiveAccounts_ShouldReturnEmptyList() {
    // Arrange
    Account inactive = new Account(Name = 'Dormant Corp', Status__c = 'Inactive');
    insert inactive;

    // Act
    Test.startTest();
    List<Account> results = AccountService.getActiveAccounts();
    Test.stopTest();

    // Assert
    System.assertEquals(0, results.size(), 'Should return empty list when no active accounts');
}
```

Run the test. It passes already because SOQL returns an empty list naturally. This validates the behavior is already correct. No code change needed.

### Step 4: Red -- Add the Null-Safe / Bulk Test

```apex
@isTest
static void getActiveAccounts_With200Records_ShouldHandleBulk() {
    // Arrange
    List<Account> accounts = new List<Account>();
    for (Integer i = 0; i < 200; i++) {
        accounts.add(new Account(
            Name = 'Account ' + String.valueOf(i).leftPad(3, '0'),
            Status__c = (Math.mod(i, 2) == 0) ? 'Active' : 'Inactive'
        ));
    }
    insert accounts;

    // Act
    Test.startTest();
    List<Account> results = AccountService.getActiveAccounts();
    Test.stopTest();

    // Assert
    System.assertEquals(100, results.size(), 'Should return 100 active accounts out of 200');
}
```

Run it. It passes. Bulk behavior is verified.

### Step 5: Refactor

Extract test data creation into `@TestSetup` to share across methods.

```apex
@isTest
private class AccountServiceTest {

    @TestSetup
    static void setupData() {
        List<Account> accounts = new List<Account>{
            new Account(Name = 'Alpha Corp', Status__c = 'Active'),
            new Account(Name = 'Beta Inc', Status__c = 'Active'),
            new Account(Name = 'Gamma LLC', Status__c = 'Inactive')
        };
        insert accounts;
    }

    @isTest
    static void getActiveAccounts_WithActiveAccounts_ShouldReturnOnlyActive() {
        Test.startTest();
        List<Account> results = AccountService.getActiveAccounts();
        Test.stopTest();

        System.assertEquals(2, results.size(), 'Should return only active accounts');
        System.assertEquals('Alpha Corp', results[0].Name, 'Results should be ordered by Name ASC');
    }

    @isTest
    static void getActiveAccounts_WithNoActiveAccounts_ShouldReturnEmptyList() {
        delete [SELECT Id FROM Account WHERE Status__c = 'Active'];

        Test.startTest();
        List<Account> results = AccountService.getActiveAccounts();
        Test.stopTest();

        System.assertEquals(0, results.size(), 'Should return empty list when no active accounts');
    }
}
```

All tests still pass. The refactored version is cleaner. This completes one full TDD cycle.

## TDD for Triggers

Write the test first, describing the expected side effect of the trigger.

```apex
@isTest
static void afterInsert_NewOpportunity_ShouldUpdateAccountLastActivity() {
    Account acc = TestDataFactory.createAccounts(1)[0];
    insert acc;

    Test.startTest();
    Opportunity opp = new Opportunity(
        Name = 'TDD Opp', AccountId = acc.Id,
        StageName = 'Prospecting', CloseDate = Date.today().addDays(30)
    );
    insert opp;
    Test.stopTest();

    Account updated = [SELECT Last_Activity_Date__c FROM Account WHERE Id = :acc.Id];
    System.assertEquals(Date.today(), updated.Last_Activity_Date__c,
        'Account Last_Activity_Date__c should be set to today');
}
```

Then implement the trigger and handler:

```apex
trigger OpportunityTrigger on Opportunity (after insert) {
    OpportunityTriggerHandler.handleAfterInsert(Trigger.new);
}
```

```apex
public with sharing class OpportunityTriggerHandler {
    public static void handleAfterInsert(List<Opportunity> newOpps) {
        Set<Id> accountIds = new Set<Id>();
        for (Opportunity opp : newOpps) {
            if (opp.AccountId != null) {
                accountIds.add(opp.AccountId);
            }
        }
        if (accountIds.isEmpty()) return;

        List<Account> toUpdate = new List<Account>();
        for (Id accId : accountIds) {
            toUpdate.add(new Account(Id = accId, Last_Activity_Date__c = Date.today()));
        }
        update toUpdate;
    }
}
```

## TDD for Service Layer

Each public method on a service class gets its own TDD cycle. Start with the simplest behavior, then add edge cases one test at a time.

**Cycle order for a typical service method:**

1. Happy path with valid input
2. Empty collection input (should return early or return empty)
3. Null input (should throw `IllegalArgumentException`)
4. Bulk input (200+ records)
5. Security enforcement (run as restricted user)

```apex
// Cycle 3: Null input
@isTest
static void deactivateAccounts_NullInput_ShouldThrowException() {
    Boolean threw = false;
    try {
        AccountService.deactivateAccounts(null);
    } catch (IllegalArgumentException e) {
        threw = true;
    }
    System.assert(threw, 'Should throw IllegalArgumentException for null input');
}
```

Then add the guard clause to the service:

```apex
public static void deactivateAccounts(Set<Id> accountIds) {
    if (accountIds == null) {
        throw new IllegalArgumentException('accountIds cannot be null');
    }
    if (accountIds.isEmpty()) return;
    // ... existing logic
}
```

## TDD for LWC with Jest

The same Red-Green-Refactor cycle applies to Lightning Web Components using Jest.

### Red -- Write the Failing Jest Test

```javascript
import { createElement } from 'lwc';
import AccountList from 'c/accountList';
import getActiveAccounts from '@salesforce/apex/AccountService.getActiveAccounts';

jest.mock('@salesforce/apex/AccountService.getActiveAccounts',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

describe('c-account-list', () => {
    afterEach(() => { while (document.body.firstChild) { document.body.removeChild(document.body.firstChild); } });

    it('renders account names when data is returned', async () => {
        getActiveAccounts.mockResolvedValue([
            { Id: '001xx000003ABCAAA', Name: 'Alpha Corp' },
            { Id: '001xx000003ABCBBB', Name: 'Beta Inc' }
        ]);

        const element = createElement('c-account-list', { is: AccountList });
        document.body.appendChild(element);

        await Promise.resolve();
        await Promise.resolve();

        const items = element.shadowRoot.querySelectorAll('li');
        expect(items.length).toBe(2);
        expect(items[0].textContent).toBe('Alpha Corp');
    });
});
```

### Green -- Create the Component

```javascript
import { LightningElement, wire } from 'lwc';
import getActiveAccounts from '@salesforce/apex/AccountService.getActiveAccounts';

export default class AccountList extends LightningElement {
    accounts = [];
    error;

    @wire(getActiveAccounts)
    wiredAccounts({ data, error }) {
        if (data) {
            this.accounts = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.accounts = [];
        }
    }
}
```

```html
<template>
    <ul>
        <template for:each={accounts} for:item="acc">
            <li key={acc.Id}>{acc.Name}</li>
        </template>
    </ul>
</template>
```

### Refactor -- Clean Up

Add error state test, empty state test, and loading state test following the same cycle.

## Coverage as a Side Effect

When you practice TDD correctly, coverage follows naturally:

| Approach | Typical Coverage | Test Quality |
|----------|-----------------|--------------|
| TDD (test-first) | 90-100% | High -- every line exists because a test required it |
| Test-after | 75-85% | Medium -- tests written to cover, not to specify |
| Coverage-chasing | 75%+ | Low -- tests cover lines but assert nothing |

**The goal is verified behavior, not a coverage number.** If you write tests first, coverage is a guaranteed byproduct.

## TDD Anti-Patterns

1. **Writing the implementation first, then the test.** This is test-after, not TDD. The test does not drive the design.
2. **Writing multiple tests before any implementation.** Write one test at a time. Red-Green-Refactor for each.
3. **Skipping the Red phase.** If the test passes immediately, it is not testing new behavior. Either the behavior already exists or the test is wrong.
4. **Skipping the Refactor phase.** Technical debt accumulates if you only do Red-Green.
5. **Testing implementation details.** Test observable behavior (method return values, DML side effects, exceptions), not internal state or private methods.
6. **Asserting coverage instead of behavior.** A test with no assertions is not a test.

## TDD Checklist

- [ ] Test written before implementation code
- [ ] Test fails before implementation (Red confirmed)
- [ ] Minimum code written to pass (no speculative code)
- [ ] Test passes after implementation (Green confirmed)
- [ ] Code refactored with all tests still green
- [ ] Each test method tests one behavior
- [ ] Test method name follows `method_scenario_expected` convention
- [ ] Assertions include descriptive messages
- [ ] Bulk behavior tested (200+ records for triggers)
- [ ] Negative cases covered (null, empty, invalid input)
