---
description: Retrieve metadata from org to local source
---

# /retrieve

Retrieve Salesforce metadata from a target org to the local project, with diff reporting and conflict detection.

## Workflow

1. **Determine what to retrieve**
   - If specific metadata types or components are provided as arguments, retrieve those
   - If a `package.xml` or `manifest/package.xml` exists, ask if the user wants to retrieve by manifest
   - If no arguments, retrieve all source tracked changes: `sf project retrieve start`

2. **Identify target org**
   - Use `--target-org` flag if provided
   - Otherwise use the default org
   - Confirm org connectivity

3. **Execute retrieval**
   - For manifest-based: `sf project retrieve start --manifest manifest/package.xml`
   - For specific metadata: `sf project retrieve start --metadata <MetadataType:ComponentName>`
   - For source tracking: `sf project retrieve start`
   - Add `--wait 10` for timeout control

4. **Show diff with local source**
   - After retrieval, run `git diff` to show what changed locally
   - Summarize: new files, modified files, deleted files
   - For modified files, highlight the key changes

5. **Detect and report conflicts**
   - If source tracking detects conflicts (local and remote changes to same component), list them
   - For each conflict: show the component name, local change summary, remote change summary
   - Ask the user how to resolve: keep local, keep remote, or manual merge

6. **Report results**
   - Total components retrieved
   - List of new/changed/deleted files
   - Any warnings or partial failures

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--target-org` | Org alias or username | Default org |
| `--metadata` | Specific metadata type:name | None |
| `--manifest` | Path to package.xml | Auto-detected |

## Error Handling

- If the org is not reachable, prompt for authentication
- If metadata type is invalid, suggest correct type names
- If retrieval partially fails, report succeeded and failed components separately

## Example Usage

```
/retrieve
/retrieve --metadata ApexClass:AccountService
/retrieve --manifest manifest/package.xml
/retrieve --target-org devSandbox
```
