# Flow Best Practices

## Before-Save vs After-Save Flows

### Before-Save for Field Updates (No DML Needed)

Before-save flows run before the record is committed. Assign values directly to `$Record` fields without a DML operation:

```
// Before-Save Flow: Account_BeforeInsert_DefaultFields
Trigger: Account - Before Insert

Assignment Element:
  $Record.Rating = 'Cold'
  $Record.Industry = 'Other'
  $Record.Description = 'Created via automated process'
```

Benefits of before-save:
- No DML statement consumed (the triggering save handles it)
- Faster execution (no extra database operation)
- Lower risk of hitting governor limits

### After-Save for Related Records

Use after-save flows when you need to create, update, or delete related records:

```
// After-Save Flow: Opportunity_AfterInsert_CreateTask
Trigger: Opportunity - After Insert
Condition: $Record.Amount > 100000

Create Records Element:
  Object: Task
  Subject: 'Review high-value opportunity'
  WhatId: $Record.Id
  OwnerId: $Record.OwnerId
  ActivityDate: {!$Flow.CurrentDate + 3}
```

## Fault Paths on Every DML and Callout

Every Create, Update, Delete, or External Service element MUST have a fault connector. Unhandled faults cause cryptic errors for users.

```
Create Records (Create_Task)
  |
  +--> [Success] --> Next Element
  |
  +--> [Fault] --> Assignment: Set errorMessage
                    --> Screen: Display friendly error
                    OR
                    --> Create Record: Log to Error_Log__c
```

Fault path assignment example:

```
Assignment: Set_Error_Variables
  {!errorMessage} = {!$Flow.FaultMessage}
  {!errorElement} = 'Create_Task'
  {!errorTimestamp} = {!$Flow.CurrentDateTime}
```

## Naming Conventions

Follow the pattern: `ObjectName_TriggerType_Purpose`

| Flow Name | Type | Description |
|-----------|------|-------------|
| Account_BeforeInsert_DefaultFields | Before-Save | Sets default field values |
| Opportunity_AfterUpdate_StageNotify | After-Save | Sends notification on stage change |
| Case_Screen_EscalationWizard | Screen Flow | Guided case escalation |
| Lead_Scheduled_StaleLeadCleanup | Scheduled | Cleans up old leads |
| Order_Autolaunched_CalculateTax | Autolaunched | Reusable tax calculation |

## Descriptions on Every Element

Add a description to every flow element. Future administrators will thank you.

```
Element: Get_Related_Contacts
Type: Get Records
Description: Retrieves all active contacts associated with the
  parent account. Filters by Active__c = true to avoid
  processing inactive records.
```

Bad practice -- no description:
```
Element: Get Records1
Description: (empty)
```

## Subflow Decomposition for Reuse

Extract common logic into autolaunched subflows and call them from multiple parent flows:

```
Subflow: Utility_SendNotification
  Input Variables:
    recipientId (Text, Input)
    templateName (Text, Input)
    targetRecordId (Text, Input)
  Logic:
    Get email template by name
    Send notification to recipient
```

Call from parent flows:

```
// In: Opportunity_AfterUpdate_StageNotify
Subflow Element: Call Utility_SendNotification
  recipientId = {!$Record.OwnerId}
  templateName = 'Opportunity_Stage_Change'
  targetRecordId = {!$Record.Id}
```

Common reusable subflows to consider:
- Error logging (write to custom object)
- Notification dispatch (email, bell, Chatter)
- Address validation
- Record ownership assignment

## One Flow Per Object Per Trigger Type

Avoid multiple record-triggered flows on the same object and trigger combination. Multiple flows on the same trigger have unpredictable execution order.

Preferred approach:

```
Account_BeforeSave_AllLogic (single flow)
  --> Decision: Check which fields changed
      --> Branch 1: Rating changed --> update related fields
      --> Branch 2: Owner changed --> reassign tasks
      --> Branch 3: Address changed --> validate address
```

Avoid:

```
Account_BeforeSave_UpdateRating    (Flow 1 - order unknown)
Account_BeforeSave_ReassignTasks   (Flow 2 - order unknown)
Account_BeforeSave_ValidateAddress (Flow 3 - order unknown)
```

If flows become too complex, extract logic into subflows called from the single parent flow. This gives you explicit control over execution order.

## Flow Documentation Checklist

Before activating any flow, verify:

- [ ] Flow name follows ObjectName_TriggerType_Purpose convention
- [ ] Flow description explains the business purpose
- [ ] Every element has a meaningful label and description
- [ ] Every DML/callout element has a fault path
- [ ] Entry conditions filter appropriately to avoid unnecessary runs
- [ ] No duplicate record-triggered flows for the same object and trigger
- [ ] Subflows used for any logic needed in more than one flow
- [ ] Before-save used for simple field updates (no unnecessary DML)
