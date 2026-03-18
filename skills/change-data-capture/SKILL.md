---
name: change-data-capture
description: Change Data Capture configuration, ChangeEvent triggers, replay strategies, and subscriber patterns
origin: claude-sfdx-iq
tokens: 2445
domain: integration
---

# Change Data Capture

## Overview

Change Data Capture (CDC) publishes change events for record creates, updates, deletes, and undeletes. Events are published automatically by the platform when records change.

## Enable CDC per Object

### Setup UI

Setup > Integrations > Change Data Capture > Select objects to track.

### Metadata API

```xml
<!-- settings/ChangeDataCapture.settings-meta.xml -->
<ChangeDataCaptureSettings>
    <selectedObjects>
        <name>Account</name>
    </selectedObjects>
    <selectedObjects>
        <name>Contact</name>
    </selectedObjects>
    <selectedObjects>
        <name>MyCustomObject__c</name>
    </selectedObjects>
</ChangeDataCaptureSettings>
```

## ChangeEvent Trigger

### Standard Object

```apex
// triggers/AccountChangeEventTrigger.trigger
trigger AccountChangeEventTrigger on AccountChangeEvent (after insert) {
    for (AccountChangeEvent event : Trigger.New) {
        EventBus.ChangeEventHeader header = event.ChangeEventHeader;

        // Key header fields
        String changeType = header.getChangeType();    // CREATE, UPDATE, DELETE, UNDELETE
        List<String> changedFields = header.getChangedFields();
        List<String> recordIds = header.getRecordIds();
        String commitUser = header.getCommitUser();
        Long commitNumber = header.getCommitNumber();
        String transactionKey = header.getTransactionKey();
        Integer sequenceNumber = header.getSequenceNumber();

        if (changeType == 'UPDATE') {
            handleUpdate(event, changedFields, recordIds);
        } else if (changeType == 'CREATE') {
            handleCreate(event, recordIds);
        } else if (changeType == 'DELETE') {
            handleDelete(recordIds);
        } else if (changeType == 'UNDELETE') {
            handleUndelete(recordIds);
        }
    }
}
```

### Custom Object

```apex
// For custom objects, the event name is ObjectName__ChangeEvent
trigger MyObjectChangeEventTrigger on MyCustomObject__ChangeEvent (after insert) {
    for (MyCustomObject__ChangeEvent event : Trigger.New) {
        EventBus.ChangeEventHeader header = event.ChangeEventHeader;
        // Process change event
    }
}
```

## Change Event Header Fields

| Field | Type | Description |
|-------|------|-------------|
| `changeType` | String | CREATE, UPDATE, DELETE, UNDELETE |
| `changedFields` | List<String> | Fields modified (UPDATE only) |
| `recordIds` | List<String> | Affected record IDs (up to 10 per event) |
| `commitUser` | String | User ID who made the change |
| `commitNumber` | Long | Monotonically increasing commit sequence |
| `commitTimestamp` | Long | Epoch time of the commit |
| `transactionKey` | String | Groups events from same transaction |
| `sequenceNumber` | Integer | Order within a transaction |
| `entityName` | String | Object API name |
| `changeOrigin` | String | Source of change (e.g., API name) |

## Entity vs Field-Level Changes

### Detecting Specific Field Changes

```apex
trigger AccountChangeEventTrigger on AccountChangeEvent (after insert) {
    for (AccountChangeEvent event : Trigger.New) {
        EventBus.ChangeEventHeader header = event.ChangeEventHeader;

        if (header.getChangeType() == 'UPDATE') {
            List<String> changedFields = header.getChangedFields();

            // Check for specific field changes
            if (changedFields.contains('BillingCity') || changedFields.contains('BillingState')) {
                syncAddressToExternal(header.getRecordIds());
            }

            if (changedFields.contains('OwnerId')) {
                notifyOwnerChange(header.getRecordIds(), event.OwnerId);
            }

            if (changedFields.contains('Rating')) {
                // Access the new value directly from the event
                String newRating = event.Rating;
                processRatingChange(header.getRecordIds(), newRating);
            }
        }
    }
}
```

### Accessing Field Values

```apex
// For UPDATE events:
// - Changed fields contain the NEW value
// - Unchanged fields are NULL (not the old value)
// - You cannot get the old value from CDC events

// For CREATE events:
// - All populated fields contain the value
// - changedFields is empty

// For DELETE events:
// - Only header fields are available
// - No field data in the event body
```

## Gap Detection

### Monitoring for Gaps

