# Agent Delegation — Universal Rules

## When to Delegate

Use specialized agents proactively — don't wait for the user to ask:

| Trigger | Delegate To | Automatically When |
|---------|------------|-------------------|
| Complex feature request | `planner` | Multi-object changes, new integrations |
| Apex code written/modified | `apex-reviewer` | After any .cls or .trigger edit |
| LWC code written/modified | `lwc-reviewer` | After any LWC JS/HTML/CSS edit |
| SOQL queries added/changed | `soql-optimizer` | New or modified queries |
| Bug fix or new feature | `test-guide` | TDD workflow needed |
| Architectural decision | `architect` | Data model, integration, scalability |
| Security-sensitive code | `security-reviewer` | CRUD/FLS, sharing, callouts |
| Code with loops/queries | `governor-limits-checker` | Loops containing queries or DML |
| Deployment operations | `deployment-specialist` | Deploy, retrieve, package version |
| Flow automation | `flow-analyst` | Flow XML analysis |
| External integrations | `integration-specialist` | REST/SOAP callouts, Platform Events |
| Metadata questions | `metadata-analyst` | Dependencies, unused components |
| Data model design | `data-modeler` | Object relationships, schema changes |
| Admin configuration | `admin-advisor` | Permission sets, sharing, validation rules |

## Parallel Execution

Launch multiple agents simultaneously when their tasks are independent:

- `apex-reviewer` + `security-reviewer` + `governor-limits-checker` — all can review the same code in parallel
- `soql-optimizer` + `apex-reviewer` — query optimization and code quality are independent
- `planner` should run BEFORE other agents (its output guides them)

## Agent Orchestration Patterns

### Full Code Review
1. Launch `apex-reviewer`, `lwc-reviewer`, `security-reviewer`, `governor-limits-checker` in parallel
2. Consolidate findings by severity (Critical → High → Medium → Low)
3. Present unified report

### New Feature Development
1. `planner` → creates implementation plan
2. `architect` → validates design decisions
3. `test-guide` → TDD workflow
4. `apex-reviewer` + `security-reviewer` → post-implementation review

### Deployment
1. `security-reviewer` → pre-deploy security check
2. `deployment-specialist` → validation deploy
3. `deployment-specialist` → production deploy (after approval)

## Agent Response Protocol

When an agent reports a **CRITICAL** finding:
1. **STOP** current work
2. **Fix** the critical issue immediately
3. **Re-run** the agent to verify the fix
4. **Resume** original work only after critical issues are resolved
