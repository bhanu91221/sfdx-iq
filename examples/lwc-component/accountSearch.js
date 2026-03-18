import { LightningElement, wire, track } from 'lwc';
import searchAccounts from '@salesforce/apex/AccountSearchController.searchAccounts';

const COLUMNS = [
    { label: 'Account Name', fieldName: 'Name', type: 'text', sortable: true },
    { label: 'Industry', fieldName: 'Industry', type: 'text' },
    { label: 'Phone', fieldName: 'Phone', type: 'phone' },
    { label: 'Website', fieldName: 'Website', type: 'url' }
];

const DEBOUNCE_DELAY = 300;

export default class AccountSearch extends LightningElement {
    @track searchTerm = '';
    @track accounts = [];
    @track error;
    @track isLoading = false;

    columns = COLUMNS;
    _debounceTimer;

    @wire(searchAccounts, { searchTerm: '$searchTerm' })
    wiredAccounts({ error, data }) {
        this.isLoading = false;
        if (data) {
            this.accounts = data;
            this.error = undefined;
        } else if (error) {
            this.error = this.reduceErrors(error);
            this.accounts = [];
        }
    }

    handleSearchChange(event) {
        clearTimeout(this._debounceTimer);
        const value = event.target.value;

        this._debounceTimer = setTimeout(() => {
            this.isLoading = true;
            this.searchTerm = value;
        }, DEBOUNCE_DELAY);
    }

    get hasResults() {
        return this.accounts && this.accounts.length > 0;
    }

    get noResultsFound() {
        return (
            this.searchTerm &&
            !this.isLoading &&
            !this.error &&
            (!this.accounts || this.accounts.length === 0)
        );
    }

    reduceErrors(error) {
        if (typeof error === 'string') {
            return error;
        }
        if (error.body && error.body.message) {
            return error.body.message;
        }
        if (error.message) {
            return error.message;
        }
        return 'An unknown error occurred.';
    }
}
