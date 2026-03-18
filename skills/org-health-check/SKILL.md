---
name: org-health-check
description: Org health monitoring, Security Health Check score, limits analysis, technical debt scoring, and automated health scripts
origin: claude-sfdx-iq
---

# Org Health Check

## Security Health Check Score

The Security Health Check (Setup > Security > Health Check) compares your org's security settings against Salesforce's baseline recommendations and produces a score from 0 to 100.

### Score Interpretation

| Score Range | Status | Action |
|-------------|--------|--------|
| 90-100 | Excellent | Maintain current settings, review quarterly |
| 70-89 | Good | Address high-risk findings within 30 days |
| 50-69 | Needs Improvement | Prioritize remediation, review monthly |
| Below 50 | Critical | Immediate action required, executive escalation |

### Common High-Risk Settings

| Setting | Recommended Value | Risk If Misconfigured |
|---------|-------------------|----------------------|
| Session Timeout | 2 hours or less | Session hijacking |
| Password Complexity | High | Brute force attacks |
| Clickjack Protection | Enabled for all pages | UI redressing attacks |
| HTTPS Required | Enabled | Data interception |
| Login IP Ranges | Configured per profile | Unauthorized access from unknown locations |
| SMS/App Verification | Required for admins | Account takeover |
| API-Only Users | Separate profiles | Privilege escalation |

### Improving the Score

1. Review each "At Risk" and "Meets Minimum" item in the Health Check
2. Prioritize items by risk severity (Critical > High > Medium > Low)
3. Change settings to match the Salesforce Baseline or a stricter custom baseline
4. Re-run Health Check after changes to verify score improvement
5. Document exceptions for settings that cannot meet baseline (business justification required)

## Salesforce Optimizer Report

The Optimizer (Setup > Optimizer) analyzes the org across multiple dimensions and produces a report with recommendations.

### Key Areas Analyzed

| Area | What It Checks |
|------|---------------|
| Limits | Storage usage, API call volume, code limits |
| Features | Unused features, deprecated features in use |
| Customizations | Unused custom fields, validation rules, flows |
| Security | Profile and permission set configuration |
| Performance | Inefficient page layouts, complex flows |
| Clean-Up | Unused Apex classes, inactive flows, old reports |

### Acting on Optimizer Recommendations

**Priority order:**
1. **Security findings** -- Address immediately
2. **Limit warnings** -- Prevent hitting governor limits
3. **Performance issues** -- Improve user experience
4. **Clean-up items** -- Reduce technical debt
5. **Feature adoption** -- Evaluate during planning cycles

## Limits Monitoring

### System Overview Page

```
Setup > System Overview
```

Displays current usage for:
- Data storage and file storage
- API requests (24-hour rolling window)
- Custom objects, custom fields, and relationships
- Apex classes, triggers, and code size
- Flows and process builders
- Custom metadata types and records

### Limits API

Query current limits programmatically via the REST API.

```bash
# Get current org limits
sf api request rest /services/data/v62.0/limits --target-org myOrg
```

**Key limits to monitor:**

| Limit | Warning Threshold | Action |
|-------|-------------------|--------|
| DailyApiRequests | 80% consumed | Optimize integrations, implement caching |
| DataStorageMB | 80% consumed | Archive old data, clean up test records |
| FileStorageMB | 80% consumed | Review large attachments, archive files |
| DailyBulkV2QueryJobs | 70% consumed | Consolidate bulk queries |
| HourlyODataCallout | 70% consumed | Throttle external connections |

### Apex Limits Monitoring

```apex
public class LimitsMonitor {

    public static Map<String, Object> getCurrentUsage() {
        Map<String, Object> usage = new Map<String, Object>();
        usage.put('soqlQueries', Limits.getQueries() + '/' + Limits.getLimitQueries());
        usage.put('dmlStatements', Limits.getDmlStatements() + '/' + Limits.getLimitDmlStatements());
        usage.put('cpuTime', Limits.getCpuTime() + '/' + Limits.getLimitCpuTime());
        usage.put('heapSize', Limits.getHeapSize() + '/' + Limits.getLimitHeapSize());
        usage.put('soqlRows', Limits.getQueryRows() + '/' + Limits.getLimitQueryRows());
        usage.put('dmlRows', Limits.getDmlRows() + '/' + Limits.getLimitDmlRows());
        usage.put('callouts', Limits.getCallouts() + '/' + Limits.getLimitCallouts());
        return usage;
    }

    public static void warnIfApproachingLimits() {
        Decimal queryPercent = (Decimal) Limits.getQueries() / Limits.getLimitQueries() * 100;
        Decimal dmlPercent = (Decimal) Limits.getDmlStatements() / Limits.getLimitDmlStatements() * 100;
        Decimal cpuPercent = (Decimal) Limits.getCpuTime() / Limits.getLimitCpuTime() * 100;

        if (queryPercent > 80) {
            System.debug(LoggingLevel.WARN, 'SOQL queries at ' + queryPercent.setScale(1) + '%');
        }
        if (dmlPercent > 80) {
            System.debug(LoggingLevel.WARN, 'DML statements at ' + dmlPercent.setScale(1) + '%');
        }
        if (cpuPercent > 80) {
            System.debug(LoggingLevel.WARN, 'CPU time at ' + cpuPercent.setScale(1) + '%');
        }
    }
}
```

