---
paths:
  - "**/*-meta.xml"
  - "**/*.object-meta.xml"
  - "**/*.field-meta.xml"
  - "sfdx-project.json"
---

# Metadata Organization

## Source Format and sfdx-project.json

Every Salesforce DX project is defined by `sfdx-project.json` at the repository root. This file controls package directories, API versions, and namespace settings.

Minimal configuration:

```json
{
  "packageDirectories": [
    {
      "path": "force-app",
      "default": true
    }
  ],
  "namespace": "",
  "sfdcLoginUrl": "https://login.salesforce.com",
  "sourceApiVersion": "62.0"
}
```

Multi-package configuration for modular projects:

```json
{
  "packageDirectories": [
    {
      "path": "force-app",
      "default": true,
      "package": "MyApp",
      "versionNumber": "1.2.0.NEXT"
    },
    {
      "path": "force-app-common",
      "package": "MyApp-Common",
      "versionNumber": "1.0.0.NEXT",
      "dependencies": []
    },
    {
      "path": "unpackaged",
      "default": false
    }
  ],
  "namespace": "myns",
  "sourceApiVersion": "62.0"
}
```

## Directory Structure

Follow the standard Salesforce DX source format layout:

```
project-root/
  sfdx-project.json
  .forceignore
  .gitignore
  force-app/
    main/
      default/
        applications/
        aura/
        classes/          # Apex classes
        flows/            # Flow metadata
        layouts/
        lwc/              # Lightning Web Components
        objects/          # Custom objects and fields
          Account/
            fields/
            listViews/
            validationRules/
          Invoice__c/
            Invoice__c.object-meta.xml
            fields/
              Amount__c.field-meta.xml
              Status__c.field-meta.xml
        permissionsets/
        tabs/
        triggers/
  scripts/                # Build and utility scripts
  config/                 # Scratch org definitions
    project-scratch-def.json
```

Keep related metadata together by object. The source format decomposes objects into individual files for each field, validation rule, and list view.

## API Version Management

Keep API versions consistent across all metadata files. Mixing versions causes deployment warnings and unpredictable behavior.

Set the project-wide version in `sfdx-project.json`:

```json
{
  "sourceApiVersion": "62.0"
}
```

Individual metadata files reference the API version:

```xml
<!-- MyClass.cls-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>62.0</apiVersion>
    <status>Active</status>
</ApexClass>
```

Rules for API version management:
- All metadata files in a single deployment should use the same API version
- Update API versions periodically (once per major release at minimum)
- When upgrading, update `sourceApiVersion` in `sfdx-project.json` first
- Then update individual `-meta.xml` files to match
- Test thoroughly after any version upgrade

Bulk-update API versions with the CLI:

```bash
# Check current versions across files
grep -r "<apiVersion>" force-app --include="*.xml" | sort | uniq -c

# Update all meta.xml files (use sed or a script)
find force-app -name "*-meta.xml" -exec sed -i 's/<apiVersion>60.0</<apiVersion>62.0</g' {} +
```

## Namespace Considerations

Namespaces are required for managed packages and optional for unlocked packages:

```json
// Managed package - namespace required
{ "namespace": "mycompany" }

// Unlocked package or unpackaged - namespace optional
{ "namespace": "" }
```

With a namespace, all custom metadata is prefixed:

```
// Without namespace
Invoice__c.Amount__c

// With namespace "mycompany"
mycompany__Invoice__c.mycompany__Amount__c
```

Avoid hardcoding namespace prefixes in Apex. Use namespace-agnostic patterns:

```java
// Bad - hardcoded namespace
String fieldName = 'mycompany__Amount__c';

// Good - use Type methods or schema describes
SObjectField field = Invoice__c.Amount__c;
```

## Package Directories Configuration

Use multiple package directories to separate concerns:

```json
{
  "packageDirectories": [
    {
      "path": "force-app",
      "default": true,
      "package": "Core",
      "versionNumber": "2.1.0.NEXT"
    },
    {
      "path": "force-app-integrations",
      "package": "Integrations",
      "versionNumber": "1.3.0.NEXT",
      "dependencies": [
        { "package": "Core", "versionNumber": "2.0.0.LATEST" }
      ]
    },
    {
      "path": "unpackaged",
      "default": false
    }
  ]
}
```

Guidelines for package directory separation:
- `force-app` -- core application logic and objects
- `force-app-integrations` -- external system integrations
- `unpackaged` -- org-specific configuration (reports, dashboards, admin profiles)
- Keep `unpackaged` items out of packages (they are org-specific)

## Source Tracking Commands

Use source tracking to sync changes between your org and local project:

```bash
# Pull changes from scratch org
sf project retrieve start --target-org my-scratch

# Push local changes to scratch org
sf project deploy start --target-org my-scratch

# Check tracking status
sf project deploy preview --target-org my-scratch
sf project retrieve preview --target-org my-scratch

# Resolve conflicts
sf project deploy start --target-org my-scratch --ignore-conflicts
```

Track status regularly during development. Deploy before switching tasks to avoid losing untracked changes in the scratch org.
