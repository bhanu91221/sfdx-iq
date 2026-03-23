---
description: Explain Salesforce error with root cause and fix steps
---

# /explain-error

Accept a Salesforce error message and provide a clear explanation of the root cause, common scenarios that trigger it, step-by-step fix instructions, and strategies to prevent it in the future.

## Workflow

1. **Accept error input**
   - Accept the error message as an argument or prompt the user to paste it
   - Accept any of these formats:
     - Full error message string
     - Error code (e.g., `FIELD_CUSTOM_VALIDATION_EXCEPTION`)
     - Stack trace from Apex debug logs
     - Browser console error from LWC
     - Deployment error from `sf project deploy`
     - Test failure message
   - Trim and normalize the error text for analysis

2. **Identify the error type**
   - Categorize the error into one of these domains:
     - **DML Errors**: `FIELD_CUSTOM_VALIDATION_EXCEPTION`, `ENTITY_IS_DELETED`, `DUPLICATE_VALUE`, `REQUIRED_FIELD_MISSING`, `STRING_TOO_LONG`, `FIELD_FILTER_VALIDATION_EXCEPTION`
     - **Lock Errors**: `UNABLE_TO_LOCK_ROW`, `DEADLOCK_DETECTED`
     - **Access Errors**: `INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY`, `INSUFFICIENT_ACCESS_OR_READONLY`, `CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY`
     - **Governor Limit Errors**: `System.LimitException: Too many SOQL queries`, `System.LimitException: Too many DML statements`, `System.LimitException: Apex CPU time limit exceeded`, `System.LimitException: Apex heap size too large`
     - **Query Errors**: `System.QueryException: List has no rows`, `System.QueryException: Non-selective query`, `MALFORMED_QUERY`
     - **Null Reference Errors**: `System.NullPointerException`
     - **Callout Errors**: `System.CalloutException`, `Unauthorized endpoint`
     - **Flow Errors**: `FLOW_ELEMENT_ERROR`, `An unhandled fault has occurred`
     - **Deployment Errors**: component errors, test failures, missing dependencies
     - **LWC Errors**: `TypeError`, `wire adapter errors`, `template compilation errors`

3. **Explain root cause**
   - Provide a plain-language explanation of what the error means
   - Explain the technical mechanism behind the error
   - Describe the exact Salesforce platform behavior that triggered it
   - Include relevant Salesforce documentation references

4. **List common scenarios**
   - Provide 3-5 specific scenarios that commonly cause this error
   - For each scenario, describe:
     - The user action or code pattern that triggers it
     - Why this action causes the specific error
     - How to confirm this is the cause (debugging steps)
   - Order scenarios from most common to least common

5. **Provide step-by-step fix**
   - For each common scenario, provide a specific fix:
     - Exact code changes needed (with before/after examples)
     - Configuration changes in Salesforce Setup
     - Permission or security changes needed
     - Data fixes if applicable
   - If the error is in Apex, show corrected code patterns
   - If the error is in Flow, describe the Flow element changes
   - If the error is a deployment issue, provide the resolution command

6. **Recommend prevention strategies**
   - How to prevent this error from occurring in the future:
     - Code patterns to follow (defensive coding)
     - Test patterns that would catch this error
     - Configuration best practices
     - Monitoring and alerting recommendations
   - Include specific Apex code examples for prevention patterns
   - Reference relevant governor limits or platform constraints

7. **Provide debugging guidance**
   - How to gather more information if the cause is unclear:
     - Enable debug logs and which categories to set
     - SOQL queries to check data state
     - Setup pages to inspect configuration
     - Relevant Salesforce CLI commands for troubleshooting
   - Show how to use `System.debug()` effectively for this error type

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--error` | The error message to explain | Prompt user |
| `--context` | Additional context (file name, operation being performed) | None |
| `--verbose` | Include all scenarios and extended debugging guidance | `false` |

## Error Handling

- If the error message is too vague to identify, ask for the full stack trace or debug log
- If the error is not a recognized Salesforce error, provide general debugging guidance
- If multiple errors are pasted, address each one separately in order
- If the error references specific object or field names, include those in the analysis

## Common Error Quick Reference

| Error Code | Quick Cause |
|-----------|-------------|
| `FIELD_CUSTOM_VALIDATION_EXCEPTION` | A validation rule is blocking the DML |
| `UNABLE_TO_LOCK_ROW` | Row contention from concurrent updates |
| `INSUFFICIENT_ACCESS` | Missing CRUD permissions or sharing access |
| `System.LimitException: Too many SOQL queries` | SOQL queries inside a loop |
| `System.NullPointerException` | Accessing a property on a null reference |
| `System.QueryException: List has no rows` | `.get(0)` or assignment on empty query |
| `DUPLICATE_VALUE` | Unique field or external ID constraint violated |
| `ENTITY_IS_DELETED` | Operating on a record that was deleted |
| `System.CalloutException` | HTTP callout failed or endpoint not whitelisted |
| `MIXED_DML_OPERATION` | Setup and non-setup objects in same transaction |

## Example Usage

```
/explain-error UNABLE_TO_LOCK_ROW
/explain-error "System.LimitException: Too many SOQL queries: 101"
/explain-error "FIELD_CUSTOM_VALIDATION_EXCEPTION: [Status__c: You cannot change status without approval]"
/explain-error --error "System.NullPointerException: Attempt to de-reference a null object" --context AccountService.cls
```
