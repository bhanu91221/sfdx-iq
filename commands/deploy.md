---
description: Source deploy with validation, org confirmation, and tests
---

# /deploy

Deploy Salesforce source to a target org with mandatory org confirmation, automatic test level selection, and deployment monitoring.

## Workflow

0. **Load context** — Invoke the context-assigner agent for deployment context. Display the announcement block to the user before proceeding.

1. **Validate project structure**
   - Confirm `sfdx-project.json` exists in the project root
   - Read `packageDirectories` to determine source paths (default: `force-app`)
   - If missing, stop and inform the user this is not a valid SFDX project

2. **Identify target org — NEVER ASSUME**

   Follow this exact resolution order:

   a. **Use `--target-org` flag** if provided — skip to step 3
   b. **Read project-level config**: check `.sf/config.json` in the project root for `target-org`
   c. **Read global config**: if no project config, run `sf config get target-org --global`
   d. **If still unresolved**: STOP. Do not proceed. Ask the user:
      > "No default org is set. Please provide the org alias or username to deploy to (e.g., `myDevSandbox`)."

   **NEVER fall back to the Dev Hub or any org that wasn't explicitly configured as the project's default.**

3. **Verify and display target org — REQUIRED BEFORE EVERY DEPLOY**

   Run `sf org display --target-org <alias>` to get org details, then display:

   ```
   ⚠️  Deployment Target — Please Confirm
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Org Alias:    <alias>
   Username:     <username>
   Org Type:     <Scratch / Sandbox / Developer Edition / Production>
   Instance URL: <url>
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

   - If org type is **Production** or **Developer Edition** (non-scratch, non-sandbox):
     - Display a prominent warning:
       > "🚨 WARNING: This is a PRODUCTION org. Deployments to production cannot be easily reversed."
     - Require the user to explicitly confirm by typing the org alias or "yes" before proceeding
     - If the user does not confirm, abort the deployment
   - If org type is **Scratch** or **Sandbox**: ask for simple confirmation (y/N) before proceeding
   - Never silently proceed — always wait for confirmation

4. **Determine test level**
   - If `--test-level` flag is provided, use it
   - If `--dry-run` is set, default to `RunLocalTests`
   - For **scratch org or sandbox**: default to `NoTestRun`
   - For **production or developer edition**: default to `RunLocalTests` (required by Salesforce)
   - Valid values: `NoTestRun`, `RunSpecifiedTests`, `RunLocalTests`, `RunAllTestsInOrg`

5. **Execute deployment**
   - If `--dry-run` flag is set, add `--dry-run` to the command (validate only, no actual deploy)
   - Run: `sf project deploy start --source-dir <source-path> --target-org <alias> --test-level <level> --wait <minutes>`
   - Always include `--target-org` explicitly in the command — never rely on implicit defaults at execution time
   - Default wait: 33 minutes (use `--wait` flag to override)

6. **Monitor and report**
   - Stream deployment status output
   - On success: report components deployed, test results summary, coverage percentage
   - On failure: report each error with file path, line number, and error message
   - If tests fail: list failing test methods with assertion messages and delegate to test-guide agent

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--dry-run` | Validate only, do not deploy | `false` |
| `--test-level` | Test execution level | Auto-detected by org type |
| `--wait` | Minutes to wait for deployment | `33` |
| `--target-org` | Org alias or username (always preferred) | Read from `.sf/config.json` |

## Org Type Safety Rules

| Org Type | Confirmation Required | Default Test Level |
|---|---|---|
| Scratch Org | Simple y/N | NoTestRun |
| Sandbox | Simple y/N | NoTestRun |
| Developer Edition | **Explicit name confirm + WARNING** | RunLocalTests |
| Production | **Explicit name confirm + WARNING** | RunLocalTests |

## Error Handling

- If org display fails (invalid alias): stop and report — do not attempt deployment with an unverifiable org
- If deployment times out: show the deployment ID and how to check status with `sf project deploy report --job-id <id>`
- If component errors occur: group them by file and suggest fixes where possible
- If test failures occur: delegate to the test-guide agent for failure analysis

## Example Usage

```
/deploy
/deploy --dry-run
/deploy --target-org myDevSandbox --test-level RunLocalTests
/deploy --target-org myDevSandbox --wait 60
```
