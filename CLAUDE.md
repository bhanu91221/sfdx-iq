# CLAUDE.md

This file provides guidance to Claude Code when working with the sfdx-iq plugin repository.

## Project Overview

This is the **sfdx-iq plugin repository** — a Claude Code plugin that transforms Claude into a Salesforce development expert.

**Distribution Model:**
- **Global Installation** (marketplace): Agents, commands, hooks → `~/.claude/plugins/sfdx-iq/`
- **Project Setup** (per SFDX project): Settings + CLAUDE.md template → `.claude/` (via `npx sfdx-iq setup-project`)

**Architecture (v2.0.2):**
- Commands are **self-contained** — domain standards are baked in, no separate rules or context loading required
- Agents are invoked by commands for domain-specific review and analysis
- Hooks provide automated quality gates on file save

This is a **Claude Code plugin** — production-ready agents, commands, hooks, and MCP configurations specialized for Salesforce DX development. Covers Apex, LWC, SOQL, Flows, metadata management, packaging, and CI/CD.

## Running Tests

```bash
# Run all validators and tests
npm test

# Run individual validators
node scripts/ci/validate-agents.js
node scripts/ci/validate-commands.js
node scripts/ci/validate-hooks.js
```

## Architecture

### Distributed Globally (via plugin installation)
- **agents/** — 7 specialized subagents (apex-code-reviewer, lwc-reviewer, flow-analyst, security-auditor, integration-specialist, devops-coordinator, solution-designer) + reference docs (*-ref.md)
- **commands/** — 21 slash commands with baked-in domain standards
- **hooks/** — 5 hook JSON definitions + 16 hook scripts (quality gates, SOQL checks, Flow checks)
- **examples/** — Code examples (integration patterns, Apex, LWC)
- **scripts/** — Cross-platform Node.js utilities (sfdx-iq CLI, hook scripts, lib)
- **mcp-configs/** — MCP server configurations for Salesforce integrations

### Copied Per-Project (via npx sfdx-iq setup-project)
- **.claude-project-template/** — Project configuration templates (settings.json, CLAUDE.md)

### Development Only
- **tests/** — Test suite for scripts and utilities (validators, unit tests)
- **schemas/** — JSON Schema validators for plugin components

## Key Commands

**Domain Commands** (use flags for workflows):
- `/apex-class` — Create, review, refine, or bug-fix Apex classes
- `/trigger` — Trigger + handler class lifecycle
- `/async-apex` — Batch, Queueable, Schedulable, @future, Platform Events
- `/integration-apex` — REST/SOAP callouts, inbound REST/SOAP services
- `/lwc` — Lightning Web Components full lifecycle
- `/flow` — Salesforce Flows design, review, refine
- `/code-review` — Full code review via parallel agent orchestration
- `/explain` — Explain any Apex, LWC, trigger, or Flow file
- `/security-scan` — CRUD/FLS/sharing/injection vulnerability scan
- `/data-model` — ER design, object relationships

**Utility Commands:**
- `/apex-test` — Create or improve Apex test classes with coverage targeting
- `/debug-log` — Retrieve and analyze Salesforce debug logs
- `/org-health` — Org health: security score, metadata debt
- `/plan` — Implementation planning
- `/package` — 2GP package management
- `/handoff` — Generate session summary for context handoff
- `/setup-project` — Initialize plugin config for this project
- `/status` / `/doctor` / `/repair` / `/csiq-help` — CLI utilities

## CLI Tools

Available via `npx` or as slash commands:

- `npx sfdx-iq setup-project` or `/setup-project` — Copy config to an SFDX project
- `npx sfdx-iq help` or `/csiq-help` — Show available CLI commands
- `npx sfdx-iq status` or `/status` — Check plugin and org status
- `npx sfdx-iq doctor` or `/doctor` — Diagnose configuration issues
- `npx sfdx-iq repair` or `/repair` — Auto-fix common configuration problems

## Core Principles

1. **Governor-Limits-First** — Every code change is evaluated against Salesforce governor limits
2. **Security-First** — CRUD/FLS enforcement, `with sharing` by default, no SOQL injection
3. **Test-Driven** — 75% minimum coverage (90%+ target), test-first development
4. **Bulkification Always** — All code must handle 200+ records in trigger context
5. **Agent-First** — Delegate to specialized agents for domain tasks
6. **Plan Before Execute** — Plan complex features before writing code
7. **Token Optimized** — Self-contained commands load only what's needed per task

## Development Notes

- All Apex must use `with sharing` unless explicitly justified
- All SOQL must use bind variables or `WITH SECURITY_ENFORCED`
- No SOQL or DML in loops — ever
- One trigger per object with handler delegation
- Permission sets over profiles
- Agent format: Markdown with YAML frontmatter (name, description, tools, model)
- Command format: Markdown with description, argument-hint, allowed-tools frontmatter
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
- Commands: Markdown with description, argument-hint, and allowed-tools frontmatter
- Hooks: JSON with matcher and hooks array

File naming: lowercase with hyphens (e.g., `apex-code-reviewer.md`, `apex-class.md`)
