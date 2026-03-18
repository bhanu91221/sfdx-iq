# CLAUDE.md

This file provides guidance to Claude Code when working with Salesforce DX projects using the claude-sfdx-iq plugin.

## Project Overview

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

- **agents/** — 14 specialized subagents (apex-reviewer, lwc-reviewer, soql-optimizer, etc.)
- **skills/** — 36 Salesforce domain skills (apex-patterns, governor-limits, lwc-testing, etc.)
- **commands/** — 42 slash commands (/deploy, /test, /apex-review, /security-scan, /code-review, /debug-log, etc.)
- **hooks/** — Trigger-based automations with 16 hook scripts (post-edit PMD scan, governor limit check, security scan)
- **rules/** — 44 always-follow guidelines across 6 categories (common + apex + lwc + soql + flows + metadata)
- **contexts/** — 5 mode-specific context files (develop, review, debug, deploy, admin)
- **scripts/** — Cross-platform Node.js utilities: 7 CLI tools (csiq.js + subcommands), 10 library scripts, 16 hook scripts
- **mcp-configs/** — MCP server configurations for Salesforce integrations
- **tests/** — Test suite for scripts and utilities

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

## CLI Tools

- `csiq help` — Show available CLI commands
- `csiq install` — Install a configuration profile
- `csiq status` — Check plugin and org status
- `csiq doctor` — Diagnose configuration issues
- `csiq repair` — Auto-fix common configuration problems
- `csiq config` — View or update plugin configuration

## Core Principles

1. **Governor-Limits-First** — Every code change is evaluated against Salesforce governor limits
2. **Security-First** — CRUD/FLS enforcement, `with sharing` by default, no SOQL injection
3. **Test-Driven** — 75% minimum coverage (90%+ target), test-first development
4. **Bulkification Always** — All code must handle 200+ records in trigger context
5. **Agent-First** — Delegate to specialized agents for domain tasks
6. **Plan Before Execute** — Plan complex features before writing code

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
