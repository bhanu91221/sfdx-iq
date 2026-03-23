---
name: code-analysis
description: PMD for Apex, Salesforce Code Analyzer, cyclomatic complexity, custom rulesets, and CI integration
origin: claude-sfdx-iq
tokens: 2883
domain: apex
---

# Code Analysis

## Overview

Static code analysis catches bugs, security vulnerabilities, and style violations before deployment. Salesforce projects use PMD (via Salesforce Code Analyzer) as the primary analysis tool, supplemented by custom rules and CI pipeline integration.

## Salesforce Code Analyzer (sfdx-scanner)

Salesforce Code Analyzer wraps PMD, ESLint, RetireJS, and Graph Engine into a single SFDX plugin.

### Installation

```bash
sf plugins install @salesforce/sfdx-scanner
```

### Basic Usage

```bash
# Scan Apex classes
sf scanner run --target "force-app/main/default/classes" --engine pmd --format table

# Scan with severity filter (1=critical, 2=high, 3=moderate)
sf scanner run --target "force-app" --severity-threshold 2

# Output as JSON for CI parsing
sf scanner run --target "force-app" --format json --outfile results.json

# Scan specific files
sf scanner run --target "force-app/main/default/classes/AccountService.cls"

# Scan LWC JavaScript
sf scanner run --target "force-app/main/default/lwc" --engine eslint-lwc

# Run all engines
sf scanner run --target "force-app" --engine pmd,eslint-lwc,retire-js
```

### Engines

| Engine | Language | Purpose |
|--------|----------|---------|
| PMD | Apex, Visualforce | Style, security, performance |
| ESLint (LWC) | JavaScript | LWC coding standards |
| RetireJS | JavaScript | Known vulnerable libraries |
| Graph Engine | Apex | Path-based analysis (CRUD, null) |

## PMD Rules for Apex

### Critical Rules (Severity 1)

These rules must never be violated in production code.

| Rule | Category | Description |
|------|----------|-------------|
| `ApexCRUDViolation` | Security | DML without CRUD/FLS checks |
| `ApexSOQLInjection` | Security | Dynamic SOQL with unescaped input |
| `ApexSharingViolations` | Security | Class missing sharing keyword |
| `ApexInsecureEndpoint` | Security | HTTP endpoint instead of HTTPS |
| `ApexOpenRedirect` | Security | Unvalidated redirect URL |
| `ApexXSSFromURLParam` | Security | URL parameter used without encoding |
| `ApexXSSFromEscapeFalse` | Security | `escape="false"` in Visualforce |

### High Rules (Severity 2)

| Rule | Category | Description |
|------|----------|-------------|
| `AvoidDmlStatementsInLoops` | Performance | DML inside a for/while/do loop |
| `AvoidSoqlInLoops` | Performance | SOQL inside a for/while/do loop |
| `OperationWithLimitsInLoop` | Performance | Limits-consuming call in a loop |
| `CyclomaticComplexity` | Design | Method too complex (default > 10) |
| `ExcessiveClassLength` | Design | Class exceeds size threshold |
| `ExcessiveParameterList` | Design | Method has too many parameters |
| `NcssMethodCount` | Design | Method has too many statements |
| `AvoidGlobalModifier` | Best Practice | Unnecessary `global` access |

### Moderate Rules (Severity 3)

| Rule | Category | Description |
|------|----------|-------------|
| `EmptyCatchBlock` | Error Prone | Catch block with no handling |
| `EmptyIfStmt` | Error Prone | Empty if block |
| `EmptyTryOrFinallyBlock` | Error Prone | Empty try or finally |
| `IfStmtsMustUseBraces` | Code Style | If without braces |
| `WhileLoopsMustUseBraces` | Code Style | While without braces |
| `ForLoopsMustUseBraces` | Code Style | For without braces |
| `ApexDoc` | Documentation | Missing ApexDoc on public method |
| `OneDeclarationPerLine` | Code Style | Multiple declarations per line |
| `FieldNamingConventions` | Code Style | Variable naming violation |

## Cyclomatic Complexity

Cyclomatic complexity measures the number of independent paths through a method. Each decision point (if, else if, for, while, case, catch, &&, ||, ternary) adds one to the complexity.

### Thresholds

| Complexity | Risk Level | Action |
|------------|------------|--------|
| 1-5 | Low | Good. No action needed. |
| 6-10 | Moderate | Acceptable. Monitor for growth. |
| 11-15 | High | Refactor. Extract methods. |
| 16-25 | Very High | Must refactor before merge. |
| 26+ | Critical | Block merge. Redesign required. |

### Reducing Complexity

**Extract methods:**

```apex
// BEFORE: complexity = 12
public void processAccount(Account acc) {
    if (acc.Type == 'Partner') {
        if (acc.Status__c == 'Active') {
            // 20 lines of partner logic
        } else if (acc.Status__c == 'Pending') {
            // 15 lines of pending logic
        }
    } else if (acc.Type == 'Customer') {
        // 25 lines of customer logic
    }
}

// AFTER: complexity = 3 (each extracted method has low complexity)
public void processAccount(Account acc) {
    if (acc.Type == 'Partner') {
        processPartner(acc);
    } else if (acc.Type == 'Customer') {
        processCustomer(acc);
    }
}
```

**Replace conditionals with polymorphism:**

