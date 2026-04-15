# Contributing

Thank you for your interest in contributing to sfdx-iq. This guide covers the workflow, conventions, and requirements for submitting changes.

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork and create a feature branch:

```bash
git clone https://github.com/bhanu91221/sfdx-iq.git
cd sfdx-iq
git checkout -b feature/your-feature-name
```

3. Install dependencies:

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
model: claude-sonnet-4-6
---
```

### Commands (`commands/*.md`)

```yaml
---
description: One-line description of the command
---
```

Commands should include an inline domain standards section with the rules and patterns the command needs. This keeps the command self-contained — no external rule files or dynamic loading required.

### Hooks (`hooks/*.json`)

```json
{
  "event": "post-edit",
  "matcher": { "files": ["**/*.cls"] },
  "hooks": [{ "command": "node", "args": ["scripts/hooks/script.js", "${file}"] }]
}
```

## Naming Conventions

All file names use **lowercase with hyphens**:

- Agents: `my-agent.md`
- Commands: `my-command.md`
- Hooks: `my-hook.json`
- Scripts: `my-script.js`

Do not use underscores, camelCase, or spaces in file names.

## Testing

Run the full test suite before submitting:

```bash
npm test
```

This executes all validators:

- `validate-agents.js` -- Checks agent frontmatter (name, description, tools, model)
- `validate-commands.js` -- Checks command frontmatter (description)
- `validate-hooks.js` -- Checks hook JSON structure (event, matcher, hooks)
- `validate-install-manifests.js` -- Checks manifest references resolve

All validators must pass with zero errors.

## Pull Request Checklist

Before submitting your PR, verify:

- [ ] Frontmatter is valid for your component type
- [ ] File naming follows lowercase-hyphen convention
- [ ] `npm test` passes with no errors
- [ ] No secrets, credentials, or org-specific data in committed files
- [ ] New components are documented (description in frontmatter is clear)
- [ ] If adding a command, include inline domain standards and a usage example
- [ ] If adding an agent, specify the tools it requires and the model
- [ ] If adding a hook, include a timeout value

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Be respectful, constructive, and inclusive in all interactions.

## Questions

Open an issue on GitHub if you have questions about contributing or need guidance on where a feature fits within the architecture.
