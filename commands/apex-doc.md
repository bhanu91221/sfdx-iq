---
description: Generate ApexDoc documentation for Apex classes
---

# /apex-doc

Generate or update ApexDoc comments for Apex classes, or produce a documentation summary of the codebase.

## Workflow

1. **Determine scope**
   - If `--file` specified, document that file only
   - If `--all`, scan all `.cls` files in the project
   - Default: scan files changed in git (`git diff --name-only --diff-filter=ACM HEAD -- '*.cls'`)

2. **Analyze existing documentation**
   For each class, check:
   - Class-level ApexDoc (`@description`)
   - Public/global method ApexDoc (`@description`, `@param`, `@return`)
   - Missing or incomplete documentation

3. **Generate ApexDoc comments**
   For undocumented methods, generate ApexDoc based on method signature and body:

   ```apex
   /**
    * @description Retrieves active accounts filtered by industry.
    * Queries accounts with IsActive__c = true and the specified industry,
    * enforcing field-level security with SECURITY_ENFORCED.
    * @param industry The industry value to filter accounts by.
    * @return List of active Account records matching the industry filter.
    * @throws QueryException if the user lacks access to queried fields.
    */
   public List<Account> getActiveAccountsByIndustry(String industry) {
       return [
           SELECT Id, Name, Industry
           FROM Account
           WHERE IsActive__c = true AND Industry = :industry
           WITH SECURITY_ENFORCED
       ];
   }
   ```

4. **Documentation standards**
   - Every `public` and `global` method MUST have ApexDoc
   - `@description` — what the method does and why
   - `@param` — one per parameter with description
   - `@return` — what is returned (include null behavior)
   - `@throws` — exceptions that may be thrown
   - `@example` — usage example for complex methods

5. **Generate summary report** (with `--report` flag)
   Produce a documentation coverage report:
   ```
   Documentation Coverage:
     AccountService.cls:     8/8 methods documented (100%)
     ContactSelector.cls:    3/5 methods documented (60%) ⚠️
     InvoiceTriggerHandler:  0/6 methods documented (0%) 🔴

   Overall: 67% documented (42/63 public methods)
   ```

6. **Apply changes**
   - Preview generated comments before applying
   - Insert ApexDoc above each undocumented method
   - Do not modify existing ApexDoc unless `--update` flag is set

## Flags

| Flag | Description |
|------|-------------|
| `--file` | Document specific file |
| `--all` | Document all Apex classes |
| `--report` | Generate coverage report only (don't modify files) |
| `--update` | Update existing ApexDoc (improve descriptions) |
| `--dry-run` | Show what would be generated without writing |

## Example

```
/apex-doc
/apex-doc --file force-app/main/default/classes/AccountService.cls
/apex-doc --all --report
/apex-doc --all --dry-run
```
