---
description: Source deploy with validation and tests
---

# /deploy

Deploy Salesforce source to a target org with automatic test level selection and monitoring.

## Workflow

1. **Validate project structure**
   - Confirm `sfdx-project.json` exists in the project root
   - Read `packageDirectories` to determine source paths (default: `force-app`)
   - If missing, stop and inform the user this is not a valid SFDX project

2. **Identify target org**
   - Use `--target-org` flag if provided
   - Otherwise use the default org: run `sf config get target-org` to confirm
   - If no org is set, prompt the user to specify one

3. **Determine test level**
   - If `--test-level` flag is provided, use it
   - If `--dry-run` is set, default to `RunLocalTests`
   - For sandbox orgs: default to `NoTestRun`
   - For production orgs: default to `RunLocalTests`
   - Valid values: `NoTestRun`, `RunSpecifiedTests`, `RunLocalTests`, `RunAllTestsInOrg`

4. **Execute deployment**
   - If `--dry-run` flag is set, add `--dry-run` to the command
   - Run: `sf project deploy start --source-dir <source-path> --test-level <level> --wait <minutes>`
   - Default wait: 33 minutes (use `--wait` flag to override)

5. **Monitor and report**
   - Stream deployment status output
   - On success: report components deployed, test results summary, coverage percentage
   - On failure: report each error with file path, line number, and error message
   - If tests fail: list failing test methods with assertion messages

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--dry-run` | Validate only, do not deploy | `false` |
| `--test-level` | Test execution level | Auto-detected |
| `--wait` | Minutes to wait for deployment | `33` |
| `--target-org` | Org alias or username | Default org |

## Error Handling

- If deployment times out, show the deployment ID and how to check status with `sf project deploy report`
- If component errors occur, group them by file and suggest fixes where possible
- If test failures occur, delegate to the test-guide agent for failure analysis

## Example Usage

```
/deploy
/deploy --dry-run
/deploy --target-org myDevSandbox --test-level RunLocalTests
/deploy --wait 60
```
