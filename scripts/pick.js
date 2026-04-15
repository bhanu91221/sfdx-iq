#!/usr/bin/env node
'use strict';

/**
 * pick.js — Interactive component picker for sfdx-iq
 *
 * Lets users interactively select which skills, rules, agents, hooks, and commands
 * to install. Shows token costs per component and running totals.
 * Outputs a custom manifest JSON that can be used with `sfdx-iq install --manifest`.
 *
 * Usage:
 *   npx sfdx-iq pick                             # Interactive picker
 *   npx sfdx-iq pick --category apex             # Filter to apex domain
 *   npx sfdx-iq pick --search "testing"          # Search by keyword
 *   npx sfdx-iq pick --output manifests/my.json  # Save manifest to file
 *   npx sfdx-iq pick --non-interactive           # Print component catalog as JSON
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { discoverSkills, discoverAgents, discoverRules } = require('./estimate-tokens');

const ROOT = path.resolve(__dirname, '..');
const COMMANDS_DIR = path.join(ROOT, 'commands');
const HOOKS_DIR = path.join(ROOT, 'hooks');

// Parse arguments
const args = process.argv.slice(2);
let categoryFilter = null;
let searchFilter = null;
let outputPath = null;
const nonInteractive = args.includes('--non-interactive');

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--category' && args[i + 1]) {
    categoryFilter = args[i + 1].toLowerCase();
    i++;
  } else if (args[i] === '--search' && args[i + 1]) {
    searchFilter = args[i + 1].toLowerCase();
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    outputPath = args[i + 1];
    i++;
  }
}

/**
 * Discover commands (just name + description from frontmatter).
 */
function discoverCommands() {
  const commands = [];
  if (!fs.existsSync(COMMANDS_DIR)) return commands;
  const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(COMMANDS_DIR, file), 'utf8');
    const match = content.match(/description:\s*(.+)/);
    commands.push({
      name: file.replace('.md', ''),
      description: match ? match[1].trim() : '',
    });
  }
  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Discover hooks (just name from filename).
 */
function discoverHooks() {
  const hooks = [];
  if (!fs.existsSync(HOOKS_DIR)) return hooks;
  const files = fs.readdirSync(HOOKS_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    hooks.push({ name: file.replace('.json', '') });
  }
  return hooks.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Apply category and search filters to a component list.
 */
function applyFilters(items) {
  let filtered = items;
  if (categoryFilter) {
    filtered = filtered.filter(i =>
      (i.domain && i.domain.toLowerCase() === categoryFilter) ||
      i.name.toLowerCase().includes(categoryFilter)
    );
  }
  if (searchFilter) {
    filtered = filtered.filter(i =>
      i.name.toLowerCase().includes(searchFilter) ||
      (i.description && i.description.toLowerCase().includes(searchFilter))
    );
  }
  return filtered;
}

/**
 * Format number with commas.
 */
function fmt(n) {
  return n.toLocaleString();
}

/**
 * Run interactive picker for a single category.
 * Returns array of selected item names.
 */
async function pickCategory(rl, title, items, showTokens) {
  if (items.length === 0) return [];

  console.log(`\n  ${title}`);
  console.log('  ' + '-'.repeat(70));

  const selected = new Set();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const num = String(i + 1).padStart(3);
    const name = item.name.padEnd(30);
    const domain = (item.domain || '').padEnd(12);
    const tokens = showTokens && item.tokens ? `~${fmt(item.tokens).padStart(6)} tok` : '';
    console.log(`  ${num}. ${name} ${domain} ${tokens}`);
  }

  const totalTokens = showTokens
    ? items.reduce((sum, i) => sum + (i.tokens || 0), 0)
    : 0;

  if (showTokens) {
    console.log(`\n  Total available: ~${fmt(totalTokens)} tokens`);
  }

  console.log(`\n  Enter numbers (e.g., 1,3,5-7), "all", "none", or domain name (e.g., "apex"):`);

  const answer = await new Promise(resolve => {
    rl.question('  > ', resolve);
  });

  const trimmed = answer.trim().toLowerCase();

  if (trimmed === 'all') {
    return items.map(i => i.name);
  }
  if (trimmed === 'none' || trimmed === '') {
    return [];
  }

  // Check if it's a domain name
  const domainItems = items.filter(i => i.domain && i.domain.toLowerCase() === trimmed);
  if (domainItems.length > 0) {
    return domainItems.map(i => i.name);
  }

  // Parse number ranges: 1,3,5-7
  const parts = trimmed.split(',');
  for (const part of parts) {
    const rangeParts = part.trim().split('-');
    if (rangeParts.length === 2) {
      const start = parseInt(rangeParts[0], 10);
      const end = parseInt(rangeParts[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let n = start; n <= end; n++) {
          if (n >= 1 && n <= items.length) selected.add(items[n - 1].name);
        }
      }
    } else {
      const n = parseInt(part.trim(), 10);
      if (!isNaN(n) && n >= 1 && n <= items.length) {
        selected.add(items[n - 1].name);
      }
    }
  }

  return Array.from(selected);
}

