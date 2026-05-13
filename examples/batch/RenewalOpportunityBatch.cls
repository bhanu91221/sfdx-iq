/**
 * RenewalOpportunityBatch
 *
 * Schedulable + Batchable Apex job that creates a Type = 'Renewal' Opportunity
 * (deep clone with line items) for every Closed Won Opportunity whose
 * Type is 'New Business' or 'Upsell' and Contract_End_Date__c = TODAY + 90,
 * provided a renewal does not already exist for that source Opportunity.
 *
 * For every renewal created, a Chatter post is published on the renewal
 * Opportunity feed and all active Sales users are added as followers so the
 * post surfaces in their feed.
 *
 * Custom fields expected on Opportunity:
 *   - Contract_End_Date__c (Date)
 *   - Source_Opportunity__c (Lookup(Opportunity)) — populated on the renewal
 *     to point back at the original Opportunity (used to detect duplicates).
 *
 * Bulk-safe: zero SOQL or DML inside loops; partial-success DML with debug
 * logs emitted for every failed Opportunity, line item, or feed insert.
 */
public with sharing class RenewalOpportunityBatch implements
    Database.Batchable<SObject>, Database.Stateful, Schedulable {

    private static final String CRON_EXPRESSION = '0 0 2 * * ?'; // Daily at 2 AM
    private static final Integer DEFAULT_BATCH_SIZE = 50;
    private static final Integer RENEWAL_LEAD_DAYS = 90;
    private static final Set<String> SOURCE_TYPES =
        new Set<String>{ 'New Business', 'Upsell' };
    private static final String STAGE_CLOSED_WON = 'Closed Won';
    private static final String STAGE_PROSPECTING = 'Prospecting';
    private static final String TYPE_RENEWAL = 'Renewal';

    // Profile name used to identify Sales users for Chatter notifications.
    // @TestVisible so tests can swap in any standard profile available in the org.
    @TestVisible private static String salesProfileName = 'Sales User';

    @TestVisible private Date renewalDate;
    @TestVisible private Integer totalCreated = 0;
    @TestVisible private Integer totalFailed = 0;

    public RenewalOpportunityBatch() {
        this.renewalDate = Date.today().addDays(RENEWAL_LEAD_DAYS);
    }

    @TestVisible
    private RenewalOpportunityBatch(Date renewalDate) {
        this.renewalDate = renewalDate;
    }

    public Database.QueryLocator start(Database.BatchableContext bc) {
        Date target = this.renewalDate;
        Set<String> sourceTypes = SOURCE_TYPES;
        String closedWon = STAGE_CLOSED_WON;
        String renewalType = TYPE_RENEWAL;
        return Database.getQueryLocator([
            SELECT Id, Name, AccountId, Amount, CloseDate, Description,
                   StageName, Type, Contract_End_Date__c, OwnerId, Pricebook2Id
            FROM Opportunity
            WHERE StageName = :closedWon
              AND Type IN :sourceTypes
              AND Contract_End_Date__c = :target
              AND AccountId != null
              AND Id NOT IN (
                  SELECT Source_Opportunity__c
                  FROM Opportunity
                  WHERE Type = :renewalType
                    AND Source_Opportunity__c != null
              )
            WITH SECURITY_ENFORCED
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Opportunity> sourceOpps) {
        if (sourceOpps == null || sourceOpps.isEmpty()) {
            return;
        }

        // One SOQL for all line items belonging to the source Opportunities.
        Map<Id, List<OpportunityLineItem>> linesBySource =
            new Map<Id, List<OpportunityLineItem>>();
        for (OpportunityLineItem oli : [
            SELECT Id, OpportunityId, PricebookEntryId, Product2Id, Quantity,
                   UnitPrice, Discount, ServiceDate, Description
            FROM OpportunityLineItem
            WHERE OpportunityId IN :sourceOpps
            WITH SECURITY_ENFORCED
        ]) {
            List<OpportunityLineItem> bucket = linesBySource.get(oli.OpportunityId);
            if (bucket == null) {
                bucket = new List<OpportunityLineItem>();
                linesBySource.put(oli.OpportunityId, bucket);
            }
            bucket.add(oli);
        }

        // Build deep-cloned renewal Opportunities (no Id, no audit fields).
        List<Opportunity> renewals = new List<Opportunity>();
        Map<Integer, Id> indexToSourceId = new Map<Integer, Id>();
        for (Opportunity src : sourceOpps) {
            Opportunity clone = src.clone(false, true, false, false);
            clone.Name = src.Name + ' - Renewal';
            clone.StageName = STAGE_PROSPECTING;
            clone.Type = TYPE_RENEWAL;
            clone.CloseDate = this.renewalDate;
            clone.Source_Opportunity__c = src.Id;
            clone.Amount = null; // Recomputed from cloned line items after insert.
            indexToSourceId.put(renewals.size(), src.Id);
            renewals.add(clone);
        }

        List<Opportunity> insertedRenewals = new List<Opportunity>();
        Map<Id, Id> renewalToSource = new Map<Id, Id>();
        Database.SaveResult[] oppResults = Database.insert(renewals, false);
        for (Integer i = 0; i < oppResults.size(); i++) {
            Database.SaveResult sr = oppResults[i];
            Id sourceId = indexToSourceId.get(i);
            if (sr.isSuccess()) {
                totalCreated++;
                insertedRenewals.add(renewals[i]);
                renewalToSource.put(sr.getId(), sourceId);
            } else {
                totalFailed++;
                logFailure('Renewal Opportunity insert failed for source ' +
                    sourceId, sr.getErrors());
            }
        }

        if (insertedRenewals.isEmpty()) {
            return;
        }

        List<OpportunityLineItem> newLines = new List<OpportunityLineItem>();
        for (Opportunity renewal : insertedRenewals) {
            Id sourceId = renewalToSource.get(renewal.Id);
            List<OpportunityLineItem> sourceLines = linesBySource.get(sourceId);
            if (sourceLines == null || sourceLines.isEmpty()) {
                continue;
            }
            for (OpportunityLineItem srcLine : sourceLines) {
                OpportunityLineItem cloneLine = srcLine.clone(false, true, false, false);
                cloneLine.OpportunityId = renewal.Id;
                newLines.add(cloneLine);
            }
        }

        if (!newLines.isEmpty()) {
            Database.SaveResult[] lineResults = Database.insert(newLines, false);
            for (Integer i = 0; i < lineResults.size(); i++) {
                if (!lineResults[i].isSuccess()) {
                    totalFailed++;
                    logFailure(
                        'OpportunityLineItem insert failed for renewal ' +
                            newLines[i].OpportunityId,
                        lineResults[i].getErrors()
                    );
                }
            }
        }

        postChatterNotifications(insertedRenewals);
    }

    public void finish(Database.BatchableContext bc) {
        System.debug(LoggingLevel.INFO,
            'RenewalOpportunityBatch finished. Created=' + totalCreated +
            ', Failed=' + totalFailed);
    }

    public void execute(SchedulableContext sc) {
        Database.executeBatch(new RenewalOpportunityBatch(), DEFAULT_BATCH_SIZE);
    }

    public static String schedule() {
        return System.schedule(
            'RenewalOpportunityBatch Daily',
            CRON_EXPRESSION,
            new RenewalOpportunityBatch()
        );
    }

    @TestVisible
    private void postChatterNotifications(List<Opportunity> renewals) {
        // Single SOQL pulls every active Sales user up front.
        List<User> salesUsers = [
            SELECT Id
            FROM User
            WHERE IsActive = true
              AND Profile.Name = :salesProfileName
            WITH SECURITY_ENFORCED
        ];

        List<FeedItem> feedItems = new List<FeedItem>();
        for (Opportunity renewal : renewals) {
            feedItems.add(new FeedItem(
                ParentId = renewal.Id,
                Body = 'A renewal opportunity "' + renewal.Name +
                       '" has been created and is ready for review.',
                Type = 'LinkPost',
                LinkUrl = '/' + renewal.Id,
                Title = 'New Renewal Opportunity'
            ));
        }

        if (!feedItems.isEmpty()) {
            Database.SaveResult[] feedResults = Database.insert(feedItems, false);
            for (Integer i = 0; i < feedResults.size(); i++) {
                if (!feedResults[i].isSuccess()) {
                    logFailure(
                        'Chatter FeedItem insert failed for renewal ' +
                            feedItems[i].ParentId,
                        feedResults[i].getErrors()
                    );
                }
            }
        }

        if (salesUsers.isEmpty()) {
            return;
        }

        // Subscribe every Sales user to every new renewal so the post lands in
        // their feed. Duplicate follow attempts are swallowed via allOrNone=false.
        List<EntitySubscription> follows = new List<EntitySubscription>();
        Id networkId = Network.getNetworkId();
        for (Opportunity renewal : renewals) {
            for (User u : salesUsers) {
                follows.add(new EntitySubscription(
                    ParentId = renewal.Id,
                    SubscriberId = u.Id,
                    NetworkId = networkId
                ));
            }
        }
        Database.insert(follows, false);
    }

    @TestVisible
    private static void logFailure(String context, List<Database.Error> errors) {
        for (Database.Error err : errors) {
            System.debug(LoggingLevel.ERROR,
                context + ' | ' + err.getStatusCode() + ': ' + err.getMessage());
        }
    }
}
