# Git Workflow — Universal Rules

## Branch Strategy

| Branch | Purpose | Deploys To |
|--------|---------|-----------|
| `main` | Production-ready code | Production |
| `develop` | Integration branch (optional) | Full Copy Sandbox |
| `feature/TICKET-desc` | New feature development | Scratch Org |
| `fix/TICKET-desc` | Bug fix | Scratch Org |
| `release/vX.Y.Z` | Release stabilization | UAT Sandbox |
| `hotfix/TICKET-desc` | Critical production fix | Production (fast-track) |

## Commit Format

Use conventional commits:

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`, `style`

```
feat: add Account deduplication service
fix: resolve governor limit in Contact trigger bulk update
refactor: extract SOQL queries to AccountSelector
test: add bulk test for OpportunityTriggerHandler
docs: update API integration runbook
```

## .forceignore Best Practices

Always include in `.forceignore`:

```
# Profiles (use Permission Sets instead)
**/profiles/**

# Translations (unless explicitly managed)
**/translations/**

# Admin-managed metadata
**/settings/**
**/objectTranslations/**

# IDE and OS files
**/.sfdx/**
**/.sf/**
**/.localdevserver/**
.DS_Store
```

## Merge Conflict Resolution

Salesforce metadata XML is prone to merge conflicts. Follow these rules:

| Metadata Type | Strategy |
|---------------|---------|
| **Layouts** | Resolve manually — field additions are position-sensitive |
| **Profiles** | Avoid committing profiles entirely — use Permission Sets |
| **Permission Sets** | Merge carefully — field permissions are alphabetized |
| **Custom Labels** | Alphabetical order — add in correct position |
| **Flows** | Never merge flow XML manually — rebuild in org and retrieve |
| **Objects** | Safe to merge — fields are independent elements |

## Pull Request Requirements

Every PR must include:
- [ ] Descriptive title following commit convention
- [ ] Link to ticket/user story
- [ ] Summary of changes
- [ ] Test plan or evidence of testing
- [ ] No `.sfdx/`, `.sf/`, or `node_modules/` in the diff
- [ ] No hardcoded IDs, credentials, or secrets
- [ ] Code review by at least one team member

## What Never Goes in Version Control

- `.sfdx/` and `.sf/` directories (local CLI state)
- `node_modules/` (install via package.json)
- `.env` files (secrets)
- Debug logs
- Personal scratch org definitions
- Salesforce session tokens or auth files
