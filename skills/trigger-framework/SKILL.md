---
name: trigger-framework
description: TriggerHandler base class, one-trigger-per-object pattern, recursion prevention, and execution order
origin: claude-sfdx-iq
user-invocable: false
tokens: 3150
domain: apex
---

# Trigger Framework

## Core Principle

Every Salesforce org must follow the **one trigger per object** rule. The trigger itself contains zero logic; it delegates to a handler class that extends a base `TriggerHandler`.

## TriggerHandler Base Class

```apex
public virtual class TriggerHandler {

    // Recursion prevention
    private static Set<Id> processedIds = new Set<Id>();
    private static Map<String, Boolean> bypassedHandlers = new Map<String, Boolean>();

    // Context routing
    public void run() {
        if (isBypassed()) {
            return;
        }

        switch on Trigger.operationType {
            when BEFORE_INSERT  { beforeInsert(Trigger.new); }
            when BEFORE_UPDATE  { beforeUpdate(Trigger.new, Trigger.oldMap); }
            when BEFORE_DELETE  { beforeDelete(Trigger.old, Trigger.oldMap); }
            when AFTER_INSERT   { afterInsert(Trigger.new, Trigger.newMap); }
            when AFTER_UPDATE   { afterUpdate(Trigger.new, Trigger.oldMap); }
            when AFTER_DELETE   { afterDelete(Trigger.old, Trigger.oldMap); }
            when AFTER_UNDELETE { afterUndelete(Trigger.new, Trigger.newMap); }
        }
    }

    // Override these in subclasses
    protected virtual void beforeInsert(List<SObject> newRecords) { }
    protected virtual void beforeUpdate(List<SObject> newRecords, Map<Id, SObject> oldMap) { }
    protected virtual void beforeDelete(List<SObject> oldRecords, Map<Id, SObject> oldMap) { }
    protected virtual void afterInsert(List<SObject> newRecords, Map<Id, SObject> newMap) { }
    protected virtual void afterUpdate(List<SObject> newRecords, Map<Id, SObject> oldMap) { }
    protected virtual void afterDelete(List<SObject> oldRecords, Map<Id, SObject> oldMap) { }
    protected virtual void afterUndelete(List<SObject> newRecords, Map<Id, SObject> newMap) { }

    // Recursion prevention
    protected Boolean isAlreadyProcessed(Id recordId) {
        return processedIds.contains(recordId);
    }

    protected void markProcessed(Id recordId) {
        processedIds.add(recordId);
    }

    protected void markProcessed(Set<Id> recordIds) {
        processedIds.addAll(recordIds);
    }

    // Bypass mechanism
    public static void bypass(String handlerName) {
        bypassedHandlers.put(handlerName, true);
    }

    public static void clearBypass(String handlerName) {
        bypassedHandlers.remove(handlerName);
    }

    public static void clearAllBypasses() {
        bypassedHandlers.clear();
    }

    private Boolean isBypassed() {
        return bypassedHandlers.get(getHandlerName()) == true;
    }

    private String getHandlerName() {
        return String.valueOf(this).split(':')[0];
    }
}
```

## Trigger File

The trigger itself is a one-liner that delegates to the handler.

```apex
trigger AccountTrigger on Account (
    before insert, before update, before delete,
    after insert, after update, after delete, after undelete
) {
    new AccountTriggerHandler().run();
}
```

**Rules:**
- Zero logic in the trigger file
- Register all events even if not all are used yet (future-proofing)
- One trigger file per SObject, period

## Handler Implementation

