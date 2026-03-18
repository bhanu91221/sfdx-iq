# LWC Performance

## Prefer @wire Over Imperative Calls

`@wire` leverages the Lightning Data Service (LDS) cache. Repeated requests for the same data are served from cache without additional server calls:

```javascript
// Good: cached, reactive, efficient
@wire(getRecord, { recordId: '$recordId', fields: FIELDS })
account;

// Avoid for reads: bypasses cache, manual refresh needed
connectedCallback() {
    getRecord({ recordId: this.recordId, fields: FIELDS })
        .then(result => this.account = result);
}
```

## Lazy Load Child Components

Use dynamic imports for components not needed on initial render:

```javascript
async loadChartComponent() {
    const { default: ChartComponent } = await import('c/heavyChartComponent');
    // Render only when user requests it
}
```

## renderedCallback Discipline

`renderedCallback` fires after every render. Expensive operations here cause performance degradation:

```javascript
renderedCallback() {
    // Guard against repeated execution
    if (this._chartRendered) return;
    this._chartRendered = true;

    // One-time expensive operation
    this.initializeChart();
}
```

Never set reactive properties inside `renderedCallback` without a guard — it triggers infinite re-render loops.

## disconnectedCallback Cleanup

Always clean up subscriptions, timers, and event listeners:

```javascript
disconnectedCallback() {
    if (this._subscription) {
        unsubscribe(this._subscription);
        this._subscription = null;
    }
    clearInterval(this._pollingTimer);
    window.removeEventListener('resize', this._resizeHandler);
}
```

## Template Efficiency

### Use `lwc:if` over `if:true` (modern syntax)

```html
<!-- Preferred: lwc:if (Spring '23+) -->
<template lwc:if={hasAccounts}>
    <c-account-list accounts={accounts}></c-account-list>
</template>
<template lwc:else>
    <p>No accounts found.</p>
</template>
```

### Minimize DOM nodes

- Avoid deeply nested wrapper `<div>` elements
- Use `lwc:if` to exclude hidden sections from the DOM entirely (not just `class="slds-hide"`)
- Prefer SLDS grid utilities over custom nested layouts

## Reactive Tracking

Only use `@track` when you need deep reactivity on objects or arrays. Primitive fields are reactive by default:

```javascript
// No @track needed — primitive is reactive
count = 0;

// @track needed only if you mutate nested properties
@track config = { filters: [], sort: 'Name' };
```

When possible, reassign the entire object instead of using `@track`:

```javascript
// Better: no @track, reassign
this.filters = [...this.filters, newFilter];
```

## Reduce Server Calls

- Combine related Apex queries into a single method returning a wrapper object
- Use `@wire` with `refreshApex()` instead of re-fetching on every change
- Cache client-side data in component properties when it rarely changes
- Debounce search inputs to avoid rapid-fire Apex calls:
  ```javascript
  handleSearchInput(event) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
          this.searchTerm = event.target.value;
      }, 300);
  }
  ```
