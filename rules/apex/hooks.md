# Apex Hook Rules

## Post-Edit Hooks for Apex Files

When an Apex class (`.cls`) or trigger (`.trigger`) is edited, the following hooks fire automatically:

### apex-lint (always active)
Scans for critical violations:
- SOQL queries inside `for` loops
- DML statements inside `for` loops
- Missing `with sharing` keyword on class declarations
- Hardcoded Salesforce IDs (15 or 18 character patterns)

### trigger-lint (on .trigger files)
Scans for trigger-specific violations:
- Business logic directly in trigger body (should delegate to handler)
- SOQL or DML operations in trigger body
- Multiple triggers on the same object (warning)

### soql-check (on .cls files containing SOQL)
Scans SOQL queries for:
- Missing `LIMIT` clause on non-Batch queries
- String concatenation in query strings (injection risk)
- Queries selecting excessive fields

## Hook Severity Levels

| Severity | Blocks Commit? | Action Required |
|----------|---------------|-----------------|
| CRITICAL | Yes | Fix immediately — SOQL injection, missing sharing |
| HIGH | No (warning) | Fix before PR — DML in loops, hardcoded IDs |
| MEDIUM | No | Recommended — missing LIMIT, excessive fields |
| LOW | No | Informational — style suggestions |

## Hook Behavior by Profile

| Check | Minimal | Standard | Strict |
|-------|---------|----------|--------|
| SOQL in loops | ✅ | ✅ | ✅ |
| DML in loops | ✅ | ✅ | ✅ |
| Missing `with sharing` | ✅ | ✅ | ✅ |
| Hardcoded IDs | ❌ | ✅ | ✅ |
| Missing LIMIT | ❌ | ✅ | ✅ |
| SOQL injection risk | ✅ | ✅ | ✅ |
| System.debug() | ❌ | ❌ | ✅ |
| Method length >50 lines | ❌ | ❌ | ✅ |
| Missing ApexDoc | ❌ | ❌ | ✅ |

## Pre-Commit Gate

The `pre-commit-check.js` hook runs all lint scripts on staged Apex files:
- If any CRITICAL findings exist, the commit is blocked (exit code 1).
- HIGH and below produce warnings but allow the commit.

## Disabling Hooks

For bulk refactoring sessions or code generation, temporarily disable:

```bash
export CSIQ_DISABLED_HOOKS="apex-post-edit,soql-check"
```

Re-enable after the refactoring is complete — never leave hooks disabled permanently.