```apex
public class AccountTriggerHandler extends TriggerHandler {

    protected override void beforeInsert(List<SObject> newRecords) {
        List<Account> accounts = (List<Account>) newRecords;
        setDefaultValues(accounts);
        validateRequiredFields(accounts);
    }

    protected override void beforeUpdate(List<SObject> newRecords, Map<Id, SObject> oldMap) {
        List<Account> accounts = (List<Account>) newRecords;
        Map<Id, Account> oldAccounts = (Map<Id, Account>) oldMap;
        validateStatusTransitions(accounts, oldAccounts);
    }

    protected override void afterInsert(List<SObject> newRecords, Map<Id, SObject> newMap) {
        List<Account> accounts = (List<Account>) newRecords;
        createDefaultContacts(accounts);
        notifyOwners(accounts);
    }

    protected override void afterUpdate(List<SObject> newRecords, Map<Id, SObject> oldMap) {
        List<Account> accounts = (List<Account>) newRecords;
        Map<Id, Account> oldAccounts = (Map<Id, Account>) oldMap;

        List<Account> statusChanged = filterStatusChanged(accounts, oldAccounts);
        if (!statusChanged.isEmpty()) {
            processStatusChange(statusChanged, oldAccounts);
        }
    }

    // Private helper methods

    private void setDefaultValues(List<Account> accounts) {
        for (Account acc : accounts) {
            if (String.isBlank(acc.BillingCountry)) {
                acc.BillingCountry = 'US';
            }
            if (acc.Status__c == null) {
                acc.Status__c = 'New';
            }
        }
    }

    private void validateRequiredFields(List<Account> accounts) {
        for (Account acc : accounts) {
            if (String.isBlank(acc.Name)) {
                acc.Name.addError('Account Name is required.');
            }
        }
    }

    private void validateStatusTransitions(
        List<Account> accounts, Map<Id, Account> oldMap
    ) {
        for (Account acc : accounts) {
            Account oldAcc = oldMap.get(acc.Id);
            if (oldAcc.Status__c == 'Closed' && acc.Status__c != 'Closed') {
                acc.addError('Cannot reopen a closed account.');
            }
        }
    }

    private List<Account> filterStatusChanged(
        List<Account> accounts, Map<Id, Account> oldMap
    ) {
        List<Account> changed = new List<Account>();
        for (Account acc : accounts) {
            if (acc.Status__c != oldMap.get(acc.Id).Status__c) {
                changed.add(acc);
            }
        }
        return changed;
    }

    private void createDefaultContacts(List<Account> accounts) {
        List<Contact> contacts = new List<Contact>();
        for (Account acc : accounts) {
            contacts.add(new Contact(
                FirstName = 'Primary',
                LastName = 'Contact',
                AccountId = acc.Id
            ));
        }
        insert contacts;
    }

    private void notifyOwners(List<Account> accounts) {
        // Send notifications asynchronously
        Set<Id> ownerIds = new Set<Id>();
        for (Account acc : accounts) {
            ownerIds.add(acc.OwnerId);
        }
        AccountNotificationService.notifyAsync(ownerIds);
    }

    private void processStatusChange(
        List<Account> accounts, Map<Id, Account> oldMap
    ) {
        // Business logic for status changes
    }
}
```

## Recursion Prevention

Triggers can fire recursively when after-trigger DML causes the same trigger to re-fire. Use the `processedIds` set to prevent infinite loops.

```apex
protected override void afterUpdate(List<SObject> newRecords, Map<Id, SObject> oldMap) {
    List<Account> toProcess = new List<Account>();

    for (Account acc : (List<Account>) newRecords) {
        if (!isAlreadyProcessed(acc.Id)) {
            toProcess.add(acc);
            markProcessed(acc.Id);
        }
    }

    if (!toProcess.isEmpty()) {
        // This DML may re-fire the trigger, but processed IDs will be skipped
        updateRelatedRecords(toProcess);
    }
}
```

**Important:** The `static Set<Id>` persists for the entire transaction. If a record legitimately needs to be processed twice (e.g., workflow field update causes re-entry), use a more granular approach:

```apex
private static Map<Id, Integer> executionCount = new Map<Id, Integer>();
private static final Integer MAX_EXECUTIONS = 2;

protected Boolean shouldProcess(Id recordId) {
    Integer count = executionCount.get(recordId);
    if (count == null) {
        count = 0;
    }
    if (count >= MAX_EXECUTIONS) {
        return false;
    }
    executionCount.put(recordId, count + 1);
    return true;
}
```

## Bypass Mechanism

Allow code to temporarily skip trigger logic. Useful in data migrations, batch operations, or when one handler calls another.

