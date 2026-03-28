---
description: Generate LWC component with template, styles, config, and test
---

# /scaffold-lwc

Generate a complete Lightning Web Component with JavaScript controller, HTML template, CSS stylesheet, metadata configuration, and Jest test file.

## Workflow

0. **Load context** — Invoke the context-assigner agent with the description of this scaffolding task. Display the announcement block (loaded skills, rules, token count) to the user before proceeding.

1. **Gather requirements**
   - Ask for the component name in camelCase (e.g., `accountList`, `contactForm`)
   - Ask for the component purpose or description
   - Ask for the target environments: Lightning App Page, Record Page, Home Page, Flow Screen, Experience Cloud
   - Ask for the object context if it is a record page component (e.g., Account, Contact)
   - Ask if the component needs wire service data, imperative Apex calls, or navigation

2. **Validate naming**
   - Ensure the name is camelCase with no hyphens, underscores, or uppercase first letter
   - Ensure the name does not conflict with existing components in the project
   - Check `force-app/main/default/lwc/` for name collisions
   - Component folder name must match the JS file name exactly

3. **Write all files**
   - Salesforce Cli Command `sf lightning generate component --name <componentName> --type lwc --output-dir force-app/main/default/lwc`
   - Report the created files with their paths

4. **Generate JavaScript controller**
   - File: `<componentName>/<componentName>.js`
   - Import `LightningElement` and any needed modules:
     - `api` for public properties
     - `wire` for wire service
     - `track` only if needed (rarely in modern LWC)
     - `NavigationMixin` if navigation is required
   - Add `@api` properties for record page context: `recordId`, `objectApiName`
   - Add wire adapters based on requirements:
     - `getRecord` / `getFieldValue` for record data
     - Custom Apex method imports with `@salesforce/apex/`
   - Include proper error handling: try/catch for imperative calls, error property for wire
   - Add JSDoc comments for all public properties and methods
   - Include lifecycle hooks as needed: `connectedCallback`, `renderedCallback`, `disconnectedCallback`

5. **Generate HTML template**
   - File: `<componentName>/<componentName>.html`
   - Use `<template>` as root element
   - **Base components FIRST**: Before writing any `<div>` or `<span>`, check the base component selection matrix and use the matching Lightning component
   - Always wrap content in `lightning-card` with appropriate title and icon-name
   - Add conditional rendering with `lwc:if` / `lwc:else` (not `if:true` which is deprecated)
   - Include `lightning-spinner` for loading states
   - Add error display block for error states using SLDS alert classes
   - Layout: use `lightning-layout` + `lightning-layout-item`, or SLDS grid classes (`slds-grid`, `slds-col`, `slds-size_*`) for multi-column layouts
   - Tables/lists of records: `lightning-datatable` — never a custom table or `<ul>`
   - Forms: `lightning-record-form`, `lightning-record-edit-form`, or `lightning-record-view-form` with `lightning-input-field` / `lightning-output-field`
   - Inputs: `lightning-input`, `lightning-combobox`, `lightning-textarea` — never raw `<input>` or `<select>`
   - Buttons: `lightning-button` or `lightning-button-icon` — never `<button>`
   - Status labels / badges: `lightning-badge` with SLDS theme class — never a custom `<span>` with color CSS
   - Icons: `lightning-icon` — never inline SVG or `<img>`
   - Formatted values: `lightning-formatted-number`, `lightning-formatted-date-time`, `lightning-formatted-currency` — never custom JS formatting in template
   - Raw `<div>` and `<span>` are only permitted for structural wrappers (grid columns, spacing containers) where no base component applies
   - Use SLDS utility classes for all spacing (`slds-p-around_medium`), text styles (`slds-text-heading_small`), and colors (`slds-text-color_success`) — never write CSS for these

6. **Generate CSS stylesheet**
   - File: `<componentName>/<componentName>.css`
   - **Default: write zero CSS.** If the design can be achieved with SLDS utility classes in the template, leave the CSS file empty (just the generated placeholder)
   - Only generate CSS when SLDS utility classes and Lightning base components genuinely cannot satisfy the requirement
   - If CSS is required, restrict `:host` to structural rules only: `display`, `overflow`, `position`, `width`, `height`
   - Never write custom colors — use `var(--lwc-colorTextDefault)`, `var(--lwc-brandPrimary)`, etc.
   - Never write custom spacing — use SLDS utility classes (`slds-p-around_medium`, `slds-m-bottom_small`) in the template instead
   - Never write custom shadows, border-radius, or font styles — SLDS covers all of these
   - Never override `.slds-*` classes — this breaks theme consistency
   - If you find yourself writing more than 10 lines of CSS, stop and reconsider whether SLDS utility classes can replace them

7. **Generate metadata configuration**
   - File: `<componentName>/<componentName>.js-meta.xml`
   - Set `apiVersion` to latest (e.g., `62.0`)
   - Set `isExposed` to `true`
   - Add `<targets>` based on user-specified environments
   - Add `<targetConfigs>` with design attributes for App Builder configurability
   - Include `<objects>` filter if component is object-specific

8. **Generate Jest test file**
   - File: `<componentName>/__tests__/<componentName>.test.js`
   - Import the component and create test element
   - Mock wire adapters using `@salesforce/sfdx-lwc-jest` utilities
   - Test scenarios:
     - Component renders without errors
     - Public properties are reflected in the DOM
     - Wire data displays correctly
     - Error state renders error message
     - User interactions trigger expected behavior
     - Accessibility: component uses proper ARIA attributes
   - Use `async/await` with `Promise.resolve()` for DOM updates
   - Clean up DOM after each test with `document.body.removeChild()`

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--name` | Component name in camelCase | Prompt user |
| `--targets` | Comma-separated target pages | `lightning__AppPage,lightning__RecordPage` |
| `--object` | Object API name for record pages | None |
| `--wire` | Include wire service setup | `false` |
| `--apex` | Apex class to import for imperative calls | None |
| `--output-dir` | Output directory | `force-app/main/default/lwc` |

## Error Handling

- If the component name is not valid camelCase, suggest the corrected name
- If the component directory already exists, ask whether to overwrite or merge
- If the specified Apex class for import does not exist, generate with a TODO placeholder
- If targets include `lightning__FlowScreen`, add `@api` input/output properties for Flow

## Example Usage

```
/scaffold-lwc
/scaffold-lwc --name accountList --targets lightning__RecordPage --object Account --wire
/scaffold-lwc --name contactForm --apex ContactController
/scaffold-lwc --name dashboardWidget --targets lightning__AppPage,lightning__HomePage
```
