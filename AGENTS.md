# Claude SFDX IQ — Agent Instructions

This is a **Salesforce DX Claude Code plugin** providing 14 specialized agents, 36 skills, 53 commands, 44 rules across 6 categories, 16 hook scripts, 7 CLI tools, 5 mode contexts, and automated hook workflows for Salesforce development.

## Core Principles

1. **Governor-Limits-First** — Every code path evaluated for SOQL, DML, CPU, heap limits
2. **Security-First** — CRUD/FLS enforcement, `with sharing`, no SOQL injection
3. **Test-Driven** — 75% minimum (90%+ target), Apex test-first, LWC Jest
4. **Bulkification Always** — Handle 200+ records in every trigger and batch context
5. **Plan Before Execute** — Plan complex Salesforce features before writing code
6. **Agent-First** — Delegate to specialized Salesforce agents for domain tasks

## Available Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | SFDC implementation planning | Complex features, multi-object changes |
| architect | Solution architecture | Data model, integration patterns, scalability |
| apex-reviewer | Apex code quality review | After writing/modifying Apex code |
| lwc-reviewer | LWC component review | After writing/modifying LWC components |
| soql-optimizer | SOQL/SOSL query analysis | Query performance, selectivity issues |
| security-reviewer | Security vulnerability scan | CRUD/FLS, sharing, injection, before commits |
| governor-limits-checker | Governor limit analysis | Code with loops, queries, DML operations |
| deployment-specialist | Deployment and packaging | sf deploy, package versions, destructive changes |
| test-guide | Salesforce TDD workflow | New features, bug fixes, test coverage |
| flow-analyst | Flow best practices review | Flow automation analysis |
| integration-specialist | Integration patterns | REST/SOAP callouts, platform events, CDC |
| metadata-analyst | Metadata analysis | Dependencies, unused components, org health |
| data-modeler | Data model design | Object relationships, schema optimization |
| admin-advisor | Declarative configuration | Permission sets, sharing rules, validation rules |

## Agent Orchestration

Use agents proactively without user prompt:
- Complex feature requests → **planner**
- Apex code written/modified → **apex-reviewer**
- LWC code written/modified → **lwc-reviewer**
- SOQL queries added/changed → **soql-optimizer**
- Bug fix or new feature → **test-guide**
- Architectural decision → **architect**
- Security-sensitive code → **security-reviewer**
- Code with loops/queries → **governor-limits-checker**
- Deployment operations → **deployment-specialist**

Use parallel execution for independent operations — launch multiple agents simultaneously.

## Security Guidelines

**Before ANY commit:**
- [ ] All Apex uses `with sharing` (or explicit justification for `without sharing`)
- [ ] All SOQL uses bind variables or `WITH SECURITY_ENFORCED`
- [ ] No dynamic SOQL with string concatenation
- [ ] `Security.stripInaccessible()` used for DML with user-provided data
- [ ] No hardcoded credentials, API keys, or tokens
- [ ] Connected App secrets in Named Credentials, not code
- [ ] Error messages don't expose field names or object structure to unauthorized users

**If security issue found:** STOP → use security-reviewer agent → fix CRITICAL issues → review codebase for similar issues.

## Coding Style

**Bulkification (CRITICAL):** All trigger handlers must process `Trigger.new` as a collection. No SOQL or DML inside for loops — ever. Use Maps for lookups.

**File organization:** One trigger per object. Handler class per trigger. Service classes for reusable business logic. Selector classes for SOQL encapsulation. 200-400 lines typical, 800 max.

**Naming:** PascalCase for classes, camelCase for methods/variables, UPPER_SNAKE for constants. Descriptive names — `AccountTriggerHandler` not `ATH`.

## Testing Requirements

**Minimum coverage: 75% (Salesforce requirement), target 90%+**

Test types (all required for Apex):
1. **Unit tests** — Individual methods, utility classes, trigger handlers
2. **Integration tests** — DML operations, SOQL queries, callout mocks
3. **Bulk tests** — Test with 200+ records to verify bulkification

**TDD workflow:**
1. Write test first (RED) — test should FAIL
2. Write minimal Apex implementation (GREEN) — test should PASS
3. Refactor (IMPROVE) — verify coverage 90%+

**Test patterns:**
- Use `@TestSetup` for shared test data
- Use `TestDataFactory` pattern for reusable test data creation
- Use `Test.startTest()`/`Test.stopTest()` for governor limit reset
- Use `System.runAs()` for user context and sharing tests
- Implement `HttpCalloutMock` for external callout tests

## Development Workflow

1. **Plan** — Use planner agent for complex features
2. **TDD** — Use test-guide agent, write Apex tests first
3. **Review** — Use apex-reviewer + security-reviewer agents
4. **Deploy** — Use deployment-specialist agent for validation and deploy
5. **Commit** — Conventional commits format

## Git Workflow

**Commit format:** `<type>: <description>` — Types: feat, fix, refactor, docs, test, chore, perf, ci

**Branch naming:** `feature/TICKET-description`, `fix/TICKET-description`, `release/vX.Y.Z`

## Project Structure

```
agents/          — 14 specialized Salesforce subagents
skills/          — 36 Salesforce domain skills
commands/        — 53 slash commands
hooks/           — Trigger-based automations with 16 hook scripts
rules/           — 44 always-follow guidelines (common + apex + lwc + soql + flows + metadata)
contexts/        — 5 mode-specific context files (develop, review, debug, deploy, admin)
scripts/         — Cross-platform Node.js utilities, 7 CLI tools (claude-sfdx-iq), 10 library scripts
mcp-configs/     — MCP server configurations
tests/           — Test suite
```

## Success Metrics

- All Apex tests pass with 90%+ coverage
- No security vulnerabilities (CRUD/FLS enforced, no injection)
- No governor limit violations
- All code handles 200+ records (bulkified)
- Code is readable and follows Salesforce best practices
