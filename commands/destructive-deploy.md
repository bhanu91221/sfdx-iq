---
description: Deploy destructive changes to remove metadata from an org
---

# /destructive-deploy

Safely deploy destructive changes to delete metadata components from a target org with confirmation safeguards.

## Workflow

1. **Identify components to delete**
   - If specific components are provided as arguments, use those
   - If a `destructiveChanges.xml` already exists, read it and confirm contents
   - If neither, ask the user what metadata to delete (type and component names)

2. **Generate destructiveChanges.xml**
   - Create `destructiveChanges.xml` with the components to delete:
     ```xml
     <?xml version="1.0" encoding="UTF-8"?>
     <Package xmlns="http://soap.sforce.com/2006/04/metadata">
       <types>
         <members>ComponentName</members>
         <name>MetadataType</name>
       </types>
     </Package>
     ```
   - Create an empty `package.xml` (required companion file):
     ```xml
     <?xml version="1.0" encoding="UTF-8"?>
     <Package xmlns="http://soap.sforce.com/2006/04/metadata">
       <version>62.0</version>
     </Package>
     ```
   - Place both in a temporary deploy directory (e.g., `destructive-deploy-temp/`)

3. **Safety warnings**
   - Display a clear, prominent warning that this action is IRREVERSIBLE
   - List every component that will be deleted with its type
   - Check for dependencies: warn if other components reference the ones being deleted
   - Warn about impact on running users (e.g., deleting a class used by a Flow)

4. **Require explicit confirmation**
   - Ask the user to confirm by typing the exact phrase or confirming intent
   - Do NOT proceed without explicit confirmation
   - If the target is a production org, require double confirmation

5. **Execute destructive deployment**
   - Run: `sf project deploy start --metadata-dir destructive-deploy-temp/ --target-org <org> --wait 20`
   - Monitor deployment progress

6. **Verify deletion**
   - After successful deployment, verify components are removed
   - Run: `sf project retrieve start --metadata <Type:Component>` and confirm it fails or returns empty
   - Report: components successfully deleted, any components that could not be deleted

7. **Cleanup**
   - Remove the temporary `destructive-deploy-temp/` directory
   - Suggest the user update their local source to reflect the deletions

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--target-org` | Org alias or username | Default org |
| `--pre-destructive` | Use pre-destructive changes (delete before deploy) | `false` |
| `--manifest` | Path to existing destructiveChanges.xml | None |

## Error Handling

- If a component has dependencies, list them and ask the user whether to proceed
- If deployment fails due to dependencies, report which components blocked the deletion
- If the user cancels, clean up any generated files
- Never proceed without explicit user confirmation — this is the most important rule

## Safety Rules

- ALWAYS list components before deletion
- ALWAYS require explicit confirmation
- ALWAYS warn about production orgs
- NEVER auto-delete without user approval
- ALWAYS clean up temporary files regardless of success or failure

## Example Usage

```
/destructive-deploy
/destructive-deploy --manifest destructiveChanges.xml
/destructive-deploy ApexClass:OldService ApexClass:DeprecatedHelper
```
