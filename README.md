# sfdx-iq

![npm test](https://img.shields.io/badge/npm%20test-passing-brightgreen)
![License: MIT](https://img.shields.io/badge/License-MIT-blue)
![21 commands](https://img.shields.io/badge/commands-21-orange)
![7 agents](https://img.shields.io/badge/agents-7-purple)

This plugin gives Claude Code deep Salesforce expertise. When you install it, Claude understands Salesforce best practices -- security, governor limits, permission models, flows, deployments -- and applies them automatically to everything it builds or reviews for you.

Ask Claude to review your Apex code, design a data model, check your flows, build a trigger, or plan a feature -- and it will follow Salesforce platform rules without you having to remind it.

---

## Who Is This For?

| If you are... | This plugin helps you... |
|---|---|
| **A Salesforce Admin** | Review flows, design permission sets, analyze data models, check org health -- all through plain English conversation with Claude |
| **A Salesforce Developer** | Write bulkified Apex, build secure LWC, create triggers, catch governor limit violations, scaffold components with tests |
| **A DevOps / Release Manager** | Plan deployments, manage packages, run CI/CD checks |

---

## Installation

You can install this plugin two ways -- pick whichever you are most comfortable with.

### Directly from Your Terminal
**Add the marketplace (one-time)**
```
claude plugin marketplace add bhanu91221/sfdx-iq
```
**Install the plugin**
```
claude plugin install sfdx-iq
```

### Or install in Claude Code
**Add the marketplace (one-time)**
```
/plugin marketplace add bhanu91221/sfdx-iq
```
**Install the plugin**
```
/plugin install sfdx-iq
```

### Setting Up Your Salesforce Project

After installing the plugin, copy the plugin configuration into each Salesforce project you work on. **This is a one-time step per project.**

#### Option 1 -- Run a command in your terminal (recommended)

Open a terminal, navigate to your Salesforce project folder, and run:

```
npx sfdx-iq setup-project
```

#### Option 2 -- Use a slash command inside Claude Code

Open Claude Code cli in your Salesforce project and type:

```
/setup-project
```

This is a good option if npm is blocked on your network (corporate VPN).

#### Option 3 -- Copy files manually

Download the plugin files from [GitHub](https://github.com/bhanu91221/sfdx-iq), then copy the following into the `.claude` folder inside your Salesforce project:

```
your-salesforce-project/
  .claude/
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
| `/flow --review` | Checks your flows for performance issues and missing fault paths |
| `/org-health` | Analyzes your org's permissions, sharing rules, and metadata for technical debt |
| `/data-model` | Helps design or analyze object relationships and field architecture |
| `/security-scan` | Scans for CRUD/FLS, sharing, and injection vulnerabilities |
| `/status` | Shows plugin status and org connection |

Try typing `/org-health` in Claude Code. The plugin will analyze your org's permission model, sharing rules, and metadata structure, then give you a report with specific recommendations.

### For Developers

| Command | What it does |
|---------|-------------|
| `/apex-class --review` | Reviews Apex code for quality, bulkification, and security |
| `/trigger --new` | Scaffolds a complete trigger + handler + test (3 files) |
| `/lwc --new` | Scaffolds an LWC component with JS, HTML, CSS, meta, and test |
| `/security-scan` | Scans for CRUD/FLS, sharing, and injection vulnerabilities |
| `/code-review --apex --all` | Full Apex review with specialist agents running in parallel |

Run `/help` for the full command list, or see the [Command Reference](docs/COMMAND-REFERENCE.md).

> **Note:** If you see "Not an SFDX project", make sure you are in a directory with `sfdx-project.json` and you have run the setup-project step above.

---

## What It Does

The plugin adds two layers of Salesforce intelligence to Claude:

**Commands (21 self-contained tools)** -- Each command includes its own domain standards inline. When you run `/apex-class --review`, the command already knows Apex bulkification rules, SOQL standards, governor limits, and error handling patterns. No context loading step required.

**Agents (7 specialists)** -- Think of these as 7 Salesforce consultants that Claude can call on. Commands invoke them automatically when deeper expertise is needed. You never call agents directly.

### What the plugin enforces

- **Governor limits first** -- Prevents code patterns that would hit Salesforce platform limits (like too many database queries)
- **Security by default** -- Ensures proper access checks, data security, and protection against injection attacks
- **Bulk-safe code** -- All code handles large volumes of records, not just one at a time
- **Test coverage** -- Targets 90%+ test coverage with meaningful test scenarios

---

## Domain Commands

Each domain command covers the full lifecycle of a Salesforce artifact. Use flags to select the workflow.

### Apex & Backend

| Command | Flags | What it does |
|---------|-------|-------------|
| `/apex-class` | `--new`, `--review`, `--refine`, `--bug-fix` | General Apex classes -- service layers, controllers, utilities |
| `/trigger` | `--new`, `--review`, `--refine`, `--bug-fix` | Triggers + handler delegation (one-per-object pattern) |
| `/async-apex` | `--new`, `--refine`, `--bug-fix` | Batch, Queueable, Schedulable, @future classes |
| `/integration-apex` | `--new`, `--refine`, `--bug-fix` | REST/SOAP callouts and inbound web services |

### Frontend

| Command | Flags | What it does |
|---------|-------|-------------|
| `/lwc` | `--new`, `--explain`, `--refine`, `--bug-fix` | Lightning Web Components |

### Flow & Process

| Command | Flags | What it does |
|---------|-------|-------------|
| `/flow` | `--new`, `--review`, `--refine`, `--explain` | Screen Flows, Record-Triggered Flows, Scheduled Flows |

### Cross-Domain

| Command | Flags | What it does |
|---------|-------|-------------|
| `/code-review` | `--apex [file\|--all]`, `--lwc [comp\|--all]`, `--flow [name\|--all]` | Full review with specialist agents running in parallel |
| `/explain` | `--apex [file]`, `--lwc [comp]`, `--flow [name]`, `--deep` | Explain what code does; `--deep` traces behavior across files |
| `/security-scan` | _(no flags -- scans all)_ | CRUD/FLS, sharing model, SOQL injection, CSP, guest user security |

**Flag behaviors:**
- `--new` -- gather requirements → scaffold artifact + test class → explain what was generated
- `--review` -- identify files → check against domain standards → delegate to agent → severity report
- `--refine` -- understand change request → apply modification → update tests
- `--bug-fix` -- gather symptoms → diagnose root cause → fix → explain
- `--explain` -- describe purpose, data flow, key behaviors, dependencies

---

## Utility Commands

| Command | What it does |
|---------|-------------|
| `/setup-project` | Copy plugin configuration to your SFDX project |
| `/doctor` | Diagnose plugin and org configuration issues |
| `/status` | Show plugin status and org connection |
| `/org-health` | Org health check: security score, limits, technical debt, metadata |
| `/data-model` | ER design, object relationships, best practices |
| `/plan` | Implementation planning with phased roadmap |
| `/package` | 2GP package versioning and management |
| `/debug-log` | Retrieve and analyze Salesforce debug logs |
| `/apex-test` | Create or improve Apex test classes with coverage targeting |
| `/handoff` | Generate session summary for context continuity across conversations |
| `/repair` | Auto-fix common configuration problems |

---

## The 7 Agents

The plugin includes 7 specialist agents. Commands invoke them automatically -- you do not call them directly.

| Agent | What they help with |
|-------|-------------|
| `apex-code-reviewer` | Apex quality -- bulkification, SOQL selectivity, governor limits, N+1 detection, naming, security |
| `solution-designer` | Solution architecture, phased implementation plans, integration design, risk assessment |
| `devops-coordinator` | Deployment strategy, test patterns, org health analysis, CI/CD pipelines, metadata debt |
| `lwc-reviewer` | LWC components -- wire usage, events, accessibility, performance, security |
| `security-auditor` | Security -- CRUD/FLS, sharing model, SOQL injection, XSS, CSP, guest user risks |
| `flow-analyst` | Flows -- DML in loops, fault paths, recursion prevention, before/after save decisions |
| `integration-specialist` | REST/SOAP callouts, Named Credentials, platform events, Change Data Capture |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Plugin not loading | Run `npx sfdx-iq doctor` or `/doctor` to diagnose environment issues |
| "Not an SFDX project" error | Make sure you are in a folder with `sfdx-project.json` and have run the setup-project step |
| Org not connected | Run `npx sfdx-iq status` or `/status` to check your connection, then re-authenticate with `sf org login web` |
| Something seems broken | Run `npx sfdx-iq repair` or `/repair` to auto-fix common configuration problems |

For more troubleshooting steps, see the [Installation Guide](docs/INSTALLATION.md#troubleshooting).

---

## Documentation

| Document | Description |
|----------|-------------|
| [Installation Guide](docs/INSTALLATION.md) | Detailed installation, prerequisites, and environment setup |
| [Architecture](docs/ARCHITECTURE.md) | Technical architecture and component flow |
| [Command Reference](docs/COMMAND-REFERENCE.md) | All 21 commands with flags and examples |
| [Customization](docs/CUSTOMIZATION.md) | How to add custom agents, commands, and hooks |
| [Contributing](docs/CONTRIBUTING.md) | Contribution guidelines |
| [Privacy Policy](PRIVACY.md) | What data the plugin accesses and what it does not |
| [Security Policy](SECURITY.md) | How to report vulnerabilities |

---

## License

MIT -- see [LICENSE](LICENSE) for details.

---

*This plugin is not officially affiliated with or endorsed by Salesforce, Inc. "Salesforce," "Apex," "Lightning," "Visualforce," and related marks are trademarks of Salesforce, Inc.*
