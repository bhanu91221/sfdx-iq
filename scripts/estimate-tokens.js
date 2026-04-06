#!/usr/bin/env node
'use strict';

/**
 * estimate-tokens.js — Token estimator, frontmatter annotator, and index generator
 *
 * Usage:
 *   node scripts/estimate-tokens.js --update        # Write tokens + domain to frontmatter
 *   node scripts/estimate-tokens.js --check         # CI: fail if tokens are stale
 *   node scripts/estimate-tokens.js --build-index   # Generate skills/index.md + rules/index.md
 *   node scripts/estimate-tokens.js --all           # Run --update + --build-index together
 */

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./lib/frontmatter-parser');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');
const AGENTS_DIR = path.join(ROOT, 'agents');
// Rules are optional — users copy them via setup-project. Fall back to rules-backup/ for tooling.
const _primaryRulesDir = path.join(ROOT, 'rules');
const _backupRulesDir = path.join(ROOT, 'rules-backup');
const RULES_DIR = fs.existsSync(_primaryRulesDir) ? _primaryRulesDir : _backupRulesDir;

// Domain inference from skill/agent name prefixes
const DOMAIN_MAP = {
  'apex': 'apex',
  'trigger': 'apex',
  'error-handling': 'apex',
  'code-analysis': 'apex',
  'logging': 'apex',
  'tdd': 'apex',
  'lwc': 'lwc',
  'aura': 'lwc',
  'soql': 'soql',
  'sosl': 'soql',
  'flow': 'flows',
  'metadata': 'metadata',
  'packaging': 'metadata',
  'org-health': 'metadata',
  'scratch-org': 'devops',
  'salesforce-dx': 'devops',
  'ci-cd': 'devops',
  'deployment': 'devops',
  'rest-api': 'integration',
  'integration': 'integration',
  'platform-events': 'integration',
  'change-data': 'integration',
  'security': 'security',
  'shield': 'security',
  'permission': 'security',
  'experience': 'platform',
  'visualforce': 'platform',
  'data-model': 'platform',
  'governor': 'apex',
  'admin': 'admin',
  'architect': 'platform',
  'planner': 'common',
  'test-guide': 'apex',
};

/**
 * Estimate token count from file content (~4 chars per token).
 */
function estimateTokens(content) {
  return Math.ceil(content.length / 4);
}

/**
 * Infer domain from a component name using prefix matching.
 */
function inferDomain(name) {
  // Try exact match first
  if (DOMAIN_MAP[name]) return DOMAIN_MAP[name];

  // Try prefix match (longest prefix wins)
  const prefixes = Object.keys(DOMAIN_MAP).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (name.startsWith(prefix)) return DOMAIN_MAP[prefix];
  }

  return 'common';
}

/**
 * Discover all skills with frontmatter and token estimates.
 */
function discoverSkills() {
  const skills = [];
  if (!fs.existsSync(SKILLS_DIR)) return skills;

  const dirs = fs.readdirSync(SKILLS_DIR).filter(d => {
    const full = path.join(SKILLS_DIR, d);
    return fs.statSync(full).isDirectory();
  });

  for (const dir of dirs) {
    const filePath = path.join(SKILLS_DIR, dir, 'SKILL.md');
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    const { data, content: body } = parseFrontmatter(content);
    const tokens = estimateTokens(content);
    const domain = inferDomain(dir);

    skills.push({
      name: data.name || dir,
      description: data.description || '',
      origin: data.origin || 'claude-sfdx-iq',
      domain,
      tokens,
      filePath,
      rawContent: content,
      existingTokens: data.tokens ? parseInt(data.tokens, 10) : null,
      existingDomain: data.domain || null,
    });
  }

  return skills.sort((a, b) => a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name));
}

/**
 * Discover all agents with frontmatter and token estimates.
 */
function discoverAgents() {
  const agents = [];
  if (!fs.existsSync(AGENTS_DIR)) return agents;

  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(AGENTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const { data } = parseFrontmatter(content);
    const name = file.replace('.md', '');
    const tokens = estimateTokens(content);
    const domain = inferDomain(name);

    agents.push({
      name: data.name || name,
      description: data.description || '',
      tools: data.tools || '',
      model: data.model || 'sonnet',
      domain,
      tokens,
      filePath,
      rawContent: content,
      existingTokens: data.tokens ? parseInt(data.tokens, 10) : null,
      existingDomain: data.domain || null,
    });
  }

  return agents.sort((a, b) => a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name));
}