```apex
// BEFORE: switch with 8 cases
public Decimal calculatePrice(Order__c order) {
    switch on order.Type__c {
        when 'Standard' { return calculateStandardPrice(order); }
        when 'Premium'  { return calculatePremiumPrice(order); }
        when 'VIP'      { return calculateVipPrice(order); }
        // ... more cases
    }
}

// AFTER: Strategy pattern
public Decimal calculatePrice(Order__c order) {
    IPricingStrategy strategy = PricingFactory.create(order.Type__c);
    return strategy.calculate(order);
}
```

## Custom Ruleset Configuration

Create a custom PMD ruleset to enforce project-specific standards.

### File: `.pmd/apex-ruleset.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ruleset name="Custom Apex Rules"
         xmlns="http://pmd.sourceforge.net/ruleset/2.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://pmd.sourceforge.net/ruleset/2.0.0
             http://pmd.sourceforge.net/ruleset_2_0_0.xsd">

    <description>Custom Apex ruleset for the project</description>

    <!-- Security (all enabled, no exclusions) -->
    <rule ref="category/apex/security.xml" />

    <!-- Performance -->
    <rule ref="category/apex/performance.xml" />

    <!-- Design -->
    <rule ref="category/apex/design.xml/CyclomaticComplexity">
        <properties>
            <property name="classReportLevel" value="40" />
            <property name="methodReportLevel" value="10" />
        </properties>
    </rule>

    <rule ref="category/apex/design.xml/ExcessiveClassLength">
        <properties>
            <property name="minimum" value="500" />
        </properties>
    </rule>

    <rule ref="category/apex/design.xml/ExcessiveParameterList">
        <properties>
            <property name="minimum" value="4" />
        </properties>
    </rule>

    <rule ref="category/apex/design.xml/NcssMethodCount">
        <properties>
            <property name="minimum" value="50" />
        </properties>
    </rule>

    <!-- Best Practices -->
    <rule ref="category/apex/bestpractices.xml/ApexDoc">
        <properties>
            <property name="reportMissingDescription" value="true" />
            <property name="reportPrivate" value="false" />
            <property name="reportProtected" value="true" />
        </properties>
    </rule>

    <rule ref="category/apex/bestpractices.xml/AvoidGlobalModifier" />

    <!-- Error Prone -->
    <rule ref="category/apex/errorprone.xml/EmptyCatchBlock" />
    <rule ref="category/apex/errorprone.xml/EmptyIfStmt" />
    <rule ref="category/apex/errorprone.xml/EmptyTryOrFinallyBlock" />

    <!-- Code Style -->
    <rule ref="category/apex/codestyle.xml/IfStmtsMustUseBraces" />
    <rule ref="category/apex/codestyle.xml/WhileLoopsMustUseBraces" />
    <rule ref="category/apex/codestyle.xml/ForLoopsMustUseBraces" />
    <rule ref="category/apex/codestyle.xml/OneDeclarationPerLine" />
</ruleset>
```

### Using Custom Ruleset

```bash
sf scanner run --target "force-app" --pmdconfig ".pmd/apex-ruleset.xml" --format table
```

## CI Integration

### GitHub Actions Example

```yaml
name: Code Analysis
on:
  pull_request:
    paths:
      - 'force-app/**'

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Install Scanner
        run: sf plugins install @salesforce/sfdx-scanner

      - name: Run PMD Analysis
        run: |
          sf scanner run \
            --target "force-app" \
            --pmdconfig ".pmd/apex-ruleset.xml" \
            --format json \
            --outfile scan-results.json \
            --severity-threshold 2

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: scan-results
          path: scan-results.json
```

### Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

CHANGED_APEX=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(cls|trigger)$')

if [ -n "$CHANGED_APEX" ]; then
    echo "Running PMD analysis on changed Apex files..."
    sf scanner run \
        --target "$CHANGED_APEX" \
        --pmdconfig ".pmd/apex-ruleset.xml" \
        --severity-threshold 2

    if [ $? -ne 0 ]; then
        echo "PMD violations found. Fix before committing."
        exit 1
    fi
fi
```

## Interpreting Results

### JSON Output Structure

```json
{
    "violations": [
        {
            "ruleName": "AvoidDmlStatementsInLoops",
            "message": "Avoid DML statements inside loops",
            "severity": 2,
            "category": "Performance",
            "url": "https://pmd.github.io/...",
            "line": 45,
            "column": 9,
            "endLine": 45,
            "endColumn": 30
        }
    ]
}
```

### Triage Priority

1. **Security violations (Severity 1):** Fix immediately. Never suppress.
2. **Performance violations (Severity 2):** Fix before merge. SOQL/DML in loops are blockers.
3. **Design violations (Severity 2):** Fix or document justification. Complexity above threshold needs refactoring.
4. **Style violations (Severity 3):** Fix during normal development. Do not block deployment.

### Suppressing False Positives

Use `@SuppressWarnings` only when the violation is a confirmed false positive and add a comment explaining why.

```apex
@SuppressWarnings('PMD.ApexCRUDViolation') // System context: no user data access
public without sharing class SystemDataService {
    // This class intentionally runs without CRUD checks
    // because it only accesses system configuration records
}
```

**Rules for suppression:**
- Never suppress security rules without a written justification
- Add a comment explaining why the suppression is safe
- Review suppressions during code review
- Track suppressions and revisit periodically

## Metrics to Track

| Metric | Target | Frequency |
|--------|--------|-----------|
| Critical violations | 0 | Every commit |
| High violations | 0 | Every PR |
| Average cyclomatic complexity | < 8 | Weekly |
| Classes over 500 lines | 0 | Weekly |
| Methods over 50 lines | < 5% | Weekly |
| PMD suppression count | Decreasing trend | Monthly |
