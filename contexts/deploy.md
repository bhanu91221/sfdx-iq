# Deployment Mode Context

Active during `/deploy`, `/push`, `/validate`, `/destructive`, and deployment workflows.

## Pre-Deploy Checklist

- [ ] All Apex tests pass locally (`sf apex run test --test-level RunLocalTests`)
- [ ] Code coverage meets threshold (75% minimum, 90%+ target)
- [ ] No CRITICAL or HIGH issues from security scan
- [ ] All metadata components tracked in source control
- [ ] Destructive changes reviewed and approved
- [ ] Profile/permission set changes verified
- [ ] Connected App and Named Credential configs confirmed
- [ ] Release notes or change log updated

## Test Level Decision Matrix

| Target | Scenario | Test Level | Flag |
|--------|----------|------------|------|
| Scratch Org | Development push | NoTestRun | `--test-level NoTestRun` |
| Developer Sandbox | Feature validation | NoTestRun | `--test-level NoTestRun` |
| Developer Pro Sandbox | Integration testing | RunLocalTests | `--test-level RunLocalTests` |
| Partial Sandbox | QA/staging validation | RunLocalTests | `--test-level RunLocalTests` |
| Full Sandbox | Pre-production validation | RunLocalTests | `--test-level RunLocalTests` |
| Production | Standard deployment | RunLocalTests | `--test-level RunLocalTests` |
| Production | Managed package | RunLocalTests | `--test-level RunLocalTests` |
| Production | Specific tests only | RunSpecifiedTests | `--tests TestClass1 --tests TestClass2` |

## Deployment Commands

```bash
# Validate only (dry run) — always do this first
sf project deploy start --target-org myOrg --dry-run --test-level RunLocalTests

# Deploy after successful validation
sf project deploy start --target-org myOrg --test-level RunLocalTests

# Quick Deploy (use validated deployment ID)
sf project deploy quick --job-id <jobId> --target-org myOrg

# Deploy specific metadata
sf project deploy start --source-dir force-app/main/default/classes --target-org myOrg

# Destructive deployment
sf project deploy start --target-org myOrg --post-destructive-changes destructive/destructiveChanges.xml
```

## Rollback Procedures

### Immediate Rollback (within 24 hours)
1. Identify the failed components from deployment status
2. Revert source to previous version: `git revert <commit-sha>`
3. Deploy the reverted source to the target org
4. Verify rollback with smoke tests

### Component-Level Rollback
1. Retrieve the previous version of affected components from source control
2. Deploy only those specific components
3. Run affected test classes to verify

### Data Rollback (if needed)
1. Use Data Loader or sf data commands to restore records
2. Check for cascade effects from triggers and flows
3. Verify data integrity with SOQL queries

## Quick Deploy Workflow

1. **Validate** — Run validation deployment with tests
   ```bash
   sf project deploy start --dry-run --test-level RunLocalTests --target-org prod
   ```
2. **Note Job ID** — Save the deployment job ID from validation
3. **Quick Deploy** — Deploy without re-running tests (within 10 days)
   ```bash
   sf project deploy quick --job-id 0Af... --target-org prod
   ```

## Common Deployment Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Test failure` | Apex test failing in target org | Run tests locally against target; fix test or data dependency |
| `Missing dependency` | Component references missing metadata | Add missing components to deployment package |
| `Cannot modify managed` | Editing managed package component | Create new unmanaged component or contact ISV |
| `Insufficient coverage` | Below 75% org-wide coverage | Add tests for uncovered classes before deploying |
| `Component already exists` | Name collision in target org | Rename component or delete conflicting one in target |
| `Invalid field` | Field referenced but not deployed | Include field metadata in deployment or deploy fields first |
| `Profile/PermSet error` | References to missing components | Deploy referenced components before profiles |

## Agent Delegation

- Complex deployments -> delegate to `deployment-specialist` agent
- Test failures blocking deploy -> delegate to `test-guide` agent
- Security review before production -> delegate to `security-reviewer` agent
- Metadata dependency analysis -> delegate to `metadata-analyst` agent