/**
 * Discover all rules (no frontmatter — use first H1 heading as description).
 */
function discoverRules() {
  const rules = [];
  if (!fs.existsSync(RULES_DIR)) return rules;

  const categories = fs.readdirSync(RULES_DIR).filter(d => {
    const full = path.join(RULES_DIR, d);
    return fs.statSync(full).isDirectory();
  });

  for (const category of categories) {
    const catDir = path.join(RULES_DIR, category);
    const files = fs.readdirSync(catDir).filter(f => f.endsWith('.md') && f !== 'README.md');

    for (const file of files) {
      const filePath = path.join(catDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const tokens = estimateTokens(content);
      const name = `${category}/${file.replace('.md', '')}`;

      // Extract first H1 or H2 as description
      const headingMatch = content.match(/^##?\s+(.+)$/m);
      const description = headingMatch ? headingMatch[1].trim() : name;

      rules.push({
        name,
        description,
        domain: category === 'common' ? 'common' : category,
        tokens,
        filePath,
      });
    }
  }

  return rules.sort((a, b) => a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name));
}

/**
 * Update frontmatter in a skill or agent file with tokens + domain fields.
 */
function updateFrontmatter(filePath, tokens, domain) {
  const content = fs.readFileSync(filePath, 'utf8');

  if (!content.startsWith('---')) {
    console.error(`  No frontmatter found in ${filePath}`);
    return false;
  }

  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) return false;

  const frontmatterBlock = content.substring(3, endIndex);
  const body = content.substring(endIndex);

  // Remove existing tokens and domain lines
  let lines = frontmatterBlock.split('\n').filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('tokens:') && !trimmed.startsWith('domain:');
  });

  // Remove trailing empty lines in frontmatter
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  // Add tokens and domain at the end
  lines.push(`tokens: ${tokens}`);
  lines.push(`domain: ${domain}`);
  lines.push('');

  const newContent = '---' + lines.join('\n') + body;
  fs.writeFileSync(filePath, newContent, 'utf8');
  return true;
}

// ============================================================
// Commands
// ============================================================

function runUpdate() {
  console.log('\nUpdating frontmatter with tokens + domain...\n');

  const skills = discoverSkills();
  let updated = 0;
  let skipped = 0;

  console.log('  SKILLS:');
  for (const skill of skills) {
    const changed = (skill.existingTokens !== skill.tokens) || (skill.existingDomain !== skill.domain);
    if (!changed) {
      skipped++;
      continue;
    }
    if (updateFrontmatter(skill.filePath, skill.tokens, skill.domain)) {
      console.log(`    Updated ${skill.name} (${skill.tokens} tokens, domain: ${skill.domain})`);
      updated++;
    }
  }

  const agents = discoverAgents();
  console.log('\n  AGENTS:');
  for (const agent of agents) {
    const changed = (agent.existingTokens !== agent.tokens) || (agent.existingDomain !== agent.domain);
    if (!changed) {
      skipped++;
      continue;
    }
    if (updateFrontmatter(agent.filePath, agent.tokens, agent.domain)) {
      console.log(`    Updated ${agent.name} (${agent.tokens} tokens, domain: ${agent.domain})`);
      updated++;
    }
  }

  console.log(`\n  Updated: ${updated}, Already current: ${skipped}\n`);
  return { updated, skipped };
}

function runCheck() {
  console.log('\nChecking frontmatter tokens + domain...\n');

  const skills = discoverSkills();
  const agents = discoverAgents();
  let stale = 0;

  for (const skill of skills) {
    if (skill.existingTokens === null) {
      console.log(`  MISSING  ${skill.name} — no tokens field`);
      stale++;
    } else if (Math.abs(skill.existingTokens - skill.tokens) > 5) {
      console.log(`  STALE    ${skill.name} — frontmatter: ${skill.existingTokens}, actual: ${skill.tokens}`);
      stale++;
    }
    if (!skill.existingDomain) {
      console.log(`  MISSING  ${skill.name} — no domain field`);
      stale++;
    }
  }

  for (const agent of agents) {
    if (agent.existingTokens === null) {
      console.log(`  MISSING  ${agent.name} — no tokens field`);
      stale++;
    } else if (Math.abs(agent.existingTokens - agent.tokens) > 5) {
      console.log(`  STALE    ${agent.name} — frontmatter: ${agent.existingTokens}, actual: ${agent.tokens}`);
      stale++;
    }
    if (!agent.existingDomain) {
      console.log(`  MISSING  ${agent.name} — no domain field`);
      stale++;
    }
  }

  if (stale > 0) {
    console.log(`\n  ${stale} issue(s) found. Run: node scripts/estimate-tokens.js --update\n`);
    process.exit(1);
  } else {
    console.log('  All frontmatter tokens + domain are current.\n');
  }
}

