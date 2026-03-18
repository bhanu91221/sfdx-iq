# CLAUDE.md — Salesforce DX Project

## Project Overview

<!-- Describe your Salesforce project, org type, package namespace if any -->
This is a Salesforce DX project using [org type: scratch/sandbox/production].
- Namespace: [your namespace or empty]
- API Version: 62.0
- Package Type: [unlocked/managed/unmanaged]

## Development Workflow

- Default org alias: [your-org-alias]
- Scratch org duration: 7 days
- Scratch org definition: config/project-scratch-def.json
- Test minimum: 90% coverage
- Deployment: validate first, then quick deploy

## Architecture

- Trigger framework: one-trigger-per-object with handler delegation
- Service layer: `*Service.cls` for business logic (stateless, bulkified)
- Selector layer: `*Selector.cls` for SOQL (centralized queries)
- Domain layer: `*Domain.cls` for SObject validation/behavior
- Test data: `TestDataFactory.cls` for reusable test data creation

## Key Commands

- `/deploy` — Deploy to default org with test execution
- `/test` — Run Apex tests with coverage analysis
- `/apex-review` — Review Apex code quality
- `/security-scan` — Scan for CRUD/FLS and security issues
- `/governor-check` — Analyze governor limit risks
- `/tdd` — Test-driven development workflow

## Team Conventions

<!-- Add your team's specific conventions here -->
- Always use TestDataFactory for test data — no inline record creation
- Log errors using the LoggingFramework utility class
- Use Custom Metadata Types for configuration, not hardcoded values
- All triggers must go through TriggerHandler framework
- Feature branches: `feature/TICKET-description`
- Commit format: `feat|fix|refactor|test: description`

## External Integrations

<!-- List named credentials and their purposes -->
- [NamedCredential] — [Purpose and target system]
- [NamedCredential] — [Purpose and target system]

## Environment Notes

<!-- Any org-specific notes, limitations, or known issues -->
- [Document any org-specific configuration here]
- [Note any managed packages installed and their impact]
