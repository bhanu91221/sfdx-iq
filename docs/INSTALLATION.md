# Installation Guide

## Prerequisites

Before installing sfdx-iq, ensure you have the following:

| Requirement | Minimum Version | Check Command |
|-------------|----------------|---------------|
| Node.js | 18+ | `node --version` |
| Salesforce CLI (sf) | 2.x | `sf --version` |
| Claude Code | Latest | `claude --version` |
| Git | Any | `git --version` |

You also need an authenticated Salesforce org. Run `sf org list` to confirm at least one org is connected.

## Installation

You can install this plugin two ways -- pick whichever you are most comfortable with.

### Directly from Your Terminal

Open a terminal or command prompt and run these three commands:

**Step 1 -- Add the marketplace:**
```
claude plugin marketplace add bhanu91221/sfdx-iq
```

**Step 2 -- Install the plugin:**
```
claude plugin install sfdx-iq@sfdx-iq
```

**Step 3 -- Enable it:**
```
claude plugin enable sfdx-iq
```

### Inside Claude Code

If you are already working inside Claude Code (in VS Code, the Desktop app, or the CLI), type these commands directly:

**Step 1 -- Add the marketplace:**
```
/plugin marketplace add bhanu91221/sfdx-iq
```

**Step 2 -- Install the plugin:**
```
/plugin install sfdx-iq --scope user
```

**Step 3 -- Enable it:**
```
/plugin enable sfdx-iq
```

### Installation Scopes

When installing from inside Claude Code, you can choose where the plugin is available:

| Scope | What it means |
|-------|---------------|
| **user** | Available in all Claude Code sessions for your user account -- stored in your global config (default) |
| **local** | Active only in the current project directory -- stored in `.claude/` but not committed to source control |
| **project** | Shared with your team -- stored in `.claude/settings.json` and committed to the repo so everyone gets the plugin |

## Setting Up Your Salesforce Project

The plugin installs agents and commands **globally**, but each SFDX project needs a small configuration file to activate it. **This is a one-time step per project.**

There are three ways to set up a project:

### Option A -- Using npx (recommended)

From your SFDX project root:

```bash
npx sfdx-iq setup-project
```

This copies the latest configuration templates directly from npm -- no git clone needed.

### Option B -- Using the slash command

If npm is blocked (corporate VPN), open Claude Code in your SFDX project and run:

```
/setup-project
```

### Option C -- Manual copy from the GitHub repo

Clone the repo and copy files yourself:

```bash
git clone https://github.com/bhanu91221/sfdx-iq.git
cd /path/to/your/sfdx-project
mkdir -p .claude

# Copy configuration templates
cp /path/to/sfdx-iq/.claude-project-template/settings.json ./.claude/settings.local.json
cp /path/to/sfdx-iq/.claude-project-template/CLAUDE.md ./.claude/CLAUDE.md
```

**What gets copied to your project:**

| What | Destination | Purpose |
|------|-------------|---------|
| `settings.local.json` | `.claude/settings.local.json` | Plugin configuration |
| `CLAUDE.md` | `.claude/CLAUDE.md` | Project-level Claude instructions |

## How It Works

The plugin installs globally once. Commands are self-contained -- each command includes its own domain standards (Apex patterns, SOQL rules, governor limits, etc.) baked inline. No per-project rules setup is required.

```
Global (installed once via marketplace)
Location: ~/.claude/plugins/sfdx-iq/
  Agents (7)      -- Domain specialists
  Commands (21)   -- Slash commands with inline domain standards
  Hooks (5)       -- Automated quality checks
             +
Per Project (run setup-project once per repo)
Location: /your-sfdx-project/.claude/
  settings.local.json     -- Plugin configuration
  CLAUDE.md               -- Project documentation
```

**Key benefits:**
- Commands are available globally (work in any SFDX project)
- No per-project rules to copy or maintain
- Commands are self-contained -- invoke them directly, no context loading step

## Verify the Installation

Open your SFDX project in Claude Code and run:

```
/csiq-help
```

You should see the full list of available commands. Try:

```
/status    -- Check plugin and org status
/doctor    -- Diagnose environment issues
```

## CLI Tools Reference

All CLI tools are available both from the terminal (via `npx`) and as slash commands inside Claude Code:

| CLI Command | Slash Command | Description |
|---|---|---|
| `npx sfdx-iq setup-project` | `/setup-project` | Copy config to SFDX project |
| `npx sfdx-iq help` | `/csiq-help` | Show available commands |
| `npx sfdx-iq status` | `/status` | Plugin status and component counts |
| `npx sfdx-iq doctor` | `/doctor` | Diagnose environment |
| `npx sfdx-iq repair` | `/repair` | Check and repair plugin integrity |

> **Corporate VPN / blocked npm?** All CLI tools are also available as slash commands -- no npm required.

## Configuration

### Selecting a manifest

Manifests control which agents, commands, and hooks are active. Choose one that fits your role:

| Manifest | Description |
|----------|-------------|
| `default` | All components enabled (recommended for full-stack SF devs) |
| `minimal` | Core commands only: apex-class, security-scan, code-review |
| `apex-only` | Apex agents and commands; no LWC or Flow components |
| `lwc-only` | LWC agent and commands; no Apex or Flow components |
| `admin` | Flow, org-health, and data-model focused |

To switch manifests, update your project's `.claude/settings.json`:

```json
{
  "plugins": {
    "sfdx-iq": {
      "manifest": "apex-only"
    }
  }
}
```

### Hook profile

To control which automated quality checks run on file save, set the `hookProfile` in your settings:

```json
{
  "plugins": {
    "sfdx-iq": {
      "hookProfile": "standard"
    }
  }
}
```

Available profiles: `standard` (default), `minimal`, `strict`.

## Environment Setup

### JWT authentication for CI/CD

For headless CI environments, configure JWT-based auth:

1. Create a connected app in Salesforce with a digital certificate.
2. Export the private key as `server.key`.
3. Authenticate:

```bash
sf org login jwt \
  --client-id <CONSUMER_KEY> \
  --jwt-key-file server.key \
  --username <USERNAME> \
  --instance-url https://login.salesforce.com \
  --set-default
```

### DevHub setup

Enable Dev Hub in your production org, then authenticate:

```bash
sf org login web --set-default-dev-hub --alias DevHub
```

## Troubleshooting

### `sf: command not found`

The Salesforce CLI is not installed or not on your PATH. Install it from <https://developer.salesforce.com/tools/salesforcecli> and restart your terminal.

### `ERROR: auth expired`

Your org session has expired. Re-authenticate:

```bash
sf org login web --alias <your-org-alias>
```

### Plugin not loading

1. Confirm the plugin path is correct: `claude plugin list`
2. Ensure `package.json` and `.claude-plugin/plugin.json` exist in the plugin root.
3. Run the doctor script to diagnose issues:

```bash
npx sfdx-iq doctor
```

### "Not an SFDX project" error

Make sure you are in a directory that contains `sfdx-project.json` and that you have run the setup-project step.

### Validators failing on install

Run the full test suite to identify the issue:

```bash
npm test
```

This executes all component validators (agents, commands, hooks) and reports any malformed files.
