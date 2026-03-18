# Claude SFDX IQ: The Complete Guide

## What Is This Plugin?

**claude-sfdx-iq** is a Claude Code plugin that transforms Claude into an expert Salesforce developer, architect, and admin — all at once. It's a curated knowledge base of **252 files** containing Salesforce best practices, patterns, anti-patterns, and automated workflows, packaged as agents, skills, commands, rules, and hooks that Claude loads and follows automatically.

Think of it as hiring 14 Salesforce specialists who:
- Review every line of Apex you write for governor limits, security, and bulkification
- Scaffold production-ready triggers, LWC components, batch jobs, and integrations in seconds
- Deploy, test, and validate your code with a single command
- Catch SOQL injection, missing CRUD/FLS, and `without sharing` before it reaches production
- Follow TDD workflows, generate test data factories, and aim for 90%+ coverage

**Without the plugin**, Claude knows Salesforce in general terms. **With the plugin**, Claude knows the exact patterns, limits, and pitfalls that distinguish junior Salesforce code from senior-level architecture.

---

## How It Improves Salesforce Development

### 1. Governor-Limits-First Thinking

Every piece of code Claude writes is evaluated against Salesforce governor limits. The plugin embeds a complete limits reference database and automated scanning.

**Before the plugin:**
```apex
// Claude might write this — looks fine, breaks at scale
for (Account acc : accounts) {
    List<Contact> contacts = [SELECT Id FROM Contact WHERE AccountId = :acc.Id];
    acc.Contact_Count__c = contacts.size();
    update acc;
}
```

**With the plugin:**
```apex
// Claude writes bulkified code from the start
Map<Id, Integer> contactCounts = new Map<Id, Integer>();
for (AggregateResult ar : [
    SELECT AccountId, COUNT(Id) cnt
    FROM Contact
    WHERE AccountId IN :accounts
    GROUP BY AccountId
]) {
    contactCounts.put((Id)ar.get('AccountId'), (Integer)ar.get('cnt'));
}

List<Account> toUpdate = new List<Account>();
for (Account acc : accounts) {
    acc.Contact_Count__c = contactCounts.containsKey(acc.Id)
        ? contactCounts.get(acc.Id) : 0;
    toUpdate.add(acc);
}
update toUpdate; // Single DML outside the loop
```

### 2. Security by Default

The plugin enforces `with sharing`, CRUD/FLS checks, and SOQL injection prevention automatically.

**Before:** Claude might use `without sharing` or forget `WITH SECURITY_ENFORCED`.
**With the plugin:** Every class gets `with sharing` unless you explicitly justify otherwise. Every SOQL query uses bind variables. Every field access respects FLS.

### 3. 10x Faster Scaffolding

Instead of writing boilerplate from scratch, get production-ready code in seconds:

```
You: /scaffold-trigger Account

Claude generates:
  - AccountTrigger.trigger (pure delegation, no logic)
  - AccountTriggerHandler.cls (with sharing, recursion prevention, all contexts)
  - AccountTriggerHandlerTest.cls (200-record bulk tests, all scenarios)
```

### 4. Automated Quality Gates

Every file save triggers background checks:
- **Apex files (.cls)** → PMD scan + governor limit check + security scan
- **Triggers (.trigger)** → Logic-in-trigger detection + handler pattern enforcement
- **LWC files (.js)** → innerHTML check + disconnectedCallback audit
- **SOQL in Apex** → Missing LIMIT, string concatenation, N+1 pattern detection
- **Flows (.flow-meta.xml)** → DML in loops, missing fault paths

---

## Getting Started

### Installation

```bash
# Clone the plugin
git clone https://github.com/bhanu91221/claude-sfdx-iq.git
cd claude-sfdx-iq
npm install

# Copy the example CLAUDE.md into your SFDX project
cp examples/CLAUDE.md /path/to/your/sfdx-project/CLAUDE.md
```

### First Steps After Installation

1. **Check your environment:**
   ```
   npx csiq doctor
   ```
   This verifies Node.js, Salesforce CLI, Git, and your org connection.

2. **See what's installed:**
   ```
   npx csiq status
   ```

3. **Try a command:**
   Open your SFDX project and type `/apex-review` to review your Apex code.

---

## The 42 Commands — Complete Reference

