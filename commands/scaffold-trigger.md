---
description: Generate trigger and handler boilerplate with test class
---

# /scaffold-trigger

Generate a complete trigger framework for a specified SObject: a single trigger that delegates to a handler class, the handler with before/after methods, and a comprehensive test class.

## Workflow

1. **Gather requirements**
   - Ask for the SObject API name (e.g., `Account`, `Custom_Object__c`)
   - Ask which trigger events are needed: before insert, before update, before delete, after insert, after update, after delete, after undelete
   - If not specified, default to all seven events
   - Ask if the handler should extend a base class or implement an interface (e.g., TriggerHandler framework)

2. **Check for existing triggers**
   - Search `force-app/main/default/triggers/` for any existing trigger on the same object
   - If a trigger already exists, warn the user: only one trigger per object is the recommended pattern
   - Offer to integrate into the existing trigger or replace it

3. **Generate the trigger file**
   - File: `<ObjectName>Trigger.trigger`
   - Meta file: `<ObjectName>Trigger.trigger-meta.xml` with API version
   - Trigger body should contain NO logic — only delegation:
     - Instantiate the handler: `new <ObjectName>TriggerHandler()`
     - Call the handler's `run()` method or dispatch by event type
   - Include all requested trigger events in the trigger definition
   - Add a header comment with object name, author placeholder, and date

4. **Generate the handler class**
   - File: `<ObjectName>TriggerHandler.cls`
   - Meta file: `<ObjectName>TriggerHandler.cls-meta.xml`
   - Class must use `with sharing` by default
   - Include a dispatch method that routes to event-specific methods based on `Trigger.operationType`
   - Generate stub methods for each requested event:
     - `beforeInsert(List<SObject> newRecords)`
     - `beforeUpdate(List<SObject> newRecords, Map<Id, SObject> oldMap)`
     - `beforeDelete(Map<Id, SObject> oldMap)`
     - `afterInsert(List<SObject> newRecords)`
     - `afterUpdate(List<SObject> newRecords, Map<Id, SObject> oldMap)`
     - `afterDelete(Map<Id, SObject> oldMap)`
     - `afterUndelete(List<SObject> newRecords)`
   - Each method should have a TODO comment explaining its purpose
   - Include private helper method stubs for common patterns: validation, field updates, related record operations

5. **Generate the test class**
   - File: `<ObjectName>TriggerHandlerTest.cls`
   - Meta file: `<ObjectName>TriggerHandlerTest.cls-meta.xml`
   - Include `@isTest` annotation
   - Generate test methods for each event:
     - `testBeforeInsert()` — insert single record, verify handler logic
     - `testBeforeInsert_Bulk()` — insert 200+ records, verify bulkification
     - `testBeforeUpdate()` — update record, verify field changes
     - `testAfterInsert()` — insert record, verify side effects
     - (continue for each enabled event)
   - Include negative test: verify error handling
   - Include `@TestSetup` method using TestDataFactory if it exists
   - Use `System.assert`, `System.assertEquals`, `System.assertNotEquals` with descriptive messages

6. **Write output files**
   - Default location: `force-app/main/default/triggers/` for trigger, `force-app/main/default/classes/` for handler and test
   - Create `-meta.xml` files for all components
   - Report the files created with their paths

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--object` | SObject API name | Prompt user |
| `--events` | Comma-separated trigger events | All events |
| `--framework` | Base handler framework to extend | None |
| `--output-dir` | Base output directory | `force-app/main/default` |

## Error Handling

- If the object name contains invalid characters, reject and ask for correction
- If a trigger already exists for the object, offer merge or replacement options
- If the handler class name conflicts with an existing class, suggest an alternative name
- If no events are selected, default to all events with a notice

## Example Usage

```
/scaffold-trigger
/scaffold-trigger --object Account --events beforeInsert,afterInsert,afterUpdate
/scaffold-trigger --object Custom_Object__c
/scaffold-trigger --object Order --framework TriggerHandler
```
