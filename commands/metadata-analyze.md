---
description: Analyze metadata dependencies and deployment risks
---

# /metadata-analyze

Analyze Salesforce metadata to identify dependencies between components, detect unused metadata, assess deployment risks, and flag potential breaking changes.

## Workflow

1. **Determine analysis scope**
   - If a specific component or directory is provided, analyze only that scope
   - If no argument is given, analyze the entire `force-app/main/default/` directory
   - Identify all metadata types present: classes, triggers, LWC, Aura, objects, fields, flows, profiles, permission sets, layouts, etc.
   - Delegate to the **metadata-analyst** agent for deep analysis

2. **Scan metadata files**
   - Parse metadata XML files for references and dependencies:
     - **Apex classes/triggers**: scan for class references, SObject references, field references, custom label usage, custom metadata references
     - **LWC/Aura components**: scan for Apex controller imports, component references, custom label imports, static resource usage
     - **Custom objects/fields**: scan for formula references, lookup relationships, validation rules referencing other fields
     - **Flows**: scan for Apex action references, subflow references, object references
     - **Profiles/Permission sets**: scan for object permissions, field permissions, class access, page access
     - **Layouts**: scan for field references, related list references, button overrides

3. **Build dependency graph**
   - Create a directed graph of component dependencies
   - Identify:
     - **Direct dependencies**: Component A directly references Component B
     - **Transitive dependencies**: Component A depends on B, which depends on C
     - **Circular dependencies**: Components that reference each other (flag as risk)
   - Group dependencies by metadata type
   - Calculate dependency depth for each component

4. **Detect unused metadata**
   - Identify components with zero inbound references:
     - Apex classes not referenced by any other class, trigger, flow, or LWC
     - Custom fields not used in any formula, flow, layout, validation rule, or Apex code
     - Permission sets not assigned to any profile or permission set group
     - Custom labels not referenced in any Apex or LWC code
   - Distinguish between truly unused and entry-point components (REST endpoints, batch classes, scheduled classes, Visualforce pages)
   - Flag each unused component with confidence level: High (definitely unused), Medium (probably unused), Low (might have external references)

5. **Assess deployment risks**
   - For a planned deployment, analyze:
     - **Missing dependencies**: Components referenced but not in the deployment package
     - **Order-of-operations risks**: Components that must be deployed before others
     - **Breaking changes**: Field deletions, class renames, API changes that break dependents
     - **Test coverage gaps**: Modified classes without corresponding test changes
   - Categorize risks: Critical (will fail deployment), High (may fail), Medium (could cause issues), Low (cosmetic)

6. **Detect breaking changes**
   - Compare current state against git history (if available):
     - Removed public methods that other classes reference
     - Changed method signatures (parameters, return types)
     - Deleted or renamed custom fields still referenced in code or configuration
     - Deleted custom labels still referenced
     - Changed field types that affect dependent formulas
   - For each breaking change, list all affected components

7. **Generate report**
   - **Dependency summary**: Total components, total dependencies, most-connected components
   - **Dependency graph**: Textual representation of key dependencies
   - **Unused metadata list**: Grouped by type with confidence levels
   - **Deployment risk assessment**: Risks sorted by severity
   - **Breaking changes**: Each change with affected components listed
   - **Recommendations**: Cleanup suggestions, refactoring opportunities, deployment ordering

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--path` | Directory or component to analyze | `force-app/main/default` |
| `--type` | Filter to specific metadata type | All types |
| `--deployment` | Analyze deployment risks for changed files | `false` |
| `--unused` | Focus on unused metadata detection | `false` |
| `--depth` | Maximum dependency depth to traverse | `5` |

## Error Handling

- If metadata XML is malformed, report the file and skip it
- If the project structure is non-standard, attempt to locate metadata directories
- If git is not available for breaking change detection, skip that analysis
- If the scope is very large (1000+ components), warn and suggest narrowing the scope

## Example Usage

```
/metadata-analyze
/metadata-analyze --path force-app/main/default/classes/AccountService.cls
/metadata-analyze --deployment
/metadata-analyze --unused --type classes
/metadata-analyze --path force-app/main/default/objects/Account
```