### Deployment & Retrieval

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `/deploy` | Deploy source with validation + automatic test level | Ready to push changes to an org |
| `/push` | Push source to scratch org | Daily scratch org development |
| `/validate` | Check-only deployment (no changes) | Pre-deploy sanity check |
| `/retrieve` | Retrieve metadata from org | Pull changes made in the org UI |
| `/destructive` | Generate destructiveChanges.xml | Removing metadata from target org |
| `/destructive-deploy` | Deploy destructive changes safely | Executing metadata removal |

**Example workflow:**
```
You: /validate
Claude: Running check-only deployment against my-sandbox...
        ✅ 47 components validated successfully
        Test level: RunLocalTests (23 tests, 94% coverage)
        Ready to deploy.

You: /deploy
Claude: Deploying to my-sandbox with RunLocalTests...
        ✅ Deploy succeeded. 47 components. 23 tests passed. 94.2% coverage.
```

### Code Review & Quality

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `/apex-review` | Apex quality review (bulkification, naming, patterns) | After writing Apex code |
| `/lwc-review` | LWC component review (decorators, events, a11y) | After writing LWC components |
| `/soql-review` | SOQL optimization analysis | Tuning query performance |
| `/soql-check` | Quick SOQL anti-pattern scan | Fast check during development |
| `/security-scan` | CRUD/FLS/sharing/injection scan | Before any deployment |
| `/governor-check` | Governor limit risk analysis | Complex transaction analysis |
| `/flow-review` | Flow best practices check | After building flows |
| `/pmd-scan` | PMD static analysis | CI pipeline integration |
| `/code-review` | Full review (all domains in parallel) | Comprehensive pre-PR review |
| `/org-health` | Org health assessment | Quarterly org checkup |

**Example — catching a security issue:**
```
You: /security-scan

Claude: 🔴 CRITICAL: AccountService.cls:42 — Dynamic SOQL without bind variables
        String query = 'SELECT Id FROM Account WHERE Name = \'' + userInput + '\'';

        FIX: Use bind variables:
        String query = 'SELECT Id FROM Account WHERE Name = :userInput';

   🟡 HIGH: OpportunityHelper.cls:1 — Class uses `without sharing` without justification

        FIX: Add `with sharing` or document why `without sharing` is required:
        // without sharing: Required for background data cleanup that runs as system
```

### Testing

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `/test` | Run Apex tests with coverage analysis | After any code change |
| `/tdd` | Start TDD workflow (Red-Green-Refactor) | Building new features |
| `/lwc-test` | Run LWC Jest tests | After LWC changes |
| `/test-data` | Generate TestDataFactory class | Setting up test infrastructure |
| `/integration-test` | Run integration tests against org | Pre-deployment validation |

**Example — TDD workflow:**
```
You: /tdd I need a service method that returns active accounts with more than 5 opportunities

Claude: Starting TDD cycle...

        STEP 1 — RED: Writing failing test first:

        @isTest
        static void testGetHighValueActiveAccounts_ReturnsMatchingAccounts() {
            // Arrange: Create 3 active accounts, 2 with >5 opps, 1 with <5
            // Act: Call the service method
            // Assert: Only 2 accounts returned

            List<Account> result = AccountService.getHighValueActiveAccounts();
            System.assertEquals(2, result.size(), 'Should return only accounts with >5 opportunities');
        }

        Running test... ❌ FAIL (AccountService doesn't exist yet — this is expected!)

        STEP 2 — GREEN: Writing minimum implementation...
        [writes AccountService.cls with getHighValueActiveAccounts()]

        Running test... ✅ PASS

        STEP 3 — REFACTOR: Improving code quality...
        [extracts SOQL to Selector, adds LIMIT, adds WITH SECURITY_ENFORCED]
```

### Scaffolding

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `/scaffold-trigger` | Generate trigger + handler + test | New trigger requirement |
| `/scaffold-lwc` | Generate LWC component (JS/HTML/CSS/meta/test) | New UI component |
| `/scaffold-apex` | Generate Apex class + test (any type) | New Apex class |
| `/scaffold-apex-class` | Generate specific class type (Service/Selector/etc.) | Specific pattern needed |
| `/scaffold-batch` | Generate Batch + Scheduler + test | Data processing job |
| `/scaffold-integration` | Generate callout + mock + test | External API integration |
| `/scaffold-flow` | Generate Flow design document | New automation |

