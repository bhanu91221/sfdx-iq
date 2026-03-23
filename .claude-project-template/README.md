# Claude SFDX IQ — Project Template

This directory contains the project-level configuration template for claude-sfdx-iq.

## What's Included

- **settings.json** — Plugin configuration for this project
- **CLAUDE.md** — Project documentation template with plugin guidance

## How to Use

### Option 1: Automated Setup (Recommended)

From your Salesforce DX project root:

```bash
npx claude-sfdx-iq setup-project
# Or if npm is blocked (corporate VPN): use /setup-project slash command in Claude Code
```

This will:
1. Copy all 44 rules to `.claude/rules/`
2. Copy settings.json and CLAUDE.md to `.claude/`
3. Verify you're in an SFDX project (checks for sfdx-project.json)

### Option 2: Manual Setup

```bash
cd /path/to/your/sfdx-project

# Create .claude directory if it doesn't exist
mkdir -p .claude

# Copy rules from the plugin
cp -r ~/.claude/plugins/claude-sfdx-iq/rules ./.claude/rules

# Copy configuration templates
cp ~/.claude/plugins/claude-sfdx-iq/.claude-project-template/settings.json ./.claude/settings.json
cp ~/.claude/plugins/claude-sfdx-iq/.claude-project-template/CLAUDE.md ./CLAUDE.md
```

### Option 3: Copy from GitHub

If you haven't installed the plugin yet:

```bash
# Clone the repo temporarily
git clone https://github.com/bhanu91221/claude-sfdx-iq.git /tmp/claude-sfdx-iq

cd /path/to/your/sfdx-project
mkdir -p .claude

# Copy rules
cp -r /tmp/claude-sfdx-iq/rules ./.claude/rules

# Copy templates
cp /tmp/claude-sfdx-iq/.claude-project-template/settings.json ./.claude/settings.json
cp /tmp/claude-sfdx-iq/.claude-project-template/CLAUDE.md ./CLAUDE.md
```

## What Gets Copied

### Rules Directory (44 files, ~43k tokens total)

```
.claude/rules/
├── index.md              # Rules catalog with token counts
├── apex/                 # 9 Apex rules (~11k tokens)
├── common/               # 9 Common rules (~6k tokens)
├── lwc/                  # 6 LWC rules (~4.5k tokens)
├── soql/                 # 6 SOQL rules (~6.7k tokens)
├── flows/                # 6 Flow rules (~6.9k tokens)
└── metadata/             # 8 Metadata rules (~8k tokens)
```

**Token Optimization**: The context-assigner agent loads only 5-8 rules per task, saving ~30,000 tokens per session.

### Configuration Files

- **settings.json** — Enables the plugin for this project, configures hook profile
- **CLAUDE.md** — Project documentation with rule references and command list

## Verification

After setup, verify everything is configured:

```bash
# Check rules are installed
ls .claude/rules/

# Check settings exist
cat .claude/settings.json

# Check CLAUDE.md exists
cat CLAUDE.md
```

## Customization

### Adjust Hook Profile

Edit `.claude/settings.json`:

```json
{
  "environment": {
    "CSIQ_HOOK_PROFILE": "minimal"  // or "standard" or "strict"
  }
}
```

### Disable Specific Hooks

```json
{
  "environment": {
    "CSIQ_DISABLED_HOOKS": "post-edit-pmd-scan,post-edit-debug-warn"
  }
}
```

### Custom Project Conventions

Edit `CLAUDE.md` to add your team's conventions, integrations, and environment notes.

## Need Help?

- Run `/help` in Claude Code
- Visit: https://github.com/bhanu91221/claude-sfdx-iq
- Issues: https://github.com/bhanu91221/claude-sfdx-iq/issues
