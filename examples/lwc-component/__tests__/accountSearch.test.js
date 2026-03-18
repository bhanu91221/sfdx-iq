import { createElement } from 'lwc';
import AccountSearch from 'c/accountSearch';
import searchAccounts from '@salesforce/apex/AccountSearchController.searchAccounts';

// Mock the Apex wire adapter
jest.mock(
    '@salesforce/apex/AccountSearchController.searchAccounts',
    () => {
        const { createApexTestWireAdapter } = require('@salesforce/sfdx-lwc-jest');
        return { default: createApexTestWireAdapter(jest.fn()) };
    },
    { virtual: true }
);

const MOCK_ACCOUNTS = [
    { Id: '001000000000001', Name: 'Acme Corp', Industry: 'Technology', Phone: '555-0100' },
    { Id: '001000000000002', Name: 'Acme Labs', Industry: 'Healthcare', Phone: '555-0200' }
];

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('c-account-search', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    function createComponent() {
        const element = createElement('c-account-search', { is: AccountSearch });
        document.body.appendChild(element);
        return element;
    }

    it('renders search input', () => {
        const element = createComponent();
        const input = element.shadowRoot.querySelector('lightning-input');
        expect(input).not.toBeNull();
        expect(input.type).toBe('search');
    });

    it('displays results when wire returns data', async () => {
        const element = createComponent();

        searchAccounts.emit(MOCK_ACCOUNTS);
        await flushPromises();

        const datatable = element.shadowRoot.querySelector('lightning-datatable');
        expect(datatable).not.toBeNull();
        expect(datatable.data).toHaveLength(2);
        expect(datatable.data[0].Name).toBe('Acme Corp');
    });

    it('displays error message when wire returns error', async () => {
        const element = createComponent();

        searchAccounts.error({ body: { message: 'Server error occurred' } });
        await flushPromises();

        const errorDiv = element.shadowRoot.querySelector('.slds-alert_error');
        expect(errorDiv).not.toBeNull();
        expect(errorDiv.textContent).toContain('Server error occurred');
    });

    it('shows no results message when search returns empty', async () => {
        const element = createComponent();

        // Simulate a search term being set then empty results
        const input = element.shadowRoot.querySelector('lightning-input');
        input.dispatchEvent(new CustomEvent('change', { detail: { value: 'xyz' } }));

        // Wait for debounce
        await new Promise((resolve) => setTimeout(resolve, 350));
        searchAccounts.emit([]);
        await flushPromises();

        const noResults = element.shadowRoot.querySelector('.slds-text-color_weak');
        expect(noResults).not.toBeNull();
    });

    it('shows loading spinner during search', async () => {
        const element = createComponent();

        const input = element.shadowRoot.querySelector('lightning-input');
        input.dispatchEvent(new CustomEvent('change', { detail: { value: 'test' } }));

        // Wait for debounce to set isLoading
        await new Promise((resolve) => setTimeout(resolve, 350));
        await flushPromises();

        const spinner = element.shadowRoot.querySelector('lightning-spinner');
        expect(spinner).not.toBeNull();
    });
});
