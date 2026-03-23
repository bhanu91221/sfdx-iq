---
name: lwc-performance
description: LWC performance optimization including wire caching, lazy loading, DOM efficiency, and rendering best practices
origin: claude-sfdx-iq
tokens: 2805
domain: lwc
---

# LWC Performance

## Wire Service Caching

The wire service caches data on the client. Understand caching behavior to avoid unnecessary server round-trips.

### Cache Behavior

```
@wire with LDS adapters (getRecord, getFieldValue):
  - Cached by recordId + fields combination
  - Cache is shared across components on the same page
  - Cache invalidated automatically on record updates
  - TTL varies by adapter

@wire with custom Apex:
  - Cached by method name + parameters
  - @AuraEnabled(cacheable=true) required for wire
  - Cache NOT automatically invalidated on data changes
  - Use refreshApex() to manually refresh
```

### Refresh Pattern

```javascript
import { LightningElement, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getContacts from '@salesforce/apex/ContactController.getContacts';

export default class ContactList extends LightningElement {
    contacts;
    wiredContactsResult; // Store the full wire result

    @wire(getContacts, { accountId: '$recordId' })
    wiredContacts(result) {
        this.wiredContactsResult = result; // Store for refreshApex
        const { data, error } = result;
        if (data) {
            this.contacts = data;
        }
    }

    async handleRefresh() {
        // Pass the stored wire result, not the data
        await refreshApex(this.wiredContactsResult);
    }
}
```

## Lazy Loading with Dynamic Imports

Load components on demand to reduce initial bundle size.

```javascript
import { LightningElement } from 'lwc';

export default class LazyContainer extends LightningElement {
    chartConstructor;
    showChart = false;

    async loadChart() {
        if (!this.chartConstructor) {
            const { default: Ctor } = await import('c/heavyChartComponent');
            this.chartConstructor = Ctor;
        }
        this.showChart = true;
    }
}
```

```html
<template>
    <lightning-button label="Show Chart" onclick={loadChart}></lightning-button>
    <template lwc:if={showChart}>
        <lwc:component lwc:is={chartConstructor}></lwc:component>
    </template>
</template>
```

### Conditional Module Loading

```javascript
async loadModule(moduleName) {
    switch (moduleName) {
        case 'chart':
            return (await import('c/chartComponent')).default;
        case 'map':
            return (await import('c/mapComponent')).default;
        case 'table':
            return (await import('c/tableComponent')).default;
        default:
            return null;
    }
}
```

## renderedCallback Guards

`renderedCallback` fires after every render. Always guard against repeated execution.

```javascript
import { LightningElement } from 'lwc';

export default class ChartComponent extends LightningElement {
    chartInitialized = false;

    renderedCallback() {
        // Guard: only initialize once
        if (this.chartInitialized) {
            return;
        }
        this.chartInitialized = true;

        // Safe to initialize third-party library or DOM manipulation
        const container = this.template.querySelector('.chart-container');
        if (container) {
            this.initializeChart(container);
        }
    }

    initializeChart(container) {
        // One-time chart setup
    }
}
```

### Pattern: Conditional Re-render

```javascript
renderedCallback() {
    // Only re-render when specific data changes
    const currentHash = JSON.stringify(this.chartData);
    if (this._lastDataHash === currentHash) {
        return;
    }
    this._lastDataHash = currentHash;
    this.updateChart();
}
```

## disconnectedCallback Cleanup

Always clean up resources when a component is removed from the DOM.

```javascript
import { LightningElement } from 'lwc';

export default class PollingComponent extends LightningElement {
    _intervalId;
    _resizeHandler;

    connectedCallback() {
        // Start polling
        this._intervalId = setInterval(() => {
            this.fetchData();
        }, 30000);

        // Add event listener
        this._resizeHandler = this.handleResize.bind(this);
        window.addEventListener('resize', this._resizeHandler);
    }

    disconnectedCallback() {
        // Clean up interval
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }

        // Clean up event listener
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
    }

    handleResize() {
        // Handle window resize
    }

    fetchData() {
        // Polling logic
    }
}
```

## Debounce User Input

Prevent excessive server calls during user typing.

```javascript
import { LightningElement } from 'lwc';
import searchAccounts from '@salesforce/apex/AccountController.searchAccounts';

export default class SearchComponent extends LightningElement {
    searchResults = [];
    _debounceTimer;

    handleSearchInput(event) {
        const searchTerm = event.target.value;

        // Clear previous timer
        clearTimeout(this._debounceTimer);

        if (searchTerm.length < 2) {
            this.searchResults = [];
            return;
        }

        // Debounce: wait 300ms after last keystroke
        this._debounceTimer = setTimeout(() => {
            this.performSearch(searchTerm);
        }, 300);
    }

    async performSearch(term) {
        try {
            this.searchResults = await searchAccounts({ searchTerm: term });
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    disconnectedCallback() {
        clearTimeout(this._debounceTimer);
    }
}
```

