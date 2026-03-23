# Metadata Hook Rules

## Hook Triggers for Metadata Files

Metadata hooks fire based on file extension and path patterns:

| File Pattern | Hook | Checks |
|-------------|------|--------|
| `**/*.object-meta.xml` | Object validation | Field descriptions, API name conventions |
| `**/*.field-meta.xml` | Field validation | Naming convention, description required |
| `**/*.permissionset-meta.xml` | Permission set check | Naming convention, scope review |
| `**/*.flow-meta.xml` | Flow analysis | DML in loops, fault paths, naming |
| `**/*.cls-meta.xml` | Apex metadata | API version consistency |
| `**/*.profile-meta.xml` | Profile warning | Warn against profile-based permissions |

## API Version Consistency

- All metadata MUST use the same `apiVersion` within a project.
- The target version is set in `sfdx-project.json` → `sourceApiVersion`.
- When a file's API version differs from the project version, flag as MEDIUM.

```xml
<!-- All files should match project sourceApiVersion -->
<apiVersion>62.0</apiVersion>
```

## Profile Detection Warning

When a `.profile-meta.xml` file is edited, the hook issues a warning:

```
[MEDIUM] Use Permission Sets instead of Profiles for permission management.
See: rules/metadata/security.md
```

This is a warning, not a blocker — profiles are sometimes needed for login hours, IP ranges, and page layout assignments.

## Metadata Naming Validation

The hook checks that metadata API names follow conventions:
- Custom objects: `PascalCase__c` pattern
- Custom fields: `PascalCase__c` pattern
- Permission sets: `PS_` prefix recommended
- Flows: `ObjectName_TriggerType_Purpose` pattern

## Hook Behavior by Profile

| Check | Minimal | Standard | Strict |
|-------|---------|----------|--------|
| API version mismatch | ❌ | ✅ | ✅ |
| Profile edit warning | ❌ | ✅ | ✅ |
| Naming convention | ❌ | ❌ | ✅ |
| Missing descriptions | ❌ | ❌ | ✅ |
| Unused metadata detection | ❌ | ❌ | ✅ |

## Integration with metadata-analyst Agent

When metadata hooks detect complex issues (dependency conflicts, naming inconsistencies across >5 files), they suggest invoking the `metadata-analyst` agent for comprehensive analysis.

## Destructive Change Safety

When a metadata file is deleted from the project:
1. Hook warns that a `destructiveChanges.xml` entry may be needed.
2. Suggests running `/destructive-deploy` command for safe removal.
3. Never auto-delete metadata from the org — always require explicit confirmation.
