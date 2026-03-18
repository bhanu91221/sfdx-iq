# Claude SFDX IQ Rules System

Rules are always-follow guidelines that govern how Salesforce development work is performed. They are automatically loaded and enforced during all operations.

## Directory Structure

- **common/** — Rules that apply to all Salesforce development work regardless of technology. These cover security, testing, governor limits, design patterns, coding style, workflows, and agent coordination.
- **apex/** — Specialized rules for Apex development including class structure, design patterns, security enforcement, testing patterns, and performance optimization.
- **lwc/** — Rules for Lightning Web Component development (component structure, testing, accessibility).
- **soql/** — Rules for SOQL/SOSL query construction and optimization.
- **flows/** — Rules for Flow Builder development and best practices.
- **metadata/** — Rules for Salesforce metadata management and deployment.

## How Rules Work

1. Rules in `common/` are loaded for every Salesforce operation.
2. Technology-specific directories add additional rules when working in that context.
3. Rules are cumulative — specific rules extend common rules, they do not override them.
4. When rules conflict, the more specific rule takes precedence.

## Adding New Rules

Create a markdown file in the appropriate directory. No YAML frontmatter is needed — write actionable guidelines directly in markdown. Keep rules concrete, with code examples where they add clarity.
