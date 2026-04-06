---
paths:
  - "**/*-meta.xml"
  - "**/*.object-meta.xml"
  - ".forceignore"
  - "sfdx-project.json"
---

# Metadata Version Control

## Feature Branch Per User Story

Every user story or task gets its own branch. Never commit directly to the main branch.

```bash
# Branch naming convention
git checkout -b feature/JIRA-123-account-trigger-handler
git checkout -b bugfix/JIRA-456-fix-duplicate-detection
git checkout -b refactor/JIRA-789-extract-service-layer

# After work is complete
git push origin feature/JIRA-123-account-trigger-handler
# Create pull request for code review
```

Branch naming conventions:
- `feature/` -- new functionality
- `bugfix/` -- bug fixes
- `refactor/` -- code restructuring without behavior change
- `hotfix/` -- urgent production fixes
- `release/` -- release preparation branches

Keep branches short-lived. Merge within a few days to avoid long-running conflicts in metadata XML.

## .forceignore Patterns

The `.forceignore` file excludes metadata from source tracking and deployments. Configure it to avoid pulling down org-specific or noisy metadata:

```
# .forceignore

# Profiles - use Permission Sets instead
**/profiles/**

# Translations - unless actively managing
**/translations/**

# Standard value sets that clutter diffs
**/standardValueSets/**

# Auto-generated admin profile changes
**/Admin.profile-meta.xml

# Org-specific settings
**/settings/Account.settings-meta.xml
**/settings/Security.settings-meta.xml

# IDE metadata
**/.eslintrc.json
**/.prettierrc

# Scratch org artifacts
**/.sfdx/
**/.sf/

# Stale components tracked by the org but not in the project
**/installedPackages/**
```

Add entries judiciously. Ignoring too much metadata can cause deployment failures when dependencies are missing.

## Conflict Resolution for Metadata XML

Salesforce metadata XML files are prone to merge conflicts because of their structure. Follow these strategies:

### Object and Field Files (Rarely Conflict)

Source format decomposes objects into individual files. Field additions on separate branches rarely conflict:

```
force-app/main/default/objects/Account/fields/
  Rating__c.field-meta.xml     (Branch A adds this)
  Segment__c.field-meta.xml    (Branch B adds this)
  --> No conflict: different files
```

### Layout Files (Frequently Conflict)

Layouts are a single XML file and commonly conflict when multiple developers modify them:

```xml
<!-- Conflict in Account-Account Layout.layout-meta.xml -->
<<<<<<< HEAD
    <layoutItems>
        <field>Rating__c</field>
    </layoutItems>
=======
    <layoutItems>
        <field>Segment__c</field>
    </layoutItems>
>>>>>>> feature/add-segment
```

Resolution strategy: accept both additions, then validate the layout in a scratch org:

```xml
    <layoutItems>
        <field>Rating__c</field>
    </layoutItems>
    <layoutItems>
        <field>Segment__c</field>
    </layoutItems>
```

### Permission Set Conflicts

Permission sets conflict when two branches grant access to different new fields:

```xml
<!-- Resolve by including BOTH field permissions -->
<fieldPermissions>
    <editable>true</editable>
    <field>Account.Rating__c</field>
    <readable>true</readable>
</fieldPermissions>
<fieldPermissions>
    <editable>true</editable>
    <field>Account.Segment__c</field>
    <readable>true</readable>
</fieldPermissions>
```

General conflict resolution rules:
- For additive XML (new fields in permissions, new items in layouts): include both
- For changed values (picklist defaults, field lengths): discuss with the other developer
- Always deploy to a scratch org after resolving conflicts to validate

## Scratch Org Definition Files

Maintain scratch org definitions in the `config/` directory:

```json
// config/project-scratch-def.json
{
  "orgName": "MyApp Development",
  "edition": "Developer",
  "features": [
    "EnableSetPasswordInApi",
    "AuthorApex"
  ],
  "settings": {
    "lightningExperienceSettings": {
      "enableS1DesktopEnabled": true
    },
    "securitySettings": {
      "passwordPolicies": {
        "enableSetPasswordInApi": true
      }
    },
    "languageSettings": {
      "enableTranslationWorkbench": false
    }
  }
}
```

Keep scratch org definitions version-controlled. Multiple definitions for different purposes:

```
config/
  project-scratch-def.json        # Default development
  project-scratch-def-ci.json     # CI/CD (minimal features)
  project-scratch-def-full.json   # Full feature set for QA
```

## Merging sfdx-project.json

The `sfdx-project.json` file requires careful merging. Conflicting changes here can break the entire project.

Common conflict scenarios:

```json
// Branch A: bumped API version
{ "sourceApiVersion": "62.0" }

// Branch B: added a package directory
{
  "packageDirectories": [
    { "path": "force-app", "default": true },
    { "path": "force-app-integrations" }
  ]
}

// Resolution: incorporate both changes
{
  "packageDirectories": [
    { "path": "force-app", "default": true },
    { "path": "force-app-integrations" }
  ],
  "sourceApiVersion": "62.0"
}
```

After resolving `sfdx-project.json` conflicts, always validate:

```bash
# Verify the JSON is valid
cat sfdx-project.json | python -m json.tool

# Test that the CLI can read it
sf project deploy preview --target-org my-scratch
```

## Never Commit .sfdx/ or .sf/ Folders

These directories contain local org authentication tokens, scratch org credentials, and user-specific settings. They must never be committed.

```gitignore
# .gitignore (required entries)
.sfdx/
.sf/
node_modules/
*.log

# OS files
.DS_Store
Thumbs.db

# IDE settings (optional - some teams share these)
.vscode/
.idea/
```

If `.sfdx/` or `.sf/` was accidentally committed:

```bash
# Remove from tracking without deleting local files
git rm -r --cached .sfdx/
git rm -r --cached .sf/
git commit -m "Remove .sfdx and .sf directories from version control"
```

## Version Control Checklist

- [ ] Every change is on a feature branch (never commit to main directly)
- [ ] `.forceignore` excludes profiles, translations, and org-specific settings
- [ ] `.gitignore` excludes `.sfdx/`, `.sf/`, `node_modules/`, and OS files
- [ ] Layout and permission set conflicts are resolved by including both additions
- [ ] `sfdx-project.json` is validated after any merge
- [ ] Scratch org definitions are version-controlled in `config/`
- [ ] Successful production deployments are tagged (e.g., `v1.3.0`)
- [ ] Pull requests require review before merging to main
- [ ] No authentication tokens or credentials in the repository
