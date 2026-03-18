# Customization Guide

This guide explains how to extend claude-sfdx-iq with your own agents, skills, commands, hooks, rules, and manifests.

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
model: claude-sonnet-4-20250514
---

# my-custom-agent

You are an expert at reviewing Apex batch classes...

## Instructions

1. Check that Database.Batchable is implemented correctly
2. Verify Schedulable interface if present
3. Confirm stateful tracking uses Database.Stateful
```

The agent is available immediately to commands and other agents. Agent files must use lowercase-hyphen naming (e.g., `batch-reviewer.md`).

## Adding a New Skill

Create a directory under `skills/` with a `SKILL.md` file:

```
skills/
  my-custom-skill/
    SKILL.md
```

The `SKILL.md` file requires frontmatter:

```markdown
---
name: my-custom-skill
description: Best practices for Platform Event handling
origin: Salesforce Platform Events Developer Guide
---

# Platform Event Patterns

## Publishing

- Use EventBus.publish() for single events...
```

Skills provide reference knowledge that agents consult during execution. They do not execute code directly.

## Adding a New Command

Create a markdown file in `commands/` with a `description` frontmatter field:

```markdown
---
description: Analyze Platform Event subscriptions and publish volumes
---

# /event-analysis

Analyze Platform Event usage in the current org.

## Workflow

1. Scan for Platform Event definitions in source
2. Identify all EventBus.publish() and trigger subscriptions
3. Report event volumes against daily limits
```

The file name (minus `.md`) becomes the slash command name. Use lowercase-hyphen naming.

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

## Modifying Rules

Rules live in `rules/` subdirectories organized by domain:

```
rules/
  common/     -- Applied to all files
  apex/       -- Applied to .cls and .trigger files
  lwc/        -- Applied to .js files in lwc/ directories
  soql/       -- Applied to SOQL queries
  flows/      -- Applied to .flow-meta.xml files
  metadata/   -- Applied to *-meta.xml files
```

Each rule file is a markdown document with guidelines. To add a rule, create a new `.md` file in the appropriate directory. To modify, edit the existing file directly.

To disable a rule file, add it to your project settings:

```json
{
  "plugins": {
    "claude-sfdx-iq": {
      "disabledRules": ["rules/apex/some-rule.md"]
    }
  }
}
```

## Creating Custom Manifests

Manifests control which components are active. Create a JSON file in `manifests/`:

```json
{
  "name": "my-team-config",
  "description": "Custom configuration for the platform team",
  "agents": [
    "apex-reviewer",
    "deployment-specialist",
    "governor-limits-checker",
    "security-reviewer",
    "test-guide"
  ],
  "skills": [
    "apex-patterns",
    "apex-testing",
    "deployment-strategies",
    "governor-limits"
  ],
  "commands": [
    "deploy",
    "test",
    "apex-review",
    "security-scan",
    "governor-check"
  ],
  "hooks": [
    "apex-post-edit",
    "pre-commit"
  ],
  "rules": [
    "common",
    "apex",
    "soql"
  ]
}
```

Reference your manifest in `.claude/settings.json`:

```json
{
  "plugins": {
    "claude-sfdx-iq": {
      "manifest": "my-team-config"
    }
  }
}
```

Only the components listed in the manifest will be loaded. Unlisted components are inactive but remain available if the manifest is changed later.
