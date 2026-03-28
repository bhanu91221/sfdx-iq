# claude-sfdx-iq

![npm test](https://img.shields.io/badge/npm%20test-829+%20passing-brightgreen)
![License: MIT](https://img.shields.io/badge/License-MIT-blue)
![56 commands](https://img.shields.io/badge/commands-56-orange)
![14 agents](https://img.shields.io/badge/agents-14-purple)
![36 skills](https://img.shields.io/badge/skills-36-teal)
![44 rules](https://img.shields.io/badge/rules-44-red)

This plugin gives Claude Code deep Salesforce expertise. When you install it, Claude understands Salesforce best practices -- security, governor limits, permission models, flows, deployments -- and applies them automatically to everything it builds or reviews for you.

Ask Claude to review your Apex code, design a data model, check your flows, scaffold a trigger, or deploy to a sandbox -- and it will follow Salesforce platform rules without you having to remind it.

---

## Who Is This For?

| If you are... | This plugin helps you... |
|---|---|
| **A Salesforce Admin** | Review flows, design permission sets, analyze data models, check org health, deploy metadata -- all through plain English conversation with Claude |
| **A Salesforce Developer** | Write bulkified Apex, build secure LWC, run TDD workflows, catch governor limit violations, scaffold components with tests |
| **A DevOps / Release Manager** | Validate deployments, generate destructive changes, manage packages, run CI/CD checks |

---

## Installation

You can install this plugin two ways -- pick whichever you are most comfortable with.

### Directly from Your Terminal

**Run in your terminal:**
```
npx claudepluginhub bhanu91221/claude-sfdx-iq
```
Or install manually in Claude Code

**Add the marketplace (one-time)**
```
/plugin marketplace add https://www.claudepluginhub.com/api/plugins/bhanu91221-claude-sfdx-iq/marketplace.json
```
**Install the plugin**
```
/plugin install bhanu91221-claude-sfdx-iq@cpd-bhanu91221-claude-sfdx-iq
```

### Setting Up Rules for Your Salesforce Project

After installing the plugin, you need to copy rules and configuration files into each Salesforce project you work on. **This is a one-time step per project.**

#### Option 1 -- Run a command in your terminal (recommended)

Open a terminal, navigate to your Salesforce project folder, and run:

```
npx claude-sfdx-iq setup-project
```

#### Option 2 -- Use a slash command inside Claude Code

Open Claude Code cli in your Salesforce project and type:

```
/setup-project
```

This is a good option if npm is blocked on your network (corporate VPN).

#### Option 3 -- Copy files manually

Download the plugin files from [GitHub](https://github.com/bhanu91221/claude-sfdx-iq), then copy the following into the `.claude` folder inside your Salesforce project:

```
your-salesforce-project/
  .claude/
    rules/           <-- copy from plugin's rules/ folder
    settings.json    <-- copy from plugin's .claude-project-template/ folder
    CLAUDE.md        <-- copy from plugin's .claude-project-template/ folder
```

For detailed manual copy commands, see the [Installation Guide](docs/INSTALLATION.md).

---

## Quick Start

After installation and project setup, open your Salesforce project in Claude Code and try these commands.

### For Admins

| Command | What it does |
|---------|-------------|
| `/flow-review` | Checks your flows for performance issues and missing fault paths |
| `/org-health` | Analyzes your org's permissions, sharing rules, and metadata for technical debt |
| `/data-model` | Helps design or analyze object relationships and field architecture |
| `/deploy` | Deploys metadata to your org with validation |
| `/explain-error` | Explains Salesforce error messages in plain language with fix steps |
| `/status` | Shows plugin status and org connection |

Try typing `/org-health` in Claude Code. The plugin will analyze your org's permission model, sharing rules, and metadata structure, then give you a report with specific recommendations.

### For Developers

| Command | What it does |
|---------|-------------|
| `/apex-review` | Reviews Apex code for quality, bulkification, and security |
| `/tdd` | Starts a test-driven development workflow (Red-Green-Refactor) |
| `/scaffold-trigger` | Generates a complete trigger + handler + test (3 files) |
| `/security-scan` | Scans for CRUD/FLS, sharing, and injection vulnerabilities |
| `/test` | Runs Apex tests with coverage analysis |
| `/code-review` | Full review with all specialist agents running in parallel |

Run `/help` for the complete list of all 56 commands.

> **Note:** If you see "Not an SFDX project", make sure you are in a directory with `sfdx-project.json` and you have run the setup-project step above.

---

## What It Does

The plugin adds three layers of Salesforce intelligence to Claude:

**Agents (14 specialists)** -- Think of these as 14 Salesforce consultants that Claude can call on. When you ask for a flow review, the flow analyst handles it. When you ask for a security scan, the security reviewer takes over. You never call agents directly -- they activate automatically based on what you ask.

**Skills (36 knowledge areas)** -- Skills are reference guides the agents use, covering topics like governor limits, permission models, LWC testing patterns, and SOQL optimization. The plugin loads only the skills relevant to your current task to keep things fast.

**Rules (44 guidelines)** -- Rules are the guardrails. They enforce best practices like "always use permission sets over profiles" and "never put database queries inside loops." Rules are checked automatically every time Claude writes or reviews code.

### What the plugin enforces

- **Governor limits first** -- Prevents code patterns that would hit Salesforce platform limits (like too many database queries)
- **Security by default** -- Ensures proper access checks, data security, and protection against injection attacks
- **Bulk-safe code** -- All code handles large volumes of records, not just one at a time
- **Test coverage** -- Targets 90%+ test coverage with meaningful test scenarios

---

## Commands for Admins

| Command | What it does |
|---------|-------------|
| `/flow-review` | Checks your flows for performance issues, missing fault paths, and loops with database operations |
| `/org-health` | Analyzes your org's permission model, sharing rules, and metadata for technical debt |
| `/data-model` | Helps design object relationships, external IDs, and field architecture |
| `/scaffold-flow` | Generates a flow design blueprint following best practices |
| `/deploy` | Deploys metadata to your org with validation |
| `/validate` | Tests a deployment without making any changes |
| `/retrieve` | Pulls metadata from your org into the project |
| `/metadata-analyze` | Shows metadata dependencies and unused components |
| `/explain-error` | Explains Salesforce errors in plain language with fix steps |
| `/doctor` | Checks if your environment is set up correctly |
| `/status` | Shows plugin status and org connection |

---

## Commands for Developers

### Code Understanding and Modification

| Command | What it does |
|---------|-------------|
| `/explain` | Explain what any file does — LWC components, Apex classes, triggers, Flows. Works on the active editor file or a path you provide |
| `/analyze` | Answer specific questions about code behavior. Use `--field Status__c` to trace where a field is read or written across the codebase |
| `/modify` | Add features, change behavior, or add field logic to existing Apex, LWC, or triggers. Reads the file first, plans the change, then applies it |

### Code Review and Quality

| Command | What it does |
|---------|-------------|
| `/apex-review` | Apex quality review (bulkification, naming, patterns) |
| `/lwc-review` | LWC component review (decorators, events, accessibility) |
| `/soql-review` | SOQL optimization analysis |
| `/security-scan` | CRUD/FLS, sharing, and injection vulnerability scan |
| `/governor-check` | Governor limit risk analysis |
| `/flow-review` | Flow best practices check |
| `/pmd-scan` | PMD static analysis via Salesforce Code Analyzer |
| `/code-review` | Full review with all agents running in parallel |

### Scaffolding and Testing

| Command | What it does |
|---------|-------------|
| `/scaffold-trigger` | Generate trigger + handler + test (3 files) |
| `/scaffold-lwc` | Generate LWC component with JS, HTML, CSS, meta, and test (5 files) |
| `/scaffold-apex` | Generate Apex class + test |
| `/scaffold-batch` | Generate Batch + Scheduler + test |
| `/scaffold-integration` | Generate callout service + mock + test |
| `/tdd` | TDD workflow -- Red-Green-Refactor for Apex and LWC |
| `/test` | Run Apex tests with coverage analysis |
| `/lwc-test` | Run LWC Jest tests |

### Deployment and Planning

| Command | What it does |
|---------|-------------|
| `/deploy` | Source deploy with validation and automatic test level selection |
| `/validate` | Check-only deployment (no changes applied) |
| `/destructive` | Generate destructiveChanges.xml |
| `/plan` | Implementation plan for an SFDX feature |
| `/data-model` | Design or analyze data model |
| `/debug-log` | Retrieve and analyze Salesforce debug logs |
| `/build-fix` | Diagnose and fix deployment or compilation errors |

Run `/help` for the complete list of all 56 commands, or see the [full command reference](docs/COMMAND-REFERENCE.md).

---

## Context Loading and Token Optimization

The plugin loads only the rules and skills relevant to your current task — not all 43k tokens at once.

When you run any command, you will see a context announcement before work begins:

```
Context Loaded for: Scaffold LWC opportunity tiles component
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Skills (3): lwc-patterns, lwc-performance, lwc-testing
Rules (5):  lwc/coding-style, lwc/patterns, lwc/security, common/security, common/testing
~Tokens: 9,240 / 200k session budget
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use `/context` to see what is currently loaded. Use `/context --reload` to reload context for a new task.

---

## The 14 Agents

The plugin includes 14 specialist agents. You do not need to call them directly -- they activate automatically when you use commands.

| Agent | What they help with |
|-------|-------------|
| `planner` | Building implementation plans across Apex, LWC, and metadata |
| `architect` | Solution architecture, scalability, and integration design |
| `apex-reviewer` | Apex code quality -- bulkification, naming, error handling |
| `lwc-reviewer` | LWC components -- wire usage, events, accessibility, performance |
| `soql-optimizer` | SOQL query performance -- selectivity, indexes, binding |
| `security-reviewer` | Security -- access checks, sharing model, injection prevention |
| `governor-limits-checker` | Governor limits -- database queries in loops, CPU, heap |
| `flow-analyst` | Flows -- DML in loops, fault paths, best practices |
| `deployment-specialist` | Deployments, packages, and destructive changes |
| `test-guide` | Test-driven development for Apex and LWC Jest |
| `integration-specialist` | REST/SOAP callouts, platform events, and Change Data Capture |
| `metadata-analyst` | Metadata dependencies and unused components |
| `data-modeler` | Object relationships, external IDs, and data skew |
| `admin-advisor` | Permission sets, sharing rules, and validation rules |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Plugin not loading | Run `npx claude-sfdx-iq doctor` or `/doctor` to diagnose environment issues |
| "Not an SFDX project" error | Make sure you are in a folder with `sfdx-project.json` and have run the setup-project step |
| Org not connected | Run `npx claude-sfdx-iq status` `/status` to check your connection, then re-authenticate with `sf org login web` |
| Something seems broken | Run `npx claude-sfdx-iq repair` `/repair` to auto-fix common configuration problems |

For more troubleshooting steps, see the [Installation Guide](docs/INSTALLATION.md#troubleshooting).

---

## Documentation

| Document | Description |
|----------|-------------|
| [Installation Guide](docs/INSTALLATION.md) | Detailed installation, prerequisites, and environment setup |
| [Architecture](docs/ARCHITECTURE.md) | Technical architecture and component flow |
| [Command Reference](docs/COMMAND-REFERENCE.md) | All 53 commands with flags and examples |
| [Customization](docs/CUSTOMIZATION.md) | How to add custom agents, skills, commands, and rules |
| [Contributing](docs/CONTRIBUTING.md) | Contribution guidelines |
| [Privacy Policy](PRIVACY.md) | What data the plugin accesses and what it does not |
| [Security Policy](SECURITY.md) | How to report vulnerabilities |

---

## License

MIT -- see [LICENSE](LICENSE) for details.

---

*This plugin is not officially affiliated with or endorsed by Salesforce, Inc. "Salesforce," "Apex," "Lightning," "Visualforce," and related marks are trademarks of Salesforce, Inc.*
