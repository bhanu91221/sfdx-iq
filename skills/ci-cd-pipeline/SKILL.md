---
name: ci-cd-pipeline
description: GitHub Actions workflows for SFDX, JWT auth, scratch org CI, test execution, code coverage gates, and artifact management
origin: claude-sfdx-iq
---

# CI/CD Pipeline for Salesforce DX

## Overview

A robust CI/CD pipeline for Salesforce automates validation, testing, and deployment across environments. This skill covers GitHub Actions workflows, JWT-based authentication for headless CI, scratch org creation in pipelines, test execution strategies, code coverage gates, and artifact management.

## JWT Authentication for CI

### Setup Steps

1. Generate a private key and self-signed certificate:

```bash
openssl genrsa -out server.key 2048
openssl req -new -x509 -key server.key -out server.crt -days 730 -subj "/CN=CI"
```

1. Create a Connected App in Salesforce:
   - Enable OAuth Settings
   - Upload `server.crt` as the digital certificate
   - Set OAuth scopes: `api`, `refresh_token`, `web`
   - Pre-authorize for the CI user profile

1. Store secrets in GitHub:
   - `SALESFORCE_JWT_KEY` -- contents of `server.key`
   - `SALESFORCE_CONSUMER_KEY` -- Connected App consumer key
   - `SALESFORCE_USERNAME` -- CI user username
   - `SALESFORCE_DEVHUB_USERNAME` -- Dev Hub admin username

### JWT Login Command

```bash
sf org login jwt \
  --client-id $SALESFORCE_CONSUMER_KEY \
  --jwt-key-file server.key \
  --username $SALESFORCE_USERNAME \
  --alias ci-org \
  --instance-url https://login.salesforce.com
```

## GitHub Actions Workflows

### Pull Request Validation

```yaml
# .github/workflows/validate-pr.yml
name: Validate Pull Request

on:
  pull_request:
    branches: [main, develop]
    paths:
      - 'force-app/**'
      - 'config/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Authenticate Dev Hub
        env:
          JWT_KEY: ${{ secrets.SALESFORCE_JWT_KEY }}
          CONSUMER_KEY: ${{ secrets.SALESFORCE_CONSUMER_KEY }}
          DEVHUB_USERNAME: ${{ secrets.SALESFORCE_DEVHUB_USERNAME }}
        run: |
          echo "$JWT_KEY" > server.key
          sf org login jwt \
            --client-id $CONSUMER_KEY \
            --jwt-key-file server.key \
            --username $DEVHUB_USERNAME \
            --alias devhub \
            --set-default-dev-hub

      - name: Create Scratch Org
        run: |
          sf org create scratch \
            --definition-file config/project-scratch-def.json \
            --alias ci-scratch \
            --duration-days 1 \
            --set-default \
            --wait 10

      - name: Push Source
        run: sf project deploy start --target-org ci-scratch

      - name: Run Apex Tests
        run: |
          sf apex run test \
            --target-org ci-scratch \
            --test-level RunLocalTests \
            --code-coverage \
            --result-format json \
            --output-dir test-results \
            --wait 20

      - name: Check Code Coverage
        run: |
          node scripts/ci/check-coverage.js test-results

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: apex-test-results
          path: test-results/

      - name: Delete Scratch Org
        if: always()
        run: sf org delete scratch --target-org ci-scratch --no-prompt
```

### Deploy to Sandbox

```yaml
# .github/workflows/deploy-sandbox.yml
name: Deploy to Sandbox

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: sandbox
    steps:
      - uses: actions/checkout@v4

      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Authenticate Sandbox
        env:
          JWT_KEY: ${{ secrets.SALESFORCE_JWT_KEY }}
          CONSUMER_KEY: ${{ secrets.SALESFORCE_CONSUMER_KEY }}
          SANDBOX_USERNAME: ${{ secrets.SALESFORCE_SANDBOX_USERNAME }}
        run: |
          echo "$JWT_KEY" > server.key
          sf org login jwt \
            --client-id $CONSUMER_KEY \
            --jwt-key-file server.key \
            --username $SANDBOX_USERNAME \
            --alias sandbox \
            --instance-url https://test.salesforce.com

      - name: Deploy Source
        run: |
          sf project deploy start \
            --source-dir force-app \
            --target-org sandbox \
            --test-level RunLocalTests \
            --wait 30

      - name: Run Smoke Tests
        run: |
          sf apex run test \
            --target-org sandbox \
            --suite-names SmokeTests \
            --wait 15
```

### Deploy to Production

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  release:
    types: [published]

jobs:
  validate:
    runs-on: ubuntu-latest
    environment: production
    outputs:
      deploy-id: ${{ steps.validate.outputs.id }}
    steps:
      - uses: actions/checkout@v4

      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Authenticate Production
        env:
          JWT_KEY: ${{ secrets.SALESFORCE_JWT_KEY }}
          CONSUMER_KEY: ${{ secrets.SALESFORCE_CONSUMER_KEY }}
          PROD_USERNAME: ${{ secrets.SALESFORCE_PROD_USERNAME }}
        run: |
          echo "$JWT_KEY" > server.key
          sf org login jwt \
            --client-id $CONSUMER_KEY \
            --jwt-key-file server.key \
            --username $PROD_USERNAME \
            --alias production

      - name: Validate Deployment
        id: validate
        run: |
          sf project deploy start \
            --source-dir force-app \
            --target-org production \
            --test-level RunLocalTests \
            --dry-run \
            --wait 60 \
            --json > validate-result.json
          echo "id=$(jq -r '.result.id' validate-result.json)" >> $GITHUB_OUTPUT

  deploy:
    needs: validate
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Authenticate Production
        env:
          JWT_KEY: ${{ secrets.SALESFORCE_JWT_KEY }}
          CONSUMER_KEY: ${{ secrets.SALESFORCE_CONSUMER_KEY }}
          PROD_USERNAME: ${{ secrets.SALESFORCE_PROD_USERNAME }}
        run: |
          echo "$JWT_KEY" > server.key
          sf org login jwt \
            --client-id $CONSUMER_KEY \
            --jwt-key-file server.key \
            --username $PROD_USERNAME \
            --alias production

      - name: Quick Deploy
        run: |
          sf project deploy quick \
            --job-id ${{ needs.validate.outputs.deploy-id }} \
            --target-org production
