---
description: Generate Flow design document and implementation blueprint
---

# /scaffold-flow

Generate a detailed Flow design document that serves as a blueprint for building a Salesforce Flow. Covers flow type selection, element planning, DML/query budgeting, fault handling, naming conventions, and entry conditions.

## Workflow

0. **Load context** — Invoke the context-assigner agent with the description of this scaffolding task. Display the announcement block (loaded skills, rules, token count) to the user before proceeding.

1. **Gather requirements**
   - Ask for the flow type:
     - **Record-Triggered Flow**: Runs when a record is created, updated, or deleted
     - **Screen Flow**: User-interactive flow with screens
     - **Autolaunched Flow**: Called from Apex, other flows, or Process Builder
     - **Scheduled Flow**: Runs on a schedule against a set of records
     - **Platform Event-Triggered Flow**: Responds to platform events
   - Ask for the purpose and business logic description
   - Ask for the object context (for record-triggered and scheduled flows)
   - Ask for the trigger conditions: create, update, delete, or specific field changes

2. **Plan flow architecture**
   - Determine the run context: before-save or after-save (for record-triggered)
   - Before-save: field updates on the triggering record (no DML needed)
   - After-save: creating/updating related records, sending emails, calling Apex
   - Identify if the flow needs both before-save and after-save paths
   - Plan the entry conditions to filter which records enter the flow

3. **Budget governor limits**
   - Count planned SOQL queries (Get Records elements) — must stay under 100
   - Count planned DML operations (Create/Update/Delete Records) — must stay under 150
   - Identify any loops and ensure no DML or SOQL inside loops
   - Plan collection variables to bulk-process records outside loops
   - Document the expected SOQL and DML count in the design

4. **Design flow elements**
   - For each logical step, document:
     - **Element type**: Decision, Assignment, Get Records, Create Records, Update Records, Loop, Screen, Subflow, Apex Action
     - **Element name**: Following naming convention: `Get_Account_Records`, `Check_Status`, `Update_Contact_Fields`
     - **Purpose**: What this element does
     - **Inputs/Outputs**: Variables used and produced
     - **Conditions**: For Decision elements, document each outcome and its conditions
   - Order elements in execution sequence
   - Identify reusable subflows for common patterns

5. **Design fault handling**
   - Add fault paths for every DML and Get Records element
   - Design a fault handler that:
     - Captures the fault message in a text variable
     - Logs the error (via custom object, platform event, or email)
     - Displays a user-friendly error for screen flows
     - Rolls back changes where possible
   - Document the default fault connector behavior

6. **Define variables and resources**
   - List all variables with: name, data type, scope (input/output/local), default value
   - List all constants and formulas
   - List all text templates (for emails or screen display)
   - List all choices and choice sets (for screen flows)
   - Follow naming conventions: `var_RecordId`, `col_AccountList`, `txt_EmailBody`, `fml_DueDate`

7. **Generate design document**
   - Output a structured Markdown document containing:
     - Flow metadata: name, type, object, description, API version
     - Entry conditions with field-level detail
     - Element-by-element breakdown with descriptions
     - Variable and resource inventory
     - Governor limit budget summary
     - Fault handling strategy
     - Testing checklist: scenarios to validate after building
   - Note: This command generates a design document, not flow XML metadata

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--type` | Flow type | Prompt user |
| `--object` | Object API name | Prompt user (if applicable) |
| `--trigger` | Trigger event (create, update, delete) | Prompt user (if record-triggered) |
| `--output` | Output file path for design document | Print to console |

## Error Handling

- If the flow type is not specified, list available types with descriptions and ask
- If the object does not exist, warn and proceed with the provided name
- If the planned DML/SOQL count exceeds limits, flag the issue and suggest optimization
- If the design includes SOQL/DML inside loops, reject the design and suggest collection-based alternatives

## Example Usage

```
/scaffold-flow
/scaffold-flow --type Record-Triggered --object Case --trigger create,update
/scaffold-flow --type Screen --object Opportunity
/scaffold-flow --type Scheduled --object Lead
```
