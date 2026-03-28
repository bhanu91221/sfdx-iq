---
description: Show loaded context or browse available skills and rules
---

# /context — Context Inspector

Show which skills and rules are currently loaded in this session, browse the full catalog, or reload context for a new task.

## Default (no flags)

Display the session's current context state:

1. **If context-assigner has run this session**: Show the loaded skills and rules with their token counts, the task they were loaded for, and the session token summary
2. **If context-assigner has NOT run**: Clearly state that NO rules or skills have been dynamically loaded yet, and offer two options:
   - Run context-assigner now: "Describe your current task and I'll load the right context"
   - Browse and pick manually: `/context --list rules` or `/context --list skills`

**Important**: Never report all 44 rules as "loaded" when context-assigner has not been invoked. The rules exist in `.claude/rules/` but they are NOT in active context until explicitly loaded by context-assigner or the user.

Display format:
```
Context Inspector — Current Session
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task: [task context-assigner was invoked for, or "None yet"]

Loaded Skills ([count] / 36 available):
  • [skill-name]  ~[tokens] tokens
  • ...

Loaded Rules ([count] / 44 available):
  • [domain/rule-name]  ~[tokens] tokens
  • ...

Session Token Estimate:
  Loaded context:  ~[sum] tokens
  Conversation:    ~[estimate] tokens
  Session total:   ~[total] / 200k budget
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tip: /context --reload to re-run context-assigner for your current task
```

## Flags

| Flag | Description |
|------|-------------|
| `--list` | Show both skill and rule catalog tables (does NOT load them) |
| `--list skills` | Show skill catalog table only |
| `--list rules` | Show rule catalog table only |
| `--reload` | Re-invoke context-assigner for the current task and load fresh context |

## Flag Behavior

### `--list` / `--list skills` / `--list rules`

Read and display `.claude/skills/index.md` and/or `.claude/rules/index.md` as catalog reference tables.

**These are browse-only.** Displaying the catalog does NOT load any rules or skills into context. Make this explicit to the user:
> "Showing the rules catalog for reference. Rules are NOT loaded until context-assigner selects them for your task."

### `--reload`

1. Ask the user: "Describe your current task in one sentence" (or use the last user message if clear)
2. Re-invoke the context-assigner agent with that task description
3. Load the newly recommended skills and rules
4. Display the updated context summary (announcement block)
5. Confirm: "Context reloaded. Ready to proceed."

## Examples

```
/context
/context --list skills
/context --list rules
/context --reload
```

## Implementation

1. **Default**: Check if context-assigner was invoked this session. Show loaded items if yes; show "nothing loaded" with options if no
2. **`--list`**: Read and display `.claude/skills/index.md` and/or `.claude/rules/index.md` — catalog only
3. **`--reload`**: Re-invoke context-assigner agent, load recommended components, show updated announcement block
