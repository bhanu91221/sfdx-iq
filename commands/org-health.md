---
description: Org health check across security, limits, coverage, and technical debt
---

# /org-health

Run a comprehensive health check on a Salesforce org assessing security settings, governor limits usage, code coverage, unused components, permission complexity, and overall technical debt.

## Workflow

1. **Validate org connection**
   - Confirm an org is connected: run `sf org display`
   - If no default org is set, prompt the user to specify one
   - Identify org type: production, sandbox, scratch, developer edition
   - Record org limits baseline for comparison

2. **Delegate to specialized agents**
   - **metadata-analyst**: Scan all metadata for unused components, complexity metrics, and dependency issues
   - **security-reviewer**: Assess security posture across code and configuration

3. **Security assessment**
   - Check `with sharing` usage across all Apex classes — flag classes using `without sharing` or with no sharing declaration
   - Verify CRUD/FLS enforcement in SOQL queries: `WITH SECURITY_ENFORCED` or `Schema.SObjectType` checks
   - Scan for SOQL injection vulnerabilities: string concatenation in queries
   - Check for hardcoded credentials, API keys, or sensitive data in Apex code
   - Review session settings: timeout, IP restrictions, login hours
   - Assess password policies if accessible
   - Check for overly permissive profiles or permission sets

4. **Governor limits assessment**
   - Run: `sf org list limits --target-org <org>` to get current limits usage
   - Flag limits approaching thresholds:
     - Over 80%: Warning
     - Over 90%: Critical
   - Key limits to check:
     - Data Storage and File Storage usage
     - API Request limit (daily)
     - Streaming API events
     - Custom metadata types count
     - Custom objects count
   - Identify Apex classes most likely to hit governor limits based on code patterns

5. **Code coverage analysis**
   - Run: `sf apex get test --code-coverage --target-org <org>` or query `ApexCodeCoverageAggregate`
   - Report overall org code coverage percentage
   - Identify classes below 75% coverage (deployment risk)
   - Identify classes with 0% coverage (no tests at all)
   - List classes between 75%-90% (improvement candidates)
   - Flag any test classes that are themselves failing

6. **Unused component detection**
   - Scan for unused Apex classes: not referenced in triggers, other classes, flows, or UI
   - Scan for unused custom fields: not in layouts, formulas, flows, or Apex
   - Scan for unused permission sets: not assigned to users or permission set groups
   - Scan for unused custom labels: not referenced in Apex or LWC
   - Estimate storage and complexity savings from cleanup

7. **Permission complexity analysis**
   - Count total profiles, permission sets, permission set groups
   - Identify profiles with excessive permissions (System Admin clones)
   - Find overlapping permission sets that grant the same access
   - Detect permission sets that could be consolidated
   - Check for users with excessive profile/permission combinations

8. **Technical debt scoring**
   - Calculate a composite health score (0-100) based on:
     - Security posture (25 points): sharing rules, FLS enforcement, injection prevention
     - Code quality (25 points): coverage, governor limit safety, design patterns
     - Metadata hygiene (20 points): unused components, naming conventions, documentation
     - Permission model (15 points): profile/permission set simplicity, least privilege
     - Limit headroom (15 points): distance from governor limits
   - Deduct points for each issue found, weighted by severity
   - Provide letter grade: A (90+), B (80+), C (70+), D (60+), F (below 60)

9. **Generate health report**
   - **Executive summary**: Overall score, letter grade, top 3 risks
   - **Security section**: Findings with severity and remediation steps
   - **Limits section**: Current usage vs. maximum with trend direction
   - **Coverage section**: Overall percentage, classes needing attention
   - **Unused metadata section**: Components recommended for removal
   - **Permission section**: Complexity metrics and simplification suggestions
   - **Action items**: Prioritized list of improvements, sorted by impact and effort

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--target-org` | Org alias or username | Default org |
| `--section` | Run specific section only (security, limits, coverage, unused, permissions) | All sections |
| `--output` | Output file for the report | Print to console |
| `--threshold` | Minimum severity to report (critical, high, medium, low) | `low` |

## Error Handling

- If the org is not connected, provide the `sf org login` command to authenticate
- If certain API calls fail (insufficient permissions), skip that check and note it in the report
- If code coverage data is unavailable, suggest running tests first with `/test`
- If the org has too many components for a full scan, break into sections and report progress

## Example Usage

```
/org-health
/org-health --target-org myProductionOrg
/org-health --section security,coverage
/org-health --threshold high --output health-report.md
```
