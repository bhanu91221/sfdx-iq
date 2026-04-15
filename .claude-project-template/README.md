# Claude SFDX IQ — Project Template

This directory contains the project-level configuration template for sfdx-iq.

## What's Included

- **settings.json** — Plugin configuration for this project
- **CLAUDE.md** — Project documentation template with plugin guidance

## How to Use

### Option 1: Automated Setup (Recommended)

From your Salesforce DX project root:

```bash
npx sfdx-iq setup-project
# Or if npm is blocked (corporate VPN): use /setup-project slash command in Claude Code
```

This will:
1. Verify you're in an SFDX project (checks for sfdx-project.json)
2. Copy settings.json to `.claude/`
3. Copy CLAUDE.md to your project root

### Option 2: Manual Setup

```bash
cd /path/to/your/sfdx-project

# Create .claude directory if it doesn't exist
mkdir -p .claude

# Copy configuration templates
cp ~/.claude/plugins/sfdx-iq/.claude-project-template/settings.json ./.claude/settings.json
cp ~/.claude/plugins/sfdx-iq/.claude-project-template/CLAUDE.md ./CLAUDE.md
```

### Option 3: Copy from GitHub

If you haven't installed the plugin yet:

```bash
# Clone the repo temporarily
git clone https://github.com/bhanu91221/sfdx-iq.git /tmp/sfdx-iq

cd /path/to/your/sfdx-project
mkdir -p .claude

# Copy templates
cp /tmp/sfdx-iq/.claude-project-template/settings.json ./.claude/settings.json
cp /tmp/sfdx-iq/.claude-project-template/CLAUDE.md ./CLAUDE.md
```

## What Gets Copied

### Configuration Files

- **settings.json** — Enables the plugin for this project, configures hook profile
- **CLAUDE.md** — Project documentation with command list and team conventions

Commands are self-contained — each command includes its own domain standards (Apex patterns, SOQL rules, governor limits, etc.) baked inline. No per-project rules directory is needed.

## Verification

After setup, verify everything is configured:

```bash
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
- Visit: https://github.com/bhanu91221/sfdx-iq
- Issues: https://github.com/bhanu91221/sfdx-iq/issues
