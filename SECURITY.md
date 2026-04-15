# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in sfdx-iq, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email **support@tactforce.ca** with:

- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact
- Any suggested fix (optional)

You should receive a response within 48 hours. We will work with you to understand the issue and coordinate a fix before any public disclosure.

## Scope

This policy covers the sfdx-iq plugin code, including:

- Agents, skills, commands, hooks, and rules
- CLI scripts (`scripts/`)
- Hook scripts (`scripts/hooks/`)
- Configuration templates (`.claude-project-template/`)
- MCP configurations (`mcp-configs/`)

## What This Plugin Does NOT Do

- It does **not** store or transmit Salesforce credentials
- It does **not** make network calls to external services
- It does **not** execute arbitrary code from remote sources
- All operations run locally on your machine through Claude Code and the Salesforce CLI

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (npm) | Yes |
| Older versions | Best effort |

We recommend always using the latest version from npm or the Claude Code marketplace.
