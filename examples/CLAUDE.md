# CLAUDE.md — Salesforce DX Project

## Project Overview

<!-- Describe your Salesforce project, org type, package namespace if any -->
This is a Salesforce DX project using [org type: scratch/sandbox/production].
- Namespace: [your namespace or empty]
- API Version: 62.0
- Package Type: [unlocked/managed/unmanaged]

## claude-sfdx-iq Plugin

This project uses the **claude-sfdx-iq** plugin for Salesforce development.

### Plugin Configuration
- **Installed**: v1.5.4
- **Rules**: 44 rules in `.claude/rules/` (~43k tokens total)
- **Token Optimization**: context-assigner agent loads only 5-8 rules per task (5k-15k tokens)
- **Hook Profile**: `standard` (balanced checks)

### Available Commands

Run `/help` to see all 53 commands, including:
- `/deploy` — Deploy to Salesforce org with validation
- `/test` — Run Apex tests with coverage analysis
- `/apex-review` — Review Apex code quality
- `/lwc-review` — Review LWC components
- `/security-scan` — CRUD/FLS/sharing/injection scan
- `/governor-check` — Governor limit risk analysis
- `/tdd` — Test-driven development workflow
- `/scaffold-trigger` — Generate trigger + handler + test
- `/scaffold-lwc` — Generate LWC component boilerplate
- `/code-review` — Full code review with parallel agents

### Rules Loading

**Rules are loaded dynamically** by the context-assigner agent based on your task:
- Apex tasks → apex rules + common/security
- LWC tasks → lwc rules + common/security
- Full review → broader rule set

**Available Rules:**

@.claude/rules/index.md

**Manual rule selection:** Add `--custom rules` to your message to choose specific rules.

## Development Workflow

- Default org alias: [your-org-alias]
- Scratch org duration: 7 days
- Scratch org definition: config/project-scratch-def.json
- Test minimum: 90% coverage
- Deployment: validate first, then quick deploy

## Architecture

- **Trigger framework**: one-trigger-per-object with handler delegation
- **Service layer**: `*Service.cls` for business logic (stateless, bulkified)
- **Selector layer**: `*Selector.cls` for SOQL (centralized queries)
- **Domain layer**: `*Domain.cls` for SObject validation/behavior
- **Test data**: `TestDataFactory.cls` for reusable test data creation

## Team Conventions

<!-- Add your team's specific conventions here -->
- Always use TestDataFactory for test data — no inline record creation
- All triggers must go through TriggerHandler framework
- Feature branches: `feature/TICKET-description`
- Commit format: `feat|fix|refactor|test: description`
- 90%+ test coverage required for all Apex classes

## External Integrations

<!-- List named credentials and their purposes -->
- [NamedCredential] — [Purpose and target system]

## Environment Notes

<!-- Any org-specific notes, limitations, or known issues -->
- [Document any org-specific configuration here]
- [Note any managed packages installed and their impact]

## Hook Configuration

Current hook profile: **standard** (balanced checks)

Available profiles:
- `minimal` — Critical checks only (fastest)
- `standard` — Balanced checks (default)
- `strict` — All checks including style warnings

To change: Set `CSIQ_HOOK_PROFILE=minimal` in `.claude/settings.json`

To disable specific hooks: Set `CSIQ_DISABLED_HOOKS="post-edit-pmd-scan,post-edit-debug-warn"`
