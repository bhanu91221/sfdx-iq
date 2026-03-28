---
description: Security vulnerability scan for CRUD/FLS, sharing, and injection
---

# /security-scan

Scan the entire codebase for security vulnerabilities including CRUD/FLS enforcement, sharing model violations, injection risks, and hardcoded secrets.

## Workflow

0. **Load context** — Invoke the context-assigner agent with the description of this scan task. Display the announcement block (loaded skills, rules, token count) to the user before proceeding.

1. **Discover scannable files**
   - Find all Apex classes (`.cls`) and triggers (`.trigger`)
   - Find all LWC components (`.js`, `.html`)
   - Find all Aura components if present
   - Find all Visualforce pages (`.page`) and controllers

2. **Delegate to security-reviewer agent**
   - Pass the full file inventory to the **security-reviewer** agent

3. **Security checks**

   **CRUD/FLS Enforcement (Critical)**
   - DML operations without `Security.stripInaccessible()` or `WITH SECURITY_ENFORCED`
   - Direct field access without FLS checks
   - Missing `Schema.sObjectType.*.isAccessible()` / `isCreateable()` / `isUpdateable()` / `isDeletable()` checks
   - Unsafe use of `Database.insert/update/delete` without FLS

   **Sharing Model (Critical)**
   - Classes without `with sharing`, `without sharing`, or `inherited sharing` keyword
   - `without sharing` used without documented justification
   - Utility classes that should use `inherited sharing`
   - Controllers that should enforce `with sharing`

   **SOQL Injection (Critical)**
   - Dynamic SOQL built with string concatenation using user input
   - Missing use of `String.escapeSingleQuotes()` on dynamic values
   - Dynamic SOQL that should use bind variables instead

   **Hardcoded Credentials (Critical)**
   - API keys, tokens, passwords, or secrets in source code
   - Hardcoded org IDs or record IDs
   - Named Credentials not used for external callouts

   **LWC / Aura Security (High)**
   - Use of `innerHTML` or `lwc:dom="manual"` without sanitization
   - CSP violations in component markup
   - Sensitive data exposed in client-side code
   - Missing CSRF protection on form submissions

   **Visualforce Security (High)**
   - Missing `escape="true"` on output fields
   - Inline JavaScript with user-controlled data
   - Missing CSRF tokens

   **Callout Security (High)**
   - HTTP instead of HTTPS for external callouts
   - Missing certificate validation
   - Sensitive data in URL parameters

4. **Output format**
   - **Critical findings first** — these must be fixed before deployment
   - Group remaining findings by file
   - For each finding: file, line, vulnerability type, risk description, remediation with code example
   - End with a security score (Critical / Needs Work / Acceptable / Good)

## Error Handling

- If no Apex/LWC files are found, inform the user
- If files have syntax errors, skip them but note they could not be scanned

## Example Usage

```
/security-scan
/security-scan force-app/main/default/classes/
```
