---
name: aura-patterns
description: Aura component architecture, events, server communication, and Aura-to-LWC migration strategies
origin: claude-sfdx-iq
tokens: 2719
domain: lwc
---

# Aura Patterns

## Component Structure

An Aura component bundle consists of multiple files in a single directory:

| File | Purpose |
|------|---------|
| `myComponent.cmp` | Markup (HTML-like template) |
| `myComponentController.js` | Client-side controller (action handlers) |
| `myComponentHelper.js` | Reusable logic (called from controller) |
| `myComponentRenderer.js` | Custom rendering lifecycle hooks |
| `myComponent.css` | Component styles |
| `myComponent.design` | Design attributes for Lightning App Builder |
| `myComponent.svg` | Custom icon |

### Basic Component Markup

```xml
<aura:component implements="flexipage:availableForAllPageTypes" access="global">
    <aura:attribute name="accounts" type="Account[]" />
    <aura:attribute name="isLoading" type="Boolean" default="false" />
    <aura:attribute name="errorMessage" type="String" />

    <aura:handler name="init" value="{!this}" action="{!c.doInit}" />

    <aura:if isTrue="{!v.isLoading}">
        <lightning:spinner alternativeText="Loading" />
    </aura:if>

    <aura:if isTrue="{!not(empty(v.errorMessage))}">
        <div class="slds-text-color_error">{!v.errorMessage}</div>
    </aura:if>

    <aura:iteration items="{!v.accounts}" var="acc">
        <p>{!acc.Name}</p>
    </aura:iteration>
</aura:component>
```

## Controller and Helper Pattern

The controller handles UI events and delegates logic to the helper. Keep controllers thin.

### Controller (myComponentController.js)

```javascript
({
    doInit: function(component, event, helper) {
        helper.loadAccounts(component);
    },

    handleRefresh: function(component, event, helper) {
        helper.loadAccounts(component);
    }
})
```

### Helper (myComponentHelper.js)

```javascript
({
    loadAccounts: function(component) {
        component.set("v.isLoading", true);
        var action = component.get("c.getAccounts");
        action.setParams({ status: "Active" });

        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                component.set("v.accounts", response.getReturnValue());
                component.set("v.errorMessage", null);
            } else if (state === "ERROR") {
                var errors = response.getError();
                var message = (errors && errors[0] && errors[0].message)
                    ? errors[0].message : "Unknown error";
                component.set("v.errorMessage", message);
            }
            component.set("v.isLoading", false);
        });

        $A.enqueueAction(action);
    }
})
```

## Server Communication with $A.enqueueAction()

All server calls go through `$A.enqueueAction()`. This queues the request and the framework batches multiple actions together.

```javascript
var action = component.get("c.saveAccount");
action.setParams({ account: component.get("v.account") });
action.setStorable();  // enables client-side caching for read operations

action.setCallback(this, function(response) {
    if (response.getState() === "SUCCESS") {
        // handle success
    }
});

$A.enqueueAction(action);
```

**Rules:**
- Always handle `ERROR` and `INCOMPLETE` states in callbacks
- Use `setStorable()` for read-only actions to enable caching
- Never call `$A.enqueueAction()` in a tight loop; batch parameters instead
- Use `setBackground()` for low-priority actions that should not block the UI

## Component Events vs Application Events

### Component Events

Travel up the containment hierarchy (child to parent). The parent must be a direct container.

```xml
<!-- Event definition -->
<aura:event type="COMPONENT" description="Account selected">
    <aura:attribute name="accountId" type="Id" />
</aura:event>

<!-- Child fires the event -->
<aura:registerEvent name="onAccountSelect" type="c:AccountSelectedEvent" />
```

```javascript
// Child helper
fireAccountSelect: function(component, accountId) {
    var event = component.getEvent("onAccountSelect");
    event.setParams({ accountId: accountId });
    event.fire();
}
```

```xml
<!-- Parent handles the event -->
<c:accountRow onAccountSelect="{!c.handleAccountSelect}" />
```

### Application Events

Broadcast to all listeners in the application. Use sparingly as they are harder to trace and debug.

```xml
<aura:event type="APPLICATION" description="Global notification">
    <aura:attribute name="message" type="String" />
    <aura:attribute name="severity" type="String" />
</aura:event>
```

```javascript
// Fire application event
var appEvent = $A.get("e.c:NotificationEvent");
appEvent.setParams({ message: "Record saved", severity: "success" });
appEvent.fire();
```

```xml
<!-- Any component can listen -->
<aura:handler event="c:NotificationEvent" action="{!c.handleNotification}" />
```

**Decision Matrix:**

| Scenario | Event Type |
|----------|-----------|
| Child notifies direct parent | Component Event |
| Sibling communication | Application Event (or shared service component) |
| Global notification/toast | Application Event |
| Deeply nested child to ancestor | Application Event |

## component.get() and component.set()

```javascript
// Read attribute
var name = component.get("v.accountName");

// Write attribute
component.set("v.accountName", "New Value");

// Read server-side action
var action = component.get("c.getAccounts");

// Access body
var body = component.get("v.body");
```