## Virtual Scrolling for Large Lists

For lists with hundreds or thousands of items, render only visible items.

```javascript
import { LightningElement, api } from 'lwc';

export default class VirtualList extends LightningElement {
    @api items = [];
    visibleItems = [];

    itemHeight = 40; // pixels per item
    containerHeight = 400;
    scrollTop = 0;

    get containerStyle() {
        return `height: ${this.containerHeight}px; overflow-y: auto;`;
    }

    get spacerStyle() {
        return `height: ${this.items.length * this.itemHeight}px;`;
    }

    get listStyle() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        return `transform: translateY(${startIndex * this.itemHeight}px);`;
    }

    connectedCallback() {
        this.updateVisibleItems();
    }

    handleScroll(event) {
        this.scrollTop = event.target.scrollTop;
        this.updateVisibleItems();
    }

    updateVisibleItems() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const visibleCount = Math.ceil(this.containerHeight / this.itemHeight) + 2;
        this.visibleItems = this.items.slice(startIndex, startIndex + visibleCount);
    }
}
```

## Minimize DOM Nodes

### Use lwc:if Over template if:true (Deprecated)

```html
<!-- PREFERRED (lwc:if) - cleaner, better performance -->
<template>
    <template lwc:if={isLoading}>
        <lightning-spinner alternative-text="Loading"></lightning-spinner>
    </template>
    <template lwc:elseif={hasError}>
        <c-error-panel errors={errors}></c-error-panel>
    </template>
    <template lwc:else>
        <c-data-table data={records}></c-data-table>
    </template>
</template>

<!-- DEPRECATED (if:true/if:false) - avoid in new code -->
<template>
    <template if:true={isLoading}>
        <lightning-spinner alternative-text="Loading"></lightning-spinner>
    </template>
</template>
```

### Flatten Unnecessary Wrappers

```html
<!-- BAD: unnecessary nesting -->
<template>
    <div class="wrapper">
        <div class="inner-wrapper">
            <div class="content-wrapper">
                <span>{value}</span>
            </div>
        </div>
    </div>
</template>

<!-- GOOD: minimal DOM -->
<template>
    <span class="content">{value}</span>
</template>
```

## Reduce Bundle Size

### Import Only What You Need

```javascript
// BAD: importing entire module
import { everything } from 'c/utilityModule';

// GOOD: import specific functions
import { formatCurrency } from 'c/currencyUtils';
import { validateEmail } from 'c/validationUtils';
```

### Avoid Large Static Resources in JS

```javascript
// BAD: embedding large data in component
const ALL_COUNTRIES = [/* 200+ countries */];

// GOOD: load on demand from static resource or custom metadata
import getCountries from '@salesforce/apex/ReferenceDataController.getCountries';
```

## getRelatedListRecords Optimization

```javascript
import { LightningElement, wire, api } from 'lwc';
import { getRelatedListRecords } from 'lightning/uiRelatedListApi';

export default class RelatedContacts extends LightningElement {
    @api recordId;

    @wire(getRelatedListRecords, {
        parentRecordId: '$recordId',
        relatedListId: 'Contacts',
        fields: ['Contact.Name', 'Contact.Email'], // Request only needed fields
        pageSize: 10,  // Limit page size
        sortBy: ['Contact.Name']
    })
    contacts;
}
```

## Performance Checklist

| Category | Check | Impact |
|----------|-------|--------|
| Data Loading | Use @wire with cacheable=true for reads | High |
| Data Loading | Imperative calls only for mutations | Medium |
| Data Loading | refreshApex instead of re-fetching | Medium |
| Rendering | lwc:if/lwc:elseif/lwc:else over if:true | Medium |
| Rendering | Guard renderedCallback with boolean flag | High |
| Rendering | Reassign arrays/objects for reactivity | Medium |
| Cleanup | disconnectedCallback for intervals/listeners | High |
| DOM | Minimize DOM depth and node count | Medium |
| DOM | Virtual scrolling for 100+ item lists | High |
| Input | Debounce search inputs (300ms) | High |
| Bundle | Dynamic imports for heavy components | High |
| Bundle | Import only needed functions | Low |
| Wire | Store wire result for refreshApex | Medium |
| Wire | Use fields parameter to limit data | Medium |

## Common Anti-Patterns

```
1. SOQL in connectedCallback without wire caching
   Fix: Use @wire with cacheable=true Apex

2. Fetching data in renderedCallback
   Fix: Use connectedCallback or @wire

3. Direct array mutation (this.items.push(x))
   Fix: this.items = [...this.items, x]

4. Missing disconnectedCallback cleanup
   Fix: Always clean up intervals, listeners, subscriptions

5. Unguarded renderedCallback
   Fix: Use boolean flag to prevent repeated initialization

6. Synchronous heavy computation in rendering
   Fix: Move to async or compute in connectedCallback
```
