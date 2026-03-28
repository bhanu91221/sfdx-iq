---
name: packaging-2gp
description: Second-generation package creation, versioning, ancestry, namespace management, and ISV distribution
origin: claude-sfdx-iq
user-invocable: false
tokens: 2160
domain: metadata
---

# Second-Generation Packages (2GP)

## Overview

Second-generation packages (2GP) are the modern packaging model for Salesforce. They are source-driven, version-controlled, and built using the Salesforce CLI. 2GP supports both managed (with namespace for ISV distribution) and unmanaged (unlocked) packages. This skill covers the full lifecycle from project configuration through distribution and deprecation.

## Package Types

| Type | Namespace | IP Protection | Distribution | Upgradeable |
|------|-----------|--------------|--------------|-------------|
| Unlocked | Optional | None | Internal only | Yes |
| Managed 2GP | Required | Code hidden | AppExchange / ISV | Yes |
| Org-Dependent Unlocked | Optional | None | Internal only | Yes (org-specific) |

### When to Use Each

- **Unlocked Packages** -- Internal modularization, team boundaries, dependency management within a single company
- **Managed 2GP** -- ISV distribution, AppExchange listings, code IP protection
- **Org-Dependent Unlocked** -- Components tightly coupled to org-specific metadata that cannot be packaged

## Project Configuration

### sfdx-project.json Package Setup

```json
{
  "packageDirectories": [
    {
      "path": "force-app/core",
      "default": true,
      "package": "MyApp-Core",
      "versionName": "Spring 2026",
      "versionNumber": "1.5.0.NEXT",
      "versionDescription": "Core services and utilities"
    },
    {
      "path": "force-app/billing",
      "package": "MyApp-Billing",
      "versionName": "Spring 2026",
      "versionNumber": "2.0.0.NEXT",
      "versionDescription": "Billing module",
      "dependencies": [
        {
          "package": "MyApp-Core",
          "versionNumber": "1.4.0.LATEST"
        }
      ]
    }
  ],
  "namespace": "myns",
  "sfdcLoginUrl": "https://login.salesforce.com",
  "sourceApiVersion": "62.0",
  "packageAliases": {
    "MyApp-Core": "0Ho1234567890AB",
    "MyApp-Core@1.4.0-1": "04t1234567890AB",
    "MyApp-Core@1.5.0-1": "04t1234567890CD",
    "MyApp-Billing": "0Ho1234567890EF",
    "MyApp-Billing@2.0.0-1": "04t1234567890GH"
  }
}
```

### Key Configuration Fields

| Field | Description |
|-------|-------------|
| `package` | Human-readable package name |
| `versionNumber` | Format: `MAJOR.MINOR.PATCH.BUILD` |
| `NEXT` | Auto-increments build number |
| `LATEST` | Resolves to latest build of that version |
| `dependencies` | Other packages this package requires |
| `namespace` | Required for managed, optional for unlocked |
| `packageAliases` | Maps names to Salesforce IDs (0Ho for package, 04t for version) |

## Package Lifecycle

### Step 1: Create the Package

```bash
# Create an unlocked package
sf package create --name "MyApp-Core" --package-type Unlocked \
  --path force-app/core --target-dev-hub devhub

# Create a managed package
sf package create --name "MyApp-Core" --package-type Managed \
  --path force-app/core --namespace myns --target-dev-hub devhub
```

### Step 2: Create a Package Version

```bash
# Create a beta version (not promoted)
sf package version create --package "MyApp-Core" \
  --installation-key "secretkey123" \
  --wait 30 --target-dev-hub devhub

# Create with code coverage requirement
sf package version create --package "MyApp-Core" \
  --installation-key "secretkey123" \
  --code-coverage --wait 30 --target-dev-hub devhub

# Create with specific definition file
sf package version create --package "MyApp-Core" \
  --definition-file config/project-scratch-def.json \
  --installation-key "secretkey123" \
  --wait 30 --target-dev-hub devhub
```

### Step 3: Test the Version

```bash
# Install beta version in a scratch org or sandbox
sf package install --package "MyApp-Core@1.5.0-1" \
  --installation-key "secretkey123" \
  --target-org test-scratch --wait 20

# Run tests in the target org
sf apex run test --target-org test-scratch --test-level RunLocalTests --wait 10
```

### Step 4: Promote to Released

