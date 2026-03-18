---
name: lwc-patterns
description: LWC component patterns including wire service, events, navigation, composition, and record forms
origin: claude-sfdx-iq
tokens: 2988
domain: lwc
---

# LWC Patterns

## @wire for Reads (Cached, Reactive)

The wire service provides a reactive, cached data pipeline. Use it for read operations.

### Wire to a Property

```javascript
import { LightningElement, wire, api } from 'lwc';
import getAccountDetails from '@salesforce/apex/AccountController.getAccountDetails';

export default class AccountDetail extends LightningElement {
    @api recordId;

    @wire(getAccountDetails, { accountId: '$recordId' })
    account;

    get accountName() {
        return this.account.data ? this.account.data.Name : '';
    }

    get hasError() {
        return !!this.account.error;
    }
}
```

### Wire to a Function

```javascript
import { LightningElement, wire, api } from 'lwc';
import getContacts from '@salesforce/apex/ContactController.getContacts';

export default class ContactList extends LightningElement {
    @api recordId;
    contacts = [];
    error;

    @wire(getContacts, { accountId: '$recordId' })
    wiredContacts({ error, data }) {
        if (data) {
            this.contacts = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.contacts = [];
        }
    }
}
```

### Wire with Lightning Data Service

```javascript
import { LightningElement, wire, api } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import ACCOUNT_NAME from '@salesforce/schema/Account.Name';
import ACCOUNT_INDUSTRY from '@salesforce/schema/Account.Industry';

const FIELDS = [ACCOUNT_NAME, ACCOUNT_INDUSTRY];

export default class AccountInfo extends LightningElement {
    @api recordId;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    account;

    get name() {
        return getFieldValue(this.account.data, ACCOUNT_NAME);
    }

    get industry() {
        return getFieldValue(this.account.data, ACCOUNT_INDUSTRY);
    }
}
```

## Imperative Calls for Mutations

Use imperative Apex calls for create, update, delete operations and when you need control over timing.

```javascript
import { LightningElement, api } from 'lwc';
import createContact from '@salesforce/apex/ContactController.createContact';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CreateContact extends LightningElement {
    @api recordId;
    isLoading = false;

    async handleCreate() {
        this.isLoading = true;
        try {
            const contact = await createContact({
                firstName: this.template.querySelector('[data-id="firstName"]').value,
                lastName: this.template.querySelector('[data-id="lastName"]').value,
                accountId: this.recordId
            });
            this.dispatchEvent(new ShowToastEvent({
                title: 'Success',
                message: 'Contact created: ' + contact.Id,
                variant: 'success'
            }));
            this.dispatchEvent(new CustomEvent('contactcreated', {
                detail: { contactId: contact.Id }
            }));
        } catch (error) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: error.body?.message || 'Unknown error',
                variant: 'error'
            }));
        } finally {
            this.isLoading = false;
        }
    }
}
```

## @api Public Properties

```javascript
import { LightningElement, api } from 'lwc';

export default class StatusBadge extends LightningElement {
    _status;

    @api
    get status() {
        return this._status;
    }
    set status(value) {
        this._status = value?.toUpperCase();
    }

    @api recordId;
    @api objectApiName;

    // Public method callable by parent
    @api
    refresh() {
        // Refresh component data
    }

    get badgeClass() {
        const classMap = {
            'OPEN': 'slds-badge slds-theme_success',
            'CLOSED': 'slds-badge slds-theme_error',
            'PENDING': 'slds-badge slds-theme_warning'
        };
        return classMap[this._status] || 'slds-badge';
    }
}
```

## Reactivity (@track Removed)

Since Spring '20, all fields are reactive by default. `@track` is only needed for deep object/array property changes (and even then, reassignment is preferred).

```javascript
import { LightningElement } from 'lwc';

export default class ReactiveExample extends LightningElement {
    // All reactive by default
    name = '';
    count = 0;
    items = [];

    addItem(item) {
        // Reassign to trigger reactivity (spread operator)
        this.items = [...this.items, item];
    }

    updateItem(index, newValue) {
        // Reassign the array to trigger reactivity
        this.items = this.items.map((item, i) =>
            i === index ? { ...item, value: newValue } : item
        );
    }
}
```

## CustomEvent for Child-to-Parent Communication

### Child Component

```javascript
// child.js
import { LightningElement, api } from 'lwc';

export default class Child extends LightningElement {
    @api item;

    handleSelect() {
        this.dispatchEvent(new CustomEvent('select', {
            detail: {
                id: this.item.Id,
                name: this.item.Name
            },
            bubbles: false,    // Default: does not bubble
            composed: false    // Default: does not cross shadow DOM
        }));
    }
}
```

### Parent Component

```html
<!-- parent.html -->
<template>
    <template for:each={items} for:item="item">
        <c-child
            key={item.Id}
            item={item}
            onselect={handleItemSelect}>
        </c-child>
    </template>
</template>
```

```javascript
// parent.js
import { LightningElement } from 'lwc';

export default class Parent extends LightningElement {
    selectedItem;

    handleItemSelect(event) {
        this.selectedItem = event.detail;
    }
}
```

