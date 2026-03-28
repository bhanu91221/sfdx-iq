---
description: Full code review across all Salesforce domains
---

# /code-review

Run a comprehensive code review across Apex, LWC, SOQL, security, and governor limits by orchestrating all specialized review agents.

## Workflow

0. **Load context** — Invoke the context-assigner agent with the description of this review task. Display the announcement block (loaded skills, rules, token count) to the user before proceeding.

1. **Identify scope**
   - If a file path or directory is provided, review only those files
   - If no argument is given, review all changed files: run `git diff --name-only HEAD` to detect modified files
   - If no git changes are found, ask the user which files or directories to review
   - Categorize files by type: `.cls`, `.trigger` (Apex), `.js`, `.html`, `.css` (LWC), `.soql` (queries), metadata XML

2. **Delegate to specialized agents**
   - **apex-reviewer**: All `.cls` and `.trigger` files — check naming conventions, method complexity, exception handling, documentation, bulkification patterns, separation of concerns
   - **lwc-reviewer**: All LWC component directories — check reactive properties, lifecycle hooks, event handling, accessibility, error handling, template expressions
   - **soql-optimizer**: All SOQL queries found in Apex classes — check selectivity, index usage, relationship queries, field list optimization, query plan analysis
   - **security-reviewer**: All Apex and LWC files — check CRUD/FLS enforcement, `with sharing` usage, SOQL injection risks, XSS in LWC, sensitive data exposure, CSP compliance
   - **governor-limits-checker**: All Apex files — check SOQL/DML in loops, heap usage risks, CPU-intensive operations, callout patterns, future/queueable usage

3. **Run each agent sequentially**
   - Pass the relevant file list to each agent
   - Collect findings from each agent with severity levels: Critical, High, Medium, Low, Info
   - Track which files each finding applies to

4. **Consolidate findings**
   - Merge all findings into a single report
   - Deduplicate overlapping findings (e.g., security and governor agents may flag the same SOQL)
   - Group findings by severity, then by file

5. **Generate report**
   - Display a summary header with total findings by severity
   - For each severity level (Critical first), list findings with:
     - File path and line number (if available)
     - Domain (Apex, LWC, SOQL, Security, Governor)
     - Description of the issue
     - Recommended fix with code example
   - End with an overall health score: Critical=0-2 points deducted per finding, High=1, Medium=0.5, Low=0.25
   - Score out of 100, starting at 100 and deducting per finding

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--path` | File or directory to review | Changed files |
| `--severity` | Minimum severity to report | `Low` |
| `--domain` | Limit to specific domain (apex, lwc, soql, security, governor) | All |
| `--fix` | Auto-suggest fixes inline | `false` |

## Error Handling

- If no reviewable files are found, inform the user and suggest specifying a path
- If an agent encounters a parse error, report the file as unreadable and continue with other files
- If a file type is unrecognized, skip it and note it in the report summary
- If the review scope is very large (50+ files), warn the user and suggest narrowing the scope

## Example Usage

```
/code-review
/code-review --path force-app/main/default/classes/AccountService.cls
/code-review --severity High --domain security
/code-review --path force-app/main/default/lwc/accountList
```
