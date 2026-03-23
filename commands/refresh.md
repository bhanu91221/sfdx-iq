---
description: Regenerate project CLAUDE.md from template and profile (alternative to npx claude-sfdx-iq refresh)
---

# /refresh

Regenerate the project's CLAUDE.md file from the plugin template, incorporating the active profile configuration.

## Usage
- `/refresh` — Regenerate using current profile
- `/refresh --profile minimal` — Regenerate using a specific profile

## Workflow

1. Use Glob to find `**/claude-sfdx-iq/scripts/refresh-claude-md.js`
2. Run via Bash: `node <found-path>` (append any flags the user provided)
3. Display the output to the user
