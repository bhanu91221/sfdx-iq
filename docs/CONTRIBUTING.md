# Contributing

Thank you for your interest in contributing to claude-sfdx-iq. This guide covers the workflow, conventions, and requirements for submitting changes.

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork and create a feature branch:

```bash
git clone https://github.com/<your-username>/claude-sfdx-iq.git
cd claude-sfdx-iq
git checkout -b feature/your-feature-name
```

1. Install dependencies:

```bash
npm install
```

## File Format Requirements

Each component type has a specific format. All files must be valid markdown or JSON as appropriate.

### Agents (`agents/*.md`)

YAML frontmatter with required fields:

```yaml
---
name: agent-name
description: One-line description of what the agent does
tools:
  - sf
  - grep
model: claude-sonnet-4-20250514
---
```

### Skills (`skills/<name>/SKILL.md`)

Each skill lives in its own directory. The `SKILL.md` file requires:

```yaml
---
name: skill-name
description: One-line description
origin: Source reference (documentation, guide, etc.)
---
```

### Commands (`commands/*.md`)

```yaml
---
description: One-line description of the command
---
```

### Hooks (`hooks/*.json`)

```json
{
  "event": "post-edit",
  "matcher": { "files": ["**/*.cls"] },
  "hooks": [{ "command": "node", "args": ["scripts/hooks/script.js", "${file}"] }]
}
```

### Rules (`rules/<domain>/*.md`)

Plain markdown files with guidelines. No frontmatter required.

## Naming Conventions

All file names use **lowercase with hyphens**:

- Agents: `my-agent.md`
- Skills directory: `my-skill/SKILL.md`
- Commands: `my-command.md`
- Hooks: `my-hook.json`
- Rules: `my-rule.md`
- Scripts: `my-script.js`

Do not use underscores, camelCase, or spaces in file names.

## Testing

Run the full test suite before submitting:

```bash
npm test
```

This executes all validators:

- `validate-agents.js` -- Checks agent frontmatter (name, description, tools, model)
- `validate-skills.js` -- Checks skill directory structure and SKILL.md frontmatter
- `validate-commands.js` -- Checks command frontmatter (description)
- `validate-hooks.js` -- Checks hook JSON structure (event, matcher, hooks)
- `validate-rules.js` -- Checks rule file existence and readability
- `validate-install-manifests.js` -- Checks manifest references resolve

All validators must pass with zero errors.

## Pull Request Checklist

Before submitting your PR, verify:

- [ ] Frontmatter is valid for your component type
- [ ] File naming follows lowercase-hyphen convention
- [ ] `npm test` passes with no errors
- [ ] No secrets, credentials, or org-specific data in committed files
- [ ] New components are documented (description in frontmatter is clear)
- [ ] If adding a command, include a usage example in the command file
- [ ] If adding an agent, specify the tools it requires
- [ ] If adding a hook, include a timeout value

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Be respectful, constructive, and inclusive in all interactions.

## Questions

Open an issue on GitHub if you have questions about contributing or need guidance on where a feature fits within the architecture.
