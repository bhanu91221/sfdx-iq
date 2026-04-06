---
paths:
  - "**/*.flow"
  - "**/*.flow-meta.xml"
  - "**/flows/**"
---

# Flow Coding Style Rules

## Naming Conventions

### Flow Names
Pattern: `ObjectName_TriggerType_Purpose`

| Type | Example |
|------|---------|
| Record-Triggered (Before) | `Account_BeforeUpdate_ValidateFields` |
| Record-Triggered (After) | `Opportunity_AfterInsert_CreateTasks` |
| Screen Flow | `Screen_SubmitExpenseReport` |
| Scheduled | `Scheduled_WeeklyAccountCleanup` |
| Autolaunched (Subflow) | `Sub_CalculateDiscount` |
| Platform Event | `PlatformEvent_OrderEvent_ProcessOrder` |

### Element Names
- Use descriptive names — never `Decision1`, `Loop1`, `Assignment1`.
- Prefix with element type for clarity in complex flows.

| Element Type | Naming Pattern | Example |
|-------------|---------------|---------|
| Get Records | `Get_ObjectName_Purpose` | `Get_Account_ByOwnerId` |
| Create Records | `Create_ObjectName_Purpose` | `Create_Task_FollowUp` |
| Update Records | `Update_ObjectName_Purpose` | `Update_Opportunity_Stage` |
| Delete Records | `Delete_ObjectName_Purpose` | `Delete_Case_Duplicates` |
| Decision | `Decision_WhatIsBeingDecided` | `Decision_IsHighValueAccount` |
| Loop | `Loop_Through_ObjectName` | `Loop_Through_Contacts` |
| Assignment | `Assign_VariableName` | `Assign_TotalAmount` |
| Subflow | `Subflow_Purpose` | `Subflow_CalculateDiscount` |

### Variable Names
- camelCase: `recordCount`, `isApproved`, `accountList`
- Collection variables: plural name — `selectedContacts`, `filteredAccounts`
- Boolean variables: prefix with `is` or `has` — `isActive`, `hasOpenCases`

## Description Requirements

- Every flow MUST have a description on the flow definition explaining its business purpose.
- Every element SHOULD have a description explaining its role.
- Fault path elements MUST describe what error is being caught and the recovery action.

## Layout Standards

- Use Auto-Layout mode (not free-form) for consistency.
- Keep flow paths linear where possible — avoid excessive branching.
- Group related elements together.
- Place fault paths consistently (right side of the main path).

## Version Management

- Add version notes when creating new flow versions.
- Deactivate old versions — don't leave multiple active versions.
- Test new versions in a sandbox before activating in production.
- Use scheduled paths sparingly — they cannot be easily debugged.
