---
description: Retrieve and analyze Salesforce debug logs
---

# /debug-log

Retrieve debug logs from a Salesforce org, parse them for issues, and provide actionable analysis.

## Workflow

1. **Set up trace flag** (if not active)
   - Check for active trace flags on the running user:
     ```bash
     sf data query --query "SELECT Id, ExpirationDate, DebugLevelId FROM TraceFlag WHERE TracedEntityId = '<userId>' AND ExpirationDate > NOW()" --target-org <org>
     ```
   - If no active trace flag, create one:
     ```bash
     sf apex tail log --target-org <org>
     ```

2. **Retrieve logs**
   - Get the most recent log:
     ```bash
     sf apex get log --number 1 --target-org <org>
     ```
   - Or list available logs and let user choose:
     ```bash
     sf apex list log --target-org <org>
     ```

3. **Parse the debug log**
   Analyze the log for key sections:

   | Section | What to Look For |
   |---------|-----------------|
   | **SOQL queries** | Count, timing, selectivity warnings |
   | **DML operations** | Count, records affected, errors |
   | **CPU time** | Total usage vs limit |
   | **Heap allocation** | Peak usage vs limit |
   | **Callouts** | HTTP status, response time, timeouts |
   | **Exceptions** | Stack traces, error messages |
   | **Flow interviews** | Flow execution path, element timing |

4. **Governor limit summary**
   Extract limits from the `LIMIT_USAGE_FOR_NS` section:
   ```
   Governor Limit Usage:
     SOQL Queries:    23/100 (23%)
     DML Statements:  8/150 (5%)
     CPU Time:        3,450/10,000 ms (35%)
     Heap Size:       1.2/6 MB (20%)
     Callouts:        2/100 (2%)
   ```

5. **Identify issues**
   - Flag any limit >70% usage as ⚠️ WARNING
   - Flag any limit >90% as 🔴 CRITICAL
   - Identify SOQL queries that appear in loops (check query count vs unique queries)
   - Highlight slow queries (>100ms)
   - Flag unhandled exceptions

6. **Recommendations**
   Based on analysis, suggest:
   - Queries to optimize (slow or redundant)
   - DML to consolidate
   - Code paths to move to async
   - Delegate to `governor-limits-checker` agent if limits are concerning

## Flags

| Flag | Description |
|------|-------------|
| `--target-org` | Org to retrieve logs from |
| `--number` | Number of recent logs to retrieve (default: 1) |
| `--log-id` | Specific log ID to retrieve |
| `--user` | User to retrieve logs for (default: running user) |
| `--tail` | Live tail mode — stream logs as they're generated |

## Example

```
/debug-log
/debug-log --number 5
/debug-log --tail
/debug-log --log-id 07L000000000001
```
