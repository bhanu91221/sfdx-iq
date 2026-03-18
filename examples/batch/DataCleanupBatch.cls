/**
 * DataCleanupBatch - Batch job to archive or delete stale records.
 *
 * Implements Database.Batchable for processing, Database.Stateful
 * for tracking counts across batches, and Schedulable for cron scheduling.
 */
public with sharing class DataCleanupBatch implements
    Database.Batchable<SObject>, Database.Stateful, Schedulable {

    private static final String CRON_EXPRESSION = '0 0 2 * * ?'; // Daily at 2 AM
    private static final Integer DEFAULT_BATCH_SIZE = 200;

    private Integer totalProcessed = 0;
    private Integer totalErrors = 0;
    private Date cutoffDate;

    public DataCleanupBatch() {
        this.cutoffDate = Date.today().addDays(-180);
    }

    public DataCleanupBatch(Date cutoffDate) {
        this.cutoffDate = cutoffDate;
    }

    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([
            SELECT Id, Name, LastModifiedDate
            FROM Account
            WHERE LastModifiedDate < :this.cutoffDate
            AND IsDeleted = false
            AND Industry = null
            WITH SECURITY_ENFORCED
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Account> scope) {
        List<Account> toUpdate = new List<Account>();
        for (Account acc : scope) {
            acc.Description = 'Archived by DataCleanupBatch on ' + Date.today().format();
            toUpdate.add(acc);
        }

        List<Database.SaveResult> results = Database.update(toUpdate, false);
        for (Database.SaveResult sr : results) {
            if (sr.isSuccess()) {
                totalProcessed++;
            } else {
                totalErrors++;
            }
        }
    }

    public void finish(Database.BatchableContext bc) {
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setToAddresses(new List<String>{ UserInfo.getUserEmail() });
        email.setSubject('DataCleanupBatch Complete');
        email.setPlainTextBody(
            'Batch job finished.\n' +
            'Records processed: ' + totalProcessed + '\n' +
            'Errors: ' + totalErrors
        );
        Messaging.sendEmail(new List<Messaging.SingleEmailMessage>{ email });
    }

    public void execute(SchedulableContext sc) {
        Database.executeBatch(new DataCleanupBatch(), DEFAULT_BATCH_SIZE);
    }

    public static String schedule() {
        return System.schedule('DataCleanupBatch Daily', CRON_EXPRESSION, new DataCleanupBatch());
    }
}