**Example — scaffold a complete integration:**
```
You: /scaffold-integration REST callout to Payment Gateway API at https://api.payments.com/v2

Claude generates 4 files:
  1. PaymentGatewayService.cls
     - Named Credential reference (no hardcoded URLs)
     - Retry logic (3 attempts with exponential backoff)
     - Response wrapper class
     - Error handling with custom exception

  2. PaymentGatewayServiceTest.cls
     - HttpCalloutMock for success (200)
     - HttpCalloutMock for error (500)
     - HttpCalloutMock for timeout
     - Retry verification

  3. PaymentGatewayMock.cls
     - Configurable mock implementation
     - Supports multiple response scenarios

  4. PaymentGateway (Named Credential setup instructions)
```

### Planning & Architecture

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `/plan` | Implementation plan for a feature | Starting new feature work |
| `/data-model` | Design or analyze data model | Object/relationship design |
| `/metadata-analyze` | Analyze metadata dependencies | Before refactoring |
| `/metadata-diff` | Compare metadata between orgs | Tracking org drift |

### Utility

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `/debug-log` | Retrieve and analyze debug logs | Troubleshooting issues |
| `/build-fix` | Fix deployment/compilation errors | Broken build |
| `/explain-error` | Explain Salesforce error messages | Unfamiliar error |
| `/sf-help` | Salesforce CLI command reference | Need CLI syntax |
| `/apex-doc` | Generate ApexDoc documentation | Documentation sprint |
| `/create-scratch-org` | Create and configure scratch org | Starting fresh dev |
| `/scratch-org` | Scratch org quick setup | Quick org spin-up |
| `/package` | Manage 2GP packages | Package development |
| `/package-version` | Create package version | ISV workflow |
| `/data-seed` | Load test/sample data | Populate org with data |

---

## The 14 Agents — Your Virtual Salesforce Team

Each agent is a specialist that Claude delegates to automatically. You rarely call agents directly — commands route to them.

### Architecture & Planning

| Agent | Specialty | Model | Invoked By |
|-------|-----------|-------|------------|
| **planner** | Implementation plans spanning Apex/LWC/metadata | opus | `/plan` |
| **architect** | Solution architecture, data model, integration, scalability | opus | `/plan`, `/data-model` |
| **data-modeler** | Object model, relationships, external IDs, polymorphic lookups | opus | `/data-model` |

### Code Review

| Agent | Specialty | Model | Invoked By |
|-------|-----------|-------|------------|
| **apex-reviewer** | Bulkification, naming, patterns, method size | sonnet | `/apex-review`, `/code-review` |
| **lwc-reviewer** | Composition, wire usage, accessibility, CSS | sonnet | `/lwc-review`, `/code-review` |
| **soql-optimizer** | Selectivity, indexes, N+1, relationship depth | sonnet | `/soql-review`, `/soql-check` |
| **security-reviewer** | CRUD/FLS, sharing, injection, CSP | sonnet | `/security-scan`, `/code-review` |
| **governor-limits-checker** | DML/SOQL in loops, CPU, heap | sonnet | `/governor-check`, `/code-review` |
| **flow-analyst** | Flow XML analysis, DML in loops, fault paths | sonnet | `/flow-review` |

### DevOps & Admin

| Agent | Specialty | Model | Invoked By |
|-------|-----------|-------|------------|
| **deployment-specialist** | Deploy, package versions, destructive changes | sonnet | `/deploy`, `/validate`, `/package` |
| **test-guide** | TDD for Apex (90%+ coverage) and LWC Jest | sonnet | `/tdd`, `/test` |
| **integration-specialist** | REST/SOAP callouts, platform events, CDC | sonnet | `/scaffold-integration` |
| **metadata-analyst** | Metadata dependencies, unused components | sonnet | `/metadata-analyze`, `/org-health` |
| **admin-advisor** | Permission sets, sharing rules, validation rules | sonnet | `/org-health`, `/data-model` |

### How Agent Delegation Works

When you run `/code-review`, Claude orchestrates multiple agents in parallel:

```
/code-review
    ├── apex-reviewer       → Checks Apex quality
    ├── lwc-reviewer        → Checks LWC quality
    ├── soql-optimizer      → Checks SOQL efficiency
    ├── security-reviewer   → Checks security
    └── governor-limits-checker → Checks governor risks

All findings are merged into a single report, sorted by severity:
  🔴 CRITICAL (must fix before deploy)
  🟡 HIGH (should fix before PR)
  🔵 MEDIUM (improve when possible)
  ⚪ LOW (nice to have)
```

