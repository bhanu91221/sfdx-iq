---
name: lwc-testing
description: LWC Jest testing patterns including wire adapters, DOM queries, event testing, and mocking
origin: claude-sfdx-iq
---

# LWC Testing

## Jest Setup

### Install sfdx-lwc-jest

```bash
sf force lightning lwc test setup
# or
npm install @salesforce/sfdx-lwc-jest --save-dev
```

### jest.config.js

```javascript
const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

module.exports = {
    ...jestConfig,
    moduleNameMapper: {
        '^lightning/navigation$': '<rootDir>/force-app/test/jest-mocks/lightning/navigation',
        '^lightning/platformShowToastEvent$': '<rootDir>/force-app/test/jest-mocks/lightning/platformShowToastEvent'
    },
    testTimeout: 10000
};
```

## Test File Location

```
force-app/main/default/lwc/
  myComponent/
    myComponent.html
    myComponent.js
    myComponent.js-meta.xml
    __tests__/
      myComponent.test.js      ← Jest test file
```

## createElement Pattern

```javascript
import { createElement } from 'lwc';
import MyComponent from 'c/myComponent';

describe('c-my-component', () => {
    let element;

    beforeEach(() => {
        element = createElement('c-my-component', {
            is: MyComponent
        });
    });

    afterEach(() => {
        // Clean up the DOM after each test
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('renders component', () => {
        document.body.appendChild(element);

        const heading = element.shadowRoot.querySelector('h1');
        expect(heading).not.toBeNull();
        expect(heading.textContent).toBe('Expected Title');
    });
});
```

## Wire Adapter Testing

### registerApexTestWireAdapter (Apex Wire)

```javascript
import { createElement } from 'lwc';
import { registerApexTestWireAdapter } from '@salesforce/sfdx-lwc-jest';
import ContactList from 'c/contactList';
import getContacts from '@salesforce/apex/ContactController.getContacts';

// Register the Apex wire adapter mock
const getContactsAdapter = registerApexTestWireAdapter(getContacts);

const MOCK_CONTACTS = [
    { Id: '003xx000004TgcAAAS', Name: 'John Doe', Email: 'john@example.com' },
    { Id: '003xx000004TgcBAAS', Name: 'Jane Smith', Email: 'jane@example.com' }
];

describe('c-contact-list', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('displays contacts when wire returns data', async () => {
        const element = createElement('c-contact-list', { is: ContactList });
        document.body.appendChild(element);

        // Emit data through the wire adapter
        getContactsAdapter.emit(MOCK_CONTACTS);

        // Wait for rerender
        await Promise.resolve();

        const items = element.shadowRoot.querySelectorAll('li');
        expect(items.length).toBe(2);
        expect(items[0].textContent).toBe('John Doe');
    });

    it('displays error when wire fails', async () => {
        const element = createElement('c-contact-list', { is: ContactList });
        document.body.appendChild(element);

        // Emit error through the wire adapter
        getContactsAdapter.error();

        await Promise.resolve();

        const errorPanel = element.shadowRoot.querySelector('c-error-panel');
        expect(errorPanel).not.toBeNull();
    });
});
```

### registerLdsTestWireAdapter (Lightning Data Service)

```javascript
import { createElement } from 'lwc';
import { registerLdsTestWireAdapter } from '@salesforce/sfdx-lwc-jest';
import { getRecord } from 'lightning/uiRecordApi';
import AccountDetail from 'c/accountDetail';

const getRecordAdapter = registerLdsTestWireAdapter(getRecord);

const MOCK_RECORD = {
    fields: {
        Name: { value: 'Acme Corp' },
        Industry: { value: 'Technology' },
        AnnualRevenue: { value: 5000000 }
    }
};

describe('c-account-detail', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders account name from wire', async () => {
        const element = createElement('c-account-detail', { is: AccountDetail });
        element.recordId = '001xx000003DGb0AAG';
        document.body.appendChild(element);

        getRecordAdapter.emit(MOCK_RECORD);

        await Promise.resolve();

        const nameField = element.shadowRoot.querySelector('[data-id="name"]');
        expect(nameField.textContent).toBe('Acme Corp');
    });
});
```

