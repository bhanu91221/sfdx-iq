---
description: Create a second-generation package version
---

# /package-version

Create, list, or promote second-generation package (2GP) versions.

## Workflow

1. **Validate package configuration**
   - Read `sfdx-project.json` for `packageDirectories` with `package` property
   - Verify a package ID exists (starts with `0Ho`)
   - If no package defined, guide user through `sf package create`

2. **Create package version**
   ```bash
   sf package version create \
     --package <package-name-or-id> \
     --installation-key-bypass \
     --wait 20 \
     --code-coverage \
     --json
   ```
   - Monitor creation progress
   - Report: version number, subscriber package version ID (04t), code coverage

3. **Validate the version**
   - Check code coverage meets minimum (75%)
   - Check for any validation errors
   - Display install URL: `https://login.salesforce.com/packaging/installPackage.apexp?p0=<04tId>`

4. **Promote to released** (if requested)
   ```bash
   sf package version promote \
     --package <04t-version-id> \
     --no-prompt
   ```
   - Warn: promoted versions cannot be deleted
   - Confirm ancestry chain is correct

## Subcommands

| Action | Usage |
|--------|-------|
| Create | `/package-version` or `/package-version create` |
| List | `/package-version list` — show all versions |
| Promote | `/package-version promote --version <04tId>` |
| Report | `/package-version report --version <04tId>` |

## Flags

| Flag | Description |
|------|-------------|
| `--package` | Package name or ID |
| `--version` | Specific version ID for promote/report |
| `--key` | Installation key (password-protects the package) |
| `--skip-validation` | Skip test run (creates beta version faster) |

## Example

```
/package-version
/package-version list
/package-version promote --version 04t000000000001
```