## Code Coverage Report Generation

### SF CLI Commands

```bash
# Run all local tests and generate coverage report
sf apex run test --code-coverage --result-format human --output-dir coverage --target-org myOrg

# Run tests and output JSON for CI parsing
sf apex run test --code-coverage --result-format json --output-dir coverage --target-org myOrg

# Get coverage for specific classes
sf apex get test --test-run-id <testRunId> --code-coverage --target-org myOrg
```

### Coverage Analysis Script

```bash
#!/bin/bash
# Generate and analyze code coverage

ORG_ALIAS="myOrg"
OUTPUT_DIR="./coverage-report"

echo "Running all local tests..."
sf apex run test --code-coverage --result-format json --output-dir "$OUTPUT_DIR" --target-org "$ORG_ALIAS" --wait 30

echo "Parsing results..."
# Extract classes below 75% coverage
node -e "
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('$OUTPUT_DIR/test-result.json', 'utf8'));
const coverage = results.coverage?.coverage || [];
const belowThreshold = coverage.filter(c => c.coveredPercent < 75);
if (belowThreshold.length > 0) {
    console.log('Classes below 75% coverage:');
    belowThreshold.forEach(c => console.log('  ' + c.name + ': ' + c.coveredPercent + '%'));
    process.exit(1);
} else {
    console.log('All classes meet 75% minimum coverage.');
}
"
```

## Unused Components Detection

### Find Unused Apex Classes

```bash
# Query ApexClass metadata to find classes with no references
sf data query --query "SELECT Id, Name, LengthWithoutComments FROM ApexClass WHERE NamespacePrefix = null AND Status = 'Active' ORDER BY LengthWithoutComments ASC" --target-org myOrg --result-format table
```

### Automated Detection Approach

Cross-reference Apex classes against:

1. **Symbol Table** -- Classes that are never referenced by other classes
2. **Test Coverage** -- Classes with 0% coverage (may indicate no tests reference them)
3. **ApexCodeCoverage** -- Aggregate coverage objects

```apex
// Query for classes with no coverage at all
List<ApexCodeCoverageAggregate> covered = [
    SELECT ApexClassOrTrigger.Name, NumLinesCovered, NumLinesUncovered
    FROM ApexCodeCoverageAggregate
    WHERE NumLinesCovered = 0 AND NumLinesUncovered > 0
];
```

### Component Inventory Script

```bash
#!/bin/bash
# Inventory of org metadata counts

ORG_ALIAS="myOrg"

echo "=== Org Component Inventory ==="
echo "Apex Classes: $(sf data query --query "SELECT COUNT() FROM ApexClass WHERE NamespacePrefix = null" --target-org $ORG_ALIAS --result-format csv | tail -1)"
echo "Apex Triggers: $(sf data query --query "SELECT COUNT() FROM ApexTrigger WHERE NamespacePrefix = null" --target-org $ORG_ALIAS --result-format csv | tail -1)"
echo "VF Pages: $(sf data query --query "SELECT COUNT() FROM ApexPage WHERE NamespacePrefix = null" --target-org $ORG_ALIAS --result-format csv | tail -1)"
echo "Flows (Active): $(sf data query --query "SELECT COUNT() FROM FlowDefinitionView WHERE IsActive = true" --target-org $ORG_ALIAS --result-format csv | tail -1)"
echo "Custom Objects: $(sf data query --query "SELECT COUNT() FROM EntityDefinition WHERE IsCustomSetting = false AND QualifiedApiName LIKE '%__c'" --target-org $ORG_ALIAS --result-format csv | tail -1)"
```

## Profile and Permission Cleanup

### Assessment Steps

1. **Identify unused profiles** -- Profiles with no assigned users
2. **Review profile permissions** -- Remove unnecessary object and field access
3. **Migrate to permission sets** -- Move permissions from profiles to permission sets and permission set groups
4. **Consolidate** -- Merge similar profiles and permission sets

### Find Profiles with No Users

```apex
// Profiles with zero users assigned
List<Profile> allProfiles = [SELECT Id, Name FROM Profile];
Set<Id> profilesWithUsers = new Set<Id>();
for (User u : [SELECT ProfileId FROM User WHERE IsActive = true]) {
    profilesWithUsers.add(u.ProfileId);
}

List<String> unused = new List<String>();
for (Profile p : allProfiles) {
    if (!profilesWithUsers.contains(p.Id)) {
        unused.add(p.Name);
    }
}
```

### Permission Set Audit

```bash
# List permission sets and their assignment count
sf data query --query "SELECT PermissionSet.Name, COUNT(Id) FROM PermissionSetAssignment WHERE PermissionSet.IsOwnedByProfile = false GROUP BY PermissionSet.Name ORDER BY COUNT(Id) DESC" --target-org myOrg --result-format table
```

## Technical Debt Scoring Framework

### Scoring Dimensions

