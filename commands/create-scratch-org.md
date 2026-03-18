---
description: Create and configure a scratch org for development
---

# /create-scratch-org

Create a fully configured scratch org with source push, permission set assignment, and sample data loading.

## Workflow

1. **Validate prerequisites**
   - Confirm `sfdx-project.json` exists
   - Check for `config/project-scratch-def.json` (or `project-scratch-def.json` in root)
   - Verify DevHub is authenticated: `sf org list --json` and check for devhub
   - If no DevHub, guide user through: `sf org login web --set-default-dev-hub`

2. **Create the scratch org**
   ```bash
   sf org create scratch \
     --definition-file config/project-scratch-def.json \
     --alias <user-provided-alias or auto-generated> \
     --duration-days <duration, default 7> \
     --set-default \
     --json
   ```

3. **Push source**
   ```bash
   sf project deploy start --source-dir force-app
   ```
   - Report any push errors with file and line details
   - If errors, suggest fixes before continuing

4. **Assign permission sets**
   - Scan `force-app/**/permissionsets/` for `.permissionset-meta.xml` files
   - For each permission set found:
     ```bash
     sf org assign permset --name <PermSetName>
     ```

5. **Load sample data** (if available)
   - Check for `scripts/data/` or `data/` directory with plan files or CSV
   - If found, import: `sf data import tree --plan data/sample-data-plan.json`
   - If not found, skip with informational message

6. **Open the org**
   ```bash
   sf org open
   ```

7. **Report summary**
   - Org username and alias
   - Expiration date
   - Source push results (success/failure count)
   - Permission sets assigned
   - Data loaded (if applicable)

## Flags

| Flag | Description |
|------|-------------|
| `--alias` | Scratch org alias (default: auto-generated from branch name) |
| `--duration` | Duration in days (default: 7, max: 30) |
| `--no-push` | Create org without pushing source |
| `--no-open` | Don't open the org in browser after creation |

## Example

```
/create-scratch-org
/create-scratch-org --alias feature-invoices --duration 14
```
