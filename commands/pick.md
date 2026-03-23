---
description: Interactively select components for a custom manifest (alternative to npx claude-sfdx-iq pick)
---

# /pick

Interactively browse and select plugin components to create a custom installation manifest.

## Usage
- `/pick` — Interactive picker
- `/pick --category apex` — Filter to apex domain
- `/pick --search "testing"` — Search by keyword
- `/pick --output manifests/custom.json` — Save manifest to file

## Workflow

1. Use Glob to find `**/claude-sfdx-iq/scripts/pick.js`
2. Run via Bash: `node <found-path>` (append any flags the user provided)
3. Display the output to the user
