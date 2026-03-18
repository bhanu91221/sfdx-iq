---
name: salesforce-dx-project
description: sfdx-project.json configuration, SF CLI commands, source tracking, alias management, and .forceignore patterns
origin: claude-sfdx-iq
tokens: 2422
domain: devops
---

# Salesforce DX Project Configuration

## Overview

Every Salesforce DX project is anchored by `sfdx-project.json`, which defines source directories, API versions, package configurations, and plugin settings. This skill covers the project configuration file, the SF CLI command reference, org management, and source tracking fundamentals.

## sfdx-project.json Structure

### Complete Reference

```json
{
  "packageDirectories": [
    {
      "path": "force-app",
      "default": true,
      "package": "MyApp",
      "versionName": "Spring 2026",
      "versionNumber": "1.0.0.NEXT",
      "versionDescription": "Main application package",
      "definitionFile": "config/project-scratch-def.json",
      "dependencies": [
        {
          "package": "DependencyPackage",
          "versionNumber": "2.1.0.LATEST"
        }
      ],
      "scopeProfiles": true,
      "unpackagedMetadata": {
        "path": "unpackaged"
      }
    },
    {
      "path": "force-app-test",
      "default": false
    }
  ],
  "namespace": "",
  "sourceApiVersion": "62.0",
  "sfdcLoginUrl": "https://login.salesforce.com",
  "signupTargetLoginUrl": "https://login.salesforce.com",
  "plugins": {
    "sfdx-scanner": {
      "pmdConfigFile": "config/pmd-ruleset.xml"
    }
  },
  "packageAliases": {
    "MyApp": "0Ho1234567890AB",
    "MyApp@1.0.0-1": "04t1234567890CD",
    "DependencyPackage": "0Ho1234567890EF"
  }
}
```

### Key Fields Explained

| Field | Type | Description |
|-------|------|-------------|
| `packageDirectories` | Array | Source directories in the project |
| `path` | String | Relative path to source directory |
| `default` | Boolean | Default directory for new metadata |
| `package` | String | Associates directory with a package |
| `versionNumber` | String | `MAJOR.MINOR.PATCH.BUILD` format |
| `dependencies` | Array | Package dependencies for this directory |
| `namespace` | String | Namespace prefix (empty for no namespace) |
| `sourceApiVersion` | String | Default API version for metadata |
| `sfdcLoginUrl` | String | Login URL for auth flows |
| `plugins` | Object | Plugin-specific configuration |
| `packageAliases` | Object | Maps friendly names to 0Ho/04t IDs |
| `scopeProfiles` | Boolean | Only deploy profiles in this package directory |

### Multiple Package Directories

```json
{
  "packageDirectories": [
    { "path": "packages/core", "default": true, "package": "Core" },
    { "path": "packages/billing", "package": "Billing" },
    { "path": "packages/integration", "package": "Integration" },
    { "path": "unpackaged", "default": false }
  ]
}
```

Source is resolved in order. If the same metadata exists in multiple directories, the first match wins.

## SF CLI Command Reference

### Org Management

```bash
# List all authorized orgs
sf org list

# Display org details
sf org display --target-org myorg

# Open org in browser
sf org open --target-org myorg

# Open to a specific page
sf org open --target-org myorg --path "lightning/o/Account/list"

# Log in to an org (browser-based)
sf org login web --alias myorg --instance-url https://login.salesforce.com

# Log in with JWT (for CI)
sf org login jwt --client-id CONSUMER_KEY \
  --jwt-key-file server.key \
  --username admin@example.com \
  --alias prod-ci \
  --instance-url https://login.salesforce.com

# Log out
sf org logout --target-org myorg --no-prompt
```

### Config and Aliases

```bash
# Set default org
sf config set target-org myorg

# Set default Dev Hub
sf config set target-dev-hub devhub

# Set default API version
sf config set org-api-version 62.0

# List all config values
sf config list

# Get a specific config value
sf config get target-org

# Set an alias
sf alias set myalias=user@example.com

# List aliases
sf alias list

# Unset an alias
sf alias unset myalias
```

### Config Scope

| Scope | Location | Precedence |
|-------|----------|------------|
| Local | `.sf/config.json` in project | Highest |
| Global | `~/.sf/config.json` | Lower |
| Environment | `SF_TARGET_ORG` env var | Highest overall |

### Source Deploy and Retrieve

```bash
# Deploy source to org
sf project deploy start --source-dir force-app --target-org myorg

# Deploy with manifest
sf project deploy start --manifest manifest/package.xml --target-org myorg

# Deploy specific metadata
sf project deploy start --metadata ApexClass:AccountService --target-org myorg

# Retrieve source from org
sf project retrieve start --source-dir force-app --target-org myorg

# Retrieve with manifest
sf project retrieve start --manifest manifest/package.xml --target-org myorg

# Retrieve specific metadata
sf project retrieve start --metadata ApexClass:AccountService --target-org myorg

# Generate manifest from org
sf project generate manifest --from-org myorg --output-dir manifest
```

