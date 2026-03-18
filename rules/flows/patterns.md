# Flow Patterns

## Record-Triggered: Before-Save vs After-Save Decision Matrix

Choose the right trigger type based on what the flow needs to do:

| Requirement | Before-Save | After-Save |
|-------------|:-----------:|:----------:|
| Update fields on the triggering record | Yes | No (causes recursion) |
| Access the record Id on insert | No (not yet assigned) | Yes |
| Create/update/delete related records | No | Yes |
| Send email or notification | No | Yes |
| Call a subflow | Yes | Yes |
| Invoke Apex action | No | Yes |
| Performance priority (no extra DML) | Yes | N/A |

Before-save example -- default field values:

```
Flow: Case_BeforeSave_SetDefaults
Trigger: Case - Before Insert
Entry: No conditions (runs on all new cases)

Assignment: Set_Defaults
  {!$Record.Priority} = 'Medium'
  {!$Record.Origin} = IF(ISBLANK({!$Record.Origin}), 'Web', {!$Record.Origin})
  {!$Record.SLA_Deadline__c} = {!$Flow.CurrentDate} + 3
```

After-save example -- create related records:

```
Flow: Opportunity_AfterInsert_CreateDefaultLineItems
Trigger: Opportunity - After Insert
Entry: {!$Record.RecordType.DeveloperName} = 'Standard_Sale'

Get Records: Get default products from Product_Default__mdt
Loop: Build line item collection
Create Records: Create OpportunityLineItems
```

## Screen Flow: Progressive Disclosure Pattern

Show fields progressively based on user selections to reduce complexity:

```
Screen: Order Entry
  Section: Order Type
    - Picklist: {!orderType} (Standard, Rush, Custom)

  Section: Standard Details (visible when orderType = 'Standard')
    - Quantity, Delivery Date

  Section: Rush Details (visible when orderType = 'Rush')
    - Quantity, Delivery Date, Rush Reason
    - Display Text: "Rush orders incur a 25% surcharge"

  Section: Custom Details (visible when orderType = 'Custom')
    - Quantity, Delivery Date, Custom Specifications (Long Text)
    - File Upload: Design files
```

Multi-step wizard pattern with navigation:

```
Screen 1: Select Record Type
  --> Decision: Route by type

Screen 2a: Standard Form (if Standard)
Screen 2b: Custom Form (if Custom)

Screen 3: Review and Confirm
  --> Display all entered values read-only
  --> Checkbox: {!confirmSubmission}

  --> Submit button (visible when confirmSubmission = true)
```

## Scheduled Flow: Batch Processing Patterns

Scheduled flows process records individually. Design them to be safe for single-record execution:

```
Flow: Lead_Scheduled_StaleLeadCleanup
Schedule: Daily at 2:00 AM
Object: Lead
Entry Conditions:
  LastActivityDate < LAST_N_DAYS:90
  Status = 'Open'
  IsConverted = false

Decision: Check_Lead_Age
  Outcome 1 - Over 180 days:
    Update: Status = 'Closed - Stale'
  Outcome 2 - 90 to 180 days:
    Create Task: Follow-up reminder for owner
    Update: Status = 'Aging'
```

Scheduled path pattern for record-triggered flows:

```
Flow: Opportunity_AfterCreate_FollowUp
Trigger: Opportunity - After Insert

Immediate Path:
  --> Create welcome task for owner

Scheduled Path: "3 Days After Created"
  Condition: StageName = 'Prospecting' (still in initial stage)
  --> Create reminder task: "Opportunity needs attention"

Scheduled Path: "30 Days After Created"
  Condition: IsClosed = false
  --> Send notification to manager
```

## Platform Event: Event-Driven Patterns

Use platform event-triggered flows for asynchronous, decoupled processing:

```
Flow: OrderEvent_Autolaunched_ProcessOrder
Trigger: Platform Event - Order_Event__e

// Extract event data
Assignment: Map_Event_Data
  {!orderId} = {!$Record.Order_Id__c}
  {!eventType} = {!$Record.Event_Type__c}

Decision: Route_By_Event_Type
  Outcome: Order Placed
    --> Get Order record
    --> Create fulfillment record
    --> Send confirmation notification

  Outcome: Order Cancelled
    --> Get Order record
    --> Update status to Cancelled
    --> Create refund record

  Outcome: Order Shipped
    --> Update tracking information
    --> Send shipping notification
```

Publishing platform events from a flow:

```
// In a record-triggered flow
Create Records: Publish_Event
  Object: Order_Event__e
  Order_Id__c = {!$Record.Id}
  Event_Type__c = 'Order Placed'
  Payload__c = {!jsonPayload}
```

## Autolaunched: Reusable Subflow Patterns

Design subflows with clear input/output contracts:

```
Subflow: Utility_CreateApprovalTask
  Input Variables:
    recordId (Text, Required, Input)
    approverIds (Text Collection, Required, Input)
    taskSubject (Text, Required, Input)
    dueInDays (Number, Required, Input, Default: 7)

  Output Variables:
    taskIds (Text Collection, Output)
    success (Boolean, Output)

  Logic:
    Loop: For each approverId in approverIds
      --> Build Task record
      --> Add to taskCollection
    Create Records: taskCollection
    Assignment: Set success = true, output taskIds

  Fault Path:
    Assignment: Set success = false
```

Common subflow library to build:

| Subflow | Purpose | Inputs |
|---------|---------|--------|
| Utility_SendNotification | Send custom or bell notification | recipientId, type, message |
| Utility_LogError | Write to error log object | flowName, element, message |
| Utility_CreateApprovalTask | Generate approval tasks | recordId, approverIds, subject |
| Utility_ValidateAddress | Validate and standardize address | street, city, state, zip |
| Utility_CalculateBusinessDays | Add/subtract business days | startDate, numberOfDays |

## Orchestration: Multi-Step Approval Patterns

Use orchestrations for processes that span multiple steps and assignees:

```
Orchestration: Contract_Approval_Process

Stage 1: Legal Review
  Step: Assign to Legal Team
    --> Screen Flow: Legal_ReviewContract
    --> Wait for completion
  Condition to advance: Approved by legal

Stage 2: Finance Review
  Step: Assign to Finance (runs in parallel with Compliance)
    --> Screen Flow: Finance_ReviewTerms
  Step: Assign to Compliance
    --> Screen Flow: Compliance_CheckRegulations
  Condition to advance: Both approved

Stage 3: Executive Sign-Off
  Decision: Contract value > $500K?
    Yes --> Assign to VP
    No  --> Auto-approve

Stage 4: Finalize
  --> Autolaunched Flow: Generate signed PDF
  --> Update Contract status to Active
  --> Send notification to all parties
```

## Pattern Selection Guide

| Scenario | Recommended Pattern |
|----------|-------------------|
| Set defaults on new records | Before-save record-triggered |
| Create child records after insert | After-save record-triggered |
| Multi-step user input | Screen flow with progressive disclosure |
| Daily data cleanup | Scheduled flow |
| Decouple integrations | Platform event-triggered |
| Shared logic across flows | Autolaunched subflow |
| Multi-person approvals | Orchestration |
| Time-based follow-ups | Scheduled paths on record-triggered |