```

## SFDX Scanner in Pipeline

```yaml
      - name: Install SFDX Scanner
        run: sf plugins install @salesforce/sfdx-scanner

      - name: Run PMD Analysis
        run: |
          sf scanner run \
            --target force-app \
            --format json \
            --outfile scanner-results.json \
            --severity-threshold 2 \
            --pmdconfig config/pmd-ruleset.xml

      - name: Run Security Scan
        run: |
          sf scanner run \
            --target force-app \
            --format json \
            --outfile security-results.json \
            --category Security
```

## Code Coverage Gates

### Coverage Check Script

```javascript
// scripts/ci/check-coverage.js
const fs = require('fs');
const path = require('path');

const MINIMUM_COVERAGE = 75;
const TARGET_COVERAGE = 90;

const resultsDir = process.argv[2] || 'test-results';
const coverageFile = path.join(resultsDir, 'test-result-codecoverage.json');

if (!fs.existsSync(coverageFile)) {
    console.error('Coverage file not found:', coverageFile);
    process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
let totalLines = 0;
let coveredLines = 0;
const failures = [];

for (const cls of coverage) {
    const classLines = cls.numLocations || 0;
    const classCovered = cls.numLocationsCovered || 0;
    totalLines += classLines;
    coveredLines += classCovered;

    if (classLines > 0) {
        const pct = Math.round((classCovered / classLines) * 100);
        if (pct < MINIMUM_COVERAGE) {
            failures.push({ name: cls.name, coverage: pct });
        }
    }
}

const orgCoverage = totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0;

console.log(`\nOrg-wide coverage: ${orgCoverage}%`);
console.log(`Minimum required: ${MINIMUM_COVERAGE}%`);
console.log(`Target: ${TARGET_COVERAGE}%\n`);

if (failures.length > 0) {
    console.error('Classes below minimum coverage:');
    failures.forEach(f => console.error(`  ${f.name}: ${f.coverage}%`));
}

if (orgCoverage < MINIMUM_COVERAGE) {
    console.error(`\nFAILED: Org coverage ${orgCoverage}% is below minimum ${MINIMUM_COVERAGE}%`);
    process.exit(1);
}

if (orgCoverage < TARGET_COVERAGE) {
    console.warn(`\nWARNING: Org coverage ${orgCoverage}% is below target ${TARGET_COVERAGE}%`);
}

console.log('\nCoverage check PASSED');
```

## Parallel Test Execution

```yaml
      - name: Run Tests in Parallel
        run: |
          sf apex run test \
            --target-org ci-scratch \
            --test-level RunLocalTests \
            --synchronous false \
            --code-coverage \
            --result-format json \
            --output-dir test-results \
            --wait 30
```

### Splitting Tests Across Jobs

```yaml
jobs:
  test-unit:
    runs-on: ubuntu-latest
    steps:
      - name: Run Unit Tests
        run: |
          sf apex run test --target-org ci-scratch \
            --suite-names UnitTests --wait 20

  test-integration:
    runs-on: ubuntu-latest
    steps:
      - name: Run Integration Tests
        run: |
          sf apex run test --target-org ci-scratch \
            --suite-names IntegrationTests --wait 30

  coverage-gate:
    needs: [test-unit, test-integration]
    runs-on: ubuntu-latest
    steps:
      - name: Aggregate Coverage
        run: node scripts/ci/aggregate-coverage.js
```

## Artifact Management

```yaml
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-${{ github.sha }}
          path: test-results/
          retention-days: 30

      - name: Upload Scanner Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: scanner-results-${{ github.sha }}
          path: scanner-results.json
          retention-days: 30

      - name: Upload Deploy Logs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: deploy-logs-${{ github.sha }}
          path: deploy-result.json
          retention-days: 7
```

## Pipeline Decision Matrix

| Event | Action | Test Level | Environment |
|-------|--------|------------|-------------|
| PR opened/updated | Scratch org validation | RunLocalTests | Scratch org |
| Push to develop | Deploy to sandbox | RunLocalTests | Dev sandbox |
| Push to release/* | Deploy to UAT | RunLocalTests | UAT sandbox |
| Release published | Validate + Quick Deploy | RunLocalTests | Production |
| Nightly schedule | Full regression | RunAllTestsInOrg | Full sandbox |

## Anti-Patterns to Avoid

1. **Storing credentials in code** -- Always use GitHub Secrets or a vault solution
2. **Skipping test execution in CI** -- Always run tests; CI is the safety net
3. **No scratch org cleanup** -- Always delete scratch orgs in a `finally` or `if: always()` block
4. **Single monolithic pipeline** -- Split into validate, test, deploy stages with proper gates
5. **No artifact retention** -- Store test results and deploy logs for debugging failures
6. **Hardcoded usernames** -- Use secrets and environment variables for all credentials
7. **No environment protection rules** -- Use GitHub environment protection for production deployments
