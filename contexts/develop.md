# Development Mode Context

Active when editing Apex (.cls, .trigger), LWC (.js, .html, .css), or Flow (.flow-meta.xml) files.

## Quick Reference

### Apex Coding Standards
- PascalCase for classes, camelCase for methods/variables, UPPER_SNAKE for constants
- `with sharing` by default — document exceptions with `inherited sharing`
- Max method: 50 lines. Max class: 500 lines
- ApexDoc on all public/global methods
- One return statement per method preferred
- No magic numbers — use constants or custom metadata

### Governor Limits Budget
| Limit | Sync | Async |
|-------|------|-------|
| SOQL | 100 | 200 |
| DML | 150 | 150 |
| CPU | 10s | 60s |
| Heap | 6MB | 12MB |
| Callouts | 100 | 100 |
| Future | 50 | 0 |
| SOQL Rows | 50,000 | 50,000 |
| DML Rows | 10,000 | 10,000 |

### Patterns
- One trigger per object with handler delegation
- Service layer for business logic (stateless, bulkified)
- Selector layer for SOQL (centralized queries, `WITH SECURITY_ENFORCED`)
- Domain layer for SObject validation/behavior
- Unit of Work for transactional DML grouping

### LWC Standards
- Component naming: `camelCase` in JS, `kebab-case` in HTML templates
- Wire adapters preferred over imperative Apex calls
- Reactive properties with `@track` only when needed (objects/arrays)
- Error handling with `reduceErrors` utility
- Accessible markup: ARIA labels, keyboard navigation
- CSS custom properties for theming

### Flow Standards
- Naming: `ObjectName - Purpose - Type` (e.g., `Account - Validate Address - Before Save`)
- Always include fault paths on DML and callout elements
- Use subflows for reusable logic
- Limit loops — prefer collection variables and formulas
- Document decision criteria in descriptions

### Testing Reminders
- Write test FIRST (TDD)
- 90%+ coverage target
- Test with 200+ records for bulkification
- Use @TestSetup and TestDataFactory
- Assert both positive and negative scenarios
- Test with different user profiles using System.runAs()
- Mock external callouts with HttpCalloutMock

### Agent Delegation
- Complex architecture decisions -> delegate to `architect` agent
- Security concerns -> delegate to `security-reviewer` agent
- Performance or governor limit issues -> delegate to `governor-limits-checker` agent
- SOQL query optimization -> delegate to `soql-optimizer` agent
- New feature planning -> delegate to `planner` agent
- Deployment questions -> delegate to `deployment-specialist` agent

### Pre-Save Checklist
- [ ] No SOQL or DML in loops
- [ ] All classes have sharing keyword
- [ ] Bind variables in all SOQL
- [ ] ApexDoc on public methods
- [ ] Tests written and passing
- [ ] Bulkification verified with 200+ records
- [ ] Error handling with meaningful messages
- [ ] No hardcoded IDs or credentials
