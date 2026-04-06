---
paths:
  - "**/*.cls"
  - "**/*.trigger"
  - "**/*.apex"
  - "**/lwc/**/*.js"
  - "**/lwc/**/*.html"
---

# Coding Style — Universal Rules

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Apex classes | PascalCase | `AccountService`, `OpportunityTriggerHandler` |
| Apex methods | camelCase | `getActiveAccounts()`, `processLineItems()` |
| Apex variables | camelCase | `accountList`, `totalAmount` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE` |
| Test classes | Suffix with `Test` | `AccountServiceTest` |
| Triggers | `ObjectNameTrigger` | `AccountTrigger` |
| Custom objects | PascalCase\_\_c | `Invoice_Line_Item__c` |
| Custom fields | PascalCase\_\_c | `Total_Amount__c` |
| LWC components | camelCase | `accountSearch`, `contactList` |
| LWC JS properties | camelCase | `isLoading`, `searchTerm` |
| Flow names | `Object_TriggerType_Purpose` | `Account_AfterUpdate_SyncContacts` |
| Permission sets | `PS_Purpose` | `PS_Invoice_Manager` |
| Custom labels | `Module_Purpose` | `Account_ErrorRequired` |

## File Organization

- One class per file (Apex enforces this).
- One component per directory (LWC enforces this).
- Keep files under 400 lines. Refactor at 800 lines maximum.
- Methods under 50 lines. If longer, extract helper methods.

## Documentation

- Every public and global Apex method MUST have ApexDoc comments.
- Every LWC component MUST have a JSDoc header describing its purpose.
- Every flow MUST have a description on the flow definition and on each element.

```apex
/**
 * @description Retrieves active accounts by industry.
 * @param industry The industry to filter by.
 * @return List of active accounts in the specified industry.
 */
public List<Account> getActiveAccountsByIndustry(String industry) { }
```

## Code Cleanliness

- No magic numbers — use named constants.
- No commented-out code — delete it (version control preserves history).
- No `System.debug()` in production code — use a logging framework.
- No hardcoded IDs (15 or 18 character Salesforce IDs) — query or use Custom Metadata.
- Prefer early returns over deeply nested if/else blocks.

## Formatting

- Use consistent indentation (4 spaces for Apex, 2 spaces for LWC JS/HTML).
- One blank line between methods.
- Opening brace on the same line as the declaration.
- Always use braces for if/else blocks, even single-line bodies.
