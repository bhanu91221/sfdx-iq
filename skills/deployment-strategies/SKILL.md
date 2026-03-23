---
name: deployment-strategies
description: Org-based vs package-based development models, sandbox strategies, Quick Deploy, and rollback planning
origin: claude-sfdx-iq
user-invocable: false
tokens: 2380
domain: devops
---

# Deployment Strategies

## Overview

Salesforce deployment strategy determines how metadata moves from development through testing to production. Choosing the right model -- org-based development, unlocked packages, or second-generation managed packages -- depends on team size, release cadence, and ISV requirements. This skill covers each model, sandbox topology, and operational deployment practices.

## Development Models

### Org-Based Development

The traditional model where a sandbox is the source of truth. Developers work in sandboxes and deploy changesets or source to higher environments.

**When to use:**
- Small teams (1-3 developers)
- Simple release cadence (monthly or less)
- No need for modular packaging
- Existing orgs with heavy customization

**Workflow:**
1. Develop in Developer or Developer Pro sandbox
2. Deploy to a QA/integration sandbox for testing
3. Deploy to UAT/staging for business validation
4. Deploy to production with `sf project deploy start`

```bash
# Source deploy to target org
sf project deploy start --source-dir force-app --target-org production --test-level RunLocalTests

# Validate only (does not deploy)
sf project deploy start --source-dir force-app --target-org production --test-level RunLocalTests --dry-run

# Quick Deploy after successful validation
sf project deploy quick --job-id 0Af...
```

### Package-Based Development (Unlocked Packages)

Metadata is organized into packages defined in `sfdx-project.json`. Each package is independently versioned and deployable.

**When to use:**
- Medium to large teams (4+ developers)
- Multiple workstreams or feature teams
- Desire for modular architecture
- Need for dependency management between components

**Advantages:**
- Clear dependency graph
- Independent versioning per module
- Repeatable installs across orgs
- Upgrade and rollback at package level

### Comparison Matrix

| Factor | Org-Based | Unlocked Packages | Managed 2GP |
|--------|-----------|-------------------|-------------|
| Source of truth | Sandbox | VCS + Package | VCS + Package |
| Versioning | Manual | Automatic | Automatic |
| Dependency mgmt | None | Declared | Declared |
| Namespace | None | Optional | Required |
| ISV distribution | No | No | Yes |
| Rollback | Manual | Uninstall version | Uninstall version |
| Team size sweet spot | 1-3 | 4-15 | ISV teams |

## Sandbox Strategy

### Sandbox Topology

```
Production
  |
  +-- Full Copy Sandbox (Staging/Pre-Prod)
  |     - Full data copy, same config as prod
  |     - Final validation before production deploy
  |     - Refresh cycle: quarterly
  |
  +-- Partial Copy Sandbox (UAT)
  |     - Subset of data via sandbox template
  |     - Business user acceptance testing
  |     - Refresh cycle: monthly
  |
  +-- Developer Pro Sandbox (Integration/QA)
  |     - No data, config only
  |     - Integration testing, CI target
  |     - Refresh cycle: daily available
  |
  +-- Developer Sandbox (per developer)
        - No data, config only
        - Individual development
        - Refresh cycle: daily available
```

### Sandbox Selection Guide

| Sandbox Type | Storage | Data | Refresh | Use Case |
|-------------|---------|------|---------|----------|
| Developer | 200 MB | None | 1/day | Individual dev work |
| Developer Pro | 1 GB | None | 1/day | CI builds, integration tests |
| Partial Copy | 5 GB | Template | 5/day | UAT with realistic data |
| Full Copy | Match prod | Full | 29 days | Staging, performance testing |

### Sandbox Seeding

After sandbox refresh or creation, seed reference data:

```bash
# Export data from source org
sf data export tree --query "SELECT Id, Name, Type FROM Account WHERE Type = 'Reference'" --output-dir data/seed --target-org source

# Import into target sandbox
sf data import tree --plan data/seed/Account-plan.json --target-org target-sandbox
```

## Source Deploy Workflow

### Pre-Deployment Checklist

1. **Code quality** -- All PMD rules pass, no critical findings
2. **Test coverage** -- Minimum 75%, target 90%+ on changed classes
3. **Governor limits** -- No SOQL/DML in loops, queries under 100
4. **Security review** -- CRUD/FLS enforced, `with sharing` used
5. **Dependent metadata** -- Custom fields, objects, permissions included
6. **Destructive changes** -- Handled in separate manifest if needed
7. **Data migration** -- Scripts prepared for any schema changes

