#!/usr/bin/env node
'use strict';

/**
 * list-installed.js — List all claude-sfdx-iq components available in the plugin
 *
 * Usage:
 *   node scripts/list-installed.js [--category agents|skills|commands|hooks|rules]
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

  // Skills
  const skillsDir = path.join(ROOT, 'skills');
  if (fs.existsSync(skillsDir)) {
    components.skills = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .filter(d => fs.existsSync(path.join(skillsDir, d.name, 'SKILL.md')))
      .map(d => d.name)
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

  // Rules
  const rulesDir = path.join(ROOT, 'rules');
  if (fs.existsSync(rulesDir)) {
    components.rules = [];
    const categories = fs.readdirSync(rulesDir, { withFileTypes: true })
      .filter(d => d.isDirectory());
    for (const cat of categories) {
      const catDir = path.join(rulesDir, cat.name);
      const files = fs.readdirSync(catDir)
        .filter(f => f.endsWith('.md'))
        .map(f => `${cat.name}/${f.replace('.md', '')}`);
      components.rules.push(...files);
    }
    components.rules.sort();
  }

  return components;
}

const components = discoverComponents();
const categoriesToShow = filterCategory
  ? { [filterCategory]: components[filterCategory] }
  : components;

console.log('\n📦 claude-sfdx-iq — Installed Components\n');

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
