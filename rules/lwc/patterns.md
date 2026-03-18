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
