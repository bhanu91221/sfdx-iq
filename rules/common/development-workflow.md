# Development Workflow — Universal Rules

## Environment Strategy

| Environment | Purpose | Refresh Cadence |
|-------------|---------|----------------|
| **Scratch Org** | Feature development, isolated testing | Per feature branch |
| **Developer Sandbox** | Individual developer work | Weekly or on-demand |
| **Partial Copy Sandbox** | Integration testing with subset of data | Per sprint |
| **Full Copy Sandbox** | UAT, performance testing, staging | Per release |
| **Production** | Live environment | Deploy only validated packages |

## Source-Driven Development

1. All development uses **source format** (not metadata API format).
2. `sfdx-project.json` is the single source of truth for project structure.
3. Source tracking (`sf project deploy/retrieve`) for scratch orgs and sandboxes.
4. Version control (Git) is the canonical source — orgs are disposable.

## Development Cycle

```
1. Pull latest from main branch
2. Create feature branch: feature/TICKET-description
3. Create scratch org (or use sandbox)
4. Write tests FIRST (TDD: Red → Green → Refactor)
5. Push source to scratch org
6. Validate in scratch org
7. Run all Apex tests (must pass with 90%+ coverage)
8. Create pull request
9. Code review (use /code-review command)
10. Merge to main
11. Deploy to integration sandbox
12. Deploy to UAT → Production
```

## Scratch Org Workflow

- Define features and settings in `project-scratch-def.json`.
- Set scratch org duration to match your sprint length (default: 7 days, max: 30).
- Automate post-create steps: push source → assign permission sets → load seed data.
- Treat scratch orgs as ephemeral — never store work only in a scratch org.

## Sandbox Workflow

- Always pull latest metadata before starting work.
- Use `.forceignore` to exclude metadata you don't own (profiles, translations).
- Resolve metadata conflicts before committing — especially layouts and permission sets.
- Never make changes directly in production.

## Configuration vs Code Decision

| Use Declarative (Clicks) | Use Code (Apex/LWC) |
|--------------------------|---------------------|
| Simple field updates | Complex business logic |
| Basic record-triggered flows | Dynamic SOQL requirements |
| Validation rules | Heavy computation |
| Formula fields | External API integration |
| Approval processes | Custom UI beyond standard components |
| Simple screen flows | Bulkified batch processing |

**Default to declarative.** Only write code when declarative tools are insufficient or would create maintenance problems.

## Quality Gates

Before any pull request:
- [ ] All Apex tests pass
- [ ] Code coverage ≥ 90% on changed classes
- [ ] No governor limit violations
- [ ] Security review passed (CRUD/FLS enforced)
- [ ] No SOQL/DML in loops
- [ ] All triggers use handler delegation pattern
