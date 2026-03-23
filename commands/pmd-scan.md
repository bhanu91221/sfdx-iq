---
description: Run PMD static analysis on Apex code
---

# /pmd-scan

Run PMD static analysis (via Salesforce Code Analyzer) on Apex classes and triggers to detect code quality issues.

## Workflow

1. **Check tool availability**
   - Verify Salesforce Code Analyzer is installed: `sf scanner --version`
   - If not installed, guide user: `sf plugins install @salesforce/sfdx-scanner`
   - Fall back to regex-based analysis if scanner is unavailable

2. **Determine scan scope**
   - Default: all `.cls` and `.trigger` files in the project
   - If `--file` specified, scan only that file
   - If `--changed-only`, scan only files changed in git: `git diff --name-only --diff-filter=ACM HEAD`

3. **Run the scanner**
   ```bash
   sf scanner run \
     --target "force-app/**/*.cls,force-app/**/*.trigger" \
     --engine pmd \
     --format json \
     --severity-threshold 3
   ```

4. **Parse and categorize results**
   Map PMD severity to action level:

   | PMD Severity | Level | Action |
   |-------------|-------|--------|
   | 1 (Blocker) | 🔴 CRITICAL | Must fix before commit |
   | 2 (Critical) | 🟠 HIGH | Must fix before PR |
   | 3 (Major) | 🟡 MEDIUM | Should fix |
   | 4 (Minor) | 🔵 LOW | Nice to have |
   | 5 (Info) | ⚪ INFO | Informational |

5. **Report findings**
   Group by file, then severity:
   ```
   AccountService.cls:
     🔴 Line 42: Avoid SOQL queries inside loops (ApexCRUDViolation)
     🟡 Line 15: Method 'processRecords' has cyclomatic complexity of 12 (CyclomaticComplexity)
   ```

6. **Suggest fixes**
   For each finding, provide a concrete fix suggestion based on the rule violated.

## Common PMD Rules for Apex

| Rule | What It Catches |
|------|----------------|
| `ApexCRUDViolation` | Missing CRUD/FLS checks |
| `AvoidSoqlInLoops` | SOQL inside for loops |
| `AvoidDmlStatementsInLoops` | DML inside for loops |
| `CyclomaticComplexity` | Methods too complex (>10 paths) |
| `ApexUnitTestClassShouldHaveAsserts` | Test methods without assertions |
| `ApexUnitTestShouldNotUseSeeAllDataTrue` | Tests using SeeAllData=true |
| `AvoidHardcodingId` | Hardcoded Salesforce record IDs |

## Flags

| Flag | Description |
|------|-------------|
| `--file` | Scan specific file only |
| `--changed-only` | Scan only git-changed files |
| `--severity` | Minimum severity (1-5, default: 3) |
| `--ruleset` | Custom PMD ruleset XML file path |

## Example

```
/pmd-scan
/pmd-scan --file force-app/main/default/classes/AccountService.cls
/pmd-scan --changed-only --severity 2
```