function runBuildIndex() {
  console.log('\nBuilding indexes...\n');

  // Re-read after potential update (so tokens in frontmatter are fresh)
  const skills = discoverSkills();
  const rules = discoverRules();

  // Build skills/index.md
  const skillLines = [
    '# Available Skills',
    '',
    'Skills are loaded automatically based on your task by the context-assigner.',
    'Use `--custom skills` in your message to manually pick skills instead.',
    '',
    '| # | Skill | Domain | ~Tokens | Description |',
    '|---|-------|--------|---------|-------------|',
  ];

  skills.forEach((s, i) => {
    const desc = s.description.length > 80 ? s.description.substring(0, 77) + '...' : s.description;
    skillLines.push(`| ${i + 1} | ${s.name} | ${s.domain} | ${s.tokens.toLocaleString()} | ${desc} |`);
  });

  const totalSkillTokens = skills.reduce((sum, s) => sum + s.tokens, 0);
  skillLines.push('');
  skillLines.push(`**Total**: ${skills.length} skills, ~${totalSkillTokens.toLocaleString()} tokens if all loaded`);
  skillLines.push('');

  const skillIndexPath = path.join(SKILLS_DIR, 'index.md');
  fs.writeFileSync(skillIndexPath, skillLines.join('\n'), 'utf8');
  console.log(`  Written: skills/index.md (${skills.length} skills, ~${estimateTokens(skillLines.join('\n'))} tokens)`);

  // Build rules/index.md
  const ruleLines = [
    '# Available Rules',
    '',
    'Rules are loaded automatically based on your task by the context-assigner.',
    'Use `--custom rules` in your message to manually pick rules instead.',
    '',
    '| # | Rule | Domain | ~Tokens | Description |',
    '|---|------|--------|---------|-------------|',
  ];

  rules.forEach((r, i) => {
    const desc = r.description.length > 80 ? r.description.substring(0, 77) + '...' : r.description;
    ruleLines.push(`| ${i + 1} | ${r.name} | ${r.domain} | ${r.tokens.toLocaleString()} | ${desc} |`);
  });

  const totalRuleTokens = rules.reduce((sum, r) => sum + r.tokens, 0);
  ruleLines.push('');
  ruleLines.push(`**Total**: ${rules.length} rules, ~${totalRuleTokens.toLocaleString()} tokens if all loaded`);
  ruleLines.push('');

  const ruleIndexPath = path.join(RULES_DIR, 'index.md');
  fs.writeFileSync(ruleIndexPath, ruleLines.join('\n'), 'utf8');
  console.log(`  Written: rules/index.md (${rules.length} rules, ~${estimateTokens(ruleLines.join('\n'))} tokens)`);

  console.log('');
}

// Export for reuse by other scripts
module.exports = { discoverSkills, discoverAgents, discoverRules, estimateTokens, inferDomain };

// ============================================================
// CLI — only runs when called directly (not when required)
// ============================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const doUpdate = args.includes('--update') || args.includes('--all');
  const doCheck = args.includes('--check');
  const doBuildIndex = args.includes('--build-index') || args.includes('--all');

  if (!doUpdate && !doCheck && !doBuildIndex) {
    console.log(`
Usage:
  node scripts/estimate-tokens.js --update        Update frontmatter tokens + domain
  node scripts/estimate-tokens.js --check         CI: fail if frontmatter is stale
  node scripts/estimate-tokens.js --build-index   Generate skills/index.md + rules/index.md
  node scripts/estimate-tokens.js --all           Run --update + --build-index
`);
    process.exit(0);
  }

  if (doUpdate) runUpdate();
  if (doBuildIndex) runBuildIndex();
  if (doCheck) runCheck();
}
