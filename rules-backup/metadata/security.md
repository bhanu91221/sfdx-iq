---
paths:
  - "**/*-meta.xml"
  - "**/*.object-meta.xml"
  - "**/*.field-meta.xml"
  - "**/*.permissionset-meta.xml"
---

# Metadata Security Rules

## Permission Model

### Permission Sets Over Profiles

- **NEVER** assign permissions via Profiles for new development.
- Use Permission Sets for object, field, Apex class, and Visualforce page access.
- Group related Permission Sets into Permission Set Groups for role-based assignment.
- Use Muting Permission Sets to revoke specific permissions within a group.

```
Profile (minimal)
  └── Permission Set Group: "Sales Manager Access"
       ├── PS_Account_ReadWrite
       ├── PS_Opportunity_Full
       ├── PS_Report_Builder
       └── Muting PS: Revoke_Export_Data
```

### Custom Permissions

Use Custom Permissions for feature gating — not profiles or roles:

```apex
if (FeatureManagement.checkPermission('Enable_Advanced_Reporting')) {
    // Feature-gated logic
}
```

## Organization-Wide Defaults (OWD)

- Set OWD to the **most restrictive** level needed for the majority of users.
- Open access via Sharing Rules, Role Hierarchy, or Apex Managed Sharing.
- Never set OWD to Public Read/Write unless explicitly justified.

| Object | Recommended OWD | Open Access Via |
|--------|----------------|----------------|
| Account | Private | Role Hierarchy + Sharing Rules |
| Opportunity | Private | Role Hierarchy |
| Case | Private | Sharing Rules (queue-based) |
| Custom Objects | Private (default) | As needed |

## Sharing Rules

- Use criteria-based sharing rules over owner-based when possible.
- Document the business reason for every sharing rule.
- Avoid sharing rules that grant "Read/Write" — prefer "Read Only" and use field-level security.
- Test sharing rules with `System.runAs()` in Apex tests.

## Profile Security

- Login IP ranges MUST be configured for admin profiles.
- Session settings: enforce login hours, session timeout ≤ 4 hours.
- Password policies: minimum 12 characters, complexity requirements, 90-day rotation.
- Enable MFA for all internal users.

## Connected App Security

- OAuth scopes should follow least-privilege principle.
- Use Named Credentials — never store credentials in code or custom settings.
- Set IP restrictions on Connected Apps for server-to-server integrations.
- Rotate client secrets on a regular schedule.

## Field-Level Security

- New custom fields should default to **not visible** on all profiles.
- Grant field access only through Permission Sets.
- Sensitive fields (SSN, financial data) require Shield Platform Encryption.
- Use `WITH SECURITY_ENFORCED` in all SOQL exposed to users.

## Audit Trail

- Enable Field Audit Trail for business-critical fields.
- Use Setup Audit Trail for admin change tracking.
- Implement Shield Event Monitoring for security-sensitive orgs.
- Log access to sensitive data via custom logging framework.
