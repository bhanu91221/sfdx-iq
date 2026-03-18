/**
 * AccountTriggerHandler - Handles all Account trigger events.
 *
 * Follows one-trigger-per-object pattern with handler delegation.
 * Uses recursion prevention to avoid re-entrant execution.
 * All queries and DML are bulkified.
 */
public with sharing class AccountTriggerHandler extends TriggerHandler {

    private static Set<Id> processedIds = new Set<Id>();

    private List<Account> newRecords;
    private List<Account> oldRecords;
    private Map<Id, Account> newMap;
    private Map<Id, Account> oldMap;

    public AccountTriggerHandler() {
        this.newRecords = (List<Account>) Trigger.new;
        this.oldRecords = (List<Account>) Trigger.old;
        this.newMap = (Map<Id, Account>) Trigger.newMap;
        this.oldMap = (Map<Id, Account>) Trigger.oldMap;
    }

    public override void beforeInsert() {
        validateRequiredFields(this.newRecords);
    }

    public override void beforeUpdate() {
        validateRequiredFields(this.newRecords);
    }

    public override void afterInsert() {
        // Reserved for future use (e.g., platform event publishing)
    }

    public override void afterUpdate() {
        List<Account> accountsWithNameChange = new List<Account>();
        for (Account acc : this.newRecords) {
            if (acc.Name != this.oldMap.get(acc.Id).Name
                && !processedIds.contains(acc.Id)) {
                accountsWithNameChange.add(acc);
                processedIds.add(acc.Id);
            }
        }

        if (!accountsWithNameChange.isEmpty()) {
            updateRelatedContacts(accountsWithNameChange);
        }
    }

    public override void afterDelete() {
        // Reserved for future use (e.g., audit logging)
    }

    /**
     * Validates that required fields are populated.
     * Adds field-level errors for any missing values.
     */
    private void validateRequiredFields(List<Account> accounts) {
        for (Account acc : accounts) {
            if (String.isBlank(acc.Name)) {
                acc.Name.addError('Account Name is required.');
            }
            if (acc.Industry == null) {
                acc.Industry.addError('Industry is required for all accounts.');
            }
        }
    }

    /**
     * Updates the MailingStreet on related Contacts when Account Name changes.
     * Bulkified: single SOQL query and single DML statement.
     */
    private void updateRelatedContacts(List<Account> changedAccounts) {
        Set<Id> accountIds = new Set<Id>();
        Map<Id, String> accountNameMap = new Map<Id, String>();
        for (Account acc : changedAccounts) {
            accountIds.add(acc.Id);
            accountNameMap.put(acc.Id, acc.Name);
        }

        List<Contact> contactsToUpdate = [
            SELECT Id, AccountId, Description
            FROM Contact
            WHERE AccountId IN :accountIds
            WITH SECURITY_ENFORCED
        ];

        for (Contact con : contactsToUpdate) {
            con.Description = 'Parent account renamed to: ' + accountNameMap.get(con.AccountId);
        }

        if (!contactsToUpdate.isEmpty()) {
            update contactsToUpdate;
        }
    }
}