## DOM Querying with shadowRoot

```javascript
// Single element
const button = element.shadowRoot.querySelector('lightning-button');
const customEl = element.shadowRoot.querySelector('c-child-component');
const byDataId = element.shadowRoot.querySelector('[data-id="save-btn"]');
const byClass = element.shadowRoot.querySelector('.error-message');

// Multiple elements
const allButtons = element.shadowRoot.querySelectorAll('lightning-button');
const listItems = element.shadowRoot.querySelectorAll('li');

// Nested shadow DOM (child component)
const child = element.shadowRoot.querySelector('c-child');
const childButton = child.shadowRoot.querySelector('lightning-button');

// Check existence
expect(element.shadowRoot.querySelector('.hidden-panel')).toBeNull();
expect(element.shadowRoot.querySelector('.visible-panel')).not.toBeNull();
```

## flushPromises

```javascript
// Utility to flush all pending promises
function flushPromises() {
    return new Promise((resolve) => setImmediate(resolve));
}

// Or simply use:
await Promise.resolve(); // Single microtask flush

// For multiple async operations:
await flushPromises();

// Usage in tests
it('updates after async operation', async () => {
    const element = createElement('c-my-component', { is: MyComponent });
    document.body.appendChild(element);

    // Trigger an action that causes async updates
    const button = element.shadowRoot.querySelector('lightning-button');
    button.click();

    // Wait for all promises to resolve
    await flushPromises();

    // Now verify the DOM updated
    const result = element.shadowRoot.querySelector('.result');
    expect(result.textContent).toBe('Updated');
});
```

## Event Dispatch Testing

### Testing CustomEvent Dispatch

```javascript
it('fires select event when item clicked', async () => {
    const element = createElement('c-item-card', { is: ItemCard });
    element.item = { Id: '001', Name: 'Test Item' };
    document.body.appendChild(element);

    // Create a mock handler
    const handler = jest.fn();
    element.addEventListener('select', handler);

    // Trigger the action
    const link = element.shadowRoot.querySelector('a');
    link.click();

    // Verify event was fired
    expect(handler).toHaveBeenCalledTimes(1);

    // Verify event detail
    const eventDetail = handler.mock.calls[0][0].detail;
    expect(eventDetail.id).toBe('001');
    expect(eventDetail.name).toBe('Test Item');
});
```

### Testing Event Handling from Child

```javascript
it('handles event from child component', async () => {
    const element = createElement('c-parent', { is: Parent });
    document.body.appendChild(element);

    await Promise.resolve();

    // Find the child and dispatch an event from it
    const child = element.shadowRoot.querySelector('c-child');
    child.dispatchEvent(new CustomEvent('itemselected', {
        detail: { recordId: '001xx000003DGb0' }
    }));

    await Promise.resolve();

    // Verify parent handled the event
    const detail = element.shadowRoot.querySelector('.selected-record');
    expect(detail.textContent).toContain('001xx000003DGb0');
});
```

## Mock Module Resolution

### Mocking @salesforce Imports

```javascript
// __mocks__/@salesforce/apex/ContactController.getContacts.js
const getContacts = jest.fn();
export default getContacts;
```

### Mocking lightning/navigation

```javascript
// force-app/test/jest-mocks/lightning/navigation.js
export const CurrentPageReference = jest.fn();

let _pageRef;
export function getPageReference() {
    return _pageRef;
}

const Navigate = Symbol('Navigate');
const GenerateUrl = Symbol('GenerateUrl');

export const NavigationMixin = (Base) => {
    return class extends Base {
        [Navigate](pageRef) {
            _pageRef = pageRef;
        }
        [GenerateUrl](pageRef) {
            return Promise.resolve('https://test.salesforce.com');
        }
    };
};

NavigationMixin.Navigate = Navigate;
NavigationMixin.GenerateUrl = GenerateUrl;
```