### Source Tracking

```bash
# Preview what would be deployed
sf project deploy preview --target-org my-scratch

# Preview what would be retrieved
sf project retrieve preview --target-org my-scratch

# Reset source tracking
sf project reset tracking --target-org my-scratch

# Deploy ignoring tracking conflicts
sf project deploy start --target-org my-scratch --ignore-conflicts
```

### Apex Execution

```bash
# Run anonymous Apex
sf apex run --file scripts/apex/seed-data.apex --target-org myorg

# Run Apex tests
sf apex run test --target-org myorg --test-level RunLocalTests --wait 10

# Run specific test class
sf apex run test --target-org myorg --class-names AccountServiceTest --wait 10

# Get test results
sf apex get test --test-run-id 707... --target-org myorg

# View debug log
sf apex log list --target-org myorg
sf apex log get --log-id 07L... --target-org myorg
```

### Data Operations

```bash
# Query records
sf data query --query "SELECT Id, Name FROM Account LIMIT 10" --target-org myorg

# Query with tooling API
sf data query --query "SELECT Id, Name FROM ApexClass LIMIT 10" --target-org myorg --use-tooling-api

# Create a record
sf data create record --sobject Account --values "Name='Acme Corp' Industry='Technology'" --target-org myorg

# Update a record
sf data update record --sobject Account --record-id 001... --values "Industry='Finance'" --target-org myorg

# Delete a record
sf data delete record --sobject Account --record-id 001... --target-org myorg

# Bulk upsert
sf data upsert bulk --sobject Account --file data/accounts.csv --external-id External_Id__c --target-org myorg

# Export tree
sf data export tree --query "SELECT Id, Name FROM Account" --output-dir data/export --target-org myorg

# Import tree
sf data import tree --plan data/export/Account-plan.json --target-org myorg
```

## .forceignore Patterns

The `.forceignore` file excludes metadata from source tracking, deploy, and retrieve operations. It uses gitignore-style syntax.

### Common Patterns

```
# .forceignore

# LWC Jest test files
**/__tests__/**

# Profiles (manage separately or use permission sets)
**/profiles/**

# Admin profile (keep only if needed)
!**/profiles/Admin.profile-meta.xml

# Org-specific settings
**/settings/Account.settings-meta.xml
**/settings/Security.settings-meta.xml

# Standard objects you do not customize
**/objects/Task/**
**/objects/Event/**

# AppMenu (frequently causes conflicts)
**/appMenus/**

# Translations (if not using)
**/translations/**

# Email templates managed in org
**/email/**

# Ignore specific metadata types
**/staticresources/*.resource-meta.xml

# IDE files
.sfdx
.sf
.localdevserver
```

### Forceignore vs Gitignore

| Feature | .forceignore | .gitignore |
|---------|-------------|------------|
| Affects | SF CLI operations | Git tracking |
| Scope | Source deploy/retrieve/push/pull | Git add/commit |
| Syntax | Gitignore-like (not identical) | Standard gitignore |
| Negation | Supported (`!pattern`) | Supported |
| Double-star | `**` matches any depth | Same |

**Key difference:** `.forceignore` affects Salesforce CLI operations while `.gitignore` affects version control. You often need entries in both files.

## Project Initialization

```bash
# Create new SFDX project
sf project generate --name my-project --template standard

# Create with specific manifest
sf project generate --name my-project --manifest

# Generate manifest from source
sf project generate manifest --source-dir force-app --name package.xml --output-dir manifest

# Generate manifest from org
sf project generate manifest --from-org myorg --output-dir manifest
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SF_TARGET_ORG` | Default target org |
| `SF_TARGET_DEV_HUB` | Default Dev Hub |
| `SF_ORG_API_VERSION` | API version override |
| `SF_LOG_LEVEL` | CLI log verbosity (trace, debug, info, warn, error, fatal) |
| `SF_DISABLE_TELEMETRY` | Disable CLI telemetry |
| `SF_JSON_OUTPUT` | Force JSON output from all commands |
| `SF_ACCESS_TOKEN` | Auth token (CI environments) |

## Anti-Patterns to Avoid

1. **Hardcoded API version** -- Keep `sourceApiVersion` updated; stale versions miss features and fixes
2. **Single packageDirectory** -- Use multiple directories to separate concerns (core, test, config)
3. **Empty .forceignore** -- Always ignore noisy metadata like profiles and appMenus
4. **Username references in scripts** -- Use aliases or environment variables, never hardcoded usernames
5. **Skipping source tracking** -- Always use push/pull for scratch orgs to catch conflicts early
6. **Global config for project settings** -- Use local `.sf/config.json` per project for target-org and API version