---

## The 36 Skills — Domain Knowledge

Skills are knowledge modules that Claude loads contextually. You don't invoke them directly — they activate based on what you're working on.

### Apex Skills (7)

| Skill | What Claude Knows |
|-------|-------------------|
| `apex-patterns` | Service/Selector/Domain layers, factory pattern, strategy pattern |
| `apex-coding-standards` | PascalCase, camelCase, ApexDoc, method size limits, PMD rules |
| `apex-async-patterns` | @future vs Queueable vs Batch vs Schedulable decision matrix |
| `apex-testing` | @TestSetup, TestDataFactory, System.assert, mock patterns, 90%+ target |
| `apex-enterprise-patterns` | fflib: Application.cls, UnitOfWork, Selector base, Domain base |
| `error-handling` | Custom exceptions, Database.SaveResult, addError(), logging |
| `logging-framework` | Log__c design, Platform Event logging, log levels, retention |

### LWC Skills (4)

| Skill | What Claude Knows |
|-------|-------------------|
| `lwc-patterns` | @wire vs imperative, @api properties, CustomEvent, LMS, NavigationMixin |
| `lwc-testing` | Jest setup, wire mocks, shadowRoot queries, flushPromises, event testing |
| `lwc-performance` | Wire caching, lazy loading, debounce, virtual scroll, lwc:if optimization |
| `aura-patterns` | Aura structure, events, Aura-to-LWC interop, migration path |

### Query Skills (2)

| Skill | What Claude Knows |
|-------|-------------------|
| `soql-optimization` | Query plan tool, selective filters, indexed fields, skinny tables |
| `sosl-patterns` | FIND syntax, search groups, RETURNING clause, SOSL vs SOQL decision |

### Architecture Skills (3)

| Skill | What Claude Knows |
|-------|-------------------|
| `trigger-framework` | TriggerHandler base class, one-trigger-per-object, recursion prevention |
| `governor-limits` | Complete limits table, Limits class methods, async offloading strategies |
| `data-modeling` | Master-Detail vs Lookup, junction objects, external IDs, data skew prevention |

### Integration Skills (4)

| Skill | What Claude Knows |
|-------|-------------------|
| `integration-patterns` | Named Credentials, REST/SOAP callouts, retry, circuit breaker |
| `rest-api-patterns` | @RestResource, Composite API, Bulk API 2.0, sObject Collections |
| `platform-events` | Event__e, EventBus.publish(), Pub-Sub API, replay ID, subscriber patterns |
| `change-data-capture` | ChangeEvent trigger, ChangeEventHeader, gap detection, replay |

### Declarative Skills (4)

| Skill | What Claude Knows |
|-------|-------------------|
| `flow-best-practices` | Before vs after save, fault paths, naming, $Record__Prior |
| `flow-to-code` | When to convert flows to Apex, Invocable methods, hybrid approach |
| `metadata-management` | Metadata API types, source format, package.xml, destructive changes |
| `permission-model` | Permission Sets over Profiles, OWD, sharing rules, Apex managed sharing |

### DevOps Skills (5)

| Skill | What Claude Knows |
|-------|-------------------|
| `deployment-strategies` | Org-based vs package-based, sandbox strategy, Quick Deploy, rollback |
| `packaging-2gp` | 2GP packages, ancestry, dependencies, beta vs released, namespace |
| `scratch-org-management` | project-scratch-def.json, org shapes, data seeding, org pooling |
| `ci-cd-pipeline` | GitHub Actions for SFDX, JWT auth, parallel tests, code coverage gates |
| `salesforce-dx-project` | sfdx-project.json, source tracking, .forceignore, sf CLI commands |

### Security Skills (2)

| Skill | What Claude Knows |
|-------|-------------------|
| `security-patterns` | WITH SECURITY_ENFORCED vs USER_MODE vs stripInaccessible(), sharing hierarchy |
| `shield-encryption` | Platform Encryption, deterministic vs probabilistic, Crypto class |

### Quality Skills (3)

| Skill | What Claude Knows |
|-------|-------------------|
| `tdd-workflow` | Red-Green-Refactor for Apex and LWC, test-first for triggers/services |
| `code-analysis` | PMD rules, SFDX Scanner, cyclomatic complexity, custom rulesets |
| `org-health-check` | Security Health Check, Optimizer report, unused components, tech debt |

