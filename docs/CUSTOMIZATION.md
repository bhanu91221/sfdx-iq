# Customization Guide

This guide explains how to extend sfdx-iq with your own agents, commands, and hooks.

## Adding a New Agent

Create a markdown file in `agents/` with YAML frontmatter:

```markdown
---
name: my-custom-agent
description: Performs custom analysis on Apex batch classes
tools:
  - sf
  - grep
  - read_file
model: claude-sonnet-4-6
---

# my-custom-agent

You are an expert at reviewing Apex batch classes...

## Instructions

1. Check that Database.Batchable is implemented correctly
2. Verify Schedulable interface if present
3. Confirm stateful tracking uses Database.Stateful
```

The agent is available immediately to commands. Agent files must use lowercase-hyphen naming (e.g., `batch-reviewer.md`).

## Adding a New Command

Create a markdown file in `commands/` with a `description` frontmatter field:

```markdown
---
description: Analyze Platform Event subscriptions and publish volumes
---

# /event-analysis

Analyze Platform Event usage in the current org.

## Domain Standards

<!-- Include any domain-specific rules or patterns the command needs inline. -->
<!-- This replaces the need for external rule files or dynamic loading. -->

- EventBus.publish() should be called outside of DML transaction context where possible
- Daily platform event volume limits: 250,000 publish/subscribe operations
- Use CometD or Streaming API for high-volume subscriptions

## Workflow

1. Scan for Platform Event definitions in source
2. Identify all EventBus.publish() and trigger subscriptions
3. Report event volumes against daily limits

## Agent Delegation

For deep analysis, delegate to the `integration-specialist` agent.
```

The file name (minus `.md`) becomes the slash command name. Use lowercase-hyphen naming.

### Adding Flags to a Command

Document flags in the command body with a workflow section for each:

```markdown
## Flags

### --new
1. Ask for the event name and payload fields
2. Scaffold the Platform Event object definition
3. Scaffold the publisher class and subscriber trigger

### --review
1. Identify all Event definitions and subscribers in source
2. Check against Domain Standards above
3. Report findings with severity

### --refine
1. Understand the requested change
2. Apply the modification
3. Update any related subscribers or publishers
```

## Extending an Existing Command

To add domain standards or new flags to an existing command, edit the command's `.md` file directly in `commands/`. The inline standards section is plain markdown — add bullet points, tables, or sub-sections as needed.

## Adding a New Hook

Create a JSON file in `hooks/` with a matcher and hooks array:

```json
{
  "event": "post-edit",
  "matcher": {
    "files": ["**/*.cls"],
    "exclude": ["**/*Test.cls"]
  },
  "hooks": [
    {
      "command": "node",
      "args": ["scripts/hooks/my-custom-check.js", "${file}"],
      "timeout": 10000
    }
  ]
}
```

Matcher fields:

| Field | Description |
|-------|-------------|
| `files` | Glob patterns for files that trigger the hook |
| `exclude` | Glob patterns for files to skip |
| `event` | When to fire: `post-edit`, `pre-commit` |

Hook scripts receive the file path as an argument and should print findings to stdout.

## Custom Manifests

Manifests control which components are active. Create a JSON file in `manifests/`:

```json
{
  "name": "my-team-config",
  "description": "Custom configuration for the platform team",
  "agents": [
    "apex-code-reviewer",
    "devops-coordinator",
    "security-auditor"
  ],
  "commands": [
    "apex-class",
    "trigger",
    "code-review",
    "security-scan",
    "org-health",
    "plan"
  ],
  "hooks": [
    "apex-post-edit",
    "pre-commit"
  ]
}
```

Reference your manifest in `.claude/settings.json`:

```json
{
  "plugins": {
    "sfdx-iq": {
      "manifest": "my-team-config"
    }
  }
}
```

Only the components listed in the manifest will be loaded. Unlisted components are inactive but remain available if the manifest is changed later.
