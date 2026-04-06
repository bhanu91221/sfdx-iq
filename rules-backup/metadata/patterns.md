---
paths:
  - "**/*-meta.xml"
  - "**/*.object-meta.xml"
  - "**/*.field-meta.xml"
  - "**/*.permissionset-meta.xml"
---

# Metadata Patterns Rules

## Source Format Organization

Standard SFDX directory structure:

```
force-app/
└── main/
    └── default/
        ├── classes/           # Apex classes and test classes
        ├── triggers/          # Apex triggers
        ├── lwc/               # Lightning Web Components
        ├── aura/              # Aura components (legacy)
        ├── objects/           # Custom objects, fields, validation rules
        ├── layouts/           # Page layouts
        ├── permissionsets/    # Permission sets
        ├── flows/             # Flow definitions
        ├── customMetadata/    # Custom Metadata Type records
        ├── labels/            # Custom labels
        ├── staticresources/   # Static resources
        └── tabs/              # Custom tabs
```

## Multi-Package Directory Structure

For large projects, use package directories in `sfdx-project.json`:

```json
{
  "packageDirectories": [
    { "path": "force-app/core", "default": true },
    { "path": "force-app/sales" },
    { "path": "force-app/service" },
    { "path": "force-app/integration" }
  ]
}
```

## Custom Metadata Types vs Custom Settings

| Use Custom Metadata Types | Use Custom Settings |
|--------------------------|---------------------|
| Configuration that deploys with metadata | Per-user or per-profile configuration |
| Values that don't change between envs | Values that differ between orgs |
| Packageable configuration | Runtime-modifiable values |
| Test data accessible without SeeAllData | Hierarchical configuration |

## Permission Model Design

- **Permission Sets** over Profiles — always.
- **Permission Set Groups** for role-based access (combines multiple PS).
- **Muting Permission Sets** to revoke specific permissions within a group.
- **Custom Permissions** for feature flags (`FeatureManagement.checkPermission()`).

## Metadata Deployment Order

When deploying dependencies, order matters:

1. Custom Objects and Fields (dependencies first)
2. Custom Metadata Types and records
3. Apex Classes (in dependency order: utilities → selectors → services → handlers)
4. Apex Triggers
5. Lightning Web Components
6. Flows (depend on fields and Apex)
7. Permission Sets (reference all above)
8. Layouts (reference fields and components)
9. Profiles (last — reference everything)

## Destructive Changes

- Use `destructiveChangesPre.xml` for items that must be removed BEFORE new metadata deploys.
- Use `destructiveChangesPost.xml` for items removed AFTER deployment.
- Always validate destructive changes in a sandbox first.
- Keep a log of all destructive deployments for audit.
