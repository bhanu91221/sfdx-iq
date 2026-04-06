---
paths:
  - "**/*.flow"
  - "**/*.flow-meta.xml"
  - "**/flows/**"
---

# Flow Performance

## No Get Records or DML Inside Loops

The single most important flow performance rule: never place Get Records, Create Records, Update Records, or Delete Records elements inside a loop. Each iteration consumes a SOQL query or DML statement against governor limits.

Bad -- Get Records inside a loop:

```
Loop: For each Opportunity in {!oppCollection}
  --> Get Records: Get Account where Id = {!currentOpp.AccountId}
  --> Assignment: Set values on currentOpp
```

This executes one SOQL query per opportunity. With 200 records, that is 200 queries against a 100-query limit.

Good -- use collection variables:

```
// Step 1: Collect all Account IDs first
Loop: For each Opportunity in {!oppCollection}
  --> Assignment: Add {!currentOpp.AccountId} to {!accountIdCollection}

// Step 2: Single Get Records outside the loop
Get Records: Get Accounts where Id IN {!accountIdCollection}

// Step 3: Process results
Loop: For each Opportunity in {!oppCollection}
  --> Decision/Assignment: Match with account data
```

## Bulkification Awareness

Record-triggered flows auto-bulkify Get Records and DML elements that are outside loops. However, this does not apply in all contexts.

Auto-bulkified (outside loops in record-triggered flows):
```
// This single Get Records element automatically handles
// all triggering records in one query
Get Records: Get Contacts where AccountId = {!$Record.Id}
```

NOT auto-bulkified:
- Elements inside loops (always one operation per iteration)
- Screen flows (execute in single-record context)
- Scheduled flows (each record runs independently)
- Autolaunched flows called individually per record

## Minimize Flow Elements

Every flow element adds execution time. Consolidate where possible.

Bad -- separate assignments:

```
Assignment: Set_Field_1
  {!$Record.Status__c} = 'Active'
Assignment: Set_Field_2
  {!$Record.Priority__c} = 'High'
Assignment: Set_Field_3
  {!$Record.LastReviewed__c} = {!$Flow.CurrentDate}
```

Good -- single assignment with multiple rows:

```
Assignment: Set_All_Fields
  {!$Record.Status__c} = 'Active'
  {!$Record.Priority__c} = 'High'
  {!$Record.LastReviewed__c} = {!$Flow.CurrentDate}
```

## Avoid Recursive Flows

Flows can trigger themselves when they update the same object they are triggered on. Use `$Record__Prior` to check if relevant fields actually changed before proceeding.

```
// Entry Conditions (recommended: "Only when conditions are met")
Condition: {!$Record.Status__c} NOT EQUAL TO {!$Record__Prior.Status__c}
```

Without this guard, a before-save flow that sets Status could re-trigger itself, and an after-save flow that updates the same record will definitely re-trigger.

Additional recursion controls:

```
// Decision Element: Check for actual changes
Decision: Has_Relevant_Change
  Outcome 1 - Status Changed:
    {!$Record.Status__c} != {!$Record__Prior.Status__c}
  Outcome 2 - Amount Changed:
    {!$Record.Amount} != {!$Record__Prior.Amount}
  Default Outcome: No Change --> End flow
```

## Entry Conditions to Reduce Executions

Always set entry conditions on record-triggered flows. Without them, the flow runs for every insert or update on that object.

```
// Flow: Opportunity_AfterUpdate_LargeDeals
Entry Conditions: Only when conditions are met
  AND
    {!$Record.Amount} > 100000
    {!$Record.StageName} = 'Closed Won'
    {!$Record.StageName} != {!$Record__Prior.StageName}
```

This flow only runs when an opportunity is newly closed-won above $100K, rather than on every opportunity update.

## Limit Screen Flow Round-Trips

Each screen in a screen flow is a server round-trip. Minimize the number of screens.

Bad -- too many screens:

```
Screen 1: Enter first name
Screen 2: Enter last name
Screen 3: Enter email
Screen 4: Confirm details
```

Good -- consolidated screens:

```
Screen 1: Enter all contact details (first name, last name, email, phone)
Screen 2: Review and confirm
```

Use conditional visibility within a single screen instead of separate screens:

```
Screen: Contact Details
  Section 1: Basic Info (always visible)
    - First Name, Last Name, Email
  Section 2: Address (visible when Include_Address = true)
    - Street, City, State, Zip
  Section 3: Preferences (visible when Show_Preferences = true)
    - Communication preferences
```

## Collection Variable Patterns

Use collection variables to batch operations outside of loops:

```
// Build a collection of records to create
Loop: For each Account in {!accountCollection}
  --> Assignment: Build new Task record
      {!newTask.Subject} = 'Follow up with ' + {!currentAccount.Name}
      {!newTask.WhatId} = {!currentAccount.Id}
  --> Assignment: Add {!newTask} to {!taskCollectionToCreate}

// Single DML outside the loop
Create Records: Create {!taskCollectionToCreate}
```

## Performance Checklist

- [ ] No Get Records elements inside any loop
- [ ] No Create/Update/Delete Records elements inside any loop
- [ ] Entry conditions set on all record-triggered flows
- [ ] `$Record__Prior` comparisons used to prevent unnecessary executions
- [ ] Assignment elements consolidated (one element, multiple rows)
- [ ] Screen flows use minimal screens with conditional visibility
- [ ] Collection variables used for batching DML
- [ ] Subflows called with collection inputs where possible