### Specialized Skills (2)

| Skill | What Claude Knows |
|-------|-------------------|
| `experience-cloud` | Experience Builder, guest user security, CDN, custom domains, CMS |
| `visualforce-patterns` | VF controllers, ViewState, VF remoting, PDF generation, VF-to-LWC migration |

---

## The 44 Rules — Always Enforced

Rules are guidelines Claude follows **automatically** — you don't need to remember them. They're organized by domain:

### Common Rules (9) — Apply to Everything

| Rule | What It Enforces |
|------|-----------------|
| `security` | `with sharing` by default, CRUD/FLS, no SOQL injection, Named Credentials |
| `testing` | 75% minimum coverage (90%+ target), bulk testing, @TestSetup, no SeeAllData |
| `governor-limits` | No SOQL/DML in loops, LIMIT on queries, async for heavy processing |
| `patterns` | Service/Selector/Domain layers, one-trigger-per-object, factory pattern |
| `coding-style` | PascalCase classes, camelCase methods, ApexDoc, no magic numbers |
| `development-workflow` | Scratch org workflow, source tracking, sandbox strategy |
| `git-workflow` | Feature branches, conventional commits, .forceignore, PR process |
| `agents` | When to delegate to specialized agents |
| `hooks` | Hook profiles (minimal/standard/strict), disabling hooks |

### Apex Rules (9)

| Rule | Key Enforcement |
|------|----------------|
| `bulkification` | Never single-record processing, Map<Id,SObject> patterns, test with 200+ |
| `governor-limits` | Limits class usage, @future/Queueable/Batch decision, Platform Events |
| `error-handling` | Custom exceptions, try-catch at service boundaries only, never swallow |
| `security` | `with sharing`, stripInaccessible(), WITH USER_MODE, no string concat in SOQL |
| `coding-style` | Naming conventions, ApexDoc, 50-line method limit |
| `patterns` | One-trigger-per-object, Service/Selector/Domain, no god classes |
| `testing` | @TestSetup, TestDataFactory, 90%+ target, test all trigger contexts |
| `performance` | CPU optimization, efficient collections, lazy loading |
| `hooks` | Post-edit compile check, PMD scan, governor scan |

### LWC Rules (6)

| Rule | Key Enforcement |
|------|----------------|
| `coding-style` | camelCase components, PascalCase classes, SLDS first |
| `patterns` | @wire for reads, imperative for mutations, CustomEvent for child→parent |
| `security` | No innerHTML, CSP compliance, no hardcoded URLs |
| `testing` | Jest for every component, wire mocks, DOM assertions |
| `performance` | Wire caching, debounce, lwc:if, lazy loading |
| `hooks` | Post-edit lint, import validation |

### SOQL Rules (6), Flow Rules (6), Metadata Rules (8)

Similar domain-specific enforcement covering query patterns, flow best practices, and metadata organization.

---

## Tips and Tricks

### Tip 1: Chain Commands for Comprehensive Reviews

Before creating a PR, run the full gauntlet:

```
You: /security-scan
You: /governor-check
You: /code-review
```

Or just use `/code-review` which orchestrates all reviewers in parallel.

### Tip 2: Use /plan Before Complex Features

For any feature touching more than 2 objects or involving integration:

```
You: /plan Create a system that syncs Account and Contact changes
     to an external ERP via REST API, with retry logic and error logging

Claude: Creates a detailed plan covering:
  - Data model changes (custom fields, platform events)
  - Apex classes needed (Service, Callout, Mock, Handler)
  - Trigger design (Account + Contact triggers)
  - Error handling strategy
  - Test approach (mock callouts, bulk testing)
  - Deployment order
```

### Tip 3: Start Every New Feature with /tdd

```
You: /tdd Build a method to merge duplicate accounts

Claude walks you through:
  1. Write test: testMergeAccounts_MergesContactsAndOpportunities()
  2. Run → RED ❌
  3. Write minimum AccountMergeService.mergeAccounts()
  4. Run → GREEN ✅
  5. Refactor for bulkification and governor limits
```

### Tip 4: Use /explain-error for Cryptic Salesforce Errors

