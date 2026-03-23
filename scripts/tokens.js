#!/usr/bin/env node
'use strict';

/**
 * tokens.js — Token budget reporter for claude-sfdx-iq
 *
 * Usage:
 *   npx claude-sfdx-iq tokens                       # Show installed component costs
 *   npx claude-sfdx-iq tokens --profile <name>      # Show costs for a named profile
 *   npx claude-sfdx-iq tokens --all                 # Show all available components
 */

const fs = require('fs');
const path = require('path');
const { discoverSkills, discoverAgents, discoverRules, estimateTokens } = require('./estimate-tokens');

const ROOT = path.resolve(__dirname, '..');
const MANIFESTS_DIR = path.join(ROOT, 'manifests');

// Parse arguments
const args = process.argv.slice(2);
let profileName = null;
let showAll = args.includes('--all');
let targetDir = process.cwd();

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--profile' && args[i + 1]) {
    profileName = args[i + 1];
    i++;
  } else if (args[i] === '--target' && args[i + 1]) {
    targetDir = path.resolve(args[i + 1]);
    i++;
  }
}

/**
 * Format a number with commas.
 */
function fmt(n) {
  return n.toLocaleString();
}

/**
 * Print a token budget table for a set of components.
 */
function printTable(title, items, isStartup) {
  const label = isStartup ? '(loaded at startup)' : '(lazy-loaded on demand)';
  console.log(`\n  ${title} ${label}`);
  console.log('  ' + '-'.repeat(70));

  const maxName = Math.max(...items.map(i => i.name.length), 10);

  for (const item of items) {
    const name = item.name.padEnd(maxName + 2);
    const tokens = fmt(item.tokens).padStart(7);
    const domain = (item.domain || '').padEnd(12);
    console.log(`    ${name} ${domain} ~${tokens} tokens`);
  }

  const total = items.reduce((sum, i) => sum + i.tokens, 0);
  console.log('  ' + '-'.repeat(70));
  console.log(`    ${'SUBTOTAL'.padEnd(maxName + 2)} ${''.padEnd(12)} ~${fmt(total).padStart(7)} tokens`);

  return total;
}

/**
 * Filter components by a manifest's component list.
 */
function filterByManifest(components, manifestList) {
  if (!manifestList) return components;
  return components.filter(c => manifestList.includes(c.name));
}

// Main execution
console.log('\n  Token Budget Report');
console.log('  ' + '='.repeat(70));

const allSkills = discoverSkills();
const allAgents = discoverAgents();
const allRules = discoverRules();

let skills = allSkills;
let agents = allAgents;
let rules = allRules;
let reportTitle = 'All Available Components';

if (profileName) {
  // Filter by profile manifest
  const manifestPath = path.join(MANIFESTS_DIR, `${profileName}.json`);
  if (!fs.existsSync(manifestPath)) {
    const available = fs.readdirSync(MANIFESTS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
    console.error(`\n  Profile "${profileName}" not found.`);
    console.error(`  Available: ${available.join(', ')}\n`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  skills = filterByManifest(allSkills, manifest.components.skills);
  agents = filterByManifest(allAgents, manifest.components.agents);
  rules = filterByManifest(allRules, manifest.components.rules);
  reportTitle = `Profile: ${manifest.name}`;
} else if (!showAll) {
  // Show installed components (scan .claude/ in target dir)
  const claudeDir = path.join(targetDir, '.claude');
  if (fs.existsSync(claudeDir)) {
    reportTitle = `Installed (${targetDir})`;
    // For now, show all available since we haven't restructured yet
  } else {
    reportTitle = 'All Available (no .claude/ found in current directory)';
  }
}

console.log(`\n  ${reportTitle}\n`);

let startupTotal = 0;
let lazyTotal = 0;

// Skills are loaded at startup (currently)
startupTotal += printTable('SKILLS', skills, true);

// Rules are loaded at startup via CLAUDE.md @includes
startupTotal += printTable('RULES', rules, true);

// Agents are lazy-loaded
lazyTotal += printTable('AGENTS', agents, false);

// Summary
console.log('\n  ' + '='.repeat(70));
console.log(`\n  STARTUP COST (skills + rules):  ~${fmt(startupTotal)} tokens`);
console.log(`  LAZY COST (agents, on demand):  ~${fmt(lazyTotal)} tokens`);
console.log(`  TOTAL (if everything loaded):   ~${fmt(startupTotal + lazyTotal)} tokens`);

console.log(`\n  With dynamic context loading:`);
console.log(`    Startup:    ~2,300 tokens (indexes + assigner only)`);
console.log(`    Per-task:   ~8,000-15,000 tokens (auto-selected context)`);
console.log(`    Savings:    ~${fmt(Math.max(0, startupTotal - 2300))} tokens per session\n`);
