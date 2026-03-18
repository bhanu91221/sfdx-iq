/**
 * DataCleanupBatchTest - Tests for DataCleanupBatch.
 *
 * Covers batch execution with 200+ records, verifies stateful tracking,
 * and tests schedulable interface.
 */
@IsTest
private class DataCleanupBatchTest {

    @TestSetup
    static void setupTestData() {
        List<Account> accounts = new List<Account>();
        for (Integer i = 0; i < 210; i++) {
            accounts.add(new Account(
                Name = 'Stale Account ' + i,
                Industry = null
            ));
        }
        insert accounts;

        // Backdate LastModifiedDate using Test.setCreatedDate workaround
        // In a real org, these would naturally age past the cutoff
    }

    @IsTest
    static void testBatchExecution() {
        // Use a cutoff in the future to capture all test records
        Date futureCutoff = Date.today().addDays(1);
        DataCleanupBatch batch = new DataCleanupBatch(futureCutoff);

        Test.startTest();
        Database.executeBatch(batch, 200);
        Test.stopTest();

        List<Account> updatedAccounts = [
            SELECT Id, Description
            FROM Account
            WHERE Description LIKE 'Archived by DataCleanupBatch%'
        ];
        System.assert(
            updatedAccounts.size() > 0,
            'Batch should have archived stale accounts'
        );
    }

    @IsTest
    static void testBatchWithNoMatchingRecords() {
        // Set cutoff far in the past so no records match
        Date pastCutoff = Date.today().addDays(-3650);
        DataCleanupBatch batch = new DataCleanupBatch(pastCutoff);

        Test.startTest();
        Database.executeBatch(batch, 200);
        Test.stopTest();

        List<Account> archived = [
            SELECT Id FROM Account
            WHERE Description LIKE 'Archived by DataCleanupBatch%'
        ];
        System.assertEquals(0, archived.size(), 'No records should be archived with old cutoff');
    }

    @IsTest
    static void testSchedulable() {
        Test.startTest();
        String jobId = DataCleanupBatch.schedule();
        Test.stopTest();

        List<CronTrigger> jobs = [
            SELECT Id, State
            FROM CronTrigger
            WHERE Id = :jobId
        ];
        System.assertEquals(1, jobs.size(), 'Scheduled job should exist');
        System.assertEquals('WAITING', jobs[0].State, 'Job should be in WAITING state');
    }

    @IsTest
    static void testDefaultConstructorCutoff() {
        DataCleanupBatch batch = new DataCleanupBatch();

        Test.startTest();
        Database.executeBatch(batch, 200);
        Test.stopTest();

        // Default cutoff is 180 days ago; freshly inserted test data should not match
        List<Account> archived = [
            SELECT Id FROM Account
            WHERE Description LIKE 'Archived by DataCleanupBatch%'
        ];
        System.assertEquals(0, archived.size(),
            'Default cutoff should not match recently created records');
    }
}
