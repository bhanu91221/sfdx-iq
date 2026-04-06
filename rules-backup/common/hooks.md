# Hooks — Universal Rules

## Hook System Overview

Hooks fire automatically based on file events and tool usage. They provide guardrails without requiring manual invocation.

## Hook Types

| Hook Type | Fires When | Purpose |
|-----------|-----------|---------|
| **post-edit** | After a file is saved/modified | Lint, compile check, pattern scan |
| **pre-commit** | Before a git commit | Quality gate enforcement |
| **pre-deploy** | Before sf project deploy | Validation, test level check |
| **post-deploy** | After sf project deploy | Results logging, notification |
| **session-start** | When Claude Code session begins | Detect project type, load org info |

## File-Type Routing

Hooks route to the correct linter based on file extension and path:

| File Pattern | Hook Script | Checks |
|-------------|------------|--------|
| `**/*.cls` | `apex-lint.js` | SOQL in loops, DML in loops, missing `with sharing`, hardcoded IDs |
| `**/*.trigger` | `trigger-lint.js` | Logic in trigger body, multiple triggers per object |
| `**/lwc/**/*.js` | `lwc-lint.js` | innerHTML usage, missing cleanup, @api mutation, console.log |
| `**/*.cls` (SOQL) | `soql-check.js` | Missing LIMIT, string concatenation in queries, missing bind vars |
| `**/*.flow-meta.xml` | `flow-check.js` | DML in loops, missing fault paths, missing descriptions |

## Hook Profiles

Control hook aggressiveness via environment variable:

```bash
# Minimal — only critical checks (SOQL injection, missing sharing)
export CSIQ_HOOK_PROFILE=minimal

# Standard — default balance of speed and safety (recommended)
export CSIQ_HOOK_PROFILE=standard

# Strict — all checks including style, documentation, performance
export CSIQ_HOOK_PROFILE=strict
```

## Disabling Specific Hooks

Disable individual hooks when needed (e.g., bulk refactoring):

```bash
# Disable specific hooks by ID
export CSIQ_DISABLED_HOOKS="apex-post-edit,soql-check"
```

## Hook Output Format

All hooks output findings in a consistent format:

```
[SEVERITY] file:line — message (rule-id)
```

Severities:
- **CRITICAL** — Must fix before commit (blocks pre-commit hook)
- **HIGH** — Should fix before PR
- **MEDIUM** — Recommended improvement
- **LOW** — Informational suggestion

## Hook Performance

- Hooks must complete within **5 seconds** for post-edit (file-level).
- Pre-commit hooks may take up to **30 seconds** (scanning all staged files).
- If a hook times out, it logs a warning but does not block.

## Custom Hook Development

To add a custom hook:
1. Create the script in `scripts/hooks/your-hook.js`
2. Add a JSON definition in `hooks/your-hook.json` with `matcher` and `command`
3. The script receives the file path as `$FILE` argument
4. Exit code 0 = pass, exit code 1 = findings reported
