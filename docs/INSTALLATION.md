# Installation Guide

## Prerequisites

Before installing claude-sfdx-iq, ensure you have the following:

| Requirement | Minimum Version | Check Command |
|-------------|----------------|---------------|
| Node.js | 18+ | `node --version` |
| Salesforce CLI (sf) | 2.x | `sf --version` |
| Claude Code CLI | Latest | `claude --version` |

You also need an authenticated Salesforce org. Run `sf org list` to confirm at least one org is connected.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/bhanu91221/claude-sfdx-iq.git
cd claude-sfdx-iq
```

### 2. Install dependencies

```bash
npm install
```

### 3. Register as a Claude Code plugin

```bash
claude plugin add /path/to/claude-sfdx-iq
```

### 4. Verify the installation

```bash
claude /deploy --help
claude /test --help
claude /apex-review --help
```

If the commands print their descriptions and flags, the plugin is loaded correctly.

## Configuration

### Selecting a manifest

Manifests control which components (agents, skills, commands, hooks, rules) are active. Choose one that fits your role:

| Manifest | Description |
|----------|-------------|
| `default` | All components enabled (recommended for full-stack SF devs) |
| `minimal` | Core commands only: deploy, retrieve, test |
| `apex-only` | Apex agents, skills, and rules; no LWC or Flow components |
| `lwc-only` | LWC agents, skills, and rules; no Apex or Flow components |
| `admin` | Flow, metadata, and org-health focused; no code review agents |

To switch manifests, update your project's `.claude/settings.json`:

```json
{
  "plugins": {
    "claude-sfdx-iq": {
      "manifest": "apex-only"
    }
  }
}
```

### Customizing rules

Rules in `rules/` are loaded automatically based on file type. To disable a specific rule file, add it to the `disabledRules` array in your settings.

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

### Scratch org pool

Create scratch orgs for development:

```bash
sf org create scratch \
  --definition-file config/project-scratch-def.json \
  --alias my-scratch \
  --set-default \
  --duration-days 7
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
npx csiq doctor
```

### Validators failing on install

Run the full test suite to identify the issue:

```bash
npm test
```

This executes all component validators (agents, commands, rules, skills, hooks) and reports any malformed files.
