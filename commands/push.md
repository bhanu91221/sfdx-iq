---
description: Push source to a scratch org or sandbox
---

# /push

Push local source changes to the connected scratch org or sandbox with conflict detection.

## Workflow

1. **Identify and confirm target org — NEVER ASSUME**
   - Use `--target-org` flag if provided
   - Otherwise read `.sf/config.json` in the project root for `target-org`
   - If not found, run `sf config get target-org --global`
   - If still unresolved, stop and ask the user to provide an org alias — never fall back to Dev Hub
   - Run `sf org display --target-org <alias>` and display org alias, username, org type, and instance URL
   - If org type is Production or Developer Edition (non-scratch, non-sandbox): show WARNING and require explicit confirmation before proceeding
   - Push is intended for scratch orgs and sandboxes; warn loudly if target appears to be production

2. **Detect changes**
   - Run `sf project deploy preview` to show what will be pushed
   - Display added, changed, and deleted components
   - If no changes detected, inform the user and exit

3. **Check for conflicts**
   - If source tracking is enabled (scratch orgs), check for remote changes
   - If conflicts exist, warn the user and suggest resolution:
     - `sf project retrieve start` to pull remote changes first
     - `--force-overwrite` to push regardless (use with caution)

4. **Push source**
   ```bash
   sf project deploy start \
     --source-dir force-app \
     --target-org <org-alias> \
     --json
   ```

5. **Report results**
   - Number of components deployed successfully
   - Any errors with file path, line number, and error message
   - Time taken

6. **On failure**
   - Parse error messages and suggest fixes
   - For compilation errors, read the file and identify the issue
   - Suggest running `/build-fix` for complex errors

## Flags

| Flag | Description |
|------|-------------|
| `--target-org` | Org alias or username (default: current default org) |
| `--source-dir` | Source directory to push (default: from sfdx-project.json) |
| `--force-overwrite` | Overwrite remote changes without conflict check |
| `--dry-run` | Preview what would be pushed without pushing |

## Example

```
/push
/push --target-org my-scratch-org
/push --dry-run
```
