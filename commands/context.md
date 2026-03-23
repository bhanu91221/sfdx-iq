---
description: Show loaded context or browse available skills and rules
---

# /context — Context Inspector

Show which skills and rules are loaded, browse available components, or reload context.

## Default (no flags)

Display what's currently loaded in this session:
- List of active skills and rules
- Approximate token usage
- If nothing loaded yet, say so and offer to run context-assigner

## Flags

| Flag | Description |
|------|-------------|
| `--list` | Show both skill and rule index tables |
| `--list skills` | Show skill index table only |
| `--list rules` | Show rule index table only |
| `--reload` | Re-invoke context-assigner for current task |

## Examples

```
/context
/context --list skills
/context --list rules
/context --reload
```

## Implementation

1. **For `--list`**: Read and display `.claude/skills/index.md` and/or `.claude/rules/index.md`
2. **For `--reload`**: Re-invoke the context-assigner agent with the current task description, load the recommended components, and display the updated context summary
3. **Default**: Summarize what the context-assigner last loaded in this session, or indicate nothing has been loaded yet and offer to analyze the current task
