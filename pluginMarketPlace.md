# Claude SFDX IQ — Plugin Distribution Guide

## Overview

This document covers how to publish, distribute, and install **claude-sfdx-iq** as a Claude Code plugin via the marketplace system.

---

## Prerequisites

- Git installed and configured
- GitHub account (https://github.com/bhanu91221)
- Claude Code CLI installed
- All tests passing (`npm test` — 416 tests, 0 failures)

---

## Step 1: Commit and Push to GitHub

```bash
cd /path/to/claude-sfdx-iq

# Initialize git (if not already)
git init

# Stage all files
git add -A

# Commit
git commit -m "Initial release: claude-sfdx-iq v1.0.0

14 agents, 36 skills, 42 commands, 44 rules, 16 hooks.
Complete Salesforce DX plugin for Claude Code.
Covers Apex, LWC, SOQL, Flows, metadata, CI/CD."

# Tag the release
git tag v1.0.0

# Add remote and push
git remote add origin https://github.com/bhanu91221/claude-sfdx-iq.git
git push -u origin main --tags
```

---

## Step 2: Plugin Manifest Structure

Your repo already has the required files:

### `.claude-plugin/plugin.json` (Plugin Definition)

```json
{
  "name": "claude-sfdx-iq",
  "version": "1.0.0",
  "description": "Complete Salesforce DX plugin for Claude Code — agents, skills, hooks, commands, and rules for Apex, LWC, SOQL, Flows, and SFDX CI/CD",
  "author": {
    "name": "Bhanu Vakati"
  },
  "homepage": "https://github.com/bhanu91221/claude-sfdx-iq",
  "repository": "https://github.com/bhanu91221/claude-sfdx-iq",
  "license": "MIT",
  "keywords": [
    "claude-code", "salesforce", "sfdx", "apex", "lwc",
    "soql", "flows", "governor-limits", "tdd", "code-review",
    "security", "workflow", "automation", "best-practices"
  ]
}
```

### `.claude-plugin/marketplace.json` (Marketplace Registry)

```json
{
  "name": "claude-sfdx-iq",
  "owner": {
    "name": "Bhanu Vakati",
    "email": "bhanu91221@github.com"
  },
  "plugins": [
    {
      "name": "claude-sfdx-iq",
      "source": ".",
      "description": "Complete Salesforce DX plugin for Claude Code — 14 agents, 36 skills, 42 commands, 44 rules, 16 hooks for Apex, LWC, SOQL, Flows, and SFDX CI/CD",
      "version": "1.0.0"
    }
  ]
}
```

---

## Recommended Distribution Model

**claude-sfdx-iq uses a hybrid approach:**

1. **Global Plugin** (via marketplace) — Agents, skills, commands, hooks
2. **Project Rules** (manual copy) — 44 rules copied to each SFDX project

### Why This Approach?

| Aspect | Marketplace | Project-Level |
|--------|------------|---------------|
| **Agents** | ✅ Global | Commands work everywhere |
| **Skills** | ✅ Global | Knowledge available everywhere |
| **Commands** | ✅ Global | Available in all projects |
| **Hooks** | ✅ Global | But only activate in SFDX projects |
| **Rules** | ❌ Not global | ✅ Copied per-project to avoid token waste |

**Token Impact:**
- Global rules = Loaded for ALL Claude sessions (~43k tokens everywhere)
- Project rules = Only loaded in SFDX projects + dynamic loading (5-15k tokens)
- **Savings: ~30k tokens per non-SFDX session**

## Distribution Options

### Option A: Self-Hosted Marketplace (Recommended)

Your GitHub repo acts as both the plugin AND the marketplace.

**Users install with 2 commands:**

```bash
# 1. Add marketplace (one-time)
/plugin marketplace add bhanu91221/claude-sfdx-iq

# 2. Install plugin (one-time)
/plugin install claude-sfdx-iq@claude-sfdx-iq

# 3. Setup each SFDX project
cd /path/to/sfdx-project
npx csiq setup-project
```

**Advantages:**
- Full control over releases
- No approval process
- Immediate availability
- Private repos supported (users need git credentials)
- **Best for: Early releases, beta testing, private teams**

### Option B: Official Anthropic Marketplace (Wider Reach)

Submit to Anthropic's official plugin registry for maximum discoverability.

**Submission links:**
- Claude.ai: https://claude.ai/settings/plugins/submit
- Console: https://platform.claude.com/plugins/submit

**Process:**
1. Go to the submission URL
2. Enter your GitHub repo URL: `https://github.com/bhanu91221/claude-sfdx-iq`
3. Anthropic reviews for quality, security, and usefulness
4. Once approved, users install with simplified commands:

```bash
# 1. Install plugin (one-time)
/plugin install claude-sfdx-iq

# 2. Setup each SFDX project
cd /path/to/sfdx-project
npx csiq setup-project
```

**Advantages:**
- Listed in official plugin directory
- One-command install (no marketplace add step)
- Anthropic quality seal
- Higher visibility to all Claude Code users
- **Best for: Public release, wide adoption**

### Option C: Direct Local Install (For Testing / Teams)

Users can clone and test locally without marketplace setup:

```bash
# Clone the repo
git clone https://github.com/bhanu91221/claude-sfdx-iq.git

# Run Claude Code with the plugin loaded
claude --plugin-dir ./claude-sfdx-iq
```

---

## How Users Install & Use the Plugin

### Installation (2-Step Process)

```bash
# Step 1: Install plugin globally
/plugin marketplace add bhanu91221/claude-sfdx-iq
/plugin install claude-sfdx-iq@claude-sfdx-iq

# Step 2: Setup each SFDX project
cd /path/to/sfdx-project
npx csiq setup-project
```

**What gets installed:**

| Location | Components | Purpose |
|----------|-----------|---------|
| `~/.claude/plugins/claude-sfdx-iq/` | Agents, skills, commands, hooks | Global availability |
| `.claude/rules/` | 44 rules (~43k tokens) | Project-specific, dynamically loaded |
| `.claude/settings.json` | Plugin configuration | Project-specific settings |
| `CLAUDE.md` | Project documentation | Project guidance |

### Using Commands

Commands use the `/csiq-*` prefix for uniqueness:

```bash
# Deploy source to org
/csiq-deploy

# Review Apex code quality
/csiq-apex-review

# Run TDD workflow
/csiq-tdd

# Full code review (parallel agents)
/csiq-code-review

# Security scan
/csiq-security-scan

# Scaffold a trigger
/csiq-scaffold-trigger

# Governor limit analysis
/csiq-governor-check

# Run Apex tests with coverage
/csiq-test
```

**Note:** If commands are namespaced (`/claude-sfdx-iq:csiq-deploy`), both forms work:
- Short: `/csiq-deploy`
- Full: `/claude-sfdx-iq:csiq-deploy`

### Verify Installation

```bash
# Check plugin is installed
/help
# Should show all /csiq-* commands

# Verify project setup
ls .claude/rules/
cat .claude/rules/index.md

# Run environment diagnostics
npx csiq doctor

# Check plugin and org status
npx csiq status
```

---

## Team Adoption

### Add to Project Settings

Teams can add the plugin to their project's `.claude/settings.json` so every team member gets it automatically:

```json
{
  "plugins": ["claude-sfdx-iq@claude-sfdx-iq"]
}
```

### Add to CLAUDE.md

Teams can reference the plugin in their project's `CLAUDE.md`:

```markdown
## Plugins

This project uses the claude-sfdx-iq plugin for Salesforce development.
Install: `/plugin marketplace add bhanu91221/claude-sfdx-iq`
Then: `/plugin install claude-sfdx-iq@claude-sfdx-iq`
```

### Copy Example CLAUDE.md

The plugin includes a ready-to-use CLAUDE.md template for SFDX projects:

```bash
cp examples/CLAUDE.md /path/to/your/sfdx-project/CLAUDE.md
```

---

## Releasing Updates

### Bump Version

1. Update version in `.claude-plugin/plugin.json`:
   ```json
   { "version": "1.1.0" }
   ```

2. Update version in `.claude-plugin/marketplace.json`:
   ```json
   { "version": "1.1.0" }
   ```

3. Update version in `package.json`:
   ```json
   { "version": "1.1.0" }
   ```

### Commit, Tag, Push

```bash
git add -A
git commit -m "Release v1.1.0: [description of changes]"
git tag v1.1.0
git push origin main --tags
```

### Users Update

```bash
# Refresh marketplace catalog
/plugin marketplace update

# Update the plugin
/plugin update claude-sfdx-iq@claude-sfdx-iq
```

Claude Code caches plugins, so version bumps trigger updates automatically.

---

## Marketplace Source Types

If you want to organize multiple plugins in a single marketplace repo, the `marketplace.json` supports these source types:

| Source Type | Example | Use Case |
|-------------|---------|----------|
| Relative path | `"source": "."` | Plugin in same repo (our setup) |
| GitHub repo | `{"source": "github", "repo": "owner/repo"}` | Plugin in separate repo |
| Git URL | `{"source": "url", "url": "https://gitlab.com/team/plugin.git"}` | Non-GitHub hosting |
| Git subdirectory | `{"source": "git-subdir", "url": "owner/repo", "path": "plugins/my-plugin"}` | Monorepo with multiple plugins |
| npm package | `{"source": "npm", "package": "@org/plugin"}` | Published to npm registry |
| pip package | `{"source": "pip", "package": "my-plugin"}` | Published to PyPI |

### Example: Multi-Plugin Marketplace

If you later create more Salesforce plugins, you can list them all:

```json
{
  "name": "bhanu91221-salesforce-plugins",
  "owner": { "name": "Bhanu Vakati" },
  "plugins": [
    {
      "name": "claude-sfdx-iq",
      "source": {"source": "github", "repo": "bhanu91221/claude-sfdx-iq"},
      "description": "Complete SFDX plugin",
      "version": "1.0.0"
    },
    {
      "name": "claude-sf-admin",
      "source": {"source": "github", "repo": "bhanu91221/claude-sf-admin"},
      "description": "Admin-focused plugin",
      "version": "1.0.0"
    }
  ]
}
```

---

## Private Distribution

For enterprise/private teams:

### Private GitHub Repo

Users need git access configured:
```bash
# Users set up GitHub token for auto-updates
export GITHUB_TOKEN=ghp_your_token_here

# Then install normally
/plugin marketplace add bhanu91221/claude-sfdx-iq
/plugin install claude-sfdx-iq@claude-sfdx-iq
```

### Internal Git Server

```bash
/plugin marketplace add https://git.internal.company.com/team/claude-sfdx-iq.git
/plugin install claude-sfdx-iq@claude-sfdx-iq
```

---

## Troubleshooting

### Plugin Not Loading

```bash
# Verify plugin structure
npx csiq repair

# Check for missing files
npx csiq doctor

# Test locally first
claude --plugin-dir ./claude-sfdx-iq
```

### Marketplace Not Found

```bash
# Verify the repo is public (or you have access)
git ls-remote https://github.com/bhanu91221/claude-sfdx-iq.git

# Re-add marketplace
/plugin marketplace remove claude-sfdx-iq
/plugin marketplace add bhanu91221/claude-sfdx-iq
```

### Version Mismatch

```bash
# Force update
/plugin marketplace update
/plugin update claude-sfdx-iq@claude-sfdx-iq --force
```

### Skills Not Appearing

```bash
# Restart Claude Code after installation
# Skills are namespaced — use full name:
/claude-sfdx-iq:deploy    # NOT just /deploy
```

---

## Quick Reference Card

| Action | Command |
|--------|---------|
| Add marketplace | `/plugin marketplace add bhanu91221/claude-sfdx-iq` |
| Install plugin | `/plugin install claude-sfdx-iq@claude-sfdx-iq` |
| Update plugin | `/plugin update claude-sfdx-iq@claude-sfdx-iq` |
| Remove plugin | `/plugin uninstall claude-sfdx-iq@claude-sfdx-iq` |
| Remove marketplace | `/plugin marketplace remove claude-sfdx-iq` |
| Test locally | `claude --plugin-dir ./claude-sfdx-iq` |
| Check status | `npx csiq status` |
| Diagnose issues | `npx csiq doctor` |
| List components | `npx csiq list` |

---

## What's Included in the Plugin

| Component | Count | Description |
|-----------|-------|-------------|
| Agents | 14 | Specialized Salesforce reviewers and planners |
| Skills | 36 | Domain knowledge (Apex, LWC, SOQL, Flows, DevOps, Security) |
| Commands | 42 | Slash commands (/deploy, /test, /tdd, /scaffold-*, etc.) |
| Rules | 44 | Always-enforced guidelines across 6 categories |
| Hook Scripts | 16 | Automated post-edit scans and quality gates |
| CLI Tools | 7 | csiq help/install/status/doctor/repair/list/plan |
| Contexts | 5 | Mode-specific contexts (develop, review, debug, deploy, admin) |
| Examples | 16 | Production-ready code examples |
| Docs | 5 | Installation, architecture, commands, customization, contributing |
