# CLAUDE.md — Salesforce DX Project

## Project Overview

<!-- Describe your Salesforce project, org type, package namespace if any -->
This is a Salesforce DX project using [org type: scratch/sandbox/production].
- Namespace: [your namespace or empty]
- API Version: 62.0
- Package Type: [unlocked/managed/unmanaged]

## claude-sfdx-iq Plugin

This project uses the **claude-sfdx-iq** plugin for Salesforce development.

### Plugin Configuration
- **Installed**: v1.5.4
- **Rules**: 44 rules in `.claude/rules/` (~43k tokens total)
- **Token Optimization**: context-assigner agent loads only 5-8 rules per task (5k-15k tokens)
- **Hook Profile**: `standard` (balanced checks)

### Available Commands

Run `/help` to see all 56 commands, including:
- `/deploy` — Deploy to Salesforce org with validation
- `/test` — Run Apex tests with coverage analysis
- `/apex-review` — Review Apex code quality
- `/lwc-review` — Review LWC components
- `/security-scan` — CRUD/FLS/sharing/injection scan
- `/governor-check` — Governor limit risk analysis
- `/tdd` — Test-driven development workflow
- `/scaffold-trigger` — Generate trigger + handler + test
- `/scaffold-lwc` — Generate LWC component boilerplate
- `/code-review` — Full code review with parallel agents
- `/explain` — Explain what any file does (LWC, Apex, triggers, Flows)
- `/analyze` — Deep code analysis and field tracing across the codebase
- `/modify` — Add features or change behavior in existing Apex, LWC, or triggers

### Context Loading (Skills & Rules) — CRITICAL

Skills and rules are loaded dynamically based on each user task. This section defines how context loading works.

#### Per-Message Context Analysis

On EVERY user message that involves a Salesforce development task:

1. **Invoke the context-assigner agent** with the user's message
2. **Parse the recommendation** — the agent returns a `---CONTEXT-RECOMMENDATION---` block listing skills and rules to load
3. **Load the recommended components** using the Read tool:
   - Skills: `.claude/skills-available/<skill-name>/SKILL.md`
   - Rules: `.claude/rules/<rule-path>.md`
4. **Announce what was loaded** — ALWAYS display this summary to the user:

```
Context Loaded for: [Task description]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Skills ([count]): [comma-separated names]
Rules ([count]): [comma-separated names]
~Tokens: [estimated total]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

5. **Proceed with the task** using the loaded skill/rule knowledge

#### Context Re-evaluation

- If the user's next message **changes domain** (e.g., from Apex to LWC), re-invoke context-assigner and load fresh context
- If the user **continues in the same domain**, reuse current context (no need to re-invoke)
- If the user **explicitly asks** to reload context, re-invoke context-assigner

#### Context Delegation to Subagents

When delegating to specialized agents (e.g., apex-reviewer, lwc-reviewer, soql-optimizer):

1. **Include loaded context in the agent prompt** — When invoking a subagent via the Agent tool, include the relevant skill/rule content directly in the prompt so the subagent has access to it. Subagents run in isolated contexts and cannot see what the main agent has loaded.
2. **Domain-specific delegation** — When launching multiple agents (e.g., /code-review), each agent should receive ONLY the context relevant to its domain:
   - apex-reviewer gets: apex skills + apex rules + common rules + soql rules (SOQL is part of Apex)
   - lwc-reviewer gets: lwc skills + lwc rules + common rules
   - soql-optimizer gets: soql skills + soql rules + common rules
   - security-reviewer gets: security skills + all security rules across domains
   - governor-limits-checker gets: governor-limits skill + apex/governor-limits rule + common rules
3. **Token efficiency** — Only pass the loaded context that matches the agent's domain. Do not dump all loaded context into every agent.

#### Handling --custom Mode

If the user includes `--custom skills`, `--custom rules`, or `--custom skills rules`:

1. The context-assigner returns CUSTOM_MODE with index table(s)
2. **Display the index table(s)** to the user
3. **Ask**: "Select by number (e.g., 1,3,5-7), domain name (e.g., apex), or 'all'"
4. **Parse the user's selection** and load those items using Read tool:
   - Skills: `.claude/skills-available/<name>/SKILL.md`
   - Rules: `.claude/rules/<name>.md`
5. **Display the context summary** as above
6. **Proceed with the original task**

#### On-demand: /context

Use `/context` to inspect currently loaded context or browse available components.
- `/context` — Show what was loaded this session
- `/context --list rules` — Browse the rules catalog (does NOT load them)
- `/context --list skills` — Browse the skills catalog (does NOT load them)
- `/context --reload` — Re-run context-assigner for a fresh recommendation

## Development Workflow

- Default org alias: [your-org-alias]
- Scratch org duration: 7 days
- Scratch org definition: config/project-scratch-def.json
- Test minimum: 90% coverage
- Deployment: validate first, then quick deploy

## Architecture

- **Trigger framework**: one-trigger-per-object with handler delegation
- **Service layer**: `*Service.cls` for business logic (stateless, bulkified)
- **Selector layer**: `*Selector.cls` for SOQL (centralized queries)
- **Domain layer**: `*Domain.cls` for SObject validation/behavior
- **Test data**: `TestDataFactory.cls` for reusable test data creation

## Team Conventions

<!-- Add your team's specific conventions here -->
- Always use TestDataFactory for test data — no inline record creation
- All triggers must go through TriggerHandler framework
- Feature branches: `feature/TICKET-description`
- Commit format: `feat|fix|refactor|test: description`
- 90%+ test coverage required for all Apex classes

## External Integrations

<!-- List named credentials and their purposes -->
- [NamedCredential] — [Purpose and target system]

## Environment Notes

<!-- Any org-specific notes, limitations, or known issues -->
- [Document any org-specific configuration here]
- [Note any managed packages installed and their impact]

## Hook Configuration

Current hook profile: **standard** (balanced checks)

Available profiles:
- `minimal` — Critical checks only (fastest)
- `standard` — Balanced checks (default)
- `strict` — All checks including style warnings

To change: Set `CSIQ_HOOK_PROFILE=minimal` in `.claude/settings.json`

To disable specific hooks: Set `CSIQ_DISABLED_HOOKS="post-edit-pmd-scan,post-edit-debug-warn"`
