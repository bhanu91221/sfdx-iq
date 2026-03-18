---
description: Create an implementation plan for a Salesforce feature
---

# /plan

Create a structured implementation plan for a Salesforce feature spanning Apex, LWC, metadata, and declarative configuration.

## Workflow

1. **Gather requirements**
   - Ask the user what feature they want to build
   - Identify the objects, fields, and relationships involved
   - Clarify the user stories or acceptance criteria

2. **Delegate to planner agent**
   - Pass the requirements to the `planner` agent
   - The planner creates a phased implementation plan

3. **Architecture validation**
   - Delegate to the `architect` agent for design review
   - Validate data model decisions (Master-Detail vs Lookup, record types, etc.)
   - Identify governor limit risks early

4. **Generate the plan**
   The plan should include:
   - **Data model changes**: New objects, fields, relationships
   - **Apex components**: Triggers, handlers, services, selectors, test classes
   - **LWC components**: UI components, wire services, events
   - **Declarative config**: Flows, validation rules, permission sets, layouts
   - **Integration points**: Callouts, platform events, CDC
   - **Testing strategy**: Unit tests, integration tests, bulk tests
   - **Deployment order**: Dependencies and sequencing

5. **Output format**
   Present as a numbered checklist grouped by phase:
   ```
   Phase 1: Data Model
   - [ ] Create Invoice__c object
   - [ ] Add Status__c picklist field

   Phase 2: Backend
   - [ ] Create InvoiceTrigger + InvoiceTriggerHandler
   - [ ] Create InvoiceService with business logic

   Phase 3: UI
   - [ ] Create invoiceList LWC component
   ```

## Flags

| Flag | Description |
|------|-------------|
| `--scope` | Limit plan to specific domain: `apex`, `lwc`, `flows`, `metadata` |
| `--detail` | Detail level: `high` (architecture only), `detailed` (includes code stubs) |

## Example

```
/plan Add invoice management with line items, PDF generation, and email delivery
```
