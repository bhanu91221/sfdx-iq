# CLAUDE.md — Salesforce DX Project

## Project Overview

<!-- Describe your Salesforce project, org type, package namespace if any -->
This is a Salesforce DX project using [org type: scratch/sandbox/production].
- Namespace: [your namespace or empty]
- API Version: 62.0
- Package Type: [unlocked/managed/unmanaged]

## claude-sfdx-iq Plugin

This project uses the **claude-sfdx-iq** plugin v2.0.0 for Salesforce development.

### Plugin Configuration
- **Installed**: v2.0.0
- **Hook Profile**: `standard` (balanced checks)

### Available Commands

Commands are self-contained — each includes its domain standards inline. No context loading step needed.

**Domain commands (use flags to select workflow):**
- `/apex-class --new|--review|--refine|--bug-fix` — Apex classes, service layers, utilities
- `/trigger --new|--review|--refine|--bug-fix` — Triggers + handler delegation
- `/async-apex --new|--refine|--bug-fix` — Batch, Queueable, Schedulable, @future
- `/integration-apex --new|--refine|--bug-fix` — REST/SOAP callouts and inbound services
- `/lwc --new|--explain|--refine|--bug-fix` — Lightning Web Components
- `/flow --new|--review|--refine|--explain` — Screen/Record-Triggered/Scheduled Flows

**Cross-domain commands:**
- `/code-review --apex|--lwc|--flow [file|--all]` — Full review with specialist agents in parallel
- `/explain --apex|--lwc|--flow|--deep` — Explain code; `--deep` traces across files
- `/security-scan` — CRUD/FLS, sharing, injection, CSP, guest user scan

**Utility commands:**
- `/org-health` — Org health check and technical debt report
- `/data-model` — ER design and object relationship analysis
- `/plan` — Implementation planning with phased roadmap
- `/package` — 2GP package versioning
- `/debug-log` — Analyze Salesforce debug logs
- `/doctor` — Diagnose environment issues
- `/status` — Plugin and org connection status

## Development Workflow

- Default org alias: [your-org-alias]
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