```apex
public class CdcGapDetector {
    // Store the last processed replay ID in a custom setting or custom metadata
    private static String LAST_REPLAY_KEY = 'CDC_Account_LastReplay';

    public static void checkForGaps(List<AccountChangeEvent> events) {
        Long lastCommitNumber = getLastCommitNumber();

        for (AccountChangeEvent event : events) {
            EventBus.ChangeEventHeader header = event.ChangeEventHeader;
            Long currentCommit = header.getCommitNumber();

            if (lastCommitNumber != null && currentCommit > lastCommitNumber + 1) {
                Logger.warn('CDC gap detected. Last: ' + lastCommitNumber +
                           ', Current: ' + currentCommit);
                // Trigger reconciliation
                reconcileGap(lastCommitNumber, currentCommit);
            }

            lastCommitNumber = currentCommit;
        }

        saveLastCommitNumber(lastCommitNumber);
    }

    private static void reconcileGap(Long fromCommit, Long toCommit) {
        // Query the actual records to reconcile missed changes
        // This is a best-effort recovery
    }

    private static Long getLastCommitNumber() {
        // Retrieve from Custom Setting or Platform Cache
        return null;
    }

    private static void saveLastCommitNumber(Long commitNumber) {
        // Store in Custom Setting or Platform Cache
    }
}
```

## Replay Strategy

### CometD Replay (External Subscriber)

```javascript
// Subscribe to CDC channel with replay
const channel = '/data/AccountChangeEvent';

cometd.subscribe(channel, (message) => {
    const header = message.data.payload.ChangeEventHeader;
    const replayId = message.data.event.replayId;

    // Process the change event
    processChange(header, message.data.payload);

    // Store replayId for resume capability
    saveReplayId(channel, replayId);
});

// On reconnect, use stored replayId
replayExtension.setChannel(channel);
replayExtension.setReplay(storedReplayId);
```

### Pub/Sub API Replay

```
// gRPC subscription with replay
Subscribe {
    topic_name: "/data/AccountChangeEvent"
    replay_preset: CUSTOM   // LATEST, EARLIEST, or CUSTOM
    replay_id: <stored_replay_id>
    num_requested: 100
}
```

## CDC vs Platform Events Decision

| Criteria | Change Data Capture | Platform Events |
|----------|-------------------|-----------------|
| Trigger | Automatic on record change | Manual publish from code |
| Configuration | Point-and-click (Setup) | Define custom event object |
| Data included | Changed field values + header | Custom fields you define |
| Object support | Standard + Custom objects | Custom event objects |
| Change types | CREATE, UPDATE, DELETE, UNDELETE | N/A (your business events) |
| Old values available | No | You can include them |
| Custom business events | No | Yes |
| Enrichment | Not possible (automatic) | Full control of payload |
| Overhead | Low (automatic) | Higher (code required) |

### When to Use CDC

- Sync record changes to external systems
- Build audit trails without triggers
- Near-real-time data replication
- React to changes without writing trigger logic
- External system integration via Pub/Sub API

### When to Use Platform Events

- Custom business events (Order Placed, Payment Received)
- Events not tied to a specific record change
- Enriched payloads with computed data
- Events from external systems into Salesforce
- Complex workflow orchestration

## Subscriber Patterns

### Selective Processing

```apex
trigger AccountChangeEventTrigger on AccountChangeEvent (after insert) {
    List<Id> idsToSync = new List<Id>();

    for (AccountChangeEvent event : Trigger.New) {
        EventBus.ChangeEventHeader header = event.ChangeEventHeader;

        // Only process changes from specific sources
        if (header.getChangeOrigin() == '/services/data/v59.0') {
            continue; // Skip API-originated changes to avoid loops
        }

        // Only process specific change types
        if (header.getChangeType() == 'CREATE' || header.getChangeType() == 'UPDATE') {
            idsToSync.addAll(header.getRecordIds());
        }
    }

    if (!idsToSync.isEmpty()) {
        System.enqueueJob(new AccountSyncQueueable(idsToSync));
    }
}
```

## Undelete Handling

```apex
trigger AccountChangeEventTrigger on AccountChangeEvent (after insert) {
    for (AccountChangeEvent event : Trigger.New) {
        EventBus.ChangeEventHeader header = event.ChangeEventHeader;

        if (header.getChangeType() == 'UNDELETE') {
            List<String> recordIds = header.getRecordIds();
            // Re-sync undeleted records to external system
            // The event body contains all field values (like CREATE)
            System.enqueueJob(new ExternalResyncQueueable(recordIds));
        }
    }
}
```

## Limits and Considerations

| Limit | Value |
|-------|-------|
| Event retention | 72 hours |
| Max events per hour | Org-wide event allocation |
| Max records per event | Up to 10 record IDs batched |
| Enriched fields | Only changed fields on UPDATE |
| Compound fields | Each component delivered individually |
| Formula fields | Not included in CDC events |
| Custom metadata/settings | Not supported for CDC |
