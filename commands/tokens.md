---
description: Show token budget for installed components (alternative to npx claude-sfdx-iq tokens)
---

# /tokens

Display token costs for installed plugin components and profiles.

## Usage
- `/tokens` — Show installed component costs
- `/tokens --profile default` — Show costs for a named profile
- `/tokens --all` — Show all available components

## Workflow

1. Use Glob to find `**/claude-sfdx-iq/scripts/tokens.js`
2. Run via Bash: `node <found-path>` (append any flags the user provided)
3. Display the output to the user
