---
name: metadata-management
description: Metadata API types, source format, package.xml, deploy/retrieve commands, and destructive changes workflow
origin: claude-sfdx-iq
user-invocable: false
tokens: 2903
domain: metadata
---

# Metadata Management

## Metadata API Types

Salesforce metadata is organized into types. Each type maps to a directory in source format.

| Metadata Type | Source Directory | Example |
|--------------|-----------------|---------|
| ApexClass | `classes/` | `AccountService.cls` + `.cls-meta.xml` |
| ApexTrigger | `triggers/` | `AccountTrigger.trigger` + `.trigger-meta.xml` |
| LightningComponentBundle | `lwc/` | `myComponent/myComponent.js` |
| AuraDefinitionBundle | `aura/` | `myAuraComponent/myAuraComponent.cmp` |
| CustomObject | `objects/` | `Custom_Object__c/` directory |
| CustomField | `objects/<Object>/fields/` | `Status__c.field-meta.xml` |
| Layout | `layouts/` | `Account-Account Layout.layout-meta.xml` |
| FlexiPage | `flexipages/` | `Account_Record_Page.flexipage-meta.xml` |
| PermissionSet | `permissionsets/` | `Admin_Access.permissionset-meta.xml` |
| Flow | `flows/` | `My_Screen_Flow.flow-meta.xml` |
| CustomMetadata | `customMetadata/` | `Config.Setting__mdt.md-meta.xml` |
| StaticResource | `staticresources/` | `myLibrary.resource` + `.resource-meta.xml` |
| ApexPage | `pages/` | `MyVFPage.page` + `.page-meta.xml` |

## Source Format vs MDAPI Format

### Source Format (Default for SF CLI projects)

Decomposes metadata into granular files. A CustomObject is split into separate files per field, validation rule, list view, etc.

```
force-app/main/default/objects/Account/
    Account.object-meta.xml
    fields/
        Status__c.field-meta.xml
        Rating__c.field-meta.xml
    listViews/
        All_Accounts.listView-meta.xml
    validationRules/
        Require_Industry.validationRule-meta.xml
```

### MDAPI Format (Legacy)

Single monolithic XML file per object. Used by the Metadata API directly.

```
src/objects/Account.object
```

**Convert between formats:**

```bash
# Source to MDAPI
sf project convert source --root-dir force-app --output-dir mdapi_output

# MDAPI to Source
sf project convert mdapi --root-dir mdapi_output --output-dir force-app
```

## Package.xml (Manifest)

The manifest file specifies which metadata to retrieve or deploy.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>AccountService</members>
        <members>AccountTriggerHandler</members>
        <name>ApexClass</name>
    </types>
    <types>
        <members>AccountTrigger</members>
        <name>ApexTrigger</name>
    </types>
    <types>
        <members>Account.Status__c</members>
        <members>Account.Rating__c</members>
        <name>CustomField</name>
    </types>
    <types>
        <members>My_Screen_Flow</members>
        <name>Flow</name>
    </types>
    <types>
        <members>Admin_Access</members>
        <name>PermissionSet</name>
    </types>
    <version>62.0</version>
</Package>
```

### Wildcard Retrieval

```xml
<types>
    <members>*</members>
    <name>ApexClass</name>
</types>
```

**Rule:** Use wildcards only for retrieval in development. Production deployments should list explicit members.

### Generate Package.xml

```bash
# Generate manifest from source directory
sf project generate manifest --source-dir force-app --name package.xml

# Generate manifest from specific metadata
sf project generate manifest --metadata ApexClass:AccountService --metadata ApexTrigger:AccountTrigger
```

## SF CLI Deploy and Retrieve Commands

### Retrieve

```bash
# Retrieve from manifest
sf project retrieve start --manifest manifest/package.xml --target-org myOrg

# Retrieve specific metadata
sf project retrieve start --metadata ApexClass:AccountService --target-org myOrg

# Retrieve entire source directory mapping
sf project retrieve start --target-org myOrg

# Retrieve with specific API version
sf project retrieve start --manifest manifest/package.xml --api-version 62.0
```

### Deploy

```bash
# Deploy from source directory
sf project deploy start --source-dir force-app --target-org myOrg

# Deploy from manifest
sf project deploy start --manifest manifest/package.xml --target-org myOrg

# Deploy specific metadata
sf project deploy start --metadata ApexClass:AccountService --target-org myOrg

# Validate only (check-only deploy, no changes applied)
sf project deploy start --source-dir force-app --target-org myOrg --dry-run

# Deploy and run tests
sf project deploy start --source-dir force-app --target-org myOrg --test-level RunLocalTests

