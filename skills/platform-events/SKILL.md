---
name: platform-events
description: Platform Event definition, publishing, subscribing, replay, and event-driven architecture patterns
origin: claude-sfdx-iq
user-invocable: false
tokens: 2422
domain: integration
---

# Platform Events

## Defining Platform Events

Platform Events are custom Salesforce objects with the `__e` suffix used for event-driven communication.

### Event Definition (Metadata)

```xml
<!-- objects/Order_Placed__e.object-meta.xml -->
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Order Placed</label>
    <pluralLabel>Orders Placed</pluralLabel>
    <publishBehavior>PublishAfterCommit</publishBehavior>
    <fields>
        <fullName>Order_Id__c</fullName>
        <type>Text</type>
        <length>18</length>
    </fields>
    <fields>
        <fullName>Amount__c</fullName>
        <type>Number</type>
        <precision>16</precision>
        <scale>2</scale>
    </fields>
    <fields>
        <fullName>Payload__c</fullName>
        <type>LongTextArea</type>
        <length>131072</length>
        <visibleLines>5</visibleLines>
    </fields>
</CustomObject>
```

### Publish Behavior

| Behavior | When Published | Use Case |
|----------|---------------|----------|
| `PublishAfterCommit` | After transaction commits | Most cases - ensures data consistency |
| `PublishImmediately` | Immediately, even if transaction rolls back | Logging, auditing where delivery matters more |

## Publishing Platform Events

### Publish from Apex

```apex
public class OrderEventPublisher {

    public static Database.SaveResult publishOrderPlaced(Id orderId, Decimal amount) {
        Order_Placed__e event = new Order_Placed__e(
            Order_Id__c = orderId,
            Amount__c = amount,
            Payload__c = JSON.serialize(buildPayload(orderId))
        );

        Database.SaveResult sr = EventBus.publish(event);

        if (!sr.isSuccess()) {
            for (Database.Error err : sr.getErrors()) {
                Logger.error('Event publish failed: ' + err.getStatusCode() + ' - ' + err.getMessage());
            }
        }
        return sr;
    }

    // Bulk publish
    public static List<Database.SaveResult> publishBatch(List<Order_Placed__e> events) {
        List<Database.SaveResult> results = EventBus.publish(events);

        for (Integer i = 0; i < results.size(); i++) {
            if (!results[i].isSuccess()) {
                Logger.error('Event ' + i + ' publish failed');
            }
        }
        return results;
    }

    private static Map<String, Object> buildPayload(Id orderId) {
        // Build JSON payload
        return new Map<String, Object>();
    }
}
```

### Publish from Flow

Use the "Create Records" element targeting the Platform Event object. This works with both Record-Triggered and Screen Flows.

### Publish from REST API

```
POST /services/data/v59.0/sobjects/Order_Placed__e

{
    "Order_Id__c": "001xx000003DGb0AAG",
    "Amount__c": 500.00
}
```

## Subscribing to Platform Events

### Apex Trigger Subscriber

```apex
// triggers/OrderPlacedTrigger.trigger
trigger OrderPlacedTrigger on Order_Placed__e (after insert) {
    List<Task> tasksToCreate = new List<Task>();

    for (Order_Placed__e event : Trigger.New) {
        // Access event fields
        String orderId = event.Order_Id__c;
        Decimal amount = event.Amount__c;

        // Access standard event fields
        String replayId = event.ReplayId;
        Datetime createdDate = event.CreatedDate;
        String createdById = event.CreatedById;

        tasksToCreate.add(new Task(
            Subject = 'Process Order: ' + orderId,
            WhatId = orderId,
            Description = 'Amount: ' + amount
        ));
    }

    if (!tasksToCreate.isEmpty()) {
        insert tasksToCreate;
    }
}
```

### Error Handling in Subscribers

```apex
trigger OrderPlacedTrigger on Order_Placed__e (after insert) {
    for (Order_Placed__e event : Trigger.New) {
        try {
            processEvent(event);
        } catch (Exception e) {
            // Log error but do NOT throw - it would cause retry loop
            Logger.error('Failed to process event: ' + event.ReplayId, e);

            // Optionally publish to dead-letter event
            publishToDeadLetter(event, e.getMessage());
        }
    }
}
```

### EventBus.getOperationId()

```apex
trigger OrderPlacedTrigger on Order_Placed__e (after insert) {
    // Get the operation ID for tracking and correlation
    String operationId = EventBus.getOperationId();

    for (Order_Placed__e event : Trigger.New) {
        // Use operationId for idempotency checks
        if (hasBeenProcessed(event.ReplayId, operationId)) {
            continue;
        }
        processEvent(event);
        markAsProcessed(event.ReplayId, operationId);
    }
}
```

