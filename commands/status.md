---
description: Show plugin and Salesforce org status (alternative to npx sfdx-iq status)
argument-hint: ""
allowed-tools: [Glob, Bash]
---

# /status

Show sfdx-iq plugin status, installed component counts, and connected org info.

## Workflow

1. Use Glob to find `**/sfdx-iq/scripts/status.js`
2. Run via Bash: `node <found-path>`
3. Display the output to the user
