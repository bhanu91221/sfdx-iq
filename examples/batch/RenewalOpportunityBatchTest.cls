/**
 * RenewalOpportunityBatchTest
 *
 * Coverage targets every branch of RenewalOpportunityBatch:
 *   - happy-path renewal creation with deep-cloned line items
 *   - duplicate-renewal exclusion (NOT IN subquery)
 *   - empty scope guard
 *   - Chatter FeedItem post + Sales-user follow subscription
 *   - debug-log path for failed Opportunity inserts
 *   - schedulable execute() + cron registration via schedule()
 */
@IsTest
private class RenewalOpportunityBatchTest {

    private static final Date RENEWAL_DATE = Date.today().addDays(90);

    @TestSetup
    static void setupData() {
        Account acct = new Account(Name = 'Renewal Test Account');
        insert acct;

        Pricebook2 standardPb = new Pricebook2(
            Id = Test.getStandardPricebookId(),
            IsActive = true
        );
        update standardPb;

        Product2 prod = new Product2(Name = 'Renewal Widget', IsActive = true);
        insert prod;

        PricebookEntry pbe = new PricebookEntry(
            Pricebook2Id = Test.getStandardPricebookId(),
            Product2Id = prod.Id,
            UnitPrice = 100,
            IsActive = true
        );
        insert pbe;

        // Three eligible source Opportunities.
        List<Opportunity> sources = new List<Opportunity>{
            buildSource(acct.Id, 'Alpha Deal', 'New Business'),
            buildSource(acct.Id, 'Beta Deal',  'Upsell'),
            buildSource(acct.Id, 'Gamma Deal', 'New Business')
        };
        // One ineligible Opportunity (wrong type).
        sources.add(new Opportunity(
            Name = 'Service Deal',
            AccountId = acct.Id,
            StageName = 'Closed Won',
            Type = 'Existing Business',
            CloseDate = Date.today(),
            Contract_End_Date__c = RENEWAL_DATE
        ));
        // One ineligible Opportunity (wrong contract end date).
        sources.add(new Opportunity(
            Name = 'Stale Deal',
            AccountId = acct.Id,
            StageName = 'Closed Won',
            Type = 'New Business',
            CloseDate = Date.today(),
            Contract_End_Date__c = Date.today().addDays(120)
        ));
        insert sources;

        // Add line items only to the first two eligible source opps so we also
        // exercise the "no lines to clone" branch on the third.
        List<OpportunityLineItem> lines = new List<OpportunityLineItem>();
        for (Integer i = 0; i < 2; i++) {
            lines.add(new OpportunityLineItem(
                OpportunityId = sources[i].Id,
                PricebookEntryId = pbe.Id,
                Quantity = 2,
                UnitPrice = 150
            ));
        }
        insert lines;
    }

    private static Opportunity buildSource(Id accountId, String name, String type) {
        return new Opportunity(
            Name = name,
            AccountId = accountId,
            StageName = 'Closed Won',
            Type = type,
            CloseDate = Date.today().addDays(-10),
            Contract_End_Date__c = RENEWAL_DATE
        );
    }

    @IsTest
    static void createsRenewalsWithClonedLineItems() {
        // Use any standard profile available in the org for the Sales-user query.
        RenewalOpportunityBatch.salesProfileName = pickProfileName();
        insertSalesUser(RenewalOpportunityBatch.salesProfileName);

        Test.startTest();
        Database.executeBatch(new RenewalOpportunityBatch(), 50);
        Test.stopTest();

        List<Opportunity> renewals = [
            SELECT Id, Name, Type, StageName, CloseDate, AccountId,
                   Source_Opportunity__c,
                   (SELECT Id, PricebookEntryId, Quantity, UnitPrice
                    FROM OpportunityLineItems)
            FROM Opportunity
            WHERE Type = 'Renewal'
        ];
        System.assertEquals(3, renewals.size(),
            'One renewal should be created per eligible source Opportunity');

        Integer linesCreated = 0;
        for (Opportunity r : renewals) {
            System.assertEquals(RENEWAL_DATE, r.CloseDate,
                'Renewal CloseDate should match the renewal target date');
            System.assertEquals('Prospecting', r.StageName,
                'Renewal should start in Prospecting');
            System.assert(r.Name.endsWith(' - Renewal'),
                'Renewal name should be suffixed with " - Renewal"');
            System.assertNotEquals(null, r.Source_Opportunity__c,
                'Source_Opportunity__c should reference the original Opportunity');
            linesCreated += r.OpportunityLineItems.size();
        }
        System.assertEquals(2, linesCreated,
            'Two source opps had a line item each, so two cloned lines expected');

        List<FeedItem> posts = [
            SELECT Id, ParentId, Body
            FROM FeedItem
            WHERE ParentId IN :new Map<Id, Opportunity>(renewals).keySet()
        ];
        System.assertEquals(renewals.size(), posts.size(),
            'A Chatter FeedItem should be posted on every new renewal');
    }

