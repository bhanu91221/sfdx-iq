---
description: Explain what a Salesforce code artifact does — LWC components, Apex classes, triggers, Flows
---

# /explain

Produce a human-readable explanation of any Salesforce code artifact. Understands what the code does end-to-end: data sources, user interactions, business logic, side effects, and integration points.

## Use Cases

- "Explain this LWC component to me"
- "What does this Apex class do?"
- "What happens when this trigger fires?"
- "Walk me through this Flow step by step"
- "What does clicking this button do in the UI?"
- "Explain the data flow in this component"

## Workflow

0. **Load context** — Invoke the context-assigner agent based on the file type being explained. Display the announcement block (loaded skills, rules, token count) to the user before proceeding.

1. **Identify the file to explain**
   - If `--file <path>` is provided, use that file
   - If no file is specified and a file is open in the editor (VS Code), offer to explain the active file
   - If no file context is available, ask: "Which file would you like me to explain? You can provide a path, a class or component name, or describe what you're looking for."
   - If the user provides a name without a path, search the project:
     - LWC component: `force-app/**/lwc/<name>/<name>.js` (read all component files: .js, .html, .css)
     - Apex class: `force-app/**/classes/<name>.cls`
     - Trigger: `force-app/**/triggers/<name>.trigger`
     - Flow: `force-app/**/flows/<name>.flow-meta.xml`
   - Read all related files for the artifact (e.g., for LWC: read .js + .html + .css together)

2. **Detect file type and apply matching explanation strategy**

   **For LWC components** (`.js` / `.html` files under `**/lwc/**`):
   - Summarize the component's purpose in one sentence
   - Explain the template structure: what sections are shown, what conditions control visibility
   - Explain data sources: which `@wire` adapters or Apex methods provide data
   - Explain user interactions: what each button/input does, what events it fires
   - Explain parent/child relationships: what `@api` properties it exposes, what CustomEvents it emits
   - Identify any navigation, toast notifications, or Lightning Message Service usage
   - Describe the loading and error states

   **For Apex classes** (`.cls` files):
   - Summarize the class's role (Service, Selector, Controller, Batch, etc.)
   - Explain each public/global method: what it takes, what it does, what it returns
   - Identify SOQL queries and what data they fetch
   - Identify DML operations and what records they affect
   - Note any external callouts, platform events, email sends, or asynchronous jobs triggered
   - Highlight security: `with sharing` / `inherited sharing`, CRUD/FLS enforcement

   **For Triggers** (`.trigger` files):
   - State which object and which events (before insert, after update, etc.)
   - Explain what the trigger does for each event context
   - Trace the handler chain: trigger → handler class → service classes
   - Identify when specific fields get assigned or modified
   - Describe record conditions that activate the logic
   - Note any governor limit considerations

   **For Flows** (`.flow-meta.xml` files):
   - State the flow type and entry conditions
   - Walk through the flow elements in execution order
   - Explain each decision, assignment, loop, and DML/SOQL element
   - Describe what the flow does to records and what side effects it has

3. **Output format**

   Structure the explanation for human readability:

   ```
   ## What this [component/class/trigger/flow] does

   [One paragraph plain-English summary]

   ## How it works

   [Step-by-step explanation with code references (file:line)]

   ## Key behaviors

   - [Bullet: specific behavior with condition]
   - [Bullet: specific behavior with condition]

   ## Data flow

   [Entry point → processing → output/side effects]

   ## Dependencies

   - Calls: [Apex classes / components called]
   - Data: [Objects and fields accessed]
   - Events: [Events emitted or subscribed to]
   ```

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--file <path>` | File to explain | Active editor file or prompt |
| `--depth shallow` | One-paragraph summary only | Full explanation |
| `--depth deep` | Include all methods, all conditions, all edge cases | Standard |

## Examples

```
/explain
/explain --file force-app/main/default/lwc/opportunityTiles/opportunityTiles.js
/explain --file force-app/main/default/triggers/AccountTrigger.trigger
/explain --file force-app/main/default/classes/AccountService.cls
/explain AccountService
/explain opportunityTiles
/explain --file AccountTrigger.trigger --depth shallow
```
