---
description: Deep analysis of Salesforce code — answer questions about behavior, logic, and data flow
---

# /analyze

Answer specific questions about any Salesforce code artifact: Apex classes, triggers, LWC components, Flows, SOQL queries. Understands the code's behavior, logic flow, and data relationships.

## Use Cases

- "When is this field assigned in this trigger?"
- "What SOQL queries run when this method is called?"
- "What does this Apex class do when invoked from a Flow?"
- "Trace the value of `Status__c` through all the code that touches it"
- "What validation runs before this record is saved?"
- "What happens to related records when this trigger fires?"

## Workflow

0. **Load context** — Invoke the context-assigner agent with the description of this analysis task. Display the announcement block (loaded skills, rules, token count) to the user before proceeding.

1. **Identify the target**
   - If `--file <path>` is provided, use that file
   - If `--field <fieldName>` is provided, search the codebase for all code that reads or writes that field
   - If neither flag is provided and a file is open in the editor, offer to use that file
   - If no file context is available, ask: "Which file or component would you like me to analyze? You can provide a path, a class/component name, or describe what you're looking for."
   - If the user provides a class/component name without a path, search the project:
     - Apex: `force-app/**/classes/<name>.cls`, `force-app/**/triggers/<name>.trigger`
     - LWC: `force-app/**/lwc/<name>/<name>.js`
     - Flow: `force-app/**/flows/<name>.flow-meta.xml`

2. **Read and understand the target file(s)**
   - Read the primary file fully
   - Identify all dependencies (called Apex classes, imported LWC components, referenced objects/fields)
   - For `--field` flag: also read all files that reference the field (grep for field API name across the codebase)

3. **Answer the user's question**
   - Answer the specific question first, directly and concisely
   - Then provide supporting details: which methods, which conditions, which line numbers
   - Use the actual code — quote specific lines when explaining behavior
   - If the answer involves multiple files, trace through them in execution order

4. **Field tracing** (`--field <SObject.FieldAPIName>` or `--field <FieldAPIName>`)
   - Search for all reads and writes to the field across: Apex classes, triggers, Flows, validation rules (if accessible)
   - For each occurrence, identify: file, line, operation (read/write/condition), trigger context (before insert, after update, etc.), conditions under which the assignment fires
   - Present as a timeline/map: "This field is written in these places: ..."

5. **Data flow analysis** (triggered by questions like "what happens when", "trace", "follow")
   - Map the execution chain from entry point to final state
   - Show: trigger → handler → service → selector → DML sequence
   - Identify side effects: related record updates, platform events published, emails sent, callouts made

6. **Output format**
   - Lead with a direct answer to the question
   - Follow with a structured breakdown (file:line references)
   - For field tracing, use a table:

   | File | Line | Operation | Condition |
   |------|------|-----------|-----------|
   | AccountTrigger.trigger | 12 | Write (before insert) | Always |
   | AccountService.cls | 47 | Write | `if (record.Type == 'Partner')` |
   | AccountValidation.cls | 23 | Read | Validation check |

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--file <path>` | File to analyze | Active editor file or prompt |
| `--field <name>` | Field API name to trace across codebase (e.g., `Status__c` or `Account.Status__c`) | None |
| `--question <text>` | Specific question to answer (alternative to inline question) | User's message |

## Examples

```
/analyze --file force-app/main/default/triggers/AccountTrigger.trigger
/analyze --file force-app/main/default/lwc/opportunityTiles/opportunityTiles.js
/analyze --field Status__c
/analyze --field Account.AnnualRevenue
/analyze --file AccountService.cls --question "when does this send an email?"
```
