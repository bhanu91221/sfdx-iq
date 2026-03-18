# LWC Security

## Content Security Policy (CSP)

- LWC enforces strict CSP by default — no inline scripts or styles via `javascript:` URLs
- All external resources must be uploaded as Static Resources and loaded via `loadScript` / `loadStyle`
- Never use `eval()`, `new Function()`, or `setTimeout` with string arguments
- Do not use `document.write()` or `document.writeln()`

## Locker Service Restrictions

Locker Service (classic) isolates each namespace into its own secure context:

- **No global DOM access**: `document.querySelector()` is restricted to your component's DOM
- **No `window` manipulation**: Cannot modify `window.location` directly — use NavigationMixin
- **Restricted APIs**: `localStorage`, `sessionStorage`, `XMLHttpRequest` are wrapped; some behaviors differ
- Use `this.template.querySelector()` to query within your component shadow DOM

## Lightning Web Security (LWS)

LWS replaces Locker in newer orgs with fewer restrictions but still enforces boundaries:

- Component DOM is isolated via shadow DOM (synthetic or native)
- Cross-namespace component access is blocked
- Evaluate third-party library compatibility with LWS before importing
- Use the [LWC Test Compatibility tool](https://developer.salesforce.com) to verify library support

## Third-Party Libraries

- Upload as Static Resources (no CDN links — CSP blocks external origins)
- Load using platform utilities:
  ```javascript
  import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
  import chartLib from '@salesforce/resourceUrl/chartjs';

  async renderedCallback() {
      if (this._chartInitialized) return;
      this._chartInitialized = true;
      await loadScript(this, chartLib);
  }
  ```
- Verify the library does not use `eval`, `innerHTML` assignment, or dynamic code generation

## Secure HTML Handling

- **Never** set `innerHTML` with user-supplied content — XSS risk
- Use `lightning-formatted-rich-text` for rendering safe HTML
- Sanitize any dynamic content before display:
  ```javascript
  // Bad: XSS vulnerability
  this.template.querySelector('div').innerHTML = userInput;

  // Good: use data binding in templates
  // In .html: <lightning-formatted-text value={userInput}></lightning-formatted-text>
  ```

## Event Security

- Do not include sensitive data (credentials, tokens, PII) in CustomEvent `detail`
- Events bubble through the DOM — use `bubbles: false` unless parent needs to hear it
- Composed events cross shadow boundaries — set `composed: false` by default:
  ```javascript
  this.dispatchEvent(new CustomEvent('select', {
      detail: { recordId: this.recordId },
      bubbles: false,
      composed: false
  }));
  ```

## Apex Method Security

- All `@AuraEnabled` methods must enforce CRUD/FLS (see Apex security rules)
- Do not pass security-sensitive parameters from client to server — derive them server-side
- Validate all input parameters in the Apex method, not just in the LWC
