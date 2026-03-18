# Metadata Deployment

## Validate Before Deploy

Always validate a deployment before executing it. Validation runs all checks without committing changes.

```bash
# Validate deployment (dry run) - catches errors without affecting the org
sf project deploy start \
  --source-dir force-app \
  --target-org production \
  --dry-run \
  --test-level RunLocalTests

# Check validation result
sf project deploy report --job-id <jobId>
```

Validation catches:
- Compilation errors in Apex classes and triggers
- Missing dependencies (referenced fields, objects, classes)
- Test failures that would block production deployment
- Metadata conflicts with existing org configuration

## Test Levels

Choose the appropriate test level based on the target environment:

| Environment | Test Level | Flag |
|-------------|-----------|------|
| Sandbox (Dev/QA) | No tests | `--test-level NoTestRun` |
| Sandbox (Staging) | Local tests | `--test-level RunLocalTests` |
| Production | Local tests (minimum) | `--test-level RunLocalTests` |
| Production (specific) | Specified tests | `--test-level RunSpecifiedTests --tests MyTest` |

```bash
# Sandbox deployment - skip tests for speed
sf project deploy start \
  --source-dir force-app \
  --target-org dev-sandbox \
  --test-level NoTestRun

# Production deployment - run all local tests
sf project deploy start \
  --source-dir force-app \
  --target-org production \
  --test-level RunLocalTests

# Production deployment - run specific tests only
sf project deploy start \
  --source-dir force-app \
  --target-org production \
  --test-level RunSpecifiedTests \
  --tests AccountTriggerTest ContactServiceTest OpportunityHandlerTest
```

Never use `RunAllTestsInOrg` for routine deployments. It runs managed package tests and can take hours.

## Destructive Changes

Remove metadata from an org using `destructiveChanges.xml`. This is the only way to delete metadata via deployment.

Pre-destructive changes (delete before deploy):

```xml
<!-- destructiveChangesPre.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>OldClass</members>
        <members>DeprecatedHelper</members>
        <name>ApexClass</name>
    </types>
    <types>
        <members>Account.Legacy_Field__c</members>
        <name>CustomField</name>
    </types>
</Package>
```

Post-destructive changes (delete after deploy):

```xml
<!-- destructiveChangesPost.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>ReplacedTrigger</members>
        <name>ApexTrigger</name>
    </types>
</Package>
```

Deploy with destructive changes:

```bash
# Create a manifest directory with package.xml and destructiveChanges
sf project deploy start \
  --manifest manifest/package.xml \
  --post-destructive-changes manifest/destructiveChangesPost.xml \
  --target-org production \
  --test-level RunLocalTests
```

Use pre-destructive for dependencies that must be removed first. Use post-destructive for components replaced by the current deployment.

## Dependency Ordering

Metadata has deployment dependencies. Deploy in this order when doing incremental deployments:

1. Custom Objects and Fields (dependencies for everything else)
2. Apex Classes (referenced by triggers, flows, LWC)
3. Apex Triggers
4. Flows (may reference Apex actions)
5. Lightning Web Components (may reference Apex)
6. Layouts and Record Types
7. Permission Sets and Profiles
8. Applications and Tabs

```bash
# Deploy in stages if full deployment has dependency issues
sf project deploy start --source-dir force-app/main/default/objects
sf project deploy start --source-dir force-app/main/default/classes
sf project deploy start --source-dir force-app/main/default/triggers
sf project deploy start --source-dir force-app/main/default/flows
```

Prefer full-directory deployments over staged ones. The CLI resolves most dependencies automatically when deploying everything at once.

## Quick Deploy After Validation

After a successful validation, use Quick Deploy to deploy without re-running tests. The validated job ID is reusable for up to 10 days.

```bash
# Step 1: Validate (run tests, but don't commit)
sf project deploy start \
  --source-dir force-app \
  --target-org production \
  --dry-run \
  --test-level RunLocalTests

# Step 2: Quick deploy the validated job (no tests re-run)
sf project deploy quick --job-id <validatedJobId> --target-org production
```

Quick Deploy benefits:
- Skips test execution (already passed during validation)
- Deploys in seconds instead of minutes/hours
- Reduces production deployment risk window

## Monitor Deployments

Track deployment progress for long-running jobs:

```bash
# Check deployment status
sf project deploy report --job-id <jobId>

# Cancel a running deployment
sf project deploy cancel --job-id <jobId>

# Resume a failed deployment after fixing issues
sf project deploy resume --job-id <jobId>
```

## Rollback Strategies

Salesforce has no built-in rollback. Plan your rollback before deploying:

1. **Redeploy previous version**: Keep the last-known-good commit tagged in Git and redeploy from it
2. **Destructive + redeploy**: Remove new components with destructiveChanges, then deploy the prior version
3. **Feature flags**: Use Custom Metadata or Custom Settings to toggle features without redeployment

```bash
# Rollback: deploy from previous git tag
git checkout v1.2.3
sf project deploy start \
  --source-dir force-app \
  --target-org production \
  --test-level RunLocalTests
```

Always tag successful production deployments in Git:

```bash
git tag -a v1.3.0 -m "Production deploy 2026-03-15"
git push origin v1.3.0
```
