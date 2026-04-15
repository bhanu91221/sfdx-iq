# Privacy Policy

**Last updated:** March 23, 2026

## Overview

sfdx-iq is an open-source Claude Code plugin that runs entirely on your local machine. This policy explains what data the plugin accesses, how it is used, and what it does NOT do.

## What the Plugin Accesses

When you use sfdx-iq, the plugin may read:

- **Your local project files** -- Apex classes, LWC components, flows, metadata, and configuration files in your Salesforce project folder
- **Salesforce CLI output** -- Results from `sf` commands you run (deployments, test results, org status)
- **Git history** -- Commit logs and diffs in your local repository

All of this happens locally on your machine through Claude Code. The plugin itself does not initiate any of these reads -- Claude Code does, based on your instructions.

## What the Plugin Does NOT Do

- **Does not collect or transmit your data** -- The plugin has no servers, APIs, or analytics
- **Does not store Salesforce credentials** -- Authentication is handled entirely by the Salesforce CLI (`sf org login`)
- **Does not make network calls** -- No telemetry, no tracking, no phoning home
- **Does not execute remote code** -- All agents, skills, commands, and rules are static files that run locally
- **Does not access your Salesforce org directly** -- Any org interaction goes through the Salesforce CLI, which you control

## How Claude Code Works

This plugin runs inside **Claude Code**, which is developed by Anthropic. When you use Claude Code:

- Your prompts and code context are sent to Anthropic's API for processing
- Anthropic's [privacy policy](https://www.anthropic.com/privacy) and [terms of service](https://www.anthropic.com/terms) govern how that data is handled
- Claude Code does not use your data to train models (see Anthropic's usage policy for details)

This plugin does not change or extend how Claude Code communicates with Anthropic. It only provides local configuration files (agents, skills, commands, rules) that guide Claude's responses.

## Third-Party Services

The plugin does not integrate with any third-party services. However, your development workflow may involve:

| Service | What it does | Governed by |
|---------|-------------|-------------|
| **Anthropic (Claude Code)** | Processes your prompts and code context | [Anthropic Privacy Policy](https://www.anthropic.com/privacy) |
| **Salesforce CLI** | Connects to your Salesforce org | [Salesforce Privacy Policy](https://www.salesforce.com/company/privacy/) |
| **npm** | Distributes the plugin package | [npm Privacy Policy](https://docs.npmjs.com/policies/privacy) |
| **GitHub** | Hosts the source code | [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) |

## Data Stored on Your Machine

The plugin copies configuration files to two locations:

1. **Global plugin directory** (`~/.claude/plugins/sfdx-iq/`) -- Agents, skills, commands, and hooks
2. **Your project folder** (`.claude/rules/`, `.claude/settings.json`, `.claude/CLAUDE.md`) -- Rules and project configuration

These are plain text files (Markdown and JSON). They contain no personal data, credentials, or org-specific information. You can inspect, modify, or delete them at any time.

## Children's Privacy

This plugin is a developer tool and is not directed at children under the age of 13.

## Changes to This Policy

We may update this policy as the plugin evolves. Changes will be noted in the [CHANGELOG](CHANGELOG.md) and reflected in the "Last updated" date above.

## Contact

If you have questions about this privacy policy, email **support@tactforce.ca**.
