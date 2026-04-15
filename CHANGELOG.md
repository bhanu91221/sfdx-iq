# Changelog

All notable changes to sfdx-iq will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [2.0.2] - 2026-04-15

### Changed
- Renamed plugin from `claude-sfdx-iq` to `sfdx-iq` to comply with Claude Code marketplace naming requirements (reserved `claude-` prefix)
- Updated all npm package references, binary names, plugin manifests, project templates, scripts, docs, and tests to use the new name

## [2.0.1] - 2026-04-13

### Fixed
- Dead agent references: `governor-limits-checker` in `/debug-log` (→ `apex-code-reviewer`) and `data-modeler` in `/data-model` (→ `solution-designer`)
- Removed stale `context-assigner` reference in `/setup-project` summary output
- Corrected hook count in `marketplace.json` and `AGENTS.md` (was "8 hooks", now correctly "5 hooks")
- Removed dead `rules/` references from `AGENTS.md`, `package.json`, and `scripts/status.js`
- Updated `CLAUDE.md` (repo root) to reflect v2.0.1 architecture accurately
- Fixed stale `@track` guidance in `commands/lwc.md` and `.claude-project-template/CLAUDE.md`
- Removed stale `/tdd`, `/apex-review`, `/lwc-review` references across docs

### Added
- **`/apex-test` command** — Create or improve Apex test classes; flags: `--coverage [target%]`, `--bulk`, `--mock`. Includes TestDataFactory pattern, HttpCalloutMock, bulk testing, Assert class usage.
- **`/handoff` command** — Generate session summary (`/handoff --save` writes HANDOFF.md). Captures what was built, decisions made, and next steps.
- **`agents/soql-specialist-ref.md`** — Deep SOQL reference for `apex-code-reviewer`: LDV patterns, query plan analysis, selectivity, dynamic SOQL safety, aggregate queries, anti-patterns.
- **`examples/integration/`** — 8 copy-ready Apex integration examples extracted from `integration-specialist` agent: named-credentials, rest-client, rest-resource, platform-events, change-data-capture, async-callout, retry-backoff, circuit-breaker.
- **`scripts/hooks/apex-quality-gate.js`** — Consolidated Apex hook runner. Replaces 3 separate Node.js spawns (apex-lint + governor-scan + security-scan) per `.cls` save with one profile-aware script.
- **Platform Events section** in `/async-apex` command — publish/subscribe patterns, `setResumeCheckpoint()`, PE governor limit budget separation.
- **Recursion Prevention section** in `/trigger` command — static Boolean pattern, per-operation flag pattern, TriggerHandler framework guidance.
- **Apex Controller Standards section** in `/lwc` command — sharing keywords, `@AuraEnabled` rules, `WITH USER_MODE`, `stripInaccessible()`, `AuraHandledException`.
- **Session handoff convention** in `.claude-project-template/CLAUDE.md`.
- `argument-hint` and `allowed-tools` frontmatter added to all 21 commands.

### Changed
- **Hook consolidation**: `hooks/apex-post-edit.json`, `hooks/governor-scan.json`, `hooks/security-scan.json` merged into single `apex-post-edit.json` → `apex-quality-gate.js`. Reduces per-`.cls`-save overhead from 3 Node.js processes to 1. Profile-aware: `minimal` (SOQL/DML loops only) / `standard` (+ security, default) / `strict` (all checks).
- **`integration-specialist.md`** slimmed from 612 lines (~12,000 tokens) to ~150 lines (~3,000 tokens). Code examples moved to `examples/integration/`.
- **`agents/solution-designer.md`** — Documented why Opus model is used (multi-constraint architecture reasoning).
- **`scripts/status.js`** — Removed rules and skills counting; updated component labels to match v2.0.1 structure.
- **`.claude-project-template/CLAUDE.md`** — Added `/apex-test` and `/handoff`, fixed `@track` guidance, added hook profile details, added session handoff section, removed version pin and duplicate sections.
- Removed `tokens:` field from all 7 agent frontmatter (was inaccurate since v2.0.0 rewrite).

### Removed
- **`contexts/`** directory — all 5 context files (develop.md, review.md, debug.md, deploy.md, admin.md) deleted. Orphaned v1.x mechanism, never loaded in v2.0.0. Content is covered inline in commands.
- **`skills/`** directory — empty scaffold deleted. Skills system was removed in v2.0.0; empty directory was confusing.
- `hooks/governor-scan.json` — consolidated into apex-post-edit hook
- `hooks/security-scan.json` — consolidated into apex-post-edit hook
- `validate-rules.js` and `validate-skills.js` from npm test script (no longer applicable)
- `"rules/"` and `"contexts/"` from npm package files list

## [2.0.0] - 2026-04-06

### Changed (Breaking)
- **Architecture**: Eliminated dynamic context loading system entirely. Commands are now self-contained — each includes its domain standards inline. No context-assigner invocation per message.
- **Commands**: Consolidated 56 commands → 19 domain-centric commands with `--flags` per workflow (`--new`, `--review`, `--refine`, `--bug-fix`, `--explain`).
- **Agents**: Consolidated 15 agents → 7: `apex-code-reviewer`, `solution-designer`, `devops-coordinator`, `lwc-reviewer`, `security-auditor`, `flow-analyst`, `integration-specialist`.
- **Skills system removed**: 36 skills eliminated. Domain knowledge baked directly into commands.
- **Rules no longer copied per-project**: `setup-project` no longer copies the `rules/` directory. Project setup is now just 2 config files (settings.json, CLAUDE.md).
- **Token impact**: ~11,500 fewer tokens per message (~46% reduction vs v1.x).

