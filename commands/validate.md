---
description: Validate deployment without deploying
---

# /validate

Run a check-only deployment to verify source can be successfully deployed without making changes to the target org.

## Workflow

1. **Validate project structure**
   - Confirm `sfdx-project.json` exists in the project root
   - Read source paths from `packageDirectories`

2. **Identify target org**
   - Use `--target-org` flag if provided, otherwise use default org
   - Confirm org is accessible with `sf org display`

3. **Determine test level**
   - If `--test-level` flag is provided, use it
   - For production validation: default to `RunLocalTests`
   - For sandbox validation: default to `NoTestRun` unless overridden
   - If `--class-names` provided, use `RunSpecifiedTests`

4. **Run validation**
   - Execute: `sf project deploy start --dry-run --source-dir <source-path> --test-level <level> --wait <minutes>`
   - Default wait: 33 minutes

5. **Report results**
   - On success: confirm all components validated, show test pass/fail summary and coverage
   - On failure: list every component error with file, line number, and message
   - If tests fail: list each failing method with its error message
   - Show total validation time

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--test-level` | Test execution level | Auto-detected |
| `--class-names` | Specific test classes to run | None |
| `--wait` | Minutes to wait | `33` |
| `--target-org` | Org alias or username | Default org |

## Error Handling

- If the org is not reachable, instruct the user to authenticate with `sf org login web`
- If validation times out, provide the deploy ID for manual status checking
- Group errors by type (compile errors, test failures, dependency errors) for clarity

## Example Usage

```
/validate
/validate --target-org production --test-level RunLocalTests
/validate --class-names AccountServiceTest,ContactServiceTest
```
