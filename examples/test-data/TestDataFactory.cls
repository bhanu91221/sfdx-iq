/**
 * TestDataFactory - Centralized test data creation for all test classes.
 *
 * All methods return unsaved records (no DML) so callers can customize
 * fields before inserting. Bulk overloads accept a count parameter.
 * Required field defaults are set to ensure valid records out of the box.
 */
@IsTest
public class TestDataFactory {

    private static Integer uniqueCounter = 0;

    private static String getUniqueName(String prefix) {
        uniqueCounter++;
        return prefix + ' ' + uniqueCounter + '-' + System.currentTimeMillis();
    }

    // ---------- Account ----------

    public static Account createAccount() {
        return new Account(
            Name = getUniqueName('Test Account'),
            Industry = 'Technology',
            BillingStreet = '123 Test Street',
            BillingCity = 'San Francisco',
            BillingState = 'CA',
            BillingPostalCode = '94105',
            BillingCountry = 'US',
            Phone = '555-0100'
        );
    }

    public static List<Account> createAccounts(Integer count) {
        List<Account> accounts = new List<Account>();
        for (Integer i = 0; i < count; i++) {
            accounts.add(createAccount());
        }
        return accounts;
    }

    // ---------- Contact ----------

    public static Contact createContact() {
        return createContact(null);
    }

    public static Contact createContact(Id accountId) {
        return new Contact(
            FirstName = 'Test',
            LastName = getUniqueName('Contact'),
            Email = 'test' + uniqueCounter + '@example.com',
            Phone = '555-0200',
            AccountId = accountId
        );
    }

    public static List<Contact> createContacts(Integer count, Id accountId) {
        List<Contact> contacts = new List<Contact>();
        for (Integer i = 0; i < count; i++) {
            contacts.add(createContact(accountId));
        }
        return contacts;
    }

    // ---------- Opportunity ----------

    public static Opportunity createOpportunity(Id accountId) {
        return new Opportunity(
            Name = getUniqueName('Test Opportunity'),
            AccountId = accountId,
            StageName = 'Prospecting',
            CloseDate = Date.today().addDays(30),
            Amount = 10000.00
        );
    }

    public static List<Opportunity> createOpportunities(Integer count, Id accountId) {
        List<Opportunity> opps = new List<Opportunity>();
        for (Integer i = 0; i < count; i++) {
            opps.add(createOpportunity(accountId));
        }
        return opps;
    }

    // ---------- Case ----------

    public static Case createCase(Id accountId) {
        return new Case(
            Subject = getUniqueName('Test Case'),
            Status = 'New',
            Origin = 'Web',
            Priority = 'Medium',
            AccountId = accountId
        );
    }

    public static List<Case> createCases(Integer count, Id accountId) {
        List<Case> cases = new List<Case>();
        for (Integer i = 0; i < count; i++) {
            cases.add(createCase(accountId));
        }
        return cases;
    }

    // ---------- User ----------

    public static User createStandardUser() {
        Profile stdProfile = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        String uniqueEmail = 'testuser' + uniqueCounter + '@example.com.test';
        return new User(
            FirstName = 'Test',
            LastName = getUniqueName('User'),
            Email = uniqueEmail,
            Username = uniqueEmail,
            Alias = 'tuser' + Math.mod(uniqueCounter, 10000),
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = stdProfile.Id
        );
    }
}
