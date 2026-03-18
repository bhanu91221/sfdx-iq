---
description: Generate and deploy destructive changes to remove metadata
---

# /destructive

Generate `destructiveChanges.xml` to safely remove metadata components from a Salesforce org.

## Workflow

1. **Identify components to remove**
   - Ask the user which components to delete, or detect deleted files from git:
     ```bash
     git diff --name-only --diff-filter=D HEAD~1
     ```
   - Map deleted file paths to metadata types (e.g., `classes/OldService.cls` → `ApexClass:OldService`)

2. **Generate destructive changes manifest**
   - Determine timing: pre-deploy or post-deploy destruction
     - **Pre-deploy** (`destructiveChangesPre.xml`): Remove items BEFORE new metadata deploys (e.g., removing a field referenced by deleted code)
     - **Post-deploy** (`destructiveChangesPost.xml`): Remove items AFTER new metadata deploys (e.g., removing old code replaced by new)

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <Package xmlns="http://soap.sforce.com/2006/04/metadata">
       <types>
           <members>OldService</members>
           <name>ApexClass</name>
       </types>
       <version>62.0</version>
   </Package>
   ```

3. **Safety checks**
   - ⚠️ Warn: destructive changes are **irreversible in production**
   - Check for dependencies: search codebase for references to the component being deleted
   - If dependencies found, list them and require user confirmation
   - Require explicit confirmation before proceeding

4. **Validate first**
   ```bash
   sf project deploy start \
     --metadata-dir destructive-package/ \
     --dry-run \
     --test-level RunLocalTests
   ```

5. **Deploy destructive changes**
   ```bash
   sf project deploy start \
     --metadata-dir destructive-package/ \
     --test-level RunLocalTests
   ```

6. **Verify deletion**
   - Confirm components are removed from the target org
   - Clean up local destructive manifest files

## Flags

| Flag | Description |
|------|-------------|
| `--type` | `pre` or `post` (default: `post`) |
| `--components` | Comma-separated list: `ApexClass:OldService,CustomField:Account.Old_Field__c` |
| `--from-git` | Auto-detect deleted files from git history |
| `--target-org` | Target org for deployment |

## Example

```
/destructive
/destructive --from-git
/destructive --components "ApexClass:OldService,ApexClass:OldServiceTest"
```
