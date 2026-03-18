/**
 * AccountTriggerHandlerTest - Tests for AccountTriggerHandler.
 *
 * Covers: beforeInsert validation, afterUpdate cascading to Contacts,
 * bulk operations (200 records), and delete behavior.
 * Target coverage: 90%+.
 */
@IsTest
private class AccountTriggerHandlerTest {

    @TestSetup
    static void setupTestData() {
        List<Account> accounts = TestDataFactory.createAccounts(200);
        for (Account acc : accounts) {
            acc.Industry = 'Technology';
        }
        insert accounts;

        List<Contact> contacts = new List<Contact>();
        for (Account acc : accounts) {
            contacts.addAll(TestDataFactory.createContacts(2, acc.Id));
        }
        insert contacts;
    }

    @IsTest
    static void testBeforeInsertValidation_MissingIndustry() {
        Account acc = TestDataFactory.createAccount();
        acc.Industry = null;

        Test.startTest();
        Database.SaveResult result = Database.insert(acc, false);
        Test.stopTest();

        System.assert(!result.isSuccess(), 'Insert should fail when Industry is missing');
        System.assert(
            result.getErrors()[0].getMessage().contains('Industry is required'),
            'Error message should mention Industry requirement'
        );
    }

    @IsTest
    static void testBeforeInsertValidation_ValidRecord() {
        Account acc = TestDataFactory.createAccount();
        acc.Industry = 'Finance';

        Test.startTest();
        Database.SaveResult result = Database.insert(acc, false);
        Test.stopTest();

        System.assert(result.isSuccess(), 'Insert should succeed with all required fields');
    }

    @IsTest
    static void testAfterUpdateCascadesToContacts() {
        List<Account> accounts = [SELECT Id, Name FROM Account LIMIT 5];
        for (Account acc : accounts) {
            acc.Name = acc.Name + ' - Updated';
        }

        Test.startTest();
        update accounts;
        Test.stopTest();

        Set<Id> accountIds = new Map<Id, Account>(accounts).keySet();
        List<Contact> updatedContacts = [
            SELECT Id, Description, AccountId
            FROM Contact
            WHERE AccountId IN :accountIds
        ];

        System.assert(!updatedContacts.isEmpty(), 'Should have related contacts');
        for (Contact con : updatedContacts) {
            System.assert(
                con.Description.contains('Parent account renamed to:'),
                'Contact description should reflect account name change'
            );
        }
    }

    @IsTest
    static void testBulkInsert200Accounts() {
        List<Account> accounts = TestDataFactory.createAccounts(200);
        for (Account acc : accounts) {
            acc.Industry = 'Healthcare';
        }

        Test.startTest();
        List<Database.SaveResult> results = Database.insert(accounts, false);
        Test.stopTest();

        Integer successCount = 0;
        for (Database.SaveResult sr : results) {
            if (sr.isSuccess()) {
                successCount++;
            }
        }
        System.assertEquals(200, successCount, 'All 200 accounts should insert successfully');
    }

    @IsTest
    static void testBulkUpdate200Accounts() {
        List<Account> accounts = [SELECT Id, Name FROM Account LIMIT 200];
        for (Account acc : accounts) {
            acc.Name = acc.Name + ' - Bulk Updated';
        }

        Test.startTest();
        update accounts;
        Test.stopTest();

        Set<Id> accountIds = new Map<Id, Account>(accounts).keySet();
        Integer contactCount = [
            SELECT COUNT()
            FROM Contact
            WHERE AccountId IN :accountIds
            AND Description LIKE '%Parent account renamed to:%'
        ];
        System.assert(contactCount > 0, 'Contacts should be updated after bulk account update');
    }

    @IsTest
    static void testDeleteAccounts() {
        List<Account> accounts = [SELECT Id FROM Account LIMIT 5];

        Test.startTest();
        delete accounts;
        Test.stopTest();

        List<Account> remaining = [SELECT Id FROM Account WHERE Id IN :accounts];
        System.assertEquals(0, remaining.size(), 'Deleted accounts should not be queryable');
    }
}
