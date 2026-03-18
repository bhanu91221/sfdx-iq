# Code Review Mode Context

Active during `/code-review`, `/apex-review`, `/lwc-review`, and manual review workflows.

## Review Checklist

### 1. Security
- [ ] All classes use `with sharing` (or justified `without sharing`)
- [ ] SOQL uses bind variables or `WITH SECURITY_ENFORCED`
- [ ] No dynamic SOQL with string concatenation
- [ ] `Security.stripInaccessible()` on DML with user data
- [ ] No hardcoded credentials, API keys, or tokens
- [ ] Error messages do not expose internal structure

### 2. Governor Limits
- [ ] No SOQL inside loops
- [ ] No DML inside loops
- [ ] Queries are selective (indexed fields in WHERE)
- [ ] Aggregate queries used where appropriate
- [ ] CPU-intensive logic offloaded to async when needed

### 3. Bulkification
- [ ] Trigger handlers process collections, not single records
- [ ] Maps used for lookups instead of nested loops
- [ ] DML operations batched outside loops
- [ ] Tested with 200+ records

### 4. Error Handling
- [ ] Try-catch blocks on external callouts
- [ ] Meaningful error messages for users
- [ ] Errors logged for debugging
- [ ] Fault paths in Flows

### 5. Testing
- [ ] Test coverage 90%+ per class
- [ ] Positive and negative test cases
- [ ] Bulk tests with 200+ records
- [ ] System.runAs() for sharing tests
- [ ] No SeeAllData=true

### 6. Code Quality
- [ ] Methods under 50 lines
- [ ] Classes under 500 lines
- [ ] Descriptive naming (PascalCase classes, camelCase methods)
- [ ] ApexDoc on all public/global methods
- [ ] No commented-out code
- [ ] No System.debug in production

### 7. Architecture
- [ ] One trigger per object with handler delegation
- [ ] Service layer for business logic
- [ ] Selector layer for SOQL
- [ ] No business logic in triggers

### 8. LWC Specific
- [ ] Wire adapters preferred over imperative calls
- [ ] Error handling with toast notifications
- [ ] Accessible markup (ARIA, keyboard nav)
- [ ] No inline styles — use CSS custom properties

## Severity Definitions

| Severity | Description | Response Time | Action |
|----------|-------------|---------------|--------|
| CRITICAL | Security vulnerability, data loss risk, governor limit violation in production | Immediate | Block merge, fix required |
| HIGH | Missing sharing keyword, SOQL in loop, no error handling on callouts | Same day | Fix before merge |
| MEDIUM | Missing tests, code style violations, missing ApexDoc | Before release | Fix recommended |
| LOW | Naming suggestions, minor refactoring, documentation improvements | Backlog | Optional improvement |

## Agent Orchestration

Run these agents in parallel for comprehensive review:

1. **apex-reviewer** — Code quality, patterns, naming, complexity
2. **security-reviewer** — CRUD/FLS, sharing, injection, credentials
3. **governor-limits-checker** — SOQL/DML in loops, query selectivity, limits

After parallel review completes:
4. **soql-optimizer** — If SOQL issues found, deep-dive query analysis
5. **test-guide** — If coverage gaps found, generate missing tests

## Output Format

```markdown
## Code Review Summary

**Files Reviewed:** [count]
**Overall Rating:** [PASS / PASS WITH WARNINGS / FAIL]

### Critical Issues (must fix)
- [CRITICAL] file.cls:42 — Description of issue

### High Issues (fix before merge)
- [HIGH] file.cls:87 — Description of issue

### Medium Issues (fix recommended)
- [MEDIUM] file.cls:15 — Description of issue

### Low Issues (optional)
- [LOW] file.cls:3 — Description of issue

### Positive Observations
- Well-structured trigger handler pattern
- Good test coverage at 94%
```
