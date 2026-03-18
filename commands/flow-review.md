---
description: Flow best practices review for automation metadata
---

# /flow-review

Review Salesforce Flow metadata XML files for best practices, performance risks, and maintainability issues.

## Workflow

1. **Discover Flow files**
   - Find all Flow metadata files: `force-app/**/flows/*.flow-meta.xml`
   - If a specific flow is provided as argument, review only that flow
   - Parse the XML to understand flow type (Record-Triggered, Screen, Autolaunched, Scheduled, etc.)

2. **Delegate to flow-analyst agent**
   - Pass discovered flow files to the **flow-analyst** agent

3. **Review checks**

   **DML in Loops (Critical)**
   - Create/Update/Delete record elements inside loop elements
   - Get Records elements inside loops (equivalent to SOQL in loops)
   - Suggest using collection variables and a single DML element outside the loop

   **Fault Paths (Critical)**
   - DML and callout elements without connected fault paths
   - Missing error handling for external service actions
   - No user-friendly error messaging in screen flows

   **Before vs After Save (High)**
   - Record-triggered flows using After Save when Before Save would suffice
   - Before Save flows performing DML on other objects (not allowed)
   - Flows that should be Before Save for field updates on the triggering record

   **Recursion & Reentrancy (High)**
   - Flows that update the triggering record in After Save (causes re-evaluation)
   - Missing entry conditions that could cause infinite loops
   - Flows without `$Record__Prior` checks for field change conditions

   **Naming Conventions (Medium)**
   - Flow API names not following naming standards
   - Missing descriptions on flow elements
   - Unclear variable names
   - Suggested format: `ObjectName_TriggerType_Purpose` (e.g., `Account_AfterInsert_SetDefaults`)

   **Performance (Medium)**
   - Excessive Get Records elements (consolidate where possible)
   - Decision elements that could be simplified
   - Unused variables or assignments
   - Screen flows making callouts that block user interaction

   **Maintainability (Low)**
   - Flow complexity (too many elements — flag flows with 50+ elements)
   - Hardcoded IDs or values
   - Missing documentation/description on the flow itself
   - Subflows not used for reusable logic

4. **Output format**
   - Group findings by flow, then by severity
   - For each finding: flow name, element name/label, issue, impact, remediation
   - End with summary: total flows reviewed, critical issues, overall assessment

## Error Handling

- If flow XML is malformed, skip it and report it as unreadable
- If flows reference custom objects not in source, note external dependencies

## Example Usage

```
/flow-review
/flow-review force-app/main/default/flows/Account_AfterInsert_SetDefaults.flow-meta.xml
```
