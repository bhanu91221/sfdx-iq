---
description: Modify existing Salesforce code — add features, change behavior, add field logic, extend functionality
---

# /modify

Make targeted changes to existing Salesforce code: add new features or methods, modify existing behavior, add field logic to triggers or classes, or extend component functionality. Works with Apex classes, triggers, LWC components, and Flows.

## Use Cases

- "Add a new utility method to this Apex class"
- "I want this new feature in this LWC component"
- "Add logic to set this field when the status changes to Closed"
- "Add a button to this LWC that opens the related record"
- "Modify this trigger to also handle after delete"
- "Add a new validation to this service method"
- "Extend this batch class to process a second object type"
- "Add error logging to this class"

## Workflow

0. **Load context** — Invoke the context-assigner agent based on the file type being modified. Display the announcement block (loaded skills, rules, token count) to the user before proceeding.

1. **Identify the target file**
   - If `--file <path>` is provided, use that file
   - If no file is specified and a file is open in the editor (VS Code), offer to modify the active file
   - If no file context is available, ask: "Which file would you like me to modify? You can provide a path, a class or component name, or describe what you want to change."
   - If the user provides a name without a path, search the project:
     - Apex class: `force-app/**/classes/<name>.cls`
     - Trigger: `force-app/**/triggers/<name>.trigger`
     - LWC: `force-app/**/lwc/<name>/<name>.js` (and related .html / .css)
     - Flow: search `force-app/**/flows/`

2. **Read and understand the existing code**
   - Read the full file before proposing any changes
   - Understand the existing structure, naming patterns, and architecture used
   - For Apex: note `with sharing`, pattern type (Service/Selector/Controller), existing method signatures
   - For LWC: note existing `@wire` adapters, `@api` properties, event handlers, and template structure
   - For Triggers: note which events are handled, the handler pattern in use

3. **Understand the requested change**
   - Restate the requested change in one sentence to confirm understanding
   - If the request is ambiguous, ask ONE clarifying question before proceeding
   - Identify the change type:
     - **Add feature**: New method, new UI element, new functionality
     - **Modify behavior**: Change how existing logic works
     - **Add field logic**: Assign or evaluate a specific field under certain conditions
     - **Extend**: Add support for additional object types, events, or scenarios

4. **Plan the change**
   - Describe what will be added or changed BEFORE writing any code
   - Identify all files that need to be modified (e.g., adding an Apex method may require updating the test class and LWC caller)
   - Check for governor limit implications: new SOQL queries, DML, loops
   - Check security: new methods need `with sharing`, new SOQL needs bind variables or `WITH SECURITY_ENFORCED`
   - For LWC changes: check if new base components are needed instead of custom HTML

5. **Apply the change**
   - Make the minimal change required — do not refactor unrelated code
   - Follow the existing naming conventions and code style in the file
   - For Apex additions:
     - New methods follow the same access modifier and pattern as existing methods
     - Bulkify by default: accept `List<SObject>` not single records
     - Add a corresponding test method to the test class
   - For LWC additions:
     - New UI elements use Lightning base components and SLDS utility classes (no custom CSS for colors/spacing)
     - New Apex calls use the same wire/imperative pattern already established in the component
     - New events follow the existing CustomEvent pattern
   - For Trigger additions:
     - New event handlers delegate to the existing handler class (one trigger per object)
     - New handler methods are bulkified (operate on `List<SObject>` or `Map<Id, SObject>`)
   - For field logic additions:
     - New field assignments go in the correct trigger context (before insert/update for most writes)
     - Conditions are explicit and testable

6. **Update related files**
   - If an Apex method is added: update the test class with at least one test for the new method
   - If an LWC property or method is added: update the Jest test file with coverage for the new behavior
   - If a trigger event is added: ensure the handler class covers it

7. **Summarize changes**
   - List every file modified and what was changed in each
   - Note any new dependencies introduced
   - Flag any items the user should verify (e.g., field API names to confirm, permission requirements)

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--file <path>` | File to modify | Active editor file or prompt |
| `--change <description>` | Description of the change (alternative to inline description) | User's message |

## Behavior by File Type

### Apex Class Modifications

- Preserve existing `with sharing` / `inherited sharing` declaration
- New methods must be bulkified (no single-record assumptions)
- No new SOQL or DML inside loops
- New public methods get JSDoc-style comments
- Test class updated with new test method covering happy path + at least one negative/edge case

### LWC Component Modifications

- Read `.js`, `.html`, and `.css` before making changes
- New UI: base components first, SLDS utility classes for styling, zero custom CSS for colors/spacing
- New data: prefer `@wire` for reads, imperative for mutations
- New Apex method imports follow existing import pattern
- Test file (`.test.js`) updated to cover new behavior

### Trigger Modifications

- All new logic goes through the existing handler class (never inline in the trigger file)
- New handler methods are named descriptively: `handleBeforeInsert`, `assignStatusOnUpdate`, etc.
- New field assignments explicitly state the trigger context they belong in
- Test class updated with bulk test scenarios (200+ records) for new logic

### Flow Modifications

- Flow changes are described as design guidance (step-by-step instructions for the user to implement in Flow Builder), not as XML edits, unless the user explicitly requests XML
- Identify which element type to add (Assignment, Decision, DML, etc.) and where to insert it

## Examples

```
/modify
/modify --file AccountService.cls
/modify --file opportunityTiles.js
/modify --file AccountTrigger.trigger --change "set Status__c to 'Reviewed' after update when Amount > 100000"
/modify AccountService --change "add a method to calculate average opportunity amount per account"
/modify opportunityTiles --change "add a filter dropdown to show only open opportunities"
```