```bash
# Promote (cannot be undone)
sf package version promote --package "MyApp-Core@1.5.0-1" --target-dev-hub devhub
```

**Promotion rules:**
- Released versions cannot be deleted
- Code coverage must meet 75% minimum
- Promoted versions can be installed in production
- Beta versions can only be installed in sandboxes and scratch orgs

### Step 5: Install in Production

```bash
sf package install --package "MyApp-Core@1.5.0-1" \
  --installation-key "secretkey123" \
  --target-org production --wait 20 \
  --security-type AdminsOnly
```

## Version Ancestry

Ancestry defines the upgrade path. Each new version must declare its ancestor so Salesforce can validate the upgrade is safe.

```bash
# Create version with explicit ancestor
sf package version create --package "MyApp-Core" \
  --version-number 1.6.0.NEXT \
  --ancestor 04tXXXXXXXXXXXXX \
  --wait 30 --target-dev-hub devhub

# Skip ancestry validation (use carefully)
sf package version create --package "MyApp-Core" \
  --skip-ancestor-check \
  --wait 30 --target-dev-hub devhub
```

### Ancestry Rules

| Scenario | Ancestor Required |
|----------|-------------------|
| First version ever | No ancestor |
| Patch version (1.5.1) | Must descend from 1.5.0 |
| Minor version (1.6.0) | Must descend from latest promoted in 1.x |
| Major version (2.0.0) | Can skip ancestor or descend from 1.x |
| Breaking changes | New major version recommended |

## Dependencies

### Declaring Dependencies

```json
{
  "dependencies": [
    {
      "package": "MyApp-Core",
      "versionNumber": "1.4.0.LATEST"
    },
    {
      "package": "04t000000000000AAA",
      "versionNumber": "3.2.0.LATEST"
    }
  ]
}
```

### Dependency Resolution Order

Packages must be installed in dependency order. If Package C depends on B, and B depends on A, the install order is A, B, C.

```bash
# Install in order
sf package install --package "MyApp-Core@1.5.0-1" --target-org myorg --wait 20
sf package install --package "MyApp-Billing@2.0.0-1" --target-org myorg --wait 20
```

## Namespace Considerations

### Managed Namespace

- All Apex, VF pages, components, and custom objects get the namespace prefix
- References within the package do not need the prefix
- External code must use the prefix: `myns__CustomObject__c`, `myns.MyClass`
- Namespace is permanent and cannot be changed after package creation

### Unlocked Without Namespace

- No prefix on any metadata
- Components merge into the subscriber org's default namespace
- Risk of naming collisions with subscriber metadata
- Best for internal-only distribution

## Beta vs Released Versions

| Aspect | Beta | Released (Promoted) |
|--------|------|---------------------|
| Install in sandbox | Yes | Yes |
| Install in production | No | Yes |
| Delete version | Yes | No |
| Upgrade path | Testing only | Production upgrade |
| Code coverage check | Optional | Required (75%) |

## Package Listing and Management

```bash
# List all packages in Dev Hub
sf package list --target-dev-hub devhub

# List all versions of a package
sf package version list --package "MyApp-Core" --target-dev-hub devhub

# Get version details
sf package version report --package "MyApp-Core@1.5.0-1" --target-dev-hub devhub

# List installed packages in an org
sf package installed list --target-org myorg

# Uninstall a package
sf package uninstall --package 04t... --target-org myorg --wait 20
```

## Deprecation and End-of-Life

1. **Deprecate a version** -- Mark old versions as deprecated; existing installs continue to work but new installs are blocked
2. **Communicate timeline** -- Notify subscribers of the deprecation schedule
3. **Provide upgrade path** -- Ensure a promoted version exists for subscribers to upgrade to
4. **Delete beta versions** -- Clean up unpromoted versions that are no longer needed

```bash
# Delete an unpromoted beta version
sf package version delete --package "MyApp-Core@1.5.0-3" --target-dev-hub devhub
```

## Anti-Patterns to Avoid

1. **No installation key** -- Always use an installation key for managed packages
2. **Skipping code coverage** -- Always build with `--code-coverage` before promoting
3. **Circular dependencies** -- Design packages in a DAG (directed acyclic graph)
4. **Monolith package** -- Split large packages into logical modules with clear boundaries
5. **Promoting untested versions** -- Always install and test beta versions before promoting
6. **Hardcoding subscriber org assumptions** -- Package code should be org-agnostic