**Performance note:** Each `component.set()` triggers re-rendering. Batch multiple attribute updates before setting them, or set a single object attribute rather than multiple primitives.

## Component Inheritance

Aura supports component inheritance via the `extends` attribute. Use it for shared layouts or abstract base components.

```xml
<!-- Base component -->
<aura:component extensible="true" abstract="true">
    <aura:attribute name="title" type="String" />
    <div class="slds-card">
        <h2>{!v.title}</h2>
        {!v.body}
    </div>
</aura:component>

<!-- Extending component -->
<aura:component extends="c:baseCard">
    <aura:set attribute="title" value="Account Details" />
    <p>Content goes here.</p>
</aura:component>
```

**Rule:** Prefer composition over inheritance. Deep inheritance chains are difficult to maintain and debug.

## Wrapping LWC in Aura (Interop)

LWC components can be embedded inside Aura components. This is the primary interop pattern for gradual migration.

```xml
<!-- Aura wrapper -->
<aura:component implements="flexipage:availableForAllPageTypes">
    <aura:attribute name="recordId" type="Id" />
    <c:myLwcComponent record-id="{!v.recordId}" onaccountselected="{!c.handleSelection}" />
</aura:component>
```

**Interop rules:**
- LWC property names use camelCase in JS but kebab-case in Aura markup (`recordId` becomes `record-id`)
- LWC custom events are handled with the `on` prefix in Aura (`accountselected` becomes `onaccountselected`)
- Aura components cannot be embedded inside LWC
- Data passes down via attributes, events travel up

## When Aura Is Still Needed

Despite LWC being the recommended framework, Aura is still required in certain scenarios:

| Scenario | Reason |
|----------|--------|
| `lightning:overlayLibrary` modals | LWC modal support added later but some orgs still use Aura modals |
| URL-addressable tabs (legacy) | Some legacy navigation patterns require Aura |
| `lightning:workspaceAPI` (console apps) | Some workspace APIs only available in Aura |
| Wrapping LWC for App Builder | When LWC needs Aura-only interfaces |
| Existing large Aura apps | Migration cost may not justify immediate rewrite |
| Flow screen components (older) | Some legacy flow integrations require Aura |

## Migration Path: Aura to LWC

### Strategy: Strangler Fig Pattern

1. **Wrap new LWC inside existing Aura** -- Replace inner logic with LWC, keep the Aura shell
2. **Migrate leaf components first** -- Start with the smallest, most isolated components
3. **Move up the tree** -- Replace parent Aura components once all children are LWC
4. **Replace the Aura shell** -- When all children are LWC, replace the outer Aura wrapper

### Migration Mapping

| Aura | LWC Equivalent |
|------|---------------|
| `aura:attribute` | `@api` property |
| `aura:handler name="init"` | `connectedCallback()` |
| `component.get("v.x")` | `this.x` |
| `component.set("v.x", val)` | `this.x = val` (reactive) |
| `$A.enqueueAction()` | `@wire` or imperative Apex import |
| Component Events | `CustomEvent` + `dispatchEvent()` |
| Application Events | `lightning/messageService` (LMS) |
| `aura:if` | `if:true` / `if:false` or `lwc:if` / `lwc:else` |
| `aura:iteration` | `for:each` / `for:item` |
| `$A.get("e.force:showToast")` | `import { ShowToastEvent }` |
| `helper.js` | Private methods in the component class |
| `renderer.js` | `renderedCallback()` |

### Example Migration

**Aura (before):**

```javascript
// Controller
({
    doInit: function(component, event, helper) {
        var action = component.get("c.getAccounts");
        action.setCallback(this, function(response) {
            if (response.getState() === "SUCCESS") {
                component.set("v.accounts", response.getReturnValue());
            }
        });
        $A.enqueueAction(action);
    }
})
```

**LWC (after):**

```javascript
import { LightningElement, wire } from 'lwc';
import getAccounts from '@salesforce/apex/AccountController.getAccounts';

export default class AccountList extends LightningElement {
    @wire(getAccounts)
    accounts;
}
```

## Aura Anti-Patterns

1. **Logic in the controller.** Move all logic to the helper. Controllers should only call helper methods.
2. **Not handling ERROR and INCOMPLETE states.** Server calls can fail or be interrupted.
3. **Using Application Events for parent-child communication.** Use Component Events instead.
4. **Excessive component.set() calls.** Each call triggers re-rendering. Batch updates.
5. **Starting new Aura components.** All new development should use LWC unless an Aura-only feature is required.
6. **Deep inheritance chains.** More than two levels of inheritance becomes unmaintainable.
7. **Storing state in the helper.** Helpers are shared across component instances. Use attributes for state.

## Deprecation Awareness

Salesforce has signaled that Aura is in maintenance mode. No new Aura features are being developed. The long-term direction is LWC. Plan migrations proactively:

- Audit Aura component inventory quarterly
- Prioritize migration of actively maintained components
- Leave stable, rarely-changed Aura components for last
- Track Salesforce release notes for Aura deprecation timelines
- Ensure new developers learn LWC first, Aura only for maintenance
