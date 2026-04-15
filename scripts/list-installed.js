#!/usr/bin/env node
'use strict';

/**
 * list-installed.js — List all sfdx-iq components available in the plugin
 *
 * Usage:
 *   node scripts/list-installed.js [--category agents|commands|hooks]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Parse arguments
const args = process.argv.slice(2);
let filterCategory = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--category' && args[i + 1]) {
    filterCategory = args[i + 1];
    i++;
  }
}

/**
 * Discover components in each category.
 */
function discoverComponents() {
  const components = {};

  // Agents
  const agentsDir = path.join(ROOT, 'agents');
  if (fs.existsSync(agentsDir)) {
    components.agents = fs.readdirSync(agentsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''))
      .sort();
  }

  // Commands
  const commandsDir = path.join(ROOT, 'commands');
  if (fs.existsSync(commandsDir)) {
    components.commands = fs.readdirSync(commandsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''))
      .sort();
  }

  // Hooks
  const hooksDir = path.join(ROOT, 'hooks');
  if (fs.existsSync(hooksDir)) {
    components.hooks = fs.readdirSync(hooksDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort();
  }

  return components;
}

const components = discoverComponents();
const categoriesToShow = filterCategory
  ? { [filterCategory]: components[filterCategory] }
  : components;

console.log('\n📦 sfdx-iq — Installed Components\n');

let totalCount = 0;

for (const [category, items] of Object.entries(categoriesToShow)) {
  if (!items) {
    console.log(`  ⚠️  Unknown category: ${category}\n`);
    continue;
  }

  console.log(`  ${category.toUpperCase()} (${items.length}):`);
  for (const item of items) {
    console.log(`    • ${item}`);
  }
  console.log('');
  totalCount += items.length;
}

console.log('─'.repeat(40));
console.log(`  Total: ${totalCount} components\n`);
