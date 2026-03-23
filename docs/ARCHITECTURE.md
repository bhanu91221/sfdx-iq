# Architecture

## System Overview

```
User
  |
  v
Commands (/deploy, /test, /apex-review, ...)
  |
  v
Agents (deployment-specialist, apex-reviewer, ...)
  |
  +------> Skills (deployment-strategies, apex-patterns, ...)
  |
  +------> Rules (apex/, lwc/, soql/, flows/, metadata/, common/)
  |
  v
SF CLI / External Tools (sf project deploy, sf apex run test, ...)
  |
  v
Salesforce Org
```

## Component Flow: /deploy Example

When a user runs `/deploy`, the following sequence occurs:

1. **Command layer** (`commands/deploy.md`) parses flags and validates the project structure. It checks for `sfdx-project.json` and determines the target org.

2. **Agent delegation** The deployment-specialist agent (`agents/deployment-specialist.md`) is invoked. It reads the project metadata, determines the test level, and plans the deployment strategy.

3. **Skill consultation** The agent references the deployment-strategies skill (`skills/deployment-strategies/SKILL.md`) for best practices such as test level selection, partial deploy recovery, and sandbox vs production handling.

4. **Rules enforcement** Metadata rules from `rules/metadata/` are evaluated. These enforce naming conventions, API version consistency, and required metadata fields.

5. **SF CLI execution** The agent constructs and runs the `sf project deploy start` command with appropriate flags for source path, test level, and wait time.

6. **Result reporting** Deployment results are streamed back. On failure, errors are grouped by file with line numbers. Test failures are delegated to the test-guide agent for analysis.

## Rules Loading

Rules are loaded automatically based on the file type being edited or reviewed:

| File Pattern | Rules Directory |
|-------------|----------------|
| `*.cls`, `*.trigger` | `rules/apex/` |
| `*.js` in `lwc/` | `rules/lwc/` |
| `*.soql`, SOQL in Apex | `rules/soql/` |
| `*.flow-meta.xml` | `rules/flows/` |
| `*-meta.xml` | `rules/metadata/` |
| All files | `rules/common/` |

Common rules (security, naming, documentation standards) are always loaded. Domain-specific rules are additive.

## Agent Delegation

Agents can delegate subtasks to other agents. For example, the apex-reviewer agent:

```
apex-reviewer
  |
  +---> governor-limits-checker   (analyzes SOQL/DML counts, CPU risk)
  |
  +---> security-reviewer         (checks CRUD/FLS, sharing, injection)
  |
  +---> soql-optimizer            (evaluates query selectivity, indexes)
```

Each agent has a defined set of tools it can use (specified in its frontmatter). Agents operate independently and return structured findings.

## Hook Pipeline

Hooks trigger automatically on file events. The pipeline is:

```
File Saved/Edited
  |
  v
Matcher (file pattern, e.g., *.cls)
  |
  v
Hook Script (e.g., scripts/hooks/apex-pmd-scan.js)
  |
  v
Findings Output (severity, line number, message, rule)
```

Hook definitions live in `hooks/` as JSON files. Each hook specifies:

- **matcher**: file glob pattern and event type (post-edit, pre-commit)
- **command**: the script or tool to execute
- **args**: arguments passed to the command

Example from `hooks/apex-post-edit.json`: when an Apex class is saved, the PMD scanner runs and outputs findings inline.

## Extension Points

### Adding a new agent

Create a markdown file in `agents/` with YAML frontmatter specifying `name`, `description`, `tools`, and `model`. The agent becomes available to commands and other agents immediately.

### Adding a new skill

Create a directory in `skills/` with a `SKILL.md` file containing frontmatter (`name`, `description`, `origin`). Skills provide domain knowledge that agents reference during execution.

### Adding a new command

Create a markdown file in `commands/` with `description` frontmatter. The command is registered as a slash command automatically.

### Adding a new hook

Create a JSON file in `hooks/` with `matcher` and `hooks` arrays. The hook fires whenever a matching file event occurs.

### Adding new rules

Add or edit markdown files in the appropriate `rules/` subdirectory. Rules are loaded based on file type and applied during code review and editing.

### Custom manifests

Create a JSON file in `manifests/` listing which agents, skills, commands, hooks, and rules to include. Reference it in your project settings to activate a custom configuration.
