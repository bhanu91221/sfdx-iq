---
description: LWC component review for best practices and performance
---

# /lwc-review

Review Lightning Web Components for best practices, performance, accessibility, and correctness.

## Workflow

0. **Load context** — Invoke the context-assigner agent with the description of this review task. Display the announcement block (loaded skills, rules, token count) to the user before proceeding.

1. **Identify components to review**
   - If a specific component path is provided, review that component
   - If no arguments, check for changed LWC files (`git diff --name-only` for files under `**/lwc/**`)
   - Each LWC component includes: `.js`, `.html`, `.css`, `.js-meta.xml`, and optionally test files

2. **Delegate to lwc-reviewer agent**
   - Pass all identified component files to the **lwc-reviewer** agent

3. **Review checks**

   **Decorators & Reactivity (Critical)**
   - Correct usage of `@api`, `@track`, `@wire`
   - Mutating `@api` properties (not allowed)
   - Unnecessary `@track` on objects/arrays (tracked by default since Spring '20)
   - Wire adapter parameter reactivity issues

   **Lifecycle Hooks (High)**
   - Correct hook usage: `connectedCallback`, `disconnectedCallback`, `renderedCallback`
   - DOM access in `constructor` (not allowed — DOM not ready)
   - Missing cleanup in `disconnectedCallback` (event listeners, intervals)
   - Infinite loops in `renderedCallback` (must be guarded)

   **Events (High)**
   - Custom event naming (lowercase, no uppercase, use kebab-case)
   - Event bubble/composed settings for cross-boundary communication
   - Missing event documentation
   - Using `CustomEvent` correctly with detail payload

   **Accessibility (High)**
   - Missing ARIA attributes on interactive elements
   - Missing labels on form inputs
   - Keyboard navigation support
   - Proper heading hierarchy

   **Performance (Medium)**
   - Large DOM trees (flag templates over 200 elements)
   - Unnecessary re-renders from tracked property mutations
   - Heavy computation in getters (should be cached)
   - Missing `if:true`/`lwc:if` guards on expensive sections

   **CSS (Medium)**
   - Use of `:::slotted` or deprecated shadow DOM selectors
   - Hardcoded colors instead of CSS custom properties / design tokens
   - Missing responsive design considerations

   **Meta Configuration (Low)**
   - Correct `isExposed` and `targets` in `.js-meta.xml`
   - Missing `masterLabel` or `description`
   - Target configurations for record pages, app pages, etc.

4. **Output format**
   - Group findings by severity: **Critical** > **High** > **Medium** > **Low**
   - For each finding: file, line, issue, impact, and fix suggestion
   - End with summary and top 3 action items

## Error Handling

- If component files are incomplete (e.g., missing HTML or JS), flag as a structural issue
- If Jest tests are missing, flag as a High severity finding

## Example Usage

```
/lwc-review
/lwc-review force-app/main/default/lwc/accountCard
```
