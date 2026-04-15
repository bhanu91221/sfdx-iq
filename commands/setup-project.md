---
description: Set up an SFDX project with sfdx-iq rules and configuration (alternative to npx sfdx-iq setup-project)
argument-hint: ""
allowed-tools: [Read, Write, Glob, Bash]
---

# /setup-project

Copy sfdx-iq rules and configuration templates into the current SFDX project. Use this when `npx sfdx-iq setup-project` is unavailable (e.g., corporate VPN, blocked npm).

## Workflow

### Step 1: Verify SFDX Project
Check that `sfdx-project.json` exists in the current working directory. If missing, inform the user this must be run from an SFDX project root.

### Step 2: Locate the Plugin Directory
Use Glob to search for the plugin's `CLAUDE.md` template in these locations:
1. `~/.claude/plugins/sfdx-iq/.claude-project-template/CLAUDE.md`
2. `.claude/plugins/sfdx-iq/.claude-project-template/CLAUDE.md`
3. `**/sfdx-iq/.claude-project-template/CLAUDE.md` (fallback broad search)

The plugin root is the parent directory of the found `.claude-project-template/` folder.

### Step 3: Copy Settings Template
If `.claude/settings.json` does NOT exist:
- Read `.claude-project-template/settings.json` from the plugin directory
- Write it to `.claude/settings.json`

If it already exists, skip and inform the user.

### Step 5: Copy CLAUDE.md Template
If `CLAUDE.md` does NOT exist in the project root:
- Read `.claude-project-template/CLAUDE.md` from the plugin directory
- Write it to `.claude/CLAUDE.md` in the project root

If it already exists, skip and inform the user.

### Step 5: Display Summary

```
Setup Complete
---
Settings:  [copied / skipped]
CLAUDE.md: [copied / skipped]

Next steps:
  /apex-class --review  — Review your Apex code
  /code-review          — Full code review across Apex, LWC, and Flows
  /apex-test            — Create or improve Apex test classes
  /status               — Check plugin and org status
```
