---
description: Diagnose and fix deployment or compilation errors
---

# /build-fix

Diagnose Salesforce deployment failures, compilation errors, and test failures, then apply fixes.

## Workflow

1. **Identify the error**
   - Ask the user for the error message, or read from the latest deploy/push output
   - Parse the error to identify: error type, affected component, line number

2. **Classify the error**

   | Error Category | Examples |
   |---------------|----------|
   | **Compilation** | Missing semicolon, undefined variable, type mismatch |
   | **Dependency** | Missing field, object, or class referenced in the component |
   | **Governor Limit** | Too many SOQL queries, CPU time exceeded |
   | **Test Failure** | Assertion failed, insufficient coverage |
   | **Metadata** | Invalid API version, unsupported metadata type |
   | **Permission** | Insufficient access, missing CRUD/FLS |
   | **Deployment** | Component already exists, version conflict |

3. **Diagnose root cause**
   - For compilation errors: Read the affected file, find the error location
   - For dependency errors: Search the codebase for the missing reference
   - For test failures: Read the test class and the class under test
   - For deployment errors: Check `sf project deploy report` for details

4. **Apply fix**
   - Edit the affected file(s) to resolve the error
   - For dependency issues: create the missing component or update the reference
   - For governor limits: delegate to `governor-limits-checker` agent for refactoring
   - For test failures: fix the test or the underlying code

5. **Verify the fix**
   - Re-run the deploy or push: `sf project deploy start --source-dir force-app`
   - Run affected tests: `sf apex run test --class-names <AffectedTestClass>`
   - Confirm the error is resolved

6. **Prevent recurrence**
   - If the error was a pattern issue, suggest adding a hook or rule
   - Delegate to `apex-reviewer` for broader code quality check

## Common Salesforce Errors

| Error | Typical Fix |
|-------|------------|
| `Variable does not exist: X` | Declare variable or fix typo |
| `Method does not exist or incorrect signature` | Check method name, parameter types |
| `Dependent class is invalid` | Fix the dependency class first, deploy in order |
| `FIELD_CUSTOM_VALIDATION_EXCEPTION` | Check validation rules on the object |
| `UNABLE_TO_LOCK_ROW` | Add retry logic or reduce transaction scope |
| `System.LimitException` | Refactor to reduce SOQL/DML/CPU usage |

## Example

```
/build-fix
/build-fix Error: Variable does not exist: accountMap in AccountService.cls line 42
```
