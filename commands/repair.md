---
description: Fix broken plugin configuration and missing files (alternative to npx sfdx-iq repair)
argument-hint: ""
allowed-tools: [Glob, Bash]
---

# /repair

Check plugin integrity and fix missing or broken configuration files.

## Workflow

1. Use Glob to find `**/sfdx-iq/scripts/repair.js`
2. Run via Bash: `node <found-path> --fix`
3. Display the output to the user
