# Claude SFDX IQ — End-to-End Test Plan

> Last updated: 2026-03-17
> Prerequisites: Node.js 18+, Salesforce CLI (`sf`), Claude Code CLI, Git

---

## Table of Contents

1. [Pre-Test Setup](#1-pre-test-setup)
2. [Unit Tests & Validators](#2-unit-tests--validators)
3. [Linting & Code Quality](#3-linting--code-quality-after-npm-install)
4. [CLI Tool Testing](#4-cli-tool-testing)
5. [Plugin Registration Testing](#5-plugin-registration-testing)
6. [Hook Script Testing](#6-hook-script-testing)
7. [Command Testing in Real SFDX Project](#7-command-testing-in-real-sfdx-project)
8. [Agent Delegation Testing](#8-agent-delegation-testing)
9. [Manifest & Profile Testing](#9-manifest--profile-testing)
10. [Regression & Edge Cases](#10-regression--edge-cases)

---

## 1. Pre-Test Setup

### 1.1 Install Dependencies (Home Network)

```bash
cd C:\Users\bhanu91221\Downloads\everthing-sfdc
npm install
```

Expected: All devDependencies install (eslint, markdownlint-cli, c8, ajv, globals).

### 1.2 Verify Node Version

```bash
node --version
# Expected: v18.x or higher
```

### 1.3 Verify Salesforce CLI

```bash
sf --version
# Expected: @salesforce/cli/2.x.x or higher

sf plugins --core
# Expected: Lists core plugins
```

### 1.4 Verify Claude Code CLI

```bash
claude --version
# Expected: Claude Code CLI version
```

### 1.5 Create Test SFDX Project (for E2E tests)

```bash
mkdir C:\Users\bhanu91221\Downloads\test-sfdc-project
cd C:\Users\bhanu91221\Downloads\test-sfdc-project
sf project generate --name test-sfdc-project --template standard
```

This creates a fresh SFDX project to test plugin installation into.

---

## 2. Unit Tests & Validators

### 2.1 Run All Tests

```bash
cd C:\Users\bhanu91221\Downloads\everthing-sfdc
npm test
```

**Expected output:**
```
Results: 14 passed, 0 failed out of 14 agents.
Results: 42 passed, 0 failed out of 42 commands.
Results: 44 found, 0 missing out of 44 expected rule files.
Results: 36 passed, 0 failed out of 36 skills.
Results: 6 passed, 0 failed out of 6 hooks.
Results: 5 passed, 0 failed out of 5 manifests.
# tests 416
# pass 416
# fail 0
 All tests passed.
```

**If any test fails:** Read the failure message, check the specific file referenced, fix the issue, re-run.

### 2.2 Run Individual Validators

```bash
# Test each validator independently
node scripts/ci/validate-agents.js
node scripts/ci/validate-skills.js
node scripts/ci/validate-commands.js
node scripts/ci/validate-hooks.js
node scripts/ci/validate-rules.js
node scripts/ci/validate-install-manifests.js
```

Each should print results and exit with code 0.

### 2.3 Run Library Unit Tests

```bash
# Run specific test suites
node --test tests/lib/test-frontmatter-parser.js
node --test tests/lib/test-report-formatter.js
node --test tests/lib/test-hook-flags.js
node --test tests/lib/test-apex-parser.js
node --test tests/lib/test-soql-analyzer.js
node --test tests/lib/test-governor-limits-db.js
```

### 2.4 Run Hook Script Tests

```bash
node --test tests/hooks/test-apex-lint.js
node --test tests/hooks/test-soql-check.js
```

### 2.5 Run Test Coverage (after npm install)

```bash
npm run coverage
```

**Expected:** Lines, functions, branches, statements all ≥80%.

---

## 3. Linting & Code Quality (after npm install)

### 3.1 ESLint

```bash
npx eslint .
```

**Expected:** No errors. Fix any reported issues.

**Common fixes:**
- `no-unused-vars` → Remove unused variable or prefix with `_`
- `eqeqeq` → Change `==` to `===`
- `prefer-const` → Change `let` to `const` where not reassigned

### 3.2 Markdownlint

```bash
npx markdownlint '**/*.md' --ignore node_modules
```

**Expected:** No errors. Common issues:
- MD009: Trailing spaces → Remove them
- MD010: Hard tabs → Convert to spaces
- MD012: Multiple blank lines → Reduce to one

### 3.3 JSON Validation

```bash
# Verify all JSON files parse correctly
node -e "
const fs = require('fs');
const glob = require('path');
const files = [
  'hooks/apex-post-edit.json', 'hooks/flow-post-edit.json',
  'hooks/lwc-post-edit.json', 'hooks/pre-commit.json',
  'hooks/soql-check.json', 'hooks/trigger-post-edit.json',
  'manifests/default.json', 'manifests/minimal.json',
  'manifests/apex-only.json', 'manifests/lwc-only.json',
  'manifests/admin.json',
  'schemas/agent.schema.json', 'schemas/skill.schema.json',
  'schemas/command.schema.json', 'schemas/hook.schema.json',
  'schemas/plugin.schema.json',
  'mcp-configs/salesforce-cli.json', 'mcp-configs/sfdx-scanner.json',
  'mcp-configs/pmd-apex.json', 'mcp-configs/jest-lwc.json',
  'mcp-configs/github-actions.json', 'mcp-configs/vscode-sfdx.json',
  '.claude-plugin/plugin.json'
];
let ok = 0, fail = 0;
for (const f of files) {
  try { JSON.parse(fs.readFileSync(f, 'utf8')); ok++; }
  catch (e) { console.error('FAIL:', f, e.message); fail++; }
}
console.log(ok + ' passed, ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);
"
```

**Expected:** All JSON files parse successfully.

---

## 4. CLI Tool Testing

### 4.1 Help Command

```bash
npx csiq help
```

**Expected:** Prints banner, version, list of available commands (help, install, plan, status, list, doctor, repair).

### 4.2 Status Command

```bash
npx csiq status
```

**Expected:** Prints dashboard with component counts:
- Agents: 14
- Skills: 36
- Commands: 42
- Rules: 44
- Hooks: 6
- Manifests: 5
- MCP Configs: 6

### 4.3 Doctor Command

```bash
npx csiq doctor
```

**Expected:** Runs 9 diagnostic checks:
- Node.js version ✅
- npm version ✅
- Git version ✅
- sf CLI ✅ (or ⚠️ if not installed)
- SF Scanner ⚠️ (may not be installed)
- Default Org ⚠️ (may not be authenticated)
- DevHub ⚠️ (may not be set)
- Plugin Integrity ✅
- Package.json ✅

### 4.4 Repair Command

```bash
npx csiq repair
```

**Expected:** "No issues found" or lists any integrity problems.

```bash
npx csiq repair --fix
```

**Expected:** Fixes any found issues (creates missing directories, etc.).

### 4.5 List Command

```bash
# List all components
npx csiq list

# Filter by category
npx csiq list --category agents
npx csiq list --category skills
npx csiq list --category commands
npx csiq list --category rules
```

**Expected:** Each prints the components in that category.

### 4.6 Plan Command (Dry Run)

```bash
# Show what minimal profile would install
npx csiq plan --profile minimal

# Show what developer profile would install
npx csiq plan --profile developer

# Show what full profile would install
npx csiq plan --profile full
```

**Expected:** Lists components with ✅/❌ showing what would be installed per profile.

### 4.7 Install Command (Dry Run First)

```bash
# Dry run into test project
npx csiq install --profile developer --target C:\Users\bhanu91221\Downloads\test-sfdc-project --dry-run

# Actual install
npx csiq install --profile developer --target C:\Users\bhanu91221\Downloads\test-sfdc-project
```

**Expected:** Copies agents, rules, skills, commands into the target project's `.claude/` directory.

**Verify installation:**
```bash
ls C:\Users\bhanu91221\Downloads\test-sfdc-project/.claude/
# Should contain: agents/, rules/, skills/, commands/
```

---

## 5. Plugin Registration Testing

### 5.1 Register as Claude Code Plugin

```bash
# From the plugin directory
cd C:\Users\bhanu91221\Downloads\everthing-sfdc
claude plugin add .
```

**Expected:** Plugin registered successfully.

### 5.2 Verify Plugin Appears

```bash
claude plugin list
```

**Expected:** `claude-sfdx-iq` appears in the list.

### 5.3 Test Plugin Commands Available

Open Claude Code in an SFDX project directory and verify:
```
/deploy
/test
/apex-review
/security-scan
```

**Expected:** Each command is recognized and shows its description.

### 5.4 Unregister Plugin

```bash
claude plugin remove claude-sfdx-iq
```

**Expected:** Plugin removed cleanly.

---

## 6. Hook Script Testing

### 6.1 Test apex-lint Hook

Create a test file with known violations:

```bash
cat > /tmp/test-apex.cls << 'EOF'
public class BadExample {
    public void processRecords(List<Account> accounts) {
        for (Account acc : accounts) {
            List<Contact> contacts = [SELECT Id FROM Contact WHERE AccountId = :acc.Id];
            update contacts;
        }
    }
}
EOF

node scripts/hooks/apex-lint.js /tmp/test-apex.cls
```

**Expected:** Reports:
- CRITICAL: SOQL in loop (line 4)
- CRITICAL: DML in loop (line 5)
- HIGH: Missing `with sharing` (line 1)

### 6.2 Test soql-check Hook

```bash
node scripts/hooks/soql-check.js /tmp/test-apex.cls
```

**Expected:** Reports SOQL issues found in the file.

### 6.3 Test trigger-lint Hook

```bash
cat > /tmp/test-trigger.trigger << 'EOF'
trigger AccountTrigger on Account (before insert) {
    for (Account acc : Trigger.new) {
        acc.Name = acc.Name.toUpperCase();
    }
}
EOF

node scripts/hooks/trigger-lint.js /tmp/test-trigger.trigger
```

**Expected:** Reports direct logic in trigger body (should delegate to handler).

### 6.4 Test lwc-lint Hook

```bash
cat > /tmp/test-lwc.js << 'EOF'
import { LightningElement, api } from 'lwc';
export default class TestComponent extends LightningElement {
    @api myProp;
    connectedCallback() {
        this.myProp = 'mutated'; // @api mutation
        console.log('debug output');
        this.template.innerHTML = '<b>XSS risk</b>';
    }
}
EOF

node scripts/hooks/lwc-lint.js /tmp/test-lwc.js
```

**Expected:** Reports @api mutation, console.log, innerHTML usage.

### 6.5 Test governor-scan Hook

```bash
node scripts/hooks/post-edit-governor-scan.js /tmp/test-apex.cls
```

**Expected:** Reports SOQL in loop, DML in loop as CRITICAL findings.

### 6.6 Test security-scan Hook

```bash
cat > /tmp/test-security.cls << 'EOF'
public without sharing class InsecureExample {
    public List<Account> search(String userInput) {
        String query = 'SELECT Id, Name FROM Account WHERE Name = \'' + userInput + '\'';
        return Database.query(query);
    }
}
EOF

node scripts/hooks/post-edit-security-scan.js /tmp/test-security.cls
```

**Expected:** Reports:
- HIGH: `without sharing` without justification
- CRITICAL: Dynamic SOQL with string concatenation
- CRITICAL: SOQL injection risk

### 6.7 Test debug-warn Hook

```bash
cat > /tmp/test-debug.cls << 'EOF'
public with sharing class DebugExample {
    public void doWork() {
        System.debug('Starting work');
        System.debug(LoggingLevel.ERROR, 'Error occurred');
    }
}
EOF

node scripts/hooks/post-edit-debug-warn.js /tmp/test-debug.cls
```

**Expected:** Reports 2 System.debug findings as LOW severity.

### 6.8 Test quality-gate Hook

```bash
# Stage a bad Apex file and run quality gate
cd C:\Users\bhanu91221\Downloads\test-sfdc-project
cp /tmp/test-apex.cls force-app/main/default/classes/BadExample.cls
git add force-app/main/default/classes/BadExample.cls
node C:\Users\bhanu91221\Downloads\everthing-sfdc\scripts\hooks\quality-gate.js
```

**Expected:** Exit code 1 with CRITICAL findings blocking commit.

### 6.9 Test session-start Hook

```bash
# In an SFDX project directory
cd C:\Users\bhanu91221\Downloads\test-sfdc-project
node C:\Users\bhanu91221\Downloads\everthing-sfdc\scripts\hooks\session-start.js
```

**Expected:** Detects sfdx-project.json, prints API version and package directories.

```bash
# In a non-SFDX directory
cd /tmp
node C:\Users\bhanu91221\Downloads\everthing-sfdc\scripts\hooks\session-start.js
```

**Expected:** "No sfdx-project.json found" message.

### 6.10 Test run-with-flags Hook Wrapper

```bash
# Test with default profile (standard)
node scripts/hooks/run-with-flags.js test-hook standard "echo Hook ran"

# Test with minimal profile (should skip standard-level hooks)
CSIQ_HOOK_PROFILE=minimal node scripts/hooks/run-with-flags.js test-hook standard "echo Hook ran"

# Test with disabled hook
CSIQ_DISABLED_HOOKS=test-hook node scripts/hooks/run-with-flags.js test-hook minimal "echo Hook ran"
```

**Expected:**
- First: runs the hook
- Second: skips (minimal profile < standard requirement)
- Third: skips (hook is disabled)

### 6.11 Test pre-commit-check Hook

```bash
# From test SFDX project with staged files
cd C:\Users\bhanu91221\Downloads\test-sfdc-project
git add force-app/main/default/classes/BadExample.cls
node C:\Users\bhanu91221\Downloads\everthing-sfdc\scripts\hooks\pre-commit-check.js
```

**Expected:** Runs apex-lint on staged .cls files, reports findings.

---

## 7. Command Testing in Real SFDX Project

### Prerequisites
- Authenticated Salesforce org (`sf org login web --alias testOrg`)
- OR a scratch org (`sf org create scratch --definition-file config/project-scratch-def.json --alias testScratch`)

### 7.1 Test /deploy Command

Open Claude Code in the test SFDX project and run:
```
/deploy
```

**Expected:** Claude recognizes the command, checks for sfdx-project.json, identifies target org, runs `sf project deploy start`.

### 7.2 Test /test Command

```
/test
```

**Expected:** Claude runs `sf apex run test --code-coverage`, parses results, reports pass/fail and coverage.

### 7.3 Test /apex-review Command

```
/apex-review
```

**Expected:** Claude identifies Apex files, delegates to apex-reviewer agent, reports findings by severity.

### 7.4 Test /security-scan Command

```
/security-scan
```

**Expected:** Claude delegates to security-reviewer agent, scans for CRUD/FLS, sharing, injection issues.

### 7.5 Test /governor-check Command

```
/governor-check
```

**Expected:** Analyzes Apex for governor limit risks, reports findings.

### 7.6 Test /tdd Command

```
/tdd
```

**Expected:** Claude asks what to build, writes test first, runs it (expect fail), writes implementation, runs again (expect pass).

### 7.7 Test /scaffold-trigger Command

```
/scaffold-trigger
```

**Expected:** Claude asks for object name (e.g., "Account"), generates:
- `AccountTrigger.trigger`
- `AccountTriggerHandler.cls`
- `AccountTriggerHandlerTest.cls`

### 7.8 Test /scaffold-lwc Command

```
/scaffold-lwc
```

**Expected:** Claude asks for component name, generates:
- `componentName.js`
- `componentName.html`
- `componentName.css`
- `componentName.js-meta.xml`
- `__tests__/componentName.test.js`

### 7.9 Test /scratch-org or /create-scratch-org Command

```
/create-scratch-org
```

**Expected:** Creates scratch org, pushes source, assigns permission sets.

### 7.10 Test /explain-error Command

```
/explain-error UNABLE_TO_LOCK_ROW
```

**Expected:** Claude explains the error, common causes, and step-by-step fix.

### 7.11 Test /sf-help Command

```
/sf-help deploy to production
```

**Expected:** Recommends the right `sf` CLI command with flags and examples.

### 7.12 Test /code-review Command

```
/code-review
```

**Expected:** Orchestrates multiple agents (apex-reviewer, security-reviewer, governor-limits-checker), produces consolidated report.

---

## 8. Agent Delegation Testing

### 8.1 Test Agent Availability

In Claude Code, ask:
```
List all available Salesforce agents
```

**Expected:** Claude lists 14 agents with descriptions.

### 8.2 Test Specific Agent Delegation

```
Review this Apex class for security issues: force-app/main/default/classes/MyController.cls
```

**Expected:** Claude delegates to security-reviewer agent.

```
Optimize the SOQL queries in force-app/main/default/classes/AccountSelector.cls
```

**Expected:** Claude delegates to soql-optimizer agent.

```
Design a data model for an Invoice tracking system
```

**Expected:** Claude delegates to data-modeler agent.

### 8.3 Test Multi-Agent Orchestration

```
Do a full code review of the entire project
```

**Expected:** Claude runs apex-reviewer, lwc-reviewer, security-reviewer, soql-optimizer, and governor-limits-checker, then consolidates results.

---

## 9. Manifest & Profile Testing

### 9.1 Validate All Manifests

```bash
node scripts/ci/validate-install-manifests.js
```

**Expected:** All 5 manifests pass (default, minimal, apex-only, lwc-only, admin).

### 9.2 Test Profile Installation

```bash
# Test each profile installs correctly
for profile in minimal apex-only lwc-only admin default; do
  echo "=== Testing profile: $profile ==="
  mkdir -p /tmp/test-$profile
  cd /tmp/test-$profile
  sf project generate --name test-$profile --template standard 2>/dev/null
  npx csiq install --profile $profile --target /tmp/test-$profile --dry-run
  echo ""
done
```

**Expected:** Each profile shows its component list without errors.

### 9.3 Verify Profile Component Counts

| Profile | Agents | Rules | Skills | Commands |
|---------|--------|-------|--------|----------|
| minimal | 4 | ~8 | 3 | 4 |
| apex-only | ~6 | ~12 | ~12 | ~12 |
| lwc-only | ~3 | ~8 | ~5 | ~6 |
| admin | ~5 | ~9 | ~6 | ~8 |
| default | 14 | all | all | all |

---

## 10. Regression & Edge Cases

### 10.1 Empty File Handling

```bash
touch /tmp/empty.cls
node scripts/hooks/apex-lint.js /tmp/empty.cls
```

**Expected:** "No issues found" (should not crash).

### 10.2 Non-Existent File Handling

```bash
node scripts/hooks/apex-lint.js /tmp/nonexistent.cls
```

**Expected:** "File not found" error, exit code 1.

### 10.3 Binary File Handling

```bash
node scripts/hooks/apex-lint.js /tmp/some-binary.jpg
```

**Expected:** Should not crash. May report no findings or handle gracefully.

### 10.4 Very Large File

Create a >1000 line Apex class:
```bash
node -e "
let content = 'public with sharing class BigClass {\n';
for (let i = 0; i < 600; i++) {
  content += '    public void method' + i + '() { System.debug(\'test\'); }\n';
}
content += '}\n';
require('fs').writeFileSync('/tmp/big-class.cls', content);
"
node scripts/hooks/apex-lint.js /tmp/big-class.cls
```

**Expected:** Reports class-too-long, System.debug warnings. Should complete in <5 seconds.

### 10.5 Unicode / Special Characters

```bash
cat > /tmp/unicode.cls << 'EOF'
public with sharing class UnicodeTest {
    public String getGreeting() {
        return '日本語テスト — Ñoño — 🎉';
    }
}
EOF
node scripts/hooks/apex-lint.js /tmp/unicode.cls
```

**Expected:** No crash, processes normally.

### 10.6 Windows Path Handling

```bash
# Test with Windows-style paths
node scripts/hooks/apex-lint.js "C:\Users\bhanu91221\Downloads\test-sfdc-project\force-app\main\default\classes\Test.cls"
```

**Expected:** Handles Windows paths correctly.

### 10.7 Concurrent Hook Execution

```bash
# Run multiple hooks on same file simultaneously
node scripts/hooks/apex-lint.js /tmp/test-apex.cls &
node scripts/hooks/post-edit-governor-scan.js /tmp/test-apex.cls &
node scripts/hooks/post-edit-security-scan.js /tmp/test-apex.cls &
wait
```

**Expected:** All complete without interference.

---

## Test Execution Checklist

Use this checklist to track test execution:

### Phase I-1: Unit Tests & Validators
- [ ] `npm test` passes (416 tests)
- [ ] All 7 individual validators pass
- [ ] All 6 lib test suites pass
- [ ] All 2 hook test suites pass

### Phase I-2: Linting (after npm install)
- [ ] `npx eslint .` passes
- [ ] `npx markdownlint '**/*.md' --ignore node_modules` passes
- [ ] All JSON files parse correctly

### Phase I-3: CLI Tools
- [ ] `npx csiq help` shows banner and commands
- [ ] `npx csiq status` shows correct counts
- [ ] `npx csiq doctor` runs 9 checks
- [ ] `npx csiq repair` reports no issues
- [ ] `npx csiq list` shows all components
- [ ] `npx csiq plan --profile minimal` shows dry run
- [ ] `npx csiq install --profile developer --dry-run` works

### Phase I-4: Hook Scripts
- [ ] apex-lint detects SOQL/DML in loops + missing sharing
- [ ] trigger-lint detects direct logic in trigger
- [ ] lwc-lint detects @api mutation + console.log + innerHTML
- [ ] soql-check detects query issues
- [ ] flow-check handles flow XML
- [ ] governor-scan detects governor risks
- [ ] security-scan detects SOQL injection + without sharing
- [ ] debug-warn flags System.debug
- [ ] quality-gate blocks on CRITICAL findings
- [ ] session-start detects SFDX project
- [ ] run-with-flags respects profiles and disabled hooks
- [ ] pre-commit-check orchestrates lint scripts

### Phase I-5: Commands (in Claude Code with real SFDX project)
- [ ] /deploy runs deployment workflow
- [ ] /test runs Apex tests with coverage
- [ ] /apex-review reviews Apex code
- [ ] /security-scan scans for vulnerabilities
- [ ] /governor-check analyzes governor limits
- [ ] /tdd starts TDD workflow
- [ ] /scaffold-trigger generates trigger boilerplate
- [ ] /scaffold-lwc generates LWC component
- [ ] /code-review runs multi-agent review
- [ ] /explain-error explains Salesforce errors

### Phase I-6: Edge Cases
- [ ] Empty file doesn't crash
- [ ] Non-existent file shows error
- [ ] Large file completes in <5 seconds
- [ ] Unicode content handles correctly
- [ ] Windows paths work
- [ ] Concurrent hooks don't interfere

### Phase I-7: Final
- [ ] `npm run coverage` ≥80% (after npm install)
- [ ] All findings documented
- [ ] Git commit with tag v1.0.0
- [ ] Push to GitHub

---

## Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `eslint: command not found` | npm install not run | Run `npm install` on home network |
| `sf: command not found` | Salesforce CLI not installed | `npm install -g @salesforce/cli` |
| Hook scripts fail silently | Missing report-formatter.js | Run `npx csiq repair --fix` |
| Plugin not recognized | Not registered | `claude plugin add /path/to/claude-sfdx-iq` |
| Tests timeout | Slow file system | Increase Node `--test-timeout` |
| JSON parse errors | Trailing commas | Validate JSON with `node -e "JSON.parse(require('fs').readFileSync('file.json','utf8'))"` |
| Permission denied on .claude/ | Directory permissions | `chmod -R u+rw .claude/` |

### Debug Mode

Run any hook with verbose output:
```bash
NODE_DEBUG=fs node scripts/hooks/apex-lint.js /tmp/test.cls
```

### Reset Test Environment

```bash
# Clean up test projects
rm -rf /tmp/test-sfdc-project
rm -rf /tmp/test-minimal /tmp/test-apex-only /tmp/test-lwc-only /tmp/test-admin /tmp/test-default
rm -f /tmp/test-apex.cls /tmp/test-trigger.trigger /tmp/test-lwc.js /tmp/test-security.cls /tmp/test-debug.cls
```