### Deploy Command Reference

```bash
# Deploy specific directory
sf project deploy start --source-dir force-app --target-org myorg

# Deploy with manifest
sf project deploy start --manifest manifest/package.xml --target-org myorg

# Deploy with specific test classes
sf project deploy start --source-dir force-app --target-org myorg \
  --test-level RunSpecifiedTests \
  --tests AccountServiceTest --tests ContactServiceTest

# Validate without deploying (dry run)
sf project deploy start --source-dir force-app --target-org myorg \
  --test-level RunLocalTests --dry-run

# Quick Deploy (after validation within 10 days)
sf project deploy quick --job-id 0Af1234567890AB --target-org myorg

# Check deploy status
sf project deploy report --job-id 0Af1234567890AB --target-org myorg
```

### Test Level Options

| Level | Description | When to Use |
|-------|-------------|-------------|
| NoTestRun | Skip tests | Sandbox deploys only |
| RunSpecifiedTests | Run named tests | When you know affected tests |
| RunLocalTests | All non-managed tests | Production deploys (standard) |
| RunAllTestsInOrg | All tests including managed | Rare, performance impact |

## Quick Deploy

Quick Deploy allows skipping test execution if a validation-only deployment completed successfully within the last 10 days.

**Requirements:**
- Original validation must have passed all tests
- No metadata changes in the org since validation
- Within 10-day window
- Same source as the original validation

```bash
# Step 1: Validate
sf project deploy start --source-dir force-app --target-org prod \
  --test-level RunLocalTests --dry-run

# Step 2: Note the Job ID from output
# Step 3: Quick deploy (within 10 days)
sf project deploy quick --job-id 0Af1234567890AB --target-org prod
```

## Rollback Planning

### Rollback Strategies

**Strategy 1: Reverse Deployment**
Deploy the previous version of changed components from version control.

```bash
# Checkout previous version
git checkout HEAD~1 -- force-app/main/default/classes/AccountService.cls
git checkout HEAD~1 -- force-app/main/default/classes/AccountService.cls-meta.xml

# Deploy the previous version
sf project deploy start --source-dir force-app --target-org prod --test-level RunLocalTests
```

**Strategy 2: Destructive Changes**
Remove components that were newly added.

```xml
<!-- destructiveChanges.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>NewBrokenClass</members>
        <name>ApexClass</name>
    </types>
    <version>62.0</version>
</Package>
```

```bash
sf project deploy start --manifest manifest/package.xml \
  --post-destructive-changes manifest/destructiveChanges.xml \
  --target-org prod
```

**Strategy 3: Package Version Rollback (Unlocked Packages)**

```bash
# Install previous package version
sf package install --package 04t... --target-org prod --wait 20
```

### Rollback Decision Matrix

| Change Type | Rollback Method | Risk |
|------------|-----------------|------|
| Apex class modification | Reverse deploy from VCS | Low |
| New Apex class | Destructive change | Low |
| Field addition | Cannot easily remove if data exists | High |
| Field deletion | Cannot undo | Critical -- never delete without backup |
| Workflow/Flow change | Reverse deploy | Medium |
| Profile/Permission changes | Reverse deploy | Medium |
| Custom object deletion | Cannot undo | Critical |

## Post-Deployment Steps

1. **Smoke test** -- Verify critical business processes manually
2. **Monitor logs** -- Check debug logs for unexpected errors
3. **Monitor limits** -- Review System Overview for limit consumption
4. **Verify integrations** -- Confirm external systems still connect
5. **Notify stakeholders** -- Communicate deployment completion
6. **Update documentation** -- Record what was deployed and any known issues
7. **Tag release** -- Create a git tag for the deployed commit

```bash
# Tag the release
git tag -a v1.2.0 -m "Production release 2026-03-16"
git push origin v1.2.0
```

## Anti-Patterns to Avoid

1. **Deploying without validation** -- Always validate (dry-run) before production deploys
2. **Skipping test execution** -- Never use `NoTestRun` for production
3. **No rollback plan** -- Always have a documented rollback strategy before deploying
4. **Manual metadata changes in production** -- All changes should flow through the deployment pipeline
5. **Deploying destructive changes with data loss** -- Always verify field usage before deleting fields or objects
6. **Ignoring dependent metadata** -- Ensure all dependencies are included in the deployment package