# Deploy with specific tests
sf project deploy start --source-dir force-app --target-org myOrg --test-level RunSpecifiedTests --tests AccountServiceTest AccountTriggerTest
```

### Test Levels

| Level | Description | When to Use |
|-------|-------------|-------------|
| `NoTestRun` | Skip tests | Sandbox deploy, non-Apex changes only |
| `RunSpecifiedTests` | Run named tests | Deploy with targeted test coverage |
| `RunLocalTests` | All non-managed tests | Production deploy (recommended) |
| `RunAllTestsInOrg` | All tests including managed | Full validation (slow) |

## Metadata Dependencies and Deployment Order

Metadata types have dependencies. Deploy in the correct order to avoid failures.

### Dependency Chain (deploy in this order)

1. **Custom Objects** (must exist before fields reference them)
2. **Custom Fields** (must exist before validation rules, flows, Apex reference them)
3. **Record Types** (before page layouts and profiles reference them)
4. **Page Layouts** (before layout assignments in profiles)
5. **Permission Sets** (before users reference them)
6. **Apex Classes** (dependencies: Custom Objects, Fields, Custom Metadata)
7. **Apex Triggers** (dependencies: Custom Objects, Apex Classes)
8. **Flows** (dependencies: Objects, Fields, Apex Actions)
9. **Lightning Pages** (dependencies: LWC components, objects)
10. **Profiles** (last: reference layouts, record types, objects, fields)

**Rule:** When deploying fails due to dependency errors, check that referenced metadata is included in the deployment or already exists in the target org.

## Custom Metadata Types vs Custom Settings

### Custom Metadata Types

Deployable metadata records. Can be included in packages and deployed via change sets or CLI.

```apex
// Query Custom Metadata (does not count against SOQL governor limit)
List<Config_Setting__mdt> settings = [
    SELECT DeveloperName, Value__c
    FROM Config_Setting__mdt
    WHERE IsActive__c = true
];

// Access a specific record
Config_Setting__mdt setting = Config_Setting__mdt.getInstance('API_Timeout');
String timeout = setting.Value__c;
```

### Custom Settings

**Hierarchical Custom Settings** -- values vary by user, profile, or org-wide default.

```apex
// Get for current user (checks user, then profile, then org default)
My_Hierarchy_Setting__c setting = My_Hierarchy_Setting__c.getInstance();
Boolean isEnabled = setting.Feature_Enabled__c;

// Get org default
My_Hierarchy_Setting__c orgDefault = My_Hierarchy_Setting__c.getOrgDefaults();
```

**List Custom Settings** -- like a simple custom object, stores a list of data.

```apex
Map<String, Country_Code__c> codes = Country_Code__c.getAll();
Country_Code__c us = Country_Code__c.getInstance('US');
```

### Decision Matrix

| Factor | Custom Metadata Types | Hierarchical Custom Settings | List Custom Settings |
|--------|----------------------|-----------------------------|--------------------|
| Deployable | Yes (metadata) | No (data, needs post-deploy scripts) | No (data) |
| Packageable | Yes | Limited | Limited |
| Per-user values | No | Yes (user > profile > org) | No |
| SOQL limit | Does not count | Does not count | Does not count |
| Editable by admin | Yes (via Setup) | Yes (via Setup) | Yes (via Setup) |
| Available in formulas | Yes | Yes | No |
| Recommended for | App config, feature flags | User-level preferences | Simple lookup tables |

**Rule:** Prefer Custom Metadata Types for configuration that should be deployable. Use Hierarchical Custom Settings only when per-user or per-profile variation is needed.

## Destructive Changes

Destructive changes remove metadata from the target org during deployment.

### Pre-Destructive Changes

Run deletions **before** the deploy. Use when the deployment depends on something being removed first.

```
manifest/
    package.xml             (metadata to deploy)
    destructiveChangesPre.xml  (delete before deploy)
```

### Post-Destructive Changes

Run deletions **after** the deploy. Use when removing metadata that the existing code references (deploy updated code first, then delete).

```
manifest/
    package.xml              (metadata to deploy)
    destructiveChangesPost.xml  (delete after deploy)
```

### Destructive Changes XML Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>OldHelperClass</members>
        <members>DeprecatedService</members>
        <name>ApexClass</name>
    </types>
    <types>
        <members>Account.Old_Field__c</members>
        <name>CustomField</name>
    </types>
    <version>62.0</version>
</Package>
```

### Deploy with Destructive Changes

```bash
# Deploy with post-destructive changes
sf project deploy start --manifest manifest/package.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org myOrg

# Deploy with pre-destructive changes
sf project deploy start --manifest manifest/package.xml --pre-destructive-changes manifest/destructiveChangesPre.xml --target-org myOrg
```

**Rules:**
- Always test destructive changes in a sandbox first
- `package.xml` must still be present (can be empty with just the version)
- Back up metadata before running destructive changes
- Apex classes with test coverage dependencies may require `RunLocalTests` to validate

## Metadata in CI/CD

### Validate Before Deploy

```bash
# Check-only deploy (validates but does not persist)
sf project deploy start --source-dir force-app --target-org myOrg --dry-run --test-level RunLocalTests

# Quick deploy after successful validation
sf project deploy start --use-most-recent --target-org myOrg
```

### CI Pipeline Steps

1. **Authenticate** -- `sf org login sfdx-url --sfdx-url-file authFile --alias myOrg`
2. **Validate** -- `sf project deploy start --dry-run --test-level RunLocalTests`
3. **Deploy** -- `sf project deploy start --source-dir force-app`
4. **Run Tests** -- `sf apex run test --target-org myOrg --result-format human`
5. **Verify** -- Check deploy status and test results

### Source Tracking

```bash
# Check what changed since last retrieve
sf project retrieve preview --target-org myOrg

# Check what needs to be deployed
sf project deploy preview --target-org myOrg

# Pull remote changes (scratch orgs and sandboxes with tracking)
sf project retrieve start --target-org myOrg
```

## Anti-Patterns

1. **Deploying with wildcards to production.** Always list explicit members.
2. **Skipping destructive changes review.** Deletions are hard to reverse.
3. **Ignoring dependency order.** Leads to cryptic deployment failures.
4. **Using List Custom Settings for deployable config.** Use Custom Metadata Types instead.
5. **Not validating before deploying to production.** Always run a check-only deploy first.
6. **Hardcoding API versions.** Use the project default from `sfdx-project.json`.
7. **Manual metadata changes in production.** All changes should flow through source control and CI/CD.
