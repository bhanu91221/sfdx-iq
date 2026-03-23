---
description: Manage second-generation (2GP) package versions
---

# /package

Create and manage second-generation package (2GP) versions for distribution.

## Workflow

1. **Validate package configuration**
   - Read `sfdx-project.json` and locate the `packageDirectories` with `package` and `versionNumber` fields
   - Confirm a package ID exists (starts with `0Ho`)
   - If no package is configured, guide the user through `sf package create`
   - Verify Dev Hub is authenticated

2. **Create package version**
   - Run: `sf package version create --path <package-directory> --installation-key-bypass --wait 30 --code-coverage`
   - If `--installation-key` is provided, use it instead of `--installation-key-bypass`
   - If `--skip-validation` flag is set, add it (useful for development iterations)
   - Monitor creation progress

3. **Monitor creation**
   - Package version creation can take 10-30+ minutes
   - Poll status with `sf package version create report --package-create-request-id <id>`
   - Report progress updates to the user
   - On failure: show error details from the creation request

4. **Report results**
   - **Package Version ID**: the 04t ID for installation
   - **Subscriber Package Version ID**: for distribution
   - **Install URL**: `https://login.salesforce.com/packaging/installPackage.apexp?p0=<04tId>`
   - **Version Number**: e.g., `1.2.0.1`
   - **Ancestry**: show package version lineage
   - **Code Coverage**: report overall coverage from validation
   - **Validation Status**: whether the version is validated for release

5. **Additional operations**
   - `--list`: List all package versions with `sf package version list --packages <packageId>`
   - `--promote`: Promote a version for production install with `sf package version promote --package <04tId>`

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--installation-key` | Password for package installation | Bypassed |
| `--skip-validation` | Skip test validation (dev only) | `false` |
| `--list` | List existing package versions | `false` |
| `--promote` | Promote a version to released | `false` |
| `--wait` | Minutes to wait for creation | `30` |

## Error Handling

- If no Dev Hub is configured, provide authentication instructions
- If creation fails due to test coverage, report failing tests and coverage gaps
- If creation fails due to dependencies, list missing dependencies
- If package version limit is reached, suggest deleting old beta versions

## Example Usage

```
/package
/package --skip-validation
/package --list
/package --promote 04tXXXXXXXXXXXXXXX
```