## Lightning Message Service (Cross-DOM)

### Message Channel Definition

```xml
<!-- messageChannels/Record_Selected__c.messageChannel-meta.xml -->
<LightningMessageChannel xmlns="http://soap.sforce.com/2006/04/metadata">
    <masterLabel>Record Selected</masterLabel>
    <isExposed>true</isExposed>
    <lightningMessageFields>
        <fieldName>recordId</fieldName>
        <description>The selected record Id</description>
    </lightningMessageFields>
    <lightningMessageFields>
        <fieldName>objectApiName</fieldName>
        <description>The object API name</description>
    </lightningMessageFields>
</LightningMessageChannel>
```

### Publisher

```javascript
import { LightningElement, wire } from 'lwc';
import { publish, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED from '@salesforce/messageChannel/Record_Selected__c';

export default class Publisher extends LightningElement {
    @wire(MessageContext)
    messageContext;

    handleRecordClick(event) {
        publish(this.messageContext, RECORD_SELECTED, {
            recordId: event.target.dataset.id,
            objectApiName: 'Account'
        });
    }
}
```

### Subscriber

```javascript
import { LightningElement, wire } from 'lwc';
import { subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED from '@salesforce/messageChannel/Record_Selected__c';

export default class Subscriber extends LightningElement {
    subscription = null;
    selectedRecordId;

    @wire(MessageContext)
    messageContext;

    connectedCallback() {
        this.subscription = subscribe(
            this.messageContext,
            RECORD_SELECTED,
            (message) => this.handleMessage(message)
        );
    }

    disconnectedCallback() {
        unsubscribe(this.subscription);
        this.subscription = null;
    }

    handleMessage(message) {
        this.selectedRecordId = message.recordId;
    }
}
```

## NavigationMixin

```javascript
import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class Navigator extends NavigationMixin(LightningElement) {

    // Navigate to record page
    navigateToRecord(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: 'Account',
                actionName: 'view'
            }
        });
    }

    // Navigate to list view
    navigateToList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'Account',
                actionName: 'list'
            },
            state: {
                filterName: 'Recent'
            }
        });
    }

    // Generate a URL without navigating
    async getRecordUrl(recordId) {
        const url = await this[NavigationMixin.GenerateUrl]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                actionName: 'view'
            }
        });
        return url;
    }
}
```

## Composition with Slots

### Container Component

```html
<!-- card.html -->
<template>
    <div class="slds-card">
        <div class="slds-card__header">
            <slot name="header">Default Header</slot>
        </div>
        <div class="slds-card__body">
            <slot>Default Body Content</slot>
        </div>
        <div class="slds-card__footer">
            <slot name="footer"></slot>
        </div>
    </div>
</template>
```

### Consumer

```html
<c-card>
    <span slot="header">Account Details</span>
    <p>This goes in the default slot (body)</p>
    <lightning-button slot="footer" label="Save" onclick={handleSave}>
    </lightning-button>
</c-card>
```

## lightning-record-form Family

### lightning-record-form (Simplest)

```html
<lightning-record-form
    record-id={recordId}
    object-api-name="Account"
    fields={fields}
    mode="view"
    onsuccess={handleSuccess}>
</lightning-record-form>
```

### lightning-record-edit-form (Most Control)

```html
<lightning-record-edit-form
    record-id={recordId}
    object-api-name="Account"
    onsuccess={handleSuccess}
    onerror={handleError}>
    <lightning-messages></lightning-messages>
    <lightning-input-field field-name="Name"></lightning-input-field>
    <lightning-input-field field-name="Industry"></lightning-input-field>
    <lightning-input-field field-name="Rating"></lightning-input-field>
    <lightning-button type="submit" label="Save"></lightning-button>
</lightning-record-edit-form>
```

### lightning-record-view-form (Read-Only)

```html
<lightning-record-view-form record-id={recordId} object-api-name="Account">
    <lightning-output-field field-name="Name"></lightning-output-field>
    <lightning-output-field field-name="Industry"></lightning-output-field>
    <lightning-output-field field-name="CreatedDate"></lightning-output-field>
</lightning-record-view-form>
```

## Dynamic Component Creation

```javascript
import { LightningElement } from 'lwc';

export default class DynamicLoader extends LightningElement {
    componentConstructor;

    async connectedCallback() {
        const { default: Ctor } = await import('c/dynamicChild');
        this.componentConstructor = Ctor;
    }
}
```

```html
<template>
    <lwc:component lwc:is={componentConstructor}></lwc:component>
</template>
```

## Decision Matrix: Communication Pattern

| Scenario | Pattern |
|----------|---------|
| Parent to child | @api properties or @api methods |
| Child to parent | CustomEvent |
| Sibling components (same page) | Lightning Message Service |
| Across utility bar / different pages | Lightning Message Service |
| Grandparent to grandchild | @api property chain or LMS |
| Component to Aura wrapper | CustomEvent with bubbles + composed |
