# Admin Configuration Mode Context

Active for flows, permission sets, metadata operations, and declarative configuration.

## Declarative-First Guidance

Always evaluate declarative solutions before writing code:

1. **Validation Rules** — Field-level data validation
2. **Formula Fields** — Calculated values, cross-object references
3. **Flows** — Automation, record-triggered logic, screen interactions
4. **Approval Processes** — Multi-step approval workflows
5. **Duplicate Rules** — Prevent duplicate records
6. **Assignment Rules** — Lead/case routing

Only use Apex when declarative tools cannot meet the requirement (complex logic, external callouts, high-volume batch processing).

## Flow vs Code Decision Matrix

| Scenario | Recommended | Reason |
|----------|-------------|--------|
| Simple field updates on save | Flow (Before Save) | No DML cost, fastest execution |
| Send email on record change | Flow (After Save) | Declarative, admin-maintainable |
| Complex multi-object logic | Apex Trigger | Better error handling, testability |
| External API callout | Apex (Queueable) | Retry logic, error handling, governor control |
| Batch data processing (10K+) | Apex Batch | Governor limit reset per batch |
| Screen wizard with branching | Screen Flow | Admin-maintainable, no deployment needed |
| Scheduled automation | Scheduled Flow | Simple scheduled tasks without code |
| Complex scheduled logic | Apex Schedulable | When flow complexity exceeds maintainability |
| Platform Event handling | Flow or Apex | Flow for simple; Apex for complex processing |

## Permission Model Hierarchy

```
Organization-Wide Defaults (OWD)
    |
    v  (opens access)
Role Hierarchy
    |
    v  (opens access)
Sharing Rules (criteria-based or ownership-based)
    |
    v  (opens access)
Manual Sharing / Apex Managed Sharing
    |
    v  (restricts access)
Restriction Rules (narrows visibility)
```

**Key principles:**
- Start with the most restrictive OWD setting needed
- Use Role Hierarchy to open access up the chain
- Sharing Rules for lateral or cross-team access
- Apex Managed Sharing only when declarative options fail
- Permission Sets over Profiles for granting access
- Permission Set Groups to bundle related permissions

## Custom Metadata vs Custom Settings

| Feature | Custom Metadata | Custom Settings (Hierarchy) | Custom Settings (List) |
|---------|----------------|---------------------------|----------------------|
| Deployable | Yes (metadata API) | No (data) | No (data) |
| Packageable | Yes | Limited | Limited |
| SOQL needed | No (getInstance) | No (getInstance) | No (getAll) |
| Per-user values | No | Yes (hierarchy) | No |
| Best for | App config, mappings | User/profile prefs | Lookup tables |
| Governor limit | No SOQL cost | No SOQL cost | No SOQL cost |

**Recommendation:** Use Custom Metadata Types for application configuration that should deploy between orgs. Use Hierarchy Custom Settings only for user/profile-specific preferences.

## Validation Rule Best Practices

- **Naming:** `ObjectName_RulePurpose` (e.g., `Account_RequireIndustry`)
- **Error location:** Assign to specific field when possible, not page-level
- **Error messages:** Clear, actionable user-facing language
- **Organization:** Group related validations; avoid overlapping rules
- **Bypass pattern:** Use custom permission or hierarchy custom setting for admin bypass
- **Testing:** Verify rules fire in Apex tests with `DmlException` assertions

## Flow Best Practices

- **Naming convention:** `ObjectName - Purpose - Type`
- **Always add fault connectors** on DML and callout elements
- **Use subflows** for reusable logic across multiple flows
- **Limit loop iterations** — prefer collection variables and formulas
- **Version management** — Activate new version, keep previous as backup
- **Document decisions** — Add descriptions to all decision elements
- **Avoid recursive flows** — Use `$Record__Prior` for change detection

## Agent Delegation

- Flow analysis and optimization -> delegate to `flow-analyst` agent
- Permission model design -> delegate to `admin-advisor` agent
- Data model changes -> delegate to `data-modeler` agent
- Complex architecture questions -> delegate to `architect` agent