## Replay ID for Reliability

The ReplayId enables subscribers to resume from a specific point after failure.

### Replay ID Positions

| Position | Value | Behavior |
|----------|-------|----------|
| `-1` | Tip of stream | Receive only new events |
| `-2` | Earliest available | Replay all retained events (72 hours) |
| Specific ID | `12345` | Replay from that specific event forward |

### CometD Subscription (External)

```javascript
// CometD client subscription with replay
const cometd = new CometD();
cometd.configure({
    url: instanceUrl + '/cometd/59.0/',
    appendMessageTypeToURL: false
});

const replayExtension = new cometdReplayExtension();
replayExtension.setChannel('/event/Order_Placed__e');
replayExtension.setReplay(-1); // or specific replayId
cometd.registerExtension('replay', replayExtension);

cometd.subscribe('/event/Order_Placed__e', (message) => {
    console.log('Event received:', message.data.payload);
    console.log('ReplayId:', message.data.event.replayId);
});
```

### Pub/Sub API (gRPC - Recommended)

```java
// Pub/Sub API subscription - preferred over CometD
PubSubApiClient client = new PubSubApiClient(credentials);

// Subscribe with replay preference
client.subscribe("/event/Order_Placed__e", replayPreset, (event) -> {
    SchemaInfo schema = event.getSchema();
    GenericRecord record = event.getRecord();
    String replayId = event.getReplayId();
    // Process event
});
```

## High-Volume Event Considerations

### Limits

| Limit | Standard | High-Volume Add-On |
|-------|----------|--------------------|
| Events per hour | 250,000 (Enterprise) | Up to 25M |
| Event retention | 72 hours | 72 hours |
| Maximum payload size | 1 MB | 1 MB |
| Maximum fields per event | 10 custom fields | 10 custom fields |
| Batch publish limit | 10 events per call | 10 events per call |

### Optimization Strategies

```apex
public class EventPublishOptimizer {

    // Batch events to maximize throughput
    public static void publishInBatches(List<Order_Placed__e> allEvents) {
        // EventBus.publish supports up to 10 events per call
        for (Integer i = 0; i < allEvents.size(); i += 10) {
            Integer endIdx = Math.min(i + 10, allEvents.size());
            List<Order_Placed__e> batch = new List<Order_Placed__e>();
            for (Integer j = i; j < endIdx; j++) {
                batch.add(allEvents[j]);
            }
            EventBus.publish(batch);
        }
    }

    // Use LongTextArea for complex payloads instead of many fields
    public static Order_Placed__e createCompactEvent(Map<String, Object> data) {
        return new Order_Placed__e(
            Order_Id__c = (String) data.get('orderId'),
            Payload__c = JSON.serialize(data) // All data in one field
        );
    }
}
```

## Event-Driven Architecture Patterns

### Event Choreography

```
[Order Service] --publishes--> Order_Placed__e
                                    |
        +---------------------------+---------------------------+
        |                           |                           |
[Inventory Trigger]        [Billing Trigger]          [Notification Trigger]
  Reserves stock            Creates invoice            Sends confirmation
        |                           |
  Inventory_Reserved__e     Invoice_Created__e
```

### Dead Letter Pattern

```apex
public class DeadLetterHandler {

    public static void publishToDeadLetter(SObject originalEvent, String errorMessage) {
        Dead_Letter_Event__e deadLetter = new Dead_Letter_Event__e(
            Original_Event_Type__c = String.valueOf(originalEvent.getSObjectType()),
            Original_Payload__c = JSON.serialize(originalEvent),
            Error_Message__c = errorMessage.left(255),
            Timestamp__c = Datetime.now()
        );
        EventBus.publish(deadLetter);
    }
}
```

### Decision Matrix: Platform Events vs Alternatives

| Requirement | Platform Events | Streaming API | Change Data Capture |
|-------------|----------------|---------------|---------------------|
| Custom business events | Yes | No | No |
| Record change notifications | Possible but manual | PushTopic (deprecated) | Yes (automatic) |
| External subscriber support | Yes (CometD/Pub-Sub) | Yes (CometD) | Yes (CometD/Pub-Sub) |
| Replay capability | Yes (72 hours) | Limited | Yes (72 hours) |
| Apex trigger subscriber | Yes | No | Yes |
| Flow subscriber | Yes | No | Yes |
| Publish from Apex | Yes | N/A | N/A (automatic) |
| Governor limit context | Separate transaction | N/A | Separate transaction |
