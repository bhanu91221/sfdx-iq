---
description: Diagnose environment configuration for Salesforce development (alternative to npx claude-sfdx-iq doctor)
---

# /doctor

Run environment diagnostics to check Node.js, Salesforce CLI, Git, and org authentication.

## Workflow

1. Use Glob to find `**/claude-sfdx-iq/scripts/doctor.js`
2. Run via Bash: `node <found-path>`
3. Display the output to the user
