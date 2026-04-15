# CLAUDE.md — Salesforce DX Project

## Project Overview

<!-- Describe your Salesforce project, org type, package namespace if any -->
This is a Salesforce DX project using [org type: scratch/sandbox/production].
- Namespace: [your namespace or empty]
- API Version: 62.0
- Package Type: [unlocked/managed/unmanaged]

## sfdx-iq Plugin

This project uses the **sfdx-iq** plugin for Salesforce development. Commands are self-contained — each command includes its domain standards inline. Invoke commands directly; no context loading step required.

### Available Commands

**Domain Commands** (use flags for different workflows):

| Command | Flags | Purpose |
|---------|-------|---------|
| `/apex-class` | `--new`, `--review`, `--refine`, `--bug-fix` | Service, Selector, Controller, Domain, Utility classes |
| `/trigger` | `--new`, `--review`, `--refine`, `--bug-fix` | Triggers + handler classes |
| `/async-apex` | `--new`, `--refine`, `--bug-fix` | Batch, Queueable, Schedulable, @future, Platform Events |
| `/integration-apex` | `--new`, `--refine`, `--bug-fix` | REST/SOAP callouts, inbound services |
| `/lwc` | `--new`, `--explain`, `--refine`, `--bug-fix` | Lightning Web Components |
| `/flow` | `--new`, `--review`, `--refine`, `--explain` | Salesforce Flows |
| `/code-review` | `--apex`, `--lwc`, `--flow`, `--*-all` | Full code review via specialized agents |
| `/explain` | `--apex`, `--lwc`, `--flow`, `--deep` | Explain artifacts; `--deep` for cross-file tracing |
| `/security-scan` | — | CRUD/FLS, sharing, injection, XSS |

**Utility Commands**:

| Command | Purpose |
|---------|---------|
| `/apex-test` | Create or improve Apex test classes with coverage targeting |
| `/debug-log` | Retrieve and analyze Salesforce debug logs |
| `/setup-project` | Initialize plugin config for this project |
| `/doctor` | Diagnose plugin/org configuration |
| `/status` | Org + plugin status overview |
| `/org-health` | Org health: security score, metadata debt |
| `/data-model` | ER design, object relationships |
| `/plan` | Implementation planning |
| `/package` | 2GP package management |
| `/handoff` | Generate session summary for context continuity |

## Development Workflow

- Default org alias: [your-org-alias]
- Test minimum: 90% coverage
- Deployment: validate first, then quick deploy (done from VS Code or SF CLI directly)

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

## LWC Standards

- Avoid `@track` for primitives — all LWC properties are reactive since Winter '20
- Use `@track` only for object/array properties needing deep reactivity (mutation of nested fields)
- Always handle loading, error, and data states in templates

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
- `minimal` — SOQL/DML-in-loop detection only (fastest)
- `standard` — + sharing keyword, hardcoded IDs, security checks (default)
- `strict` — All checks including callouts in loops, enqueue in loops

To change: Set `CSIQ_HOOK_PROFILE=minimal` in `.claude/settings.json`

To disable specific checks: Set `CSIQ_DISABLED_HOOKS="no-soql-in-loop,no-hardcoded-secrets"` (comma-separated rule names)

## Session Handoff

For long development sessions, use `/handoff --save` to create a `HANDOFF.md` at end of session.
Resume next session with: "Read HANDOFF.md and continue from where we left off."
