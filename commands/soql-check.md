---
description: Analyze SOQL queries for optimization opportunities
---

# /soql-check

Scan the codebase for SOQL queries and analyze them for selectivity, performance, and security.

## Workflow

1. **Discover SOQL queries**
   - Scan all `.cls` and `.trigger` files for SOQL patterns (`[SELECT ... FROM ...]`)
   - Extract each query with its file location and line number
   - Identify dynamic SOQL via `Database.query()` calls

2. **Delegate to soql-optimizer agent**
   - Pass all discovered queries to the `soql-optimizer` agent
   - The agent analyzes each query against optimization rules

3. **Analysis checks**
   For each query, evaluate:
   - **Selectivity**: Are WHERE clause fields indexed? (Id, Name, CreatedDate, RecordTypeId, foreign keys)
   - **Bind variables**: Using `:variable` vs string concatenation?
   - **LIMIT clause**: Present on all non-Batch queries?
   - **Field count**: Querying only needed fields?
   - **Relationship depth**: Parent queries ≤5 levels, child subqueries ≤1 level?
   - **N+1 pattern**: SOQL inside loops?
   - **Security**: `WITH SECURITY_ENFORCED` or `WITH USER_MODE` present?
   - **Aggregate efficiency**: Using `COUNT()` vs querying records for existence checks?

4. **Output report**
   Rank findings by priority:
   - 🔴 **CRITICAL**: SOQL in loops, injection risk
   - 🟠 **HIGH**: Non-selective filters on large objects, missing security clause
   - 🟡 **MEDIUM**: Missing LIMIT, excessive fields
   - 🔵 **LOW**: Style suggestions, minor optimizations

## Flags

| Flag | Description |
|------|-------------|
| `--file` | Analyze specific file only |
| `--severity` | Minimum severity to report: `critical`, `high`, `medium`, `low` |

## Example

```
/soql-check
/soql-check --file force-app/main/default/classes/AccountSelector.cls
```