```
You: /explain-error UNABLE_TO_LOCK_ROW

Claude explains:
  - Root cause: Two transactions trying to update the same record simultaneously
  - Common scenarios: Batch jobs overlapping, triggers on parent+child, workflows
  - Fix: Add FOR UPDATE to SOQL, implement retry logic, review batch scope size
  - Prevention: Avoid processing related records in the same batch scope
```

### Tip 5: Use /scaffold-batch for Data Processing Jobs

```
You: /scaffold-batch Clean up Opportunities closed more than 2 years ago

Claude generates:
  - OpportunityCleanupBatch.cls (Database.Batchable + Stateful + Schedulable)
  - OpportunityCleanupBatchTest.cls (200+ records, Test.startTest, scheduler test)
  - Cron expression for weekly execution
```

### Tip 6: Leverage /data-model for Relationship Design

```
You: /data-model Design a project management system with Projects, Tasks,
     Time Entries, and Resources

Claude designs:
  - Project__c (master)
  - Task__c (master-detail to Project__c, with status, dates, assignment)
  - Time_Entry__c (master-detail to Task__c, lookup to Resource__c)
  - Resource__c (lookup to User)
  - Junction objects for multi-resource assignment
  - Rollup summaries for hours tracking
  - External IDs for integration readiness
```

### Tip 7: Use /debug-log to Understand Complex Issues

```
You: /debug-log The OpportunityTrigger is hitting CPU time limit

Claude:
  1. Retrieves debug log with APEX_CODE,FINEST;SYSTEM,DEBUG log levels
  2. Parses the log for CPU time markers
  3. Identifies the hot path (e.g., nested loop in helper method)
  4. Shows time breakdown per method
  5. Suggests optimization (Map-based lookup instead of nested iteration)
```

### Tip 8: Use /org-health for Quarterly Checkups

```
You: /org-health

Claude assesses:
  - Security Health Check score: 78/100 (target: 90+)
  - Code coverage: 87% (✅ above 75% minimum)
  - 12 classes with 0% coverage (⚠️ unused or untested)
  - 3 profiles with "Modify All Data" (🔴 security risk)
  - 47 unused custom fields (tech debt)
  - Recommendations prioritized by risk
```

### Tip 9: Profile-Based Hook Control

Control how aggressive the automated checks are:

```bash
# Minimal — only critical checks (fastest)
export CSIQ_HOOK_PROFILE=minimal

# Standard — balanced checks (default)
export CSIQ_HOOK_PROFILE=standard

# Strict — all checks including style warnings (most thorough)
export CSIQ_HOOK_PROFILE=strict

# Disable specific hooks
export CSIQ_DISABLED_HOOKS="post-edit-pmd-scan,post-edit-debug-warn"
```

### Tip 10: Combine Scaffolding for Full Feature Setup

```
You: I need a trigger on Case that auto-assigns to a queue based on Type,
     and an LWC component to display the assignment rules.

Claude: Let me scaffold everything:

You: /scaffold-trigger Case
You: /scaffold-lwc caseAssignmentRules
You: /scaffold-apex CaseAssignmentService

Result: 9 files generated — trigger, handler, handler test, LWC (js/html/css/meta/test),
        service class, service test. All wired together, all following best practices.
```

---

## Common Workflows

### Workflow 1: New Feature Development

```
1. /plan [describe feature]          — Get implementation plan
2. /create-scratch-org               — Fresh development environment
3. /tdd [first component]            — Build with tests first
4. /scaffold-trigger [object]        — If trigger needed
5. /scaffold-lwc [component]         — If UI needed
6. ... write code ...
7. /apex-review                      — Check Apex quality
8. /security-scan                    — Check security
9. /test                             — Run all tests
10. /validate                        — Check-only deployment
11. /deploy                          — Deploy to target
```

### Workflow 2: Code Review (PR Review)

```
1. /code-review                      — Full parallel review
2. /governor-check                   — Deep governor analysis
3. /metadata-analyze                 — Dependency check
4. Fix any findings
5. /test                             — Verify tests pass
6. Approve PR
```

### Workflow 3: Bug Fix

```
1. /debug-log                        — Analyze the issue
2. /explain-error [error message]    — Understand the error
3. /tdd [write failing test first]   — Reproduce the bug
4. Fix the code
5. /test                             — Verify fix + no regressions
6. /deploy                           — Ship it
```

### Workflow 4: ISV Package Development

