---
description: Salesforce CLI command reference and recommendation
---

# /sf-help

Accept a task description and recommend the correct Salesforce CLI (`sf`) command with appropriate flags, provide example usage, explain common flags, and show related commands.

## Workflow

1. **Accept task description**
   - Accept a natural language description of what the user wants to accomplish
   - Examples: "deploy my code", "run tests", "create a scratch org", "export data", "check org limits"
   - If no description is provided, show a menu of common task categories:
     - Org management (login, create, delete, display)
     - Source deployment (deploy, retrieve, validate)
     - Testing (run tests, check coverage)
     - Data operations (import, export, query)
     - Package management (create, install, version)
     - Metadata operations (list, describe, retrieve)

2. **Identify the correct command**
   - Map the task description to the appropriate `sf` command
   - Use the current `sf` CLI command structure (not deprecated `sfdx` commands)
   - Key command groups:
     - `sf org` — create, delete, login, logout, display, list, open
     - `sf project deploy start` — source deployment
     - `sf project retrieve start` — source retrieval
     - `sf apex run test` — run Apex tests
     - `sf apex run` — execute anonymous Apex
     - `sf data query` — SOQL queries
     - `sf data export tree` / `sf data import tree` — data operations
     - `sf package` — package creation and management
     - `sf org list limits` — governor limits
     - `sf org create scratch` — scratch org creation
     - `sf lightning generate component` — generate LWC/Aura

3. **Present the primary command**
   - Show the full command with all relevant flags
   - Explain each flag's purpose
   - Highlight required vs. optional flags
   - Show the default values for optional flags
   - Format:
     ```
     sf <command> <subcommand> --flag1 <value> --flag2 <value>
     ```

4. **Provide examples**
   - Show 3-5 example invocations from simple to complex:
     - Basic usage with minimal flags
     - Common usage with typical flags
     - Advanced usage with all relevant flags
   - Each example should include a comment explaining when to use it
   - Use realistic values in examples (not placeholders where possible)

5. **Explain common flags**
   - For the recommended command, explain the most important flags:
     - Flag name and shorthand (e.g., `--target-org` / `-o`)
     - What it controls
     - Default value
     - Common values
   - Include global flags that apply across commands:
     - `--target-org` / `-o`: specify the org
     - `--json`: output as JSON for scripting
     - `--wait` / `-w`: wait time in minutes
     - `--verbose`: detailed output

6. **Show related commands**
   - List 2-4 commands that are commonly used alongside the primary command
   - For each related command, provide a one-line description and basic example
   - Show the typical workflow sequence (e.g., retrieve then deploy then test)

7. **Include troubleshooting tips**
   - Common errors for the recommended command and their fixes
   - Permission requirements (which org permissions are needed)
   - Prerequisites (authentication, project structure, etc.)
   - Performance tips for long-running commands

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--task` | Natural language task description | Prompt user |
| `--verbose` | Show all flags including rarely used ones | `false` |
| `--json-examples` | Show JSON output examples for scripting | `false` |

## Command Categories Quick Reference

| Category | Key Commands |
|----------|-------------|
| Authentication | `sf org login web`, `sf org login sfdx-url`, `sf org logout` |
| Orgs | `sf org create scratch`, `sf org delete scratch`, `sf org list`, `sf org display` |
| Deploy | `sf project deploy start`, `sf project deploy validate`, `sf project deploy report` |
| Retrieve | `sf project retrieve start`, `sf project retrieve preview` |
| Test | `sf apex run test`, `sf apex get test` |
| Data | `sf data query`, `sf data export tree`, `sf data import tree`, `sf data upsert bulk` |
| Apex | `sf apex run`, `sf apex get log`, `sf apex tail log` |
| Package | `sf package create`, `sf package version create`, `sf package install` |
| Generate | `sf lightning generate component`, `sf apex generate class`, `sf apex generate trigger` |
| Limits | `sf org list limits`, `sf org list metadata-types` |

## Error Handling

- If the task description is ambiguous, present the top 2-3 matching commands and ask the user to clarify
- If the user references a deprecated `sfdx` command, provide the modern `sf` equivalent
- If the task cannot be done via CLI alone, explain the limitation and suggest alternatives (Setup UI, Metadata API, Tooling API)
- If the command requires a connected org and none is set, show the login command first

## Example Usage

```
/sf-help deploy my code to production
/sf-help how to run all tests in my org
/sf-help create a scratch org
/sf-help export account data as CSV
/sf-help check my org's API usage limits
/sf-help retrieve metadata from my sandbox
```
