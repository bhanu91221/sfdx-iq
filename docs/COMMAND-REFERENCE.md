# Command Reference

All commands are invoked as slash commands within Claude Code (e.g., `/deploy`).

## Deploy and Retrieve

| Command | Description | Key Flags | Example |
|---------|-------------|-----------|---------|
| `/deploy` | Deploy source to target org with validation and tests | `--dry-run`, `--test-level`, `--wait`, `--target-org` | `/deploy --dry-run` |
| `/destructive-deploy` | Deploy with destructive changes (delete components) | `--manifest`, `--target-org`, `--dry-run` | `/destructive-deploy --manifest destructiveChanges.xml` |
| `/retrieve` | Retrieve metadata from an org to local source | `--target-org`, `--metadata`, `--package-name` | `/retrieve --metadata ApexClass` |
| `/validate` | Validate deployment without persisting changes | `--test-level`, `--target-org` | `/validate --test-level RunLocalTests` |

## Code Review

| Command | Description | Key Flags | Example |
|---------|-------------|-----------|---------|
| `/apex-review` | Apex code quality review using apex-reviewer agent | `--file`, `--severity` | `/apex-review --file AccountService.cls` |
| `/code-review` | General code review across all file types | `--file`, `--scope` | `/code-review` |
| `/lwc-review` | LWC component review for patterns and performance | `--component` | `/lwc-review --component accountSearch` |
| `/flow-review` | Flow design review for best practices | `--flow` | `/flow-review --flow Account_Automation` |
| `/soql-review` | SOQL query optimization and selectivity analysis | `--query` | `/soql-review --query "SELECT Id FROM Account"` |

## Testing

| Command | Description | Key Flags | Example |
|---------|-------------|-----------|---------|
| `/test` | Run Apex tests with coverage analysis | `--class`, `--suite`, `--coverage-target` | `/test --class AccountServiceTest` |
| `/lwc-test` | Run LWC Jest tests | `--component`, `--watch` | `/lwc-test --component accountSearch` |
| `/tdd` | Test-driven development workflow (Apex + LWC) | `--type`, `--name` | `/tdd --type apex --name AccountService` |
| `/test-data` | Generate test data factory for an sObject | `--sobject` | `/test-data --sobject Account` |

## Scaffolding

| Command | Description | Key Flags | Example |
|---------|-------------|-----------|---------|
| `/scaffold-trigger` | Generate trigger + handler boilerplate | `--sobject`, `--events` | `/scaffold-trigger --sobject Account` |
| `/scaffold-lwc` | Generate LWC component boilerplate | `--name`, `--targets` | `/scaffold-lwc --name accountSearch` |
| `/scaffold-apex` | Generate Apex class boilerplate | `--name`, `--type` | `/scaffold-apex --name AccountService --type service` |
| `/scaffold-batch` | Generate batch/schedulable class | `--name`, `--sobject` | `/scaffold-batch --name DataCleanupBatch` |
| `/scaffold-integration` | Generate callout class with Named Credential | `--name`, `--method` | `/scaffold-integration --name ExternalService` |
| `/scaffold-flow` | Generate flow metadata skeleton | `--name`, `--type` | `/scaffold-flow --name Account_Automation` |

## Analysis

| Command | Description | Key Flags | Example |
|---------|-------------|-----------|---------|
| `/governor-check` | Governor limit risk analysis | `--file`, `--threshold` | `/governor-check --file AccountTriggerHandler.cls` |
| `/security-scan` | CRUD/FLS, sharing, and injection scan | `--file`, `--scope` | `/security-scan --scope project` |
| `/metadata-analyze` | Analyze metadata dependencies and complexity | `--type` | `/metadata-analyze --type CustomObject` |
| `/data-model` | Analyze object relationships and field usage | `--sobject` | `/data-model --sobject Account` |
| `/org-health` | Org-wide health check (limits, technical debt) | `--target-org` | `/org-health` |

## Utilities

| Command | Description | Key Flags | Example |
|---------|-------------|-----------|---------|
| `/scratch-org` | Create and configure a scratch org | `--alias`, `--duration`, `--definition` | `/scratch-org --alias dev1` |
| `/package` | Package version creation and management | `--action`, `--name` | `/package --action create --name MyPackage` |
| `/explain-error` | Explain a Salesforce error message | `--error` | `/explain-error --error "FIELD_CUSTOM_VALIDATION_EXCEPTION"` |
| `/sf-help` | General Salesforce CLI help and guidance | `--topic` | `/sf-help --topic deployment` |

## Cross-References

Commands delegate to specialized agents for execution:

| Command | Primary Agent |
|---------|--------------|
| `/deploy` | deployment-specialist |
| `/apex-review` | apex-reviewer |
| `/test` | test-guide |
| `/governor-check` | governor-limits-checker |
| `/security-scan` | security-reviewer |
| `/lwc-review` | lwc-reviewer |
| `/soql-review` | soql-optimizer |
| `/flow-review` | flow-analyst |
| `/data-model` | data-modeler |
| `/metadata-analyze` | metadata-analyst |
| `/org-health` | admin-advisor |
| `/scaffold-integration` | integration-specialist |
