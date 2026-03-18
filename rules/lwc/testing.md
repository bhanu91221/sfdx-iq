# LWC Jest Testing

## File Naming and Location

- Test files live in `__tests__/` inside the component folder
- Naming convention: `componentName.test.js`
- One test file per component; group related tests with `describe` blocks

## Component Instantiation

Use `createElement` from `lwc` to create components under test:

```javascript
import { createElement } from 'lwc';
import AccountList from 'c/accountList';

describe('c-account-list', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders account records', () => {
        const element = createElement('c-account-list', { is: AccountList });
        document.body.appendChild(element);
    });
});
```

Always clean up the DOM in `afterEach` to avoid test pollution.

## Mocking Wire Adapters

Mock `@wire` adapters to control test data:

```javascript
import { registerApexTestWireAdapter } from '@salesforce/sfdx-lwc-jest';
import getAccounts from '@salesforce/apex/AccountController.getAccounts';

const getAccountsAdapter = registerApexTestWireAdapter(getAccounts);

it('displays accounts when wire returns data', async () => {
    const element = createElement('c-account-list', { is: AccountList });
    document.body.appendChild(element);

    getAccountsAdapter.emit([
        { Id: '001xx000003ABCD', Name: 'Acme Corp' },
        { Id: '001xx000003EFGH', Name: 'Global Inc' }
    ]);

    await Promise.resolve();

    const items = element.shadowRoot.querySelectorAll('lightning-card');
    expect(items.length).toBe(2);
});
```

## DOM Assertions

Query the shadow DOM using `element.shadowRoot.querySelector()`:

```javascript
const heading = element.shadowRoot.querySelector('h1');
expect(heading.textContent).toBe('Account List');

const buttons = element.shadowRoot.querySelectorAll('lightning-button');
expect(buttons.length).toBe(3);
```

## Event Simulation

Dispatch events to simulate user interaction:

```javascript
it('fires select event on row click', async () => {
    const handler = jest.fn();
    element.addEventListener('select', handler);

    const row = element.shadowRoot.querySelector('[data-id="001xx000003ABCD"]');
    row.dispatchEvent(new CustomEvent('click'));

    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ recordId: '001xx000003ABCD' });
});
```

## Async Handling

LWC re-renders are microtask-based. Flush pending updates with `Promise.resolve()`:

```javascript
await Promise.resolve(); // single re-render flush
// For multiple sequential state updates, chain:
await Promise.resolve();
await Promise.resolve();
```

Use `jest.runAllTimers()` when testing debounced or delayed operations.

## Mocking Navigation and Toast

```javascript
// Mock NavigationMixin
const NAV_MOCK = { Navigate: jest.fn(), GenerateUrl: jest.fn() };
// Assert navigation called with expected page reference

// Mock ShowToastEvent
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
const toastHandler = jest.fn();
element.addEventListener('lightning__showtoast', toastHandler);
```

## Schema Mocks

Create mock files in `__mocks__/@salesforce/schema/`:

```javascript
// __mocks__/@salesforce/schema/Account.Name.js
export default { fieldApiName: 'Name', objectApiName: 'Account' };
```