```
1. /plan [package feature]           — Plan the feature
2. /create-scratch-org               — Dev environment
3. ... develop ...
4. /code-review                      — Full quality check
5. /pmd-scan                         — Static analysis
6. /test                             — 75%+ coverage required
7. /package-version                  — Create package version
8. /validate                         — Test in subscriber org
```

### Workflow 5: Admin Automation

```
1. /flow-review                      — Review existing flows
2. /scaffold-flow [requirement]      — Design new flow
3. /data-model [changes needed]      — Data model updates
4. /org-health                       — Check org health
5. /deploy                           — Deploy changes
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    USER (You)                         │
│                                                       │
│   "Fix the SOQL injection in AccountService"         │
│   "/deploy to my-sandbox"                            │
│   "/scaffold-trigger Opportunity"                    │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│              COMMANDS (42 slash commands)             │
│                                                       │
│   Route user requests to the right agents             │
│   /deploy → deployment-specialist                     │
│   /apex-review → apex-reviewer                       │
│   /code-review → 5 agents in parallel                │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│              AGENTS (14 specialists)                  │
│                                                       │
│   Each agent has deep domain knowledge                │
│   Loaded from skills + rules automatically            │
│   apex-reviewer knows: apex-patterns, apex-testing,  │
│     governor-limits, security-patterns, etc.          │
└────────────────┬──────────────────────────────────────┘
                 │
          ┌──────┴──────┐
          ▼              ▼
┌──────────────┐  ┌──────────────┐
│   SKILLS     │  │    RULES     │
│  (36 modules)│  │  (44 files)  │
│              │  │              │
│  Deep domain │  │  Always-on   │
│  knowledge   │  │  guidelines  │
│  patterns    │  │  enforced in │
│  examples    │  │  every edit  │
└──────────────┘  └──────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│              HOOKS (16 scripts)                       │
│                                                       │
│   Automatic background checks on every file save      │
│   Pre-commit quality gates                           │
│   Post-deploy result parsing                         │
│   Session initialization (detect org, project)        │
└─────────────────────────────────────────────────────┘
```

---

## Frequently Asked Questions

### Q: Do I need a Salesforce org connected for the plugin to work?

**A:** No. The plugin works without an org connection for code review, scaffolding, planning, and local analysis. An org connection is only needed for `/deploy`, `/test`, `/retrieve`, `/create-scratch-org`, and other org-interactive commands.

### Q: Can I use this with VS Code?

**A:** Yes. Claude Code works in VS Code via the Claude Code extension. The plugin's commands, agents, and rules all work in the VS Code terminal.

### Q: Will the hooks slow down my editing?

**A:** Hooks are lightweight (regex-based, not compilation). On average, a post-edit hook runs in <500ms. Use `CSIQ_HOOK_PROFILE=minimal` if you want only critical checks.

### Q: Can I add my own custom rules?

**A:** Yes. Add `.md` files to any `rules/` subdirectory. They'll be picked up automatically. See `docs/CUSTOMIZATION.md` for format details.

### Q: Does this work with managed packages?

**A:** Yes. The `packaging-2gp` skill and `/package-version` command are designed for ISV development. Use the `isv` installation profile.

### Q: What about Flow development?

**A:** While Claude can't generate Flow XML directly, it can:
- Review existing flows for best practices (`/flow-review`)
- Design flow blueprints (`/scaffold-flow`)
- Convert complex flows to Apex (`/flow-to-code` skill)
- Analyze flow metadata for anti-patterns

### Q: How does this differ from Salesforce Code Analyzer?

**A:** Salesforce Code Analyzer (PMD) checks syntax-level issues. claude-sfdx-iq goes further:
- Understands your architecture and suggests improvements
- Knows governor limits and predicts transaction behavior
- Generates complete implementations, not just warnings
- Reviews across domains simultaneously (Apex + LWC + SOQL + security)
- Provides TDD workflows and scaffolding

Think of PMD as a linter and claude-sfdx-iq as a senior developer pair.

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 1.0.0 | 2026-03-17 | Initial release: 14 agents, 36 skills, 42 commands, 44 rules, 16 hooks |

---

## Contributing

See `docs/CONTRIBUTING.md` for details on:
- Adding new agents, skills, commands, rules, hooks
- File format requirements
- Naming conventions
- Testing requirements
- PR process

---

## License

MIT License — see `LICENSE` for details.
