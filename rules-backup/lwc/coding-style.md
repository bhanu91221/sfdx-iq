---
paths:
  - "**/lwc/**/*.js"
  - "**/lwc/**/*.html"
  - "**/lwc/**/*.css"
---

# LWC Coding Style

## Component Folder Naming

- Use **camelCase** for component folder names: `accountDetails`, `contactSearchBar`, `orderLineItem`
- Never use hyphens or underscores in folder names
- HTML templates must match the component folder name exactly

## Component Folder Structure

Every component folder must contain these files in this order of creation:

```
accountDetails/
  accountDetails.js          # Component logic
  accountDetails.html        # Template
  accountDetails.css         # Styles (optional)
  accountDetails.js-meta.xml # Metadata configuration
  __tests__/                 # Jest tests
    accountDetails.test.js
```

## Import Ordering

Organize imports in this sequence, separated by blank lines:

```javascript
// 1. Salesforce platform imports
import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

// 2. Apex method imports
import getAccounts from '@salesforce/apex/AccountController.getAccounts';

// 3. Schema imports
import ACCOUNT_OBJECT from '@salesforce/schema/Account';
import NAME_FIELD from '@salesforce/schema/Account.Name';

// 4. Custom labels and resources
import headerLabel from '@salesforce/label/c.HeaderLabel';
import logo from '@salesforce/resourceUrl/companyLogo';
```

## CSS Rules

- **SLDS first**: Always use SLDS utility classes in the template before writing any CSS
- Use CSS custom properties for theming values only when no SLDS token covers the need:
  ```css
  :host {
    --brand-color: var(--lwc-brandPrimary, #0070d2);
    --spacing-md: var(--lwc-spacingMedium, 1rem);
  }
  ```
- Never use inline styles in HTML templates — use CSS classes
- Scope all styles within the component; LWC shadow DOM handles isolation
- Use SLDS design tokens via `var(--lwc-*)` for consistency
- Restrict `:host` to structural rules only (`display`, `overflow`, `position`) — never use `:host` for colors, fonts, spacing, or shadows that SLDS already handles

## CSS Anti-Patterns (Never Do These)

The following patterns produce inconsistent UI and violate Salesforce UX standards:

- **Do NOT override SLDS classes**: Never write `.slds-card { ... }`, `.slds-badge { ... }`, or any selector that targets an existing SLDS class
- **Do NOT write custom colors**: Never use hardcoded hex/rgb values (`#0070d2`, `rgba(0,0,0,0.5)`) — use `var(--lwc-colorTextDefault)`, `var(--lwc-brandPrimary)`, etc.
- **Do NOT write custom spacing**: Never use `padding: 1rem`, `margin: 8px` — use SLDS spacing classes (`slds-p-around_medium`, `slds-m-bottom_small`)
- **Do NOT write custom shadows**: Never write `box-shadow: 0 2px 4px ...` — use `slds-card` or `slds-box` which include appropriate elevation
- **Do NOT write custom border-radius**: Use SLDS tokens (`var(--lwc-borderRadiusMedium)`) or SLDS components
- **Do NOT write custom font sizes or weights**: Use `slds-text-heading_small`, `slds-text-body_regular`, etc.
- **Do NOT recreate badge/pill/tile patterns**: If SLDS provides a component or utility class for a visual pattern, use it

## CSS Decision Hierarchy

When styling any element, follow this order and stop at the first option that works:

1. **SLDS utility class in template** — `slds-badge`, `slds-pill`, `slds-text-color_success`, `slds-theme_success`
2. **Lightning base component** — `lightning-badge`, `lightning-card`, `lightning-icon`
3. **SLDS design token via `var(--lwc-*)`** in CSS — for values not covered by utility classes
4. **Custom CSS** — only as an absolute last resort when no SLDS option exists; document why in a comment

Example of correct approach for a color-coded status badge:
```html
<!-- CORRECT: use SLDS utility classes -->
<span class="slds-badge slds-theme_success">Closed Won</span>
<span class="slds-badge slds-theme_warning">Needs Review</span>
<span class="slds-badge slds-theme_error">Closed Lost</span>

<!-- WRONG: custom CSS class with hardcoded color -->
<span class="stage-badge stage-won">Closed Won</span>
```

## Naming Conventions

- **Properties**: camelCase (`accountName`, `isLoading`)
- **Event handlers**: prefix with `handle` (`handleClick`, `handleSearch`)
- **Private reactive fields**: no underscore prefix, use `#` for truly private
- **Constants**: UPPER_SNAKE_CASE at module level (`const MAX_RECORDS = 50;`)
- **Boolean properties**: prefix with `is`, `has`, `should` (`isActive`, `hasError`)

## Base Component First Rule

Always evaluate Lightning base components before writing custom HTML. Using base components ensures consistent UI, built-in accessibility, SLDS theming compliance, and Salesforce platform integration.

### Base Component Selection Matrix

| UI Requirement | Use This | Never Use |
|---|---|---|
| Display a list of records in a table | `lightning-datatable` | `<table>` or `<div>` rows |
| View/edit a single record | `lightning-record-form` or `lightning-record-edit-form` | Custom form with `<input>` |
| Read-only record display | `lightning-record-view-form` + `lightning-output-field` | Custom field labels/values |
| Card/tile container | `lightning-card` | `<div class="card">` |
| Input field (text, number, date) | `lightning-input` | `<input>` |
| Picklist / dropdown | `lightning-combobox` | `<select>` |
| Textarea | `lightning-textarea` | `<textarea>` |
| Checkbox | `lightning-input type="checkbox"` | `<input type="checkbox">` |
| Button | `lightning-button` or `lightning-button-icon` | `<button>` |
| Status/stage label | `lightning-badge` with SLDS theme | `<span>` with custom CSS |
| Icon | `lightning-icon` | `<img>` or SVG inline |
| Formatted currency | `lightning-formatted-number` | Custom JS formatting |
| Formatted date | `lightning-formatted-date-time` | `new Date().toLocaleString()` |
| Formatted phone | `lightning-formatted-phone` | Raw text |
| Formatted email | `lightning-formatted-email` | Raw text |
| Navigation link | `lightning-formatted-url` or NavigationMixin | `<a href>` |
| Lookup / record picker | `lightning-record-picker` | Custom search input |
| Spinner/loading | `lightning-spinner` | Custom CSS animation |
| Toast notification | `ShowToastEvent` | Custom alert `<div>` |
| Progress bar | `lightning-progress-bar` | Custom CSS bar |
| Tab set | `lightning-tabset` + `lightning-tab` | Custom tab `<div>` |
| Accordion | `lightning-accordion` | Custom expand/collapse |
| Breadcrumb | `lightning-breadcrumb` | Custom `<span>` links |
| Layout (2-col, 3-col) | `lightning-layout` + `lightning-layout-item` | CSS flexbox/grid |

### Custom HTML Only When

Use `<div>`, `<span>`, or other raw HTML **only when**:
1. No base component covers the use case, AND
2. No SLDS utility class covers the layout need, AND
3. You have documented why in a comment

## Template Formatting

- One attribute per line when an element has three or more attributes
- Always use `key` directive on iterated elements:
  ```html
  <template for:each={accounts} for:item="account">
      <c-account-card key={account.Id} account={account}></c-account-card>
  </template>
  ```