```apex
// In a data migration batch
public void execute(Database.BatchableContext bc, List<Account> scope) {
    TriggerHandler.bypass('AccountTriggerHandler');

    // DML here will not fire Account trigger logic
    update scope;

    TriggerHandler.clearBypass('AccountTriggerHandler');
}
```

**Custom Setting approach** for admin-controlled bypasses:

```apex
private Boolean isBypassed() {
    // Check static bypass
    if (bypassedHandlers.get(getHandlerName()) == true) {
        return true;
    }
    // Check custom setting for current user
    Trigger_Bypass__c setting = Trigger_Bypass__c.getInstance();
    return setting != null && setting.Bypass_All__c;
}
```

## Trigger Order of Execution

Understanding the Salesforce order of execution is essential for debugging.

1. Load original record from database (or initialize for insert)
2. Overwrite field values from the request
3. **Before triggers** fire
4. System validation rules run
5. Custom validation rules run
6. Duplicate rules run
7. Record saved to database (not committed)
8. **After triggers** fire
9. Assignment rules execute
10. Auto-response rules execute
11. Workflow rules execute
12. If workflow updates fields, **before and after triggers fire again**
13. Processes and flows execute
14. Escalation rules execute
15. Entitlement rules execute
16. Roll-up summary fields calculated
17. Cross-object workflow rules execute
18. **DML committed** to database
19. Post-commit logic (sending emails, enqueuing async)

**Key implications:**
- Before triggers can modify field values on `Trigger.new` directly
- After triggers must use DML to modify records (causes re-entry risk)
- Workflow field updates cause triggers to fire a second time
- Roll-up summaries on parent can fire the parent's triggers

## Testing Triggers

```apex
@isTest
private class AccountTriggerHandlerTest {

    @TestSetup
    static void setupData() {
        // Create test data without triggering handler logic
        // (or let the trigger fire and verify setup state)
    }

    @isTest
    static void beforeInsert_MissingCountry_ShouldDefaultToUS() {
        Account acc = new Account(Name = 'Test Account');

        Test.startTest();
        insert acc;
        Test.stopTest();

        Account result = [SELECT BillingCountry FROM Account WHERE Id = :acc.Id];
        System.assertEquals('US', result.BillingCountry,
            'BillingCountry should default to US');
    }

    @isTest
    static void afterInsert_NewAccount_ShouldCreateDefaultContact() {
        Account acc = new Account(Name = 'Test Account');

        Test.startTest();
        insert acc;
        Test.stopTest();

        List<Contact> contacts = [
            SELECT FirstName, LastName
            FROM Contact
            WHERE AccountId = :acc.Id
        ];
        System.assertEquals(1, contacts.size(), 'Should create one default contact');
    }

    @isTest
    static void bulkInsert_200Records_ShouldNotExceedLimits() {
        List<Account> accounts = TestDataFactory.createAccounts(200);

        Test.startTest();
        insert accounts;
        Test.stopTest();

        System.assertEquals(200, [SELECT COUNT() FROM Account],
            'All 200 accounts should be inserted');
        System.assertEquals(200, [SELECT COUNT() FROM Contact],
            'Should create 200 default contacts');
    }

    @isTest
    static void bypass_ShouldSkipHandlerLogic() {
        TriggerHandler.bypass('AccountTriggerHandler');

        Account acc = new Account(Name = 'Test Account');
        insert acc;

        TriggerHandler.clearBypass('AccountTriggerHandler');

        List<Contact> contacts = [SELECT Id FROM Contact WHERE AccountId = :acc.Id];
        System.assertEquals(0, contacts.size(),
            'Bypassed handler should not create default contact');
    }
}
```

## Anti-Patterns

1. **Logic in the trigger file** -- All logic belongs in the handler class.
2. **Multiple triggers per object** -- Creates unpredictable execution order.
3. **No recursion guard** -- Leads to infinite loops and governor limit failures.
4. **Querying in before triggers** -- Minimize SOQL in before triggers; use after triggers for related queries.
5. **Non-bulkified handler methods** -- Every method must handle `List<SObject>`, never single records.
6. **Hardcoded bypass** -- Use a Custom Setting or Custom Metadata for bypass control, not code changes.