### Added
- `/apex-class` — New/review/refine/bug-fix for Apex classes with baked-in domain standards
- `/trigger` — New/review/refine/bug-fix for triggers with one-per-object enforcement
- `/async-apex` — New/refine/bug-fix for Batch, Queueable, Schedulable, @future
- `/integration-apex` — New/refine/bug-fix for REST/SOAP callouts and inbound services
- `/lwc` — New/explain/refine/bug-fix for Lightning Web Components
- `/flow` — New/review/refine/explain for Screen, Record-Triggered, and Scheduled Flows
- `agents/apex-code-reviewer.md` — Merged apex-reviewer + soql-optimizer + governor-limits-checker
- `agents/solution-designer.md` — Merged architect + planner
- `agents/devops-coordinator.md` — Merged deployment-specialist + test-guide + metadata-analyst
- `agents/security-auditor.md` — Renamed and streamlined security-reviewer

### Removed
- `context-assigner` agent and all dynamic rule loading infrastructure
- 36 skill files (apex-patterns, governor-limits, lwc-testing, etc.)
- 40 commands replaced by flag-based domain commands
- 12 agents (context-assigner, apex-reviewer, soql-optimizer, governor-limits-checker, architect, planner, deployment-specialist, test-guide, metadata-analyst, data-modeler, admin-advisor, security-reviewer)
- Rules no longer distributed per-project (remain in repo for reference)

### Updated
- All documentation (README, docs/ARCHITECTURE, docs/INSTALLATION, docs/COMMAND-REFERENCE, docs/CUSTOMIZATION, docs/CONTRIBUTING, AGENTS.md)
- Context files (develop, review, debug, deploy, admin) — updated agent delegation to new agent names
- All 5 install manifests rewritten for new component set
- `.claude-project-template/` — removed rules section, updated to v2.0.0

## [1.5.6] - 2026-04-03

### Fixed
- Hook command paths now use `${CLAUDE_PLUGIN_ROOT}` so scripts resolve correctly after plugin installation. Previously all 5 PostToolUse hooks used CWD-relative paths (`node scripts/hooks/<script>.js`) that broke when Claude Code was opened from a directory other than the plugin root.

### Removed
- `hooks/pre-commit.json` — used `PreToolUse` on `Bash` which fired on every bash command, not just git commits. The lint checks it ran (apex-lint, trigger-lint, lwc-lint) are already covered by PostToolUse hooks that fire on each file edit, making this hook redundant with unnecessary overhead on every bash invocation.
- Removed `pre-commit` from all 5 install manifests (`default`, `apex-only`, `minimal`, `admin`, `lwc-only`)

### Added
- `hooks/governor-scan.json` — PostToolUse on `**/*.cls`. Catches governor limit risks that apex-lint misses: `Database.query()`/`Database.insert()` dynamic DML variants, `System.enqueueJob()` in loops, HTTP callouts in loops, nested loop detection (stack-based tracker), and unbounded collection warnings.
- `hooks/destructive-warn.json` — PreToolUse on `Bash`. Intercepts destructive deploy commands, parses the destructiveChanges manifest, and lists exactly what metadata will be permanently deleted before the command executes. Near-zero overhead for non-destructive commands.
- `hooks/security-scan.json` — PostToolUse on `**/*.cls`. Adds hardcoded credentials/secrets detection, unjustified `without sharing` checks (requires inline justification comment), hardcoded URL detection, and deeper SOQL injection pattern analysis beyond what soql-check provides.
- `governor-scan` added to `default`, `apex-only`, and `minimal` manifests
- `destructive-warn` added to `default` and `admin` manifests
- `security-scan` added to `default` and `apex-only` manifests

## [1.5.5] - 2026-04-01

### Fixed
- Hook scripts now read file path from Claude Code's stdin JSON payload (`tool_input.file_path`) instead of relying on `$FILE` shell variable, which Claude Code does not set. Falls back to `process.argv[2]` for direct CLI use.
- Removed `"$FILE"` argument from all 5 PostToolUse hook commands (`apex-post-edit.json`, `trigger-post-edit.json`, `lwc-post-edit.json`, `soql-check.json`, `flow-post-edit.json`)

### Changed
- Updated `hooks/README.md` to list the actual 16 hook scripts (6 active, 10 available) replacing the outdated list of 8 non-existent script names

## [1.5.0] - 2026-03-23

### Changed
- Rewrote README.md for admin-friendly documentation
- Restructured installation guide with two clear paths (terminal vs Claude Code)
- Added dedicated "Commands for Admins" section
- Added "Who Is This For?" section with admin/developer/devops personas

### Added
- SECURITY.md for vulnerability reporting
- CODE_OF_CONDUCT.md for community standards
- GitHub issue and PR templates
- CHANGELOG.md for version tracking
- Salesforce trademark disclaimer in README

## [1.4.0] - 2026-03-22

### Changed
- Made skills non-user-invocable
- Updated setup-project script and command

## [1.3.0] - 2026-03-21

### Added
- setup-project command for per-project rule installation
- CLI tools available as slash commands

## [1.0.0] - Initial Release

### Added
- 14 specialized Salesforce agents
- 36 domain skills
- 53 slash commands
- 44 rules with dynamic loading via context-assigner
- 16 automated hook scripts
- 5 installation manifests (default, minimal, apex-only, lwc-only, admin)
- CLI tooling (doctor, repair, status, list, tokens)
- MCP server configurations
