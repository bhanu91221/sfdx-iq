---
description: Install plugin components from a profile or manifest (alternative to npx claude-sfdx-iq install)
---

# /install

Install claude-sfdx-iq components (agents, skills, commands, hooks) from a profile.

## Usage
- `/install --profile default` — Install all components
- `/install --profile minimal` — Install core commands only
- `/install --profile apex-only` — Apex-focused components
- `/install --dry-run` — Preview without installing

## Workflow

1. Use Glob to find `**/claude-sfdx-iq/scripts/install-apply.js`
2. Run via Bash: `node <found-path>` (append any flags the user provided)
3. Display the output to the user
