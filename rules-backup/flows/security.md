---
paths:
  - "**/*.flow"
  - "**/*.flow-meta.xml"
  - "**/flows/**"
---

# Flow Security

## System Context vs User Context (Run Mode)

Flows run in one of two modes, and the choice has significant security implications:

| Run Mode | Behavior | Use When |
|----------|----------|----------|
| System Context (without sharing) | Bypasses CRUD, FLS, and sharing rules | Background automation with no user interaction |
| User Context (with sharing) | Respects the running user's permissions | Screen flows and user-facing automation |

Record-triggered flows run in system context by default. Screen flows run in user context by default.

Override the default when necessary:

```
// Record-Triggered Flow Settings
How to Launch: Record-Triggered
Run Mode: System Context WITHOUT Sharing
  --> Use for: backend automation, integration processing

// Screen Flow Settings
How to Launch: Screen
Run Mode: User Context
  --> Use for: all user-facing interactions
```

Always prefer user context for screen flows. Running a screen flow in system context allows users to view and modify records they should not have access to.

## Bypass Permissions With Caution

System-context flows bypass all permission checks. Use them only when business logic requires cross-permission operations:

Justified system-context use:

```
// After-save flow that updates a parent record
// the triggering user may not have edit access to
Flow: Case_AfterInsert_UpdateAccountLastCaseDate
Run Mode: System Context without Sharing

Update Records: Account
  Filter: Id = {!$Record.AccountId}
  Set: Last_Case_Date__c = {!$Flow.CurrentDate}
```

Unjustified system-context use:

```
// BAD: Screen flow in system context lets users
// see and edit records they shouldn't access
Flow: Account_Screen_EditAnyAccount
Run Mode: System Context without Sharing  // WRONG
```

Document every system-context flow with a comment explaining why it requires elevated access:

```
Flow Description:
  "Runs in system context because the case creator may not have
   edit access to the parent Account record. Only updates the
   Last_Case_Date__c field - no other Account fields are modified."
```

## Field-Level Security in Screen Flows

Screen flows in user context respect CRUD but do NOT automatically enforce FLS on screen components. You must handle this explicitly.

Use the `isAccessible` and `isUpdateable` checks:

```
Screen: Edit Contact Details
  Section: Basic Info
    - First Name (always shown - standard field)
    - Last Name (always shown - standard field)

  Section: Sensitive Fields
    Visibility: {!$Permission.View_Sensitive_Data}
    - SSN__c (visible only with permission)
    - Salary__c (visible only with permission)
```

For Get Records in screen flows, use field-level security settings:

```
Get Records: Get_Contact
  Object: Contact
  How to Store: Automatically store all fields
  --> WARNING: This retrieves fields the user may not have access to

Get Records: Get_Contact (Better)
  Object: Contact
  How to Store: Choose fields and assign variables
  --> Only select fields the user should see
```

## Guest User Restrictions

Guest users (unauthenticated site visitors) have severe restrictions. Flows exposed to guest users must be designed carefully.

Guest user limitations:
- No access to standard objects by default (Account, Contact, Opportunity)
- Can only access custom objects explicitly granted in the guest user profile
- Cannot use `$User` merge fields (returns the site guest user)
- Cannot create or update records on objects without explicit CRUD permissions

```
// Flow for guest user: Lead capture form
Flow: Public_Screen_LeadCapture
Run Mode: System Context without Sharing
  // Must use system context because guest user
  // has no CRUD access to Lead by default

Screen: Capture Information
  - First Name, Last Name, Email, Company

Create Records: Create_Lead
  Object: Lead
  // Runs in system context to bypass guest user restrictions
  // Only creates Lead records - nothing else

IMPORTANT: Validate and sanitize all guest user input.
Do NOT let guest users control:
  - Record IDs (could access arbitrary records)
  - Object types
  - Field API names
```

## Flow Access via Permission Sets

Grant flow access through permission sets, not profiles:

```
Permission Set: PS_Case_Escalation
  Flow Access:
    - Case_Screen_EscalationWizard: Enabled

Permission Set: PS_Order_Management
  Flow Access:
    - Order_Screen_CreateOrder: Enabled
    - Order_Screen_CancelOrder: Enabled
```

Never add flows to the global actions or app pages without restricting access through permission sets first.

For record pages, use component visibility filters:

```
Lightning Record Page: Account Layout
  Flow Component: Account_Screen_SpecialPricing
  Component Visibility:
    - Permission: PS_Special_Pricing_Access
    - OR Custom Permission: Can_Access_Special_Pricing
```

## Sharing Rules Apply to User-Mode Flows

When a flow runs in user context, all Get Records and DML operations respect the running user's sharing rules:

```
// User-mode flow
Get Records: Get_Opportunities
  Object: Opportunity
  Filter: StageName = 'Negotiation'
  // Only returns opportunities the user can see
  // per OWD + sharing rules + role hierarchy
```

This is usually the correct behavior for screen flows. However, be aware of these edge cases:

```
// A manager's screen flow shows their team's records
// If OWD is Private, they see records via role hierarchy
// If they share the flow link with a rep, the rep sees ONLY their own records

// Solution: Add a decision element
Decision: Check_User_Role
  Outcome: Is Manager
    --> Show team dashboard
  Default:
    --> Show individual dashboard
```

## Security Checklist

- [ ] Screen flows run in user context (default) unless there is a documented reason for system context
- [ ] Record-triggered flows in system context have a description explaining why
- [ ] Sensitive fields in screen flows are protected with visibility rules
- [ ] Guest user flows use system context with minimal, specific operations
- [ ] Guest user input is validated (no user-controlled record IDs or API names)
- [ ] Flow access is granted via permission sets, not profiles
- [ ] User-mode flows account for sharing rule behavior
- [ ] No screen flow displays records the user should not see via system context bypass
- [ ] Fault paths do not expose internal error details to end users
- [ ] Platform event flows validate event data before processing