| Dimension | Weight | Metric | Scoring |
|-----------|--------|--------|---------|
| Code Coverage | 20% | Org-wide test coverage | 90%+ = 10, 80-89% = 7, 75-79% = 4, <75% = 0 |
| Security Health | 20% | Health Check score | 90+ = 10, 70-89 = 7, 50-69 = 4, <50 = 0 |
| Unused Components | 15% | % of classes with 0 references | <5% = 10, 5-15% = 7, 15-30% = 4, >30% = 0 |
| Limit Utilization | 15% | Highest limit consumption % | <50% = 10, 50-70% = 7, 70-90% = 4, >90% = 0 |
| Apex Complexity | 15% | Average class length (lines) | <200 = 10, 200-400 = 7, 400-600 = 4, >600 = 0 |
| Profile Hygiene | 15% | % permissions in PermSets vs Profiles | >80% = 10, 60-80% = 7, 40-60% = 4, <40% = 0 |

### Overall Score Calculation

```
Total = Sum(Dimension Score * Weight)
Max possible = 10
```

| Total Score | Health Rating |
|------------|---------------|
| 8.0-10.0 | Healthy |
| 6.0-7.9 | Moderate Debt |
| 4.0-5.9 | Significant Debt |
| Below 4.0 | Critical Debt |

## Automated Health Check Script

```bash
#!/bin/bash
# Automated Org Health Check

ORG_ALIAS="${1:-myOrg}"
echo "============================================"
echo "  Org Health Check: $ORG_ALIAS"
echo "  Date: $(date)"
echo "============================================"

echo ""
echo "--- Storage Usage ---"
sf api request rest /services/data/v62.0/limits --target-org "$ORG_ALIAS" 2>/dev/null | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
const limits = ['DataStorageMB', 'FileStorageMB', 'DailyApiRequests', 'DailyBulkV2QueryJobs'];
limits.forEach(l => {
    if (data[l]) {
        const pct = ((data[l].Max - data[l].Remaining) / data[l].Max * 100).toFixed(1);
        const status = pct > 80 ? 'WARNING' : pct > 60 ? 'WATCH' : 'OK';
        console.log('  ' + l + ': ' + pct + '% used [' + status + ']');
    }
});
"

echo ""
echo "--- Code Coverage ---"
sf apex run test --code-coverage --result-format json --output-dir /tmp/health-check --target-org "$ORG_ALIAS" --wait 30 2>/dev/null
node -e "
const fs = require('fs');
try {
    const results = JSON.parse(fs.readFileSync('/tmp/health-check/test-result.json', 'utf8'));
    const summary = results.summary || {};
    console.log('  Org Coverage: ' + (summary.orgWideCoverage || 'N/A'));
    console.log('  Test Run Time: ' + (summary.testRunTime || 'N/A'));
    console.log('  Tests Passed: ' + (summary.passing || 0) + '/' + (summary.testsRan || 0));
    const failures = summary.failing || 0;
    if (failures > 0) console.log('  WARNING: ' + failures + ' test(s) failing');
} catch(e) { console.log('  Could not parse test results'); }
"

echo ""
echo "--- Component Counts ---"
echo "  Apex Classes: $(sf data query --query "SELECT COUNT() FROM ApexClass WHERE NamespacePrefix = null" --target-org $ORG_ALIAS --result-format csv 2>/dev/null | tail -1)"
echo "  Apex Triggers: $(sf data query --query "SELECT COUNT() FROM ApexTrigger WHERE NamespacePrefix = null" --target-org $ORG_ALIAS --result-format csv 2>/dev/null | tail -1)"
echo "  Active Flows: $(sf data query --query "SELECT COUNT() FROM FlowDefinitionView WHERE IsActive = true" --target-org $ORG_ALIAS --result-format csv 2>/dev/null | tail -1)"
echo "  VF Pages: $(sf data query --query "SELECT COUNT() FROM ApexPage WHERE NamespacePrefix = null" --target-org $ORG_ALIAS --result-format csv 2>/dev/null | tail -1)"

echo ""
echo "============================================"
echo "  Health Check Complete"
echo "============================================"
```

## Health Check Cadence

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Security Health Check review | Monthly | Security Team / Admin |
| Salesforce Optimizer run | Quarterly | Admin |
| Limits monitoring | Weekly (automated) | DevOps |
| Code coverage analysis | Every deployment (CI) | Development Team |
| Unused component audit | Quarterly | Tech Lead |
| Profile/permission cleanup | Semi-annually | Admin / Security |
| Full technical debt scoring | Quarterly | Architecture Team |

## Anti-Patterns

1. **Never reviewing Health Check score.** Run it monthly at minimum.
2. **Ignoring Optimizer recommendations.** Review each quarterly report and triage findings.
3. **No limits monitoring.** Hitting a limit in production causes outages. Automate alerts.
4. **Keeping unused Apex classes.** Dead code increases complexity and slows deployments.
5. **Profile-heavy permission model.** Migrate to permission sets for maintainability.
6. **No technical debt tracking.** Without measurement, debt grows silently.
7. **Manual health checks only.** Automate what can be automated; reserve manual effort for interpretation and action.