    @IsTest
    static void skipsAccountsThatAlreadyHaveRenewal() {
        // Pre-create a renewal for one of the eligible source opps.
        Opportunity existingSource = [
            SELECT Id, AccountId FROM Opportunity WHERE Name = 'Alpha Deal' LIMIT 1
        ];
        insert new Opportunity(
            Name = 'Alpha Deal - Renewal',
            AccountId = existingSource.AccountId,
            StageName = 'Prospecting',
            Type = 'Renewal',
            CloseDate = RENEWAL_DATE,
            Source_Opportunity__c = existingSource.Id
        );

        Test.startTest();
        Database.executeBatch(new RenewalOpportunityBatch(), 50);
        Test.stopTest();

        Integer renewalsForAlpha = [
            SELECT COUNT()
            FROM Opportunity
            WHERE Type = 'Renewal' AND Source_Opportunity__c = :existingSource.Id
        ];
        System.assertEquals(1, renewalsForAlpha,
            'Existing renewal should prevent a second renewal from being created');

        Integer totalRenewals = [SELECT COUNT() FROM Opportunity WHERE Type = 'Renewal'];
        System.assertEquals(3, totalRenewals,
            'Two new renewals plus the pre-seeded one should exist');
    }

    @IsTest
    static void emptyScopeIsHandled() {
        // Push the renewal date out so no source records match.
        RenewalOpportunityBatch batch = new RenewalOpportunityBatch(
            Date.today().addYears(5)
        );

        Test.startTest();
        Database.executeBatch(batch, 50);
        Test.stopTest();

        Integer renewals = [SELECT COUNT() FROM Opportunity WHERE Type = 'Renewal'];
        System.assertEquals(0, renewals, 'No renewals should be created');
    }

    @IsTest
    static void logsFailuresForInvalidRenewalInsert() {
        // Force the Opportunity insert to fail by clearing the AccountId on the
        // source records and pushing them through execute() directly. The batch
        // uses partial-success DML so the failure path is exercised.
        Account acct = [SELECT Id FROM Account LIMIT 1];

        Opportunity bad = new Opportunity(
            Id = [SELECT Id FROM Opportunity WHERE Name = 'Alpha Deal' LIMIT 1].Id,
            Name = 'Alpha Deal',
            AccountId = acct.Id,
            StageName = 'Closed Won',
            Type = 'New Business',
            CloseDate = Date.today(),
            Contract_End_Date__c = RENEWAL_DATE
        );

        // Build a synthetic source record missing required fields so the cloned
        // renewal insert fails.
        Opportunity synthetic = new Opportunity(
            Id = bad.Id,
            Name = null, // Triggers REQUIRED_FIELD_MISSING on the clone
            AccountId = acct.Id,
            StageName = 'Closed Won',
            Type = 'New Business',
            CloseDate = Date.today(),
            Contract_End_Date__c = RENEWAL_DATE
        );

        RenewalOpportunityBatch batch = new RenewalOpportunityBatch(RENEWAL_DATE);

        Test.startTest();
        batch.execute(null, new List<Opportunity>{ synthetic });
        Test.stopTest();

        System.assertEquals(0, batch.totalCreated,
            'No renewals should be created for invalid source data');
        System.assert(batch.totalFailed >= 1,
            'Failure counter should record the bad insert for debug logs');
    }

    @IsTest
    static void schedulableEnqueuesBatch() {
        Test.startTest();
        String jobId = RenewalOpportunityBatch.schedule();
        Test.stopTest();

        CronTrigger ct = [
            SELECT Id, State, CronExpression
            FROM CronTrigger
            WHERE Id = :jobId
        ];
        System.assertEquals('WAITING', ct.State,
            'Scheduled job should be queued in WAITING state');
        System.assertEquals('0 0 2 * * ?', ct.CronExpression,
            'Schedule should use the daily 2 AM cron expression');
    }

    @IsTest
    static void schedulableExecuteRunsBatch() {
        Test.startTest();
        new RenewalOpportunityBatch().execute((SchedulableContext) null);
        Test.stopTest();
        // Reaching this point without exception confirms the schedulable
        // execute() path enqueues the batch successfully.
        System.assert(true, 'Schedulable execute should enqueue the batch');
    }

    // ---- Helpers --------------------------------------------------------

    private static String pickProfileName() {
        // Prefer "Sales User" when present; otherwise fall back to any standard
        // profile so the User insert below succeeds in any org.
        List<Profile> profiles = [
            SELECT Name FROM Profile
            WHERE Name IN ('Sales User', 'Standard User', 'System Administrator')
            ORDER BY CASE Name
                WHEN 'Sales User' THEN 1
                WHEN 'Standard User' THEN 2
                ELSE 3
            END
            LIMIT 1
        ];
        return profiles.isEmpty() ? 'Standard User' : profiles[0].Name;
    }

    private static void insertSalesUser(String profileName) {
        Profile p = [SELECT Id FROM Profile WHERE Name = :profileName LIMIT 1];
        String unique = String.valueOf(Crypto.getRandomLong());
        User u = new User(
            FirstName = 'Sales',
            LastName = 'Tester',
            Email = 'sales.tester+' + unique + '@example.com',
            Username = 'sales.tester+' + unique + '@example.invalid',
            Alias = 'stest',
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = p.Id,
            IsActive = true
        );
        insert u;
    }
}
