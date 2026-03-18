---
description: Create and configure a scratch org with source push and setup
---

# /scratch-org

Create a new scratch org, push source, assign permissions, load data, and open it for development.

## Workflow

1. **Validate prerequisites**
   - Confirm `sfdx-project.json` exists
   - Confirm `config/project-scratch-def.json` exists (or locate the scratch def file from `sfdx-project.json`)
   - Verify a Dev Hub is authenticated: run `sf org list --json` and check for a Dev Hub
   - If no Dev Hub, instruct the user to authenticate with `sf org login web --set-default-dev-hub`

2. **Create scratch org**
   - Run: `sf org create scratch --definition-file config/project-scratch-def.json --set-default --duration-days <days> --alias <alias>`
   - Default duration: 7 days (use `--duration` flag to override, max 30)
   - If `--alias` is provided, use it; otherwise generate one from the project name
   - Wait for org creation to complete

3. **Push source**
   - Run: `sf project deploy start --source-dir force-app`
   - If push fails, report errors and stop — do not continue with a broken org
   - Report components pushed successfully

4. **Assign permission sets**
   - Look for permission sets in `force-app/**/permissionsets/`
   - If found, run: `sf org assign permset --name <PermSetName>` for each
   - If `scripts/assign-permsets.sh` or similar exists, run it instead
   - Report which permission sets were assigned

5. **Load sample data**
   - Check for data files in `data/` or `scripts/data/` directory
   - If found, run: `sf data import tree --plan data/sample-data-plan.json` (or equivalent)
   - If no data files, skip this step and inform the user

6. **Open the org**
   - Run: `sf org open`
   - Display the org URL, username, and expiration date

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--duration` | Scratch org duration in days | `7` |
| `--alias` | Alias for the scratch org | Auto-generated |
| `--no-push` | Skip source push | `false` |
| `--no-data` | Skip data loading | `false` |

## Error Handling

- If Dev Hub is not authenticated, provide authentication instructions
- If scratch org limit is reached, suggest deleting old scratch orgs with `sf org delete scratch`
- If source push fails, display component errors and suggest fixes
- If permission set assignment fails, continue with remaining steps but report the failure

## Example Usage

```
/scratch-org
/scratch-org --duration 14 --alias feature-accounts
/scratch-org --no-data
```