### Mocking lightning/platformShowToastEvent

```javascript
// force-app/test/jest-mocks/lightning/platformShowToastEvent.js
export class ShowToastEvent {
    constructor(config) {
        this.title = config.title;
        this.message = config.message;
        this.variant = config.variant;
    }
}

export const ShowToastEventName = 'lightning__showtoast';
```

## Testing @api Properties

```javascript
it('reflects public property changes', async () => {
    const element = createElement('c-status-badge', { is: StatusBadge });
    document.body.appendChild(element);

    // Set public property
    element.status = 'Active';

    await Promise.resolve();

    const badge = element.shadowRoot.querySelector('.badge');
    expect(badge.textContent).toBe('Active');
    expect(badge.classList.contains('active')).toBe(true);

    // Change property
    element.status = 'Inactive';

    await Promise.resolve();

    expect(badge.textContent).toBe('Inactive');
    expect(badge.classList.contains('inactive')).toBe(true);
});
```

## Testing @api Methods

```javascript
it('calls public method', async () => {
    const element = createElement('c-data-table', { is: DataTable });
    document.body.appendChild(element);

    // Call public method
    element.refresh();

    await flushPromises();

    // Verify the component re-fetched data
    expect(getDataAdapter.getLastConfig()).toBeTruthy();
});
```

## Imperative Apex Call Testing

```javascript
import createContact from '@salesforce/apex/ContactController.createContact';

jest.mock('@salesforce/apex/ContactController.createContact', () => ({
    default: jest.fn()
}), { virtual: true });

describe('c-create-contact', () => {
    it('calls Apex on save', async () => {
        createContact.mockResolvedValue({ Id: '003xx000004TgcA' });

        const element = createElement('c-create-contact', { is: CreateContact });
        document.body.appendChild(element);

        // Fill form fields
        const nameInput = element.shadowRoot.querySelector('[data-id="lastName"]');
        nameInput.value = 'Smith';
        nameInput.dispatchEvent(new CustomEvent('change'));

        // Click save
        const saveBtn = element.shadowRoot.querySelector('[data-id="save"]');
        saveBtn.click();

        await flushPromises();

        // Verify Apex was called with correct params
        expect(createContact).toHaveBeenCalledWith({
            lastName: 'Smith'
        });

        // Verify success toast
        const toast = element.shadowRoot.querySelector('lightning-toast');
        // or check via event listener
    });

    it('handles Apex error', async () => {
        createContact.mockRejectedValue({
            body: { message: 'Required field missing' }
        });

        const element = createElement('c-create-contact', { is: CreateContact });
        document.body.appendChild(element);

        const saveBtn = element.shadowRoot.querySelector('[data-id="save"]');
        saveBtn.click();

        await flushPromises();

        const errorMsg = element.shadowRoot.querySelector('.error');
        expect(errorMsg.textContent).toContain('Required field missing');
    });
});
```

## Test Data Patterns

```javascript
// Use factory functions for test data
function createMockAccount(overrides = {}) {
    return {
        Id: '001xx000003DGb0AAG',
        Name: 'Test Account',
        Industry: 'Technology',
        AnnualRevenue: 1000000,
        ...overrides
    };
}

function createMockContacts(count = 3) {
    return Array.from({ length: count }, (_, i) => ({
        Id: `003xx00000${String(i).padStart(5, '0')}AAA`,
        Name: `Contact ${i + 1}`,
        Email: `contact${i + 1}@example.com`
    }));
}
```

## Testing Checklist

| Area | Test |
|------|------|
| Rendering | Component renders without errors |
| @api props | Property changes update DOM |
| @wire data | Data renders correctly |
| @wire error | Error state renders correctly |
| Events | CustomEvents fire with correct detail |
| User actions | Click/input handlers work |
| Imperative Apex | Success and error paths |
| Conditional | lwc:if branches render correctly |
| Loops | for:each renders correct items |
| Navigation | NavigationMixin calls correct pageRef |
| Accessibility | ARIA attributes present |
