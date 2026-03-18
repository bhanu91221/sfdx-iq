# LWC Lifecycle Hooks

## Hook Execution Order

1. `constructor()` — Component instance created
2. `connectedCallback()` — Component inserted into DOM
3. `render()` — Returns the template to render (rarely overridden)
4. `renderedCallback()` — Component finished rendering
5. `disconnectedCallback()` — Component removed from DOM
6. `errorCallback(error, stack)` — Descendant component throws error

## constructor()

- Called when the component is created, before it is inserted into the DOM
- Must call `super()` first
- Do not access `this.template` — the DOM does not exist yet
- Do not inspect or set `@api` properties — parent has not set them yet
- Use for: initializing private state, setting default values

```javascript
constructor() {
    super();
    this._items = [];
    this._initialized = false;
}
```

## connectedCallback()

- Fires when the component is inserted into the DOM
- `this.template` is not yet populated (child elements not rendered)
- `@api` properties set by the parent are available
- Use for: subscribing to message channels, registering global listeners, fetching initial data

```javascript
connectedCallback() {
    this._subscription = subscribe(
        this.messageContext, CHANNEL, (message) => this.handleMessage(message)
    );
    window.addEventListener('resize', this._handleResize);
}
```

**Note**: Can fire multiple times if the component is moved in the DOM. Guard against duplicate initialization.

## renderedCallback()

- Fires after every render cycle (initial and re-renders)
- Child components are rendered and queryable via `this.template.querySelector()`
- **Always guard expensive operations** to prevent infinite loops:

```javascript
renderedCallback() {
    if (this._chartInitialized) return;
    this._chartInitialized = true;
    this.setupChart();
}
```

- Never set tracked/reactive properties without a guard — causes re-render loop
- Use for: third-party library initialization, DOM measurements, focus management

## disconnectedCallback()

- Fires when the component is removed from the DOM
- Use for: cleanup of subscriptions, timers, global event listeners

```javascript
disconnectedCallback() {
    unsubscribe(this._subscription);
    this._subscription = null;
    clearTimeout(this._debounceTimer);
    window.removeEventListener('resize', this._handleResize);
}
```

## errorCallback(error, stack)

- Catches errors from child components (not from the component itself)
- Acts as an error boundary — prevents the entire page from breaking
- Use for: logging errors, displaying fallback UI

```javascript
errorCallback(error, stack) {
    this.error = error.message;
    console.error('Component error:', error, 'Stack:', stack);
}
```

## @api Property Setters as Hooks

Property setters run when a parent updates the value and serve as pseudo-hooks for reacting to input changes:

```javascript
_recordId;
@api
get recordId() { return this._recordId; }
set recordId(value) {
    this._recordId = value;
    this.loadRelatedData(value);
}
```

## Key Rules

- Never use `async` on `connectedCallback` for operations that must complete before render — the framework does not await it
- Do not rely on hook execution order across sibling components
- `connectedCallback` of a parent fires before its children are connected
- `renderedCallback` of a child fires before the parent's `renderedCallback`
