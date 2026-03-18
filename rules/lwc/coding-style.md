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

- Use CSS custom properties for theming values:
  ```css
  :host {
    --brand-color: var(--lwc-brandPrimary, #0070d2);
    --spacing-md: var(--lwc-spacingMedium, 1rem);
  }
  ```
- Never use inline styles in HTML templates — use CSS classes
- Scope all styles within the component; LWC shadow DOM handles isolation
- Use SLDS design tokens via `var(--lwc-*)` for consistency

## Naming Conventions

- **Properties**: camelCase (`accountName`, `isLoading`)
- **Event handlers**: prefix with `handle` (`handleClick`, `handleSearch`)
- **Private reactive fields**: no underscore prefix, use `#` for truly private
- **Constants**: UPPER_SNAKE_CASE at module level (`const MAX_RECORDS = 50;`)
- **Boolean properties**: prefix with `is`, `has`, `should` (`isActive`, `hasError`)

## Template Formatting

- One attribute per line when an element has three or more attributes
- Always use `key` directive on iterated elements:
  ```html
  <template for:each={accounts} for:item="account">
      <c-account-card key={account.Id} account={account}></c-account-card>
  </template>
  ```
