---
paths:
  - "**/*.cls"
  - "**/*.trigger"
  - "**/*.apex"
---

# SOQL Hook Rules

## Post-Edit SOQL Checks

When any `.cls` file is edited, the `soql-check.js` hook scans for SOQL anti-patterns:

### Checks Performed

| Check | Severity | Description |
|-------|----------|-------------|
| Missing LIMIT | MEDIUM | Queries without `LIMIT` (except in Batch `start()`) |
| String concatenation | CRITICAL | User input concatenated into SOQL strings |
| Missing bind variables | HIGH | Literal values instead of `:variable` in WHERE clauses |
| Missing security | HIGH | No `WITH SECURITY_ENFORCED` or `WITH USER_MODE` |
| Excessive fields | LOW | SELECT with >15 fields (suggests narrowing) |
| SOQL in loop | CRITICAL | Query inside a `for` or `while` loop body |

### Detection Patterns

The hook uses regex patterns to detect violations:

```
SOQL in loop:       for\s*\(.*\)\s*\{[\s\S]*?\[SELECT
Concatenation:      '\s*\+\s*\w+.*SELECT|SELECT.*\+\s*'
Missing LIMIT:      \[SELECT(?!.*LIMIT)(?!.*Database\.getQueryLocator)
```

## Hook Behavior by Profile

| Check | Minimal | Standard | Strict |
|-------|---------|----------|--------|
| SOQL in loop | ✅ | ✅ | ✅ |
| String concatenation | ✅ | ✅ | ✅ |
| Missing bind variables | ❌ | ✅ | ✅ |
| Missing LIMIT | ❌ | ✅ | ✅ |
| Missing security clause | ❌ | ✅ | ✅ |
| Excessive fields | ❌ | ❌ | ✅ |
| Non-selective filter warning | ❌ | ❌ | ✅ |

## False Positive Handling

Some patterns may trigger false positives:

- **Batch start()**: Queries without LIMIT are valid in `Database.getQueryLocator()` — the hook excludes these.
- **Test classes**: SOQL in test methods is less critical — standard profile treats these as LOW severity.
- **Dynamic SOQL**: `Database.query()` is flagged as HIGH — use `Database.queryWithBinds()` instead.

## Integration with soql-optimizer Agent

When the hook reports 3+ SOQL findings in a single file, it automatically suggests invoking the `soql-optimizer` agent for a comprehensive review.
