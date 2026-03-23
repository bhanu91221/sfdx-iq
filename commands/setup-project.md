---
description: Set up an SFDX project with claude-sfdx-iq rules and configuration (alternative to npx claude-sfdx-iq setup-project)
---

# /setup-project

Copy claude-sfdx-iq rules and configuration templates into the current SFDX project. Use this when `npx claude-sfdx-iq setup-project` is unavailable (e.g., corporate VPN, blocked npm).

## Workflow

### Step 1: Verify SFDX Project
Check that `sfdx-project.json` exists in the current working directory. If missing, inform the user this must be run from an SFDX project root.

### Step 2: Locate the Plugin Directory
Use Glob to search for the plugin's `rules/index.md` file in these locations:
1. `~/.claude/plugins/claude-sfdx-iq/rules/index.md`
2. `.claude/plugins/claude-sfdx-iq/rules/index.md`
3. `**/claude-sfdx-iq/rules/index.md` (fallback broad search)

The plugin root is the parent directory of the found `rules/` folder.

### Step 3: Copy Rules
For each subdirectory in the plugin's `rules/` folder (common, apex, lwc, soql, flows, metadata):
1. Read each `.md` file from the plugin's `rules/<subdomain>/` directory
2. Write each file to `.claude/rules/<subdomain>/` in the current project
3. Also copy `rules/index.md` to `.claude/rules/index.md`

If `.claude/rules/` already exists, warn the user and ask before overwriting.

### Step 4: Copy Settings Template
If `.claude/settings.json` does NOT exist:
- Read `.claude-project-template/settings.json` from the plugin directory
- Write it to `.claude/settings.json`

If it already exists, skip and inform the user.

### Step 5: Copy CLAUDE.md Template
If `CLAUDE.md` does NOT exist in the project root:
- Read `.claude-project-template/CLAUDE.md` from the plugin directory
- Write it to `CLAUDE.md` in the project root

If it already exists, skip and inform the user.

### Step 6: Display Summary

```
Setup Complete
---
Rules:     44 copied to .claude/rules/ (~43k tokens)
Settings:  [copied / skipped]
CLAUDE.md: [copied / skipped]

Token Optimization:
  context-assigner loads only 5-8 rules per task (saves ~30k tokens)

Next steps:
  /apex-review  — Review your Apex code
  /tdd          — Start test-driven development
  /deploy       — Deploy to your org
```
