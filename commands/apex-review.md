---
description: Apex code quality review with severity ratings
---

# /apex-review

Perform a comprehensive quality review of Apex code, checking for best practices, security, performance, and maintainability issues.

## Workflow

0. **Load context** — Invoke the context-assigner agent with the description of this review task. Display the announcement block (loaded skills, rules, token count) to the user before proceeding.

1. **Identify files to review**
   - If specific files are provided as arguments, review those
   - If no arguments, check for uncommitted/changed Apex files (`git diff --name-only` for `.cls` and `.trigger` files)
   - If no changes detected, ask the user which files to review

2. **Delegate to apex-reviewer agent**
   - Pass all identified Apex files to the **apex-reviewer** agent
   - The agent performs a multi-dimensional review

3. **Review checks**

   **Bulkification (Critical)**
   - SOQL queries inside loops
   - DML statements inside loops
   - Hardcoded SOQL LIMIT values
   - Non-bulkified trigger patterns (single record assumptions)

   **Governor Limits (Critical)**
   - SOQL query count risk (100 sync / 200 async limit)
   - DML statement count risk (150 limit)
   - CPU time concerns (complex nested loops, string concatenation)
   - Heap size concerns (large collections, unbounded queries)

   **Security (Critical)**
   - Missing `with sharing` / `inherited sharing` keyword
   - CRUD/FLS not enforced (`WITH SECURITY_ENFORCED` or `Security.stripInaccessible`)
   - Dynamic SOQL without bind variables (SOQL injection risk)
   - Hardcoded IDs, credentials, or secrets

   **Error Handling (High)**
   - Empty catch blocks
   - Catching generic `Exception` without specific handling
   - Missing null checks on query results
   - No error logging strategy

   **Naming & Structure (Medium)**
   - Class/method naming conventions (PascalCase for classes, camelCase for methods)
   - Method length (flag methods over 40 lines)
   - Class responsibility (flag classes over 500 lines)
   - Trigger handler pattern compliance (one trigger per object)

   **Test Coverage (High)**
   - Missing test class for the reviewed code
   - Test methods without assertions
   - No bulk test scenarios
   - No negative test scenarios

4. **Output format**
   - Group findings by severity: **Critical** > **High** > **Medium** > **Low**
   - For each finding, provide:
     - File and line number
     - Issue description
     - Why it matters
     - Suggested fix with code example
   - End with a summary score and top 3 action items

## Error Handling

- If files contain syntax errors, note them but continue reviewing what is possible
- If no Apex files are found, inform the user and suggest paths to check

## Example Usage

```
/apex-review
/apex-review force-app/main/default/classes/AccountService.cls
/apex-review force-app/main/default/triggers/AccountTrigger.trigger
```
