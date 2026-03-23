# CLAUDE.md

This file provides guidance to Claude Code when working with the claude-sfdx-iq plugin repository.

## Project Overview

This is the **claude-sfdx-iq plugin repository** — a Claude Code plugin that transforms Claude into a Salesforce development expert.

**Distribution Model:**
- **Global Installation** (marketplace): Agents, skills, commands, hooks → `~/.claude/plugins/claude-sfdx-iq/`
- **Project Installation** (per SFDX project): Rules → `.claude/rules/` (copied via `npx claude-sfdx-iq setup-project`)

**Why This Approach:**
- Agents/skills/commands work globally (available in all SFDX projects)
- Rules are project-specific (avoid loading 43k tokens in non-SFDX contexts)
- context-assigner agent loads only 5-8 relevant rules per task (saves ~30k tokens)

This is a **Claude Code plugin** — a collection of production-ready agents, skills, hooks, commands, rules, and MCP configurations specialized for Salesforce DX development. Covers Apex, LWC, SOQL, Flows, metadata management, packaging, and CI/CD.

## Running Tests

```bash
# Run all validators and tests
npm test

# Run individual validators
node scripts/ci/validate-agents.js
node scripts/ci/validate-skills.js
node scripts/ci/validate-commands.js
node scripts/ci/validate-hooks.js
```

## Architecture

The project is organized into core components:

### Distributed Globally (via plugin installation)
- **agents/** — 14 specialized subagents (apex-reviewer, lwc-reviewer, soql-optimizer, context-assigner, etc.)
- **skills/** — 36 Salesforce domain skills (apex-patterns, governor-limits, lwc-testing, etc.)
- **commands/** — 53 slash commands (/deploy, /test, /apex-review, etc.)
- **hooks/** — 6 hook JSON definitions + 16 hook scripts (post-edit scans, quality gates)
- **contexts/** — 5 mode-specific context files (develop, review, debug, deploy, admin)
- **scripts/** — Cross-platform Node.js utilities (claude-sfdx-iq CLI, setup-project, hook scripts, lib)
- **mcp-configs/** — MCP server configurations for Salesforce integrations

### Copied Per-Project (via npx claude-sfdx-iq setup-project)
- **rules/** — 44 rules (~43k tokens total, loaded dynamically by context-assigner)
  - common/ (9 rules)
  - apex/ (9 rules)
  - lwc/ (6 rules)
  - soql/ (6 rules)
  - flows/ (6 rules)
  - metadata/ (8 rules)
- **.claude-project-template/** — Project configuration templates (settings.json, CLAUDE.md)

### Development Only
- **tests/** — Test suite for scripts and utilities (validators, unit tests)
- **examples/** — Example code (trigger-handler, LWC, integration, batch)

## Key Commands

- `/deploy` — Source deploy with validation and tests
- `/test` — Run Apex tests with coverage analysis
- `/apex-review` — Apex code quality review
- `/security-scan` — CRUD/FLS/sharing/injection scan
- `/governor-check` — Governor limit risk analysis
- `/tdd` — Salesforce TDD workflow (Apex + LWC Jest)
- `/scaffold-trigger` — Generate trigger + handler boilerplate
- `/scaffold-lwc` — Generate LWC component boilerplate
- `/code-review` — Full code review with parallel agent orchestration
- `/debug-log` — Analyze Salesforce debug logs
- `/build-fix` — Diagnose and fix build/deploy errors
- `/explain-error` — Explain Salesforce error messages
- `/validate` — Validate deployment without executing
- `/destructive` — Manage destructive metadata changes
- `/context` — Show loaded context, browse available skills/rules

## CLI Tools

Available via `npx` or as slash commands (for corporate VPN / blocked npm):

- `npx claude-sfdx-iq setup-project` or `/setup-project` — **Most Important**: Copy rules + config to an SFDX project
- `npx claude-sfdx-iq help` or `/csiq-help` — Show available CLI commands
- `npx claude-sfdx-iq status` or `/status` — Check plugin and org status
- `npx claude-sfdx-iq doctor` or `/doctor` — Diagnose configuration issues (Node, sf CLI, Git, org)
- `npx claude-sfdx-iq repair` or `/repair` — Auto-fix common configuration problems
- `npx claude-sfdx-iq list` or `/list` — List installed components (agents, skills, commands, rules)

## Core Principles

1. **Governor-Limits-First** — Every code change is evaluated against Salesforce governor limits
2. **Security-First** — CRUD/FLS enforcement, `with sharing` by default, no SOQL injection
3. **Test-Driven** — 75% minimum coverage (90%+ target), test-first development
4. **Bulkification Always** — All code must handle 200+ records in trigger context
5. **Agent-First** — Delegate to specialized agents for domain tasks
6. **Plan Before Execute** — Plan complex features before writing code
7. **Token Optimized** — Dynamic rule loading via context-assigner (5-8 rules per task)

## Development Notes

- All Apex must use `with sharing` unless explicitly justified
- All SOQL must use bind variables or `WITH SECURITY_ENFORCED`
- No SOQL or DML in loops — ever
- One trigger per object with handler delegation
- Permission sets over profiles
- Agent format: Markdown with YAML frontmatter (name, description, tools, model)
- Skill format: Markdown with SKILL.md in each skill directory
- Command format: Markdown with description frontmatter
- Hook format: JSON with matcher conditions and command hooks

## Salesforce Governor Limits Reference

| Limit | Synchronous | Asynchronous |
|-------|-------------|--------------|
| SOQL Queries | 100 | 200 |
| DML Statements | 150 | 150 |
| CPU Time | 10,000 ms | 60,000 ms |
| Heap Size | 6 MB | 12 MB |
| Callouts | 100 | 100 |
| Future Calls | 50 | 0 (in future) |
| SOQL Rows | 50,000 | 50,000 |
| DML Rows | 10,000 | 10,000 |

## Contributing

Follow the formats in CONTRIBUTING.md:
- Agents: Markdown with frontmatter (name, description, tools, model)
- Skills: SKILL.md with frontmatter (name, description, origin)
- Commands: Markdown with description frontmatter
- Hooks: JSON with matcher and hooks array

File naming: lowercase with hyphens (e.g., `apex-reviewer.md`, `soql-optimization`)