/**
 * Main interactive picker flow.
 * Returns a manifest object.
 */
async function runPicker(options = {}) {
  const skills = applyFilters(discoverSkills());
  const rules = applyFilters(discoverRules());
  const agents = applyFilters(discoverAgents());
  const commands = applyFilters(discoverCommands());
  const hooks = applyFilters(discoverHooks());

  if (nonInteractive || options.nonInteractive) {
    // Print JSON catalog and exit
    const catalog = { skills, rules, agents, commands, hooks };
    console.log(JSON.stringify(catalog, null, 2));
    return null;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n  ╔══════════════════════════════════════════╗');
  console.log('  ║    sfdx-iq Component Picker       ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('\n  Select components to include in your custom manifest.');
  console.log('  Token costs are shown for skills and rules (loaded at startup).');

  const selectedSkills = await pickCategory(rl, 'SKILLS (loaded on-demand by context-assigner)', skills, true);
  const selectedRules = await pickCategory(rl, 'RULES (loaded on-demand by context-assigner)', rules, true);
  const selectedAgents = await pickCategory(rl, 'AGENTS (loaded when invoked)', agents, true);
  const selectedCommands = await pickCategory(rl, 'COMMANDS (slash commands)', commands, false);
  const selectedHooks = await pickCategory(rl, 'HOOKS (auto-triggers)', hooks, false);

  rl.close();

  // Always include context-assigner
  if (!selectedAgents.includes('context-assigner')) {
    selectedAgents.unshift('context-assigner');
  }

  // Calculate totals
  const skillTokens = skills
    .filter(s => selectedSkills.includes(s.name))
    .reduce((sum, s) => sum + (s.tokens || 0), 0);
  const ruleTokens = rules
    .filter(r => selectedRules.includes(r.name))
    .reduce((sum, r) => sum + (r.tokens || 0), 0);

  const manifest = {
    name: 'custom',
    description: 'Custom manifest generated by sfdx-iq pick',
    tokenEstimate: skillTokens + ruleTokens,
    tokenBreakdown: {
      skills: skillTokens,
      rules: ruleTokens,
      agents: 0,
      commands: 0,
      hooks: 0,
    },
    components: {
      agents: selectedAgents,
      rules: selectedRules,
      skills: selectedSkills,
      commands: selectedCommands,
      hooks: selectedHooks,
    },
  };

  console.log('\n  ═══════════════════════════════════════════');
  console.log(`  Selected: ${selectedSkills.length} skills, ${selectedRules.length} rules, ${selectedAgents.length} agents, ${selectedCommands.length} commands, ${selectedHooks.length} hooks`);
  console.log(`  Estimated startup tokens: ~${fmt(skillTokens + ruleTokens)} (with dynamic loading: ~2,300)`);
  console.log('  ═══════════════════════════════════════════\n');

  return manifest;
}

// CLI execution
if (require.main === module) {
  runPicker().then(manifest => {
    if (!manifest) return; // non-interactive mode already printed

    const json = JSON.stringify(manifest, null, 2) + '\n';

    if (outputPath) {
      const outDir = path.dirname(outputPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      fs.writeFileSync(outputPath, json, 'utf8');
      console.log(`  Manifest saved to: ${outputPath}`);
      console.log(`  Install with: npx sfdx-iq install --manifest ${outputPath}\n`);
    } else {
      console.log('  Generated manifest:\n');
      console.log(json);
      console.log('  To save: npx sfdx-iq pick --output manifests/custom.json\n');
    }
  }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = { runPicker };
