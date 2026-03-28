# LWC Component Patterns

## Data Fetching

### @wire for Reactive Data (Preferred for Reads)

Use `@wire` for declarative, cacheable data retrieval:

```javascript
import getContacts from '@salesforce/apex/ContactController.getContacts';

export default class ContactList extends LightningElement {
    @api recordId;

    @wire(getContacts, { accountId: '$recordId' })
    contacts;

    get hasContacts() {
        return this.contacts?.data?.length > 0;
    }
}
```

### Imperative Apex for Mutations

Use imperative calls for create, update, delete operations:

```javascript
async handleSave() {
    try {
        await updateContact({ contact: this.editedContact });
        this.dispatchEvent(new ShowToastEvent({
            title: 'Success', message: 'Contact updated', variant: 'success'
        }));
    } catch (error) {
        this.error = reduceErrors(error);
    }
}
```

## Component Communication

### Child-to-Parent: CustomEvent

```javascript
// Child dispatches
this.dispatchEvent(new CustomEvent('select', {
    detail: { recordId: this.account.Id }
}));
```
```html
<!-- Parent listens -->
<c-account-card onselect={handleAccountSelect}></c-account-card>
```

### Unrelated Components: Lightning Message Service

```javascript
import { publish, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED from '@salesforce/messageChannel/RecordSelected__c';

@wire(MessageContext) messageContext;

handleSelect(event) {
    publish(this.messageContext, RECORD_SELECTED, { recordId: event.detail.id });
}
```

### Navigation

```javascript
import { NavigationMixin } from 'lightning/navigation';

export default class MyComponent extends NavigationMixin(LightningElement) {
    navigateToRecord(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId, objectApiName: 'Account', actionName: 'view' }
        });
    }
}
```

## Composition Patterns

Prefer composition over inheritance using slots:

```html
<!-- c-card (reusable wrapper) -->
<div class="slds-card">
    <div class="slds-card__header"><slot name="header"></slot></div>
    <div class="slds-card__body"><slot></slot></div>
    <div class="slds-card__footer"><slot name="footer"></slot></div>
</div>
```

## Public API

Expose properties with `@api` for parent components:

```javascript
@api recordId;
@api
get variant() { return this._variant; }
set variant(value) {
    this._variant = ['base', 'brand', 'destructive'].includes(value) ? value : 'base';
}
```

## Base Component Composition Patterns

Combine base components with SLDS layout utilities to build complex UIs without custom CSS.

### Record Tiles / Cards Grid (e.g., Opportunity Tiles)

```html
<template>
    <lightning-card title="Opportunities" icon-name="standard:opportunity">
        <div class="slds-p-around_medium">
            <div class="slds-grid slds-wrap slds-gutters">
                <template for:each={opportunities} for:item="opp">
                    <div key={opp.Id} class="slds-col slds-size_1-of-1 slds-medium-size_1-of-2 slds-large-size_1-of-3 slds-m-bottom_small">
                        <lightning-card>
                            <div class="slds-p-around_small">
                                <p class="slds-text-heading_small">{opp.Name}</p>
                                <lightning-formatted-number value={opp.Amount} format-style="currency" currency-code="USD"></lightning-formatted-number>
                                <!-- Color-coded stage using SLDS themes -->
                                <lightning-badge label={opp.StageName} class={opp.stageBadgeClass}></lightning-badge>
                            </div>
                        </lightning-card>
                    </div>
                </template>
            </div>
        </div>
    </lightning-card>
</template>
```

```javascript
// Compute SLDS theme class based on stage — no custom CSS needed
get opportunities() {
    return this._opportunities.map(opp => ({
        ...opp,
        stageBadgeClass: this.getStageBadgeClass(opp.StageName)
    }));
}

getStageBadgeClass(stage) {
    const stageMap = {
        'Closed Won': 'slds-theme_success',
        'Closed Lost': 'slds-theme_error',
        'Negotiation': 'slds-theme_warning',
        'Prospecting': 'slds-theme_shade'
    };
    return stageMap[stage] || 'slds-theme_shade';
}
```

### Two-Column Layout with Labels

```html
<div class="slds-grid slds-gutters">
    <div class="slds-col slds-size_1-of-2">
        <lightning-output-field field-name="Amount"></lightning-output-field>
    </div>
    <div class="slds-col slds-size_1-of-2">
        <lightning-output-field field-name="CloseDate"></lightning-output-field>
    </div>
</div>
```

### Inline Edit with Record Form

```html
<lightning-record-edit-form record-id={recordId} object-api-name="Opportunity">
    <lightning-messages></lightning-messages>
    <lightning-input-field field-name="Name"></lightning-input-field>
    <lightning-input-field field-name="Amount"></lightning-input-field>
    <lightning-input-field field-name="StageName"></lightning-input-field>
    <lightning-button type="submit" label="Save" variant="brand"></lightning-button>
</lightning-record-edit-form>
```

## Reactive Tracking

- `@track` is only needed for deep object/array mutation tracking
- Primitive properties are reactive by default since LWC v1.65+
- Reassign objects/arrays instead of mutating to trigger re-render:
  ```javascript
  // Correct: reassign
  this.items = [...this.items, newItem];
  // Avoid: mutation (won't trigger re-render without @track)
  this.items.push(newItem);
  ```
