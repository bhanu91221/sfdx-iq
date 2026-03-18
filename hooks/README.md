# Hook System Documentation

## Overview

Hooks are automated scripts that run in response to specific events during your development workflow. They provide real-time feedback on code quality, security, governor limits, and best practices without requiring manual invocation.

## Hook Types

| Type | Trigger | Description |
|------|---------|-------------|
| PostToolUse | After a file edit tool completes | Runs analysis after code is written or modified |
| PreToolUse | Before a command executes | Validates conditions before proceeding |
| SessionStart | When a Claude Code session begins | Sets up environment, loads context |

## Hook Profiles

Hooks are organized into profiles that control which checks run automatically:

| Profile | Level | Description |
|---------|-------|-------------|
| minimal | 1 | Critical checks only — security scan, governor limit violations |
| standard | 2 | Default — adds code style, test reminders, sharing keyword checks |
| strict | 3 | All checks enabled — includes PMD analysis, complexity warnings |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CSIQ_HOOK_PROFILE` | `standard` | Active hook profile (minimal, standard, strict) |
| `CSIQ_DISABLED_HOOKS` | (none) | Comma-separated list of hook files to disable |

### Examples

```bash
# Use minimal hooks (CI environments)
export CSIQ_HOOK_PROFILE=minimal

# Disable specific hooks
export CSIQ_DISABLED_HOOKS=flow-post-edit,soql-check

# Use strict hooks (pre-release review)
export CSIQ_HOOK_PROFILE=strict
```

## Available Hooks

| Hook File | Type | Description | Min Profile |
|-----------|------|-------------|-------------|
| `apex-post-edit.json` | PostToolUse | Apex code analysis after edit | standard |
| `trigger-post-edit.json` | PostToolUse | Trigger pattern validation | standard |
| `lwc-post-edit.json` | PostToolUse | LWC component review after edit | standard |
| `flow-post-edit.json` | PostToolUse | Flow metadata analysis after edit | standard |
| `soql-check.json` | PostToolUse | SOQL query validation | minimal |
| `pre-commit.json` | PreToolUse | Pre-commit security and quality scan | minimal |

## Hook Scripts (scripts/hooks/)

The hook JSON files reference scripts that perform the actual analysis:

- `apex-pmd-check.js` — PMD static analysis for Apex
- `governor-limit-check.js` — SOQL/DML in loops detection
- `security-scan.js` — CRUD/FLS and sharing keyword validation
- `sharing-keyword-check.js` — Ensures sharing keywords on all classes
- `soql-injection-check.js` — Dynamic SOQL injection detection
- `trigger-pattern-check.js` — One-trigger-per-object validation
- `lwc-accessibility-check.js` — LWC accessibility checks
- `flow-fault-path-check.js` — Flow fault connector validation

## Creating Custom Hooks

### Hook Configuration Format

```json
{
  "hooks": [
    {
      "type": "PostToolUse",
      "matcher": {
        "tool": "edit_file",
        "filePattern": "**/*.cls"
      },
      "hooks": [
        {
          "command": "node scripts/hooks/your-custom-check.js $FILE",
          "description": "Custom check description",
          "profile": "standard"
        }
      ]
    }
  ]
}
```

### Registration

1. Create your hook JSON file in `hooks/`
2. Create the corresponding script in `scripts/hooks/`
3. Set the `profile` field to control when it runs
4. Test with: `node scripts/hooks/your-custom-check.js <test-file>`

### Testing Hooks

```bash
# Test a hook script directly
node scripts/hooks/governor-limit-check.js force-app/main/default/classes/MyClass.cls

# Validate all hook configurations
node scripts/ci/validate-hooks.js
```

## Troubleshooting

### Hook not running
- Check that `CSIQ_HOOK_PROFILE` includes the hook's minimum profile level
- Verify the hook is not listed in `CSIQ_DISABLED_HOOKS`
- Ensure the file pattern in `matcher` matches your file

### Hook errors
- Run the hook script directly to see detailed error output
- Check that Node.js dependencies are installed (`npm install`)
- Verify file paths use forward slashes (cross-platform compatibility)

### Performance
- If hooks slow down editing, switch to `minimal` profile
- Disable non-critical hooks via `CSIQ_DISABLED_HOOKS`
- Hook scripts are designed to complete within 2 seconds
