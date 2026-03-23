#!/usr/bin/env node
'use strict';

/**
 * refresh-claude-md.js — Generate .claude/CLAUDE.md from template + active profile
 *
 * Reads templates/CLAUDE.md.template and replaces placeholders with values
 * from the active profile (or defaults). Writes the result to .claude/CLAUDE.md
 * in the target project directory.
 *
 * Usage:
 *   node scripts/refresh-claude-md.js [--target /path/to/project] [--profile <name>]
 *   npx claude-sfdx-iq refresh
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'templates', 'CLAUDE.md.template');
const MANIFESTS_DIR = path.join(ROOT, 'manifests');

// Parse arguments
const args = process.argv.slice(2);
let targetDir = process.cwd();
let profileName = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--target' && args[i + 1]) {
    targetDir = path.resolve(args[i + 1]);
    i++;
  } else if (args[i] === '--profile' && args[i + 1]) {
    profileName = args[i + 1];
    i++;
  }
}

// Read template
if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error(`Template not found: ${TEMPLATE_PATH}`);
  console.error('Run "npx claude-sfdx-iq repair" to restore missing files.');
  process.exit(1);
}

let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// Read active profile or manifest for token info
let activeProfileName = 'default';
let tokenEstimate = 0;
let activeRules = [];

const activeProfilePath = path.join(targetDir, '.claude', 'active-profile.json');

if (fs.existsSync(activeProfilePath)) {
  try {
    const profile = JSON.parse(fs.readFileSync(activeProfilePath, 'utf8'));
    activeProfileName = profile.baseProfile || 'custom';
    tokenEstimate = profile.tokenBudget ? profile.tokenBudget.installed : 0;
    activeRules = profile.active ? (profile.active.rules || []) : [];
  } catch (e) {
    console.warn('  Warning: Could not parse active-profile.json, using defaults.');
  }
}

// If --profile flag is set, use that manifest for token info
if (profileName) {
  const manifestPath = path.join(MANIFESTS_DIR, `${profileName}.json`);
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      activeProfileName = manifest.name || profileName;
      tokenEstimate = manifest.tokenEstimate || 0;
      activeRules = manifest.components ? (manifest.components.rules || []) : [];
    } catch (e) {
      console.warn(`  Warning: Could not parse ${profileName}.json manifest.`);
    }
  }
}

// Replace placeholders
template = template.replace('{{ACTIVE_PROFILE_NAME}}', activeProfileName);
template = template.replace('{{ACTIVE_PROFILE_TOKENS}}', tokenEstimate > 0 ? tokenEstimate.toLocaleString() : 'N/A');

// Skill index include — points to the installed index file
template = template.replace('{{SKILL_INDEX_INCLUDE}}', '@.claude/skills/index.md');

// Rule index include — points to the installed index file
template = template.replace('{{RULE_INDEX_INCLUDE}}', '@.claude/rules/index.md');

// Rule includes — by default EMPTY (dynamic loading, no pre-loaded rules)
// If active profile specifies rules to always load, add @includes for those
template = template.replace('{{RULE_INCLUDES}}', '');

// Write output
const outputDir = path.join(targetDir, '.claude');
const outputPath = path.join(outputDir, 'CLAUDE.md');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, template, 'utf8');

console.log(`\n  CLAUDE.md generated successfully.`);
console.log(`  Profile: ${activeProfileName}`);
console.log(`  Output:  ${outputPath}`);
console.log(`  Token savings: ~${tokenEstimate > 0 ? (tokenEstimate - 2300).toLocaleString() : 'N/A'} tokens vs pre-loading everything\n`);

module.exports = { generateClaudeMd: function(opts) {
  // Programmatic API for use by install-apply.js
  const tDir = opts.targetDir || process.cwd();
  const tProfile = opts.profileName || 'default';

  const manifestPath = path.join(MANIFESTS_DIR, `${tProfile}.json`);
  let tpl = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  let pName = 'default';
  let pTokens = 0;

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    pName = manifest.name || tProfile;
    pTokens = manifest.tokenEstimate || 0;
  }

  tpl = tpl.replace('{{ACTIVE_PROFILE_NAME}}', pName);
  tpl = tpl.replace('{{ACTIVE_PROFILE_TOKENS}}', pTokens > 0 ? pTokens.toLocaleString() : 'N/A');
  tpl = tpl.replace('{{SKILL_INDEX_INCLUDE}}', '@.claude/skills/index.md');
  tpl = tpl.replace('{{RULE_INDEX_INCLUDE}}', '@.claude/rules/index.md');
  tpl = tpl.replace('{{RULE_INCLUDES}}', '');

  const outDir = path.join(tDir, '.claude');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outDir, 'CLAUDE.md'), tpl, 'utf8');

  return { profileName: pName, tokenEstimate: pTokens };
}};
