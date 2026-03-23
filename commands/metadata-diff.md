---
description: Compare metadata between orgs, branches, or local and remote
---

# /metadata-diff

Compare metadata between two sources to identify differences, drift, and deployment gaps.

## Workflow

1. **Determine comparison mode**

   | Mode | Compares |
   |------|---------|
   | `--org-to-local` | Remote org metadata vs local source (default) |
   | `--branch` | Current branch vs another branch |
   | `--org-to-org` | Two different orgs |

2. **Org-to-local comparison** (default)
   - Retrieve metadata from the target org into a temp directory:
     ```bash
     sf project retrieve start --target-org <org> --output-dir /tmp/org-metadata
     ```
   - Compare retrieved metadata against local source files
   - Report differences: added locally, added in org, modified, deleted

3. **Branch comparison**
   - Use git diff between branches:
     ```bash
     git diff <target-branch>...HEAD --name-status -- force-app/
     ```
   - Categorize changes by metadata type
   - Identify potential merge conflicts in XML files

4. **Generate diff report**
   Group by metadata type:
   ```
   Custom Objects:
     + Invoice__c (new locally, not in org)
     ~ Account (modified — 3 field changes)
     - Legacy_Object__c (in org, deleted locally)

   Apex Classes:
     + InvoiceService.cls (new)
     ~ AccountService.cls (modified)
   ```

5. **Conflict detection**
   - Flag metadata types prone to merge conflicts: Layouts, Profiles, Permission Sets
   - Warn about changes made directly in the org (org drift)
   - Suggest running `/retrieve` before deploying if drift is detected

6. **Deployment impact**
   - Identify components that need deployment
   - Flag components that may need destructive changes
   - Estimate deployment risk (Low/Medium/High)

## Flags

| Flag | Description |
|------|-------------|
| `--mode` | Comparison mode: `org-to-local`, `branch`, `org-to-org` |
| `--branch` | Target branch for branch comparison (default: `main`) |
| `--target-org` | Org to compare against |
| `--metadata-type` | Filter by type: `ApexClass`, `CustomObject`, `Flow`, etc. |

## Example

```
/metadata-diff
/metadata-diff --mode branch --branch develop
/metadata-diff --target-org staging-sandbox --metadata-type ApexClass
```
