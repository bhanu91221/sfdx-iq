# Debug / Troubleshoot Mode Context

Active during `/debug-log`, `/build-fix`, `/explain-error`, and troubleshooting workflows.

## Common Salesforce Errors

| Error | Root Cause | Fix |
|-------|-----------|-----|
| `FIELD_CUSTOM_VALIDATION_EXCEPTION` | Record fails a validation rule | Check validation rules on the object; ensure data meets all criteria |
| `UNABLE_TO_LOCK_ROW` | Record lock contention from concurrent DML | Reduce transaction scope; use FOR UPDATE selectively; implement retry logic |
| `ENTITY_IS_DELETED` | Operating on a deleted record reference | Check for null/deleted records before DML; refresh record references |
| `MIXED_DML_OPERATION` | Setup and non-setup objects in same transaction | Separate setup DML into @future or System.runAs() block |
| `CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY` | Trigger exception during DML | Check debug log for trigger handler errors; review trigger execution order |
| `STRING_TOO_LONG` | Field value exceeds max length | Truncate or validate string length before assignment |
| `DUPLICATE_VALUE` | Unique field constraint violated | Check for existing records before insert; use upsert with external ID |
| `INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY` | Missing object/record access | Verify OWD, sharing rules, permission sets; check record ownership |
| `LIMIT_EXCEEDED` | Governor limit hit (SOQL, DML, CPU, heap) | Profile with Limits class; refactor to reduce consumption |
| `REQUIRED_FIELD_MISSING` | Required field not populated | Check page layouts and field requirements; populate all required fields |
| `INVALID_CROSS_REFERENCE_KEY` | Invalid record type, lookup, or owner | Verify ID references exist and are accessible to running user |
| `STORAGE_LIMIT_EXCEEDED` | Org data or file storage full | Archive old data; delete unused records; request storage increase |
| `TOO_MANY_SOQL_QUERIES` | Over 100 SOQL in sync context | Remove SOQL from loops; use collections and maps; batch queries |
| `TOO_MANY_DML_STATEMENTS` | Over 150 DML in transaction | Combine DML operations; use lists for bulk DML; move to async |
| `APEX_CPU_TIME_LIMIT` | Over 10s CPU in sync context | Optimize loops; reduce nested iterations; offload to async/batch |
| `System.CalloutException` | HTTP callout failure or timeout | Check endpoint availability; verify named credentials; add retry logic |
| `System.LimitException` | Any governor limit exceeded | Identify which limit via `Limits` class; refactor the hot path |
| `System.QueryException: List has no rows` | SOQL query returned 0 rows | Use list query pattern instead of single-row; check for empty results |
| `System.NullPointerException` | Accessing method/property on null | Add null checks; use safe navigation operator (`?.`) |

## Debug Log Analysis Steps

1. **Set trace flags** — Add trace flag for the user or Apex class at FINEST level
2. **Reproduce the issue** — Execute the failing operation
3. **Open debug log** — Developer Console or VS Code Apex Replay Debugger
4. **Filter by category:**
   - `SOQL_EXECUTE_*` — Query details and row counts
   - `DML_*` — DML operations and row counts
   - `CODE_UNIT_STARTED/FINISHED` — Trigger and method execution flow
   - `LIMIT_USAGE_FOR_NS` — Governor limit consumption snapshot
   - `EXCEPTION_THROWN` — Exception details with stack trace
   - `USER_DEBUG` — Custom System.debug output
5. **Check governor limits** — Search for `LIMIT_USAGE_FOR_NS` entries
6. **Trace execution flow** — Follow CODE_UNIT entries to identify order
7. **Find the exception** — Search for EXCEPTION_THROWN or FATAL_ERROR

## Governor Limit Troubleshooting

```
Issue detected
    |
    v
Is it a SOQL limit? ──yes──> Check for queries in loops
    |                           ├── Move queries before loop
    |                           ├── Use Map<Id, SObject> for lookups
    |                           └── Use relationship queries to reduce count
    no
    |
    v
Is it a DML limit? ──yes──> Check for DML in loops
    |                          ├── Collect records in a List
    |                          ├── Perform single DML after loop
    |                          └── Use Database.insert(list, false) for partial
    no
    |
    v
Is it CPU time? ──yes──> Profile the code
    |                       ├── Reduce nested loops (O(n^2) to O(n))
    |                       ├── Use Maps instead of list searches
    |                       ├── Move to @future or Queueable
    |                       └── Check trigger recursion guards
    no
    |
    v
Is it heap size? ──yes──> Reduce data in memory
    |                        ├── Query only needed fields (no SELECT *)
    |                        ├── Process in smaller batches
    |                        ├── Use transient keyword in VF controllers
    |                        └── Clear collections when done
    no
    |
    v
Is it callout limit? ──yes──> Consolidate callouts
                                ├── Batch multiple requests into one
                                ├── Use Continuation for long-running
                                └── Move to Queueable for chaining
```

## Debugging Tools

| Tool | Use Case | Command |
|------|----------|---------|
| Debug Log | Trace execution flow | `sf apex tail log` |
| Replay Debugger | Step through Apex execution | VS Code: Launch Apex Replay |
| Anonymous Apex | Test snippets quickly | `sf apex run --file script.apex` |
| Query Editor | Test SOQL interactively | Developer Console > Query Editor |
| Checkpoints | Inspect heap at a line | Developer Console > Checkpoints |

## Agent Delegation

- Governor limit violations -> delegate to `governor-limits-checker` for refactoring guidance
- Security errors -> delegate to `security-reviewer` for permission analysis
- Test failures -> delegate to `test-guide` for test fix assistance
- Deployment errors -> delegate to `deployment-specialist` for resolution
