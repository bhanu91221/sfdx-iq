---
name: flow-best-practices
description: Flow design best practices including entry conditions, fault paths, bulkification, and naming conventions
origin: claude-sfdx-iq
---

# Flow Best Practices

## Before-Save vs After-Save Decision

### Before-Save Flow

Executes before the record is saved to the database. No DML is performed by the flow engine for field updates.

```
Use Before-Save when:
- Updating fields on the triggering record ONLY
- Setting default values
- Field validation (custom error messages)
- Calculating field values from other fields on the same record
- No need to access related records
```

**Advantages:**
- No DML consumed for field updates (updates the record in memory)
- Faster execution
- Runs before assignment rules, auto-response rules

### After-Save Flow

Executes after the record is committed. Has access to the record ID and can perform DML.

```
Use After-Save when:
- Creating, updating, or deleting OTHER records
- Sending emails or notifications
- Calling external services (via Apex actions)
- Publishing Platform Events
- Accessing the record ID (for new records)
- Launching subflows that modify other records
```

### Decision Matrix

| Scenario | Before-Save | After-Save |
|----------|-------------|------------|
| Set default field values | Yes | No |
| Update fields on same record | Yes | No |
| Create child records | No | Yes |
| Update parent/related records | No | Yes |
| Send email alert | No | Yes |
| Custom validation | Yes | No |
| Call Apex action | No | Yes |
| Record ID needed | No (null on create) | Yes |

## Entry Conditions Optimization

### Narrow Entry Conditions

```
GOOD: Entry Condition = "Status Equals Closed AND Type Equals Support"
BAD: No entry conditions (fires on every record change)
```

### Filter for Changed Fields

```
Record-Triggered Flow Settings:
- "A record is created or updated"
- Entry Conditions:
    - Status__c Equals "Closed"
- "Only when a record is updated to meet the condition requirements"
  (This ensures the flow runs only on the transition, not on every edit)
```

### $Record__Prior for Change Detection

```
Entry Condition Formula:
  {!$Record.Status__c} != {!$Record__Prior.Status__c}

Decision Element:
  "Did the stage change?"
  {!$Record.StageName} != {!$Record__Prior.StageName}
```

Use `$Record__Prior` only in After-Save flows. It is not available in Before-Save flows.

## Fault Paths Required

Every element that can fail MUST have a fault connector.

### Fault Path Pattern

```
[Get Records] --fault--> [Log Error] --> [Create Error Record]
[Create Records] --fault--> [Log Error] --> [Notify Admin]
[Apex Action] --fault--> [Log Error] --> [Screen: Display Error]
```

### Fault Path Implementation

```
1. Connect every DML element (Create, Update, Delete) to a Fault path
2. In the Fault path, capture {!$Flow.FaultMessage}
3. Log the error (create a log record or call Apex logger)
4. For screen flows, display a user-friendly error message
5. For record-triggered flows, consider a notification to admins
```

### Fault Variables

| Variable | Description |
|----------|-------------|
| `{!$Flow.FaultMessage}` | The error message text |
| `{!$Flow.InterviewGuid}` | Unique ID of the flow interview |
| `{!$Flow.CurrentDateTime}` | Timestamp of the error |
| `{!$Flow.ActiveStages}` | Currently active stages |

## Subflow Reuse

### When to Use Subflows

```
Use subflows when:
- Logic is needed in multiple flows
- Complex processes should be broken into manageable pieces
- Different entry points need the same processing
- Testing requires isolated units of logic
```

### Subflow Pattern

```
Main Flow:
  [Get Account] --> [Subflow: Validate Address] --> [Subflow: Calculate Score] --> [Update Account]

Subflow: Validate Address
  Input: Street, City, State, Zip
  Output: IsValid (Boolean), NormalizedAddress (Text)

Subflow: Calculate Score
  Input: AccountId
  Output: Score (Number), Tier (Text)
```

### Subflow Input/Output Variables

```
Mark variables as:
- "Available for Input" = receives values from parent flow
- "Available for Output" = returns values to parent flow
- Both input and output for pass-through variables
```

## Naming Conventions

### Flow Names

