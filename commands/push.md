---
description: Push source to a scratch org or sandbox
---

# /push

Push local source changes to the connected scratch org or sandbox with conflict detection.

## Workflow

1. **Check target org**
   - Identify the default org: `sf config get target-org`
   - Verify the org is active and authenticated
   - If no default org, prompt the user to set one or specify with `--target-org`

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
