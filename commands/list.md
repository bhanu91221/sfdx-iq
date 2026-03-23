---
description: List installed plugin components by category (alternative to npx claude-sfdx-iq list)
---

# /list

List installed claude-sfdx-iq components (agents, skills, commands, rules, hooks).

## Usage
- `/list` — List all components
- `/list --category agents` — List only agents
- `/list --category commands` — List only commands
- `/list --category rules` — List only rules

## Workflow

1. Use Glob to find `**/claude-sfdx-iq/scripts/list-installed.js`
2. Run via Bash: `node <found-path>` (append any flags the user provided)
3. Display the output to the user