| Type | Pattern | Example |
|------|---------|---------|
| Record-Triggered (Before) | `{Object}_Before_{Action}` | `Account_Before_CreateUpdate` |
| Record-Triggered (After) | `{Object}_After_{Action}` | `Case_After_StatusChange` |
| Screen Flow | `{Feature}_{Screen}` | `New_Employee_Onboarding` |
| Autolaunched | `{Process}_{Action}` | `Lead_Assignment_Router` |
| Scheduled | `{Object}_Scheduled_{Action}` | `Opportunity_Scheduled_StaleCheck` |
| Subflow | `Sub_{Function}` | `Sub_Address_Validation` |
| Platform Event | `{Event}_Handler` | `Order_Placed_Handler` |

### Element Labels

```
Get Records:     "Get {Object} {Criteria}"      → "Get Active Cases for Account"
Create Records:  "Create {Object}"               → "Create Follow-Up Task"
Update Records:  "Update {Object} {Fields}"      → "Update Case Status"
Delete Records:  "Delete {Object}"               → "Delete Draft Records"
Decision:        "Is {Condition}?"                → "Is High Priority?"
Assignment:      "Set {Variable}"                → "Set Discount Percentage"
Loop:            "For Each {Object}"             → "For Each Line Item"
Subflow:         "Run {Subflow Name}"            → "Run Address Validation"
Apex Action:     "Call {Action Name}"            → "Call Geocoding Service"
```

### Variable Names

```
Input variables:    inp_{name}    → inp_AccountId
Output variables:   out_{name}    → out_IsValid
Collection variables: col_{name}  → col_ContactsToUpdate
Record variables:   rec_{name}    → rec_CurrentAccount
Boolean variables:  is_{name}     → is_HighPriority
Text variables:     txt_{name}    → txt_ErrorMessage
Number variables:   num_{name}    → num_TotalAmount
```

## Collection Variables for Bulk Processing

### Bulkification Pattern

```
WRONG (DML in loop):
  [Loop: For Each Contact] --> [Update Record: Contact]
  (This performs one DML per record - hits governor limits)

RIGHT (collect then DML):
  [Loop: For Each Contact]
    --> [Assignment: Add to col_ContactsToUpdate]
  [Update Records: col_ContactsToUpdate]
  (Single DML for all records)
```

### Collection Assignment

```
Loop Variable: currentContact
Assignment Element (inside loop):
  Add {!currentContact} to {!col_ContactsToUpdate}

After Loop:
  Update Records: {!col_ContactsToUpdate}
```

## No DML in Loops

This is the most critical Flow performance rule.

```
NEVER:
  Loop → Create/Update/Delete/Get Records

ALWAYS:
  Loop → Collect into variables → DML outside loop

EXCEPTION:
  Get Records BEFORE the loop is acceptable for lookups,
  but never inside the loop body
```

### Pattern: Bulk Get + Loop + Bulk DML

```
[Get Records: All Contacts for Account]
  ↓
[Loop: For Each Contact]
  → [Decision: Needs Update?]
    → Yes: [Assignment: Add to Update Collection]
  ↓
[Update Records: Update Collection]
```

## Auto-Layout Best Practices

```
1. Use Auto-Layout mode (default in new flows)
2. Keep the main flow path vertical
3. Use Fault paths branching to the right
4. Group related elements with comments/labels
5. Minimize crossing connectors
6. Add Description on every element
7. Use scheduled paths judiciously (they create separate transactions)
```

## Flow Versioning

### Version Management

```
1. Each flow has one Active version at a time
2. Create a new version for changes (never edit active version in production)
3. Test new version in sandbox before activating
4. Flow versions are numbered sequentially (Version 1, 2, 3...)
5. Deactivate old versions after confirming new version works
6. In-progress interviews continue running on the version they started on
```

### Best Practices

```
- Use a consistent description format: "v{N} - {change summary}"
- Test new flow versions with the Flow Debug tool before activation
- Monitor flow errors in Setup > Flows > View Error Log
- Set up Flow Error Email notifications
- Use Custom Metadata for configurable thresholds in flows
```

## Governor Limits in Flows

| Limit | Value | Notes |
|-------|-------|-------|
| SOQL Queries per transaction | 100 | Each Get Records = 1 query |
| DML Statements per transaction | 150 | Each Create/Update/Delete = 1 DML |
| Records retrieved per Get | 50,000 | Use filters to narrow |
| Flow interviews per transaction | 2,000 | Includes subflows |
| Loop iterations | No hard limit | But bound by SOQL/DML limits |
| Elements executed per interview | 2,000 | Protect against infinite loops |
