#!/usr/bin/env node
'use strict';

/**
 * install-plan.js — Dry-run installer for sfdx-iq
 *
 * Shows what a profile/manifest would install without making changes.
 *
 * Usage:
 *   node scripts/install-plan.js --profile default
 *   node scripts/install-plan.js --manifest manifests/custom.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFESTS_DIR = path.join(ROOT, 'manifests');

// Parse arguments
const args = process.argv.slice(2);
let profileName = 'default';
let manifestPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--profile' && args[i + 1]) {
    profileName = args[i + 1];
    i++;
  } else if (args[i] === '--manifest' && args[i + 1]) {
    manifestPath = args[i + 1];
    i++;
  }
}

// Load manifest
if (!manifestPath) {
  manifestPath = path.join(MANIFESTS_DIR, `${profileName}.json`);
}

if (!fs.existsSync(manifestPath)) {
  const available = fs.readdirSync(MANIFESTS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
  console.error(`Profile "${profileName}" not found.`);
  console.error(`Available profiles: ${available.join(', ')}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (e) {
  console.error(`Failed to parse manifest: ${e.message}`);
  process.exit(1);
}

// Component resolution paths
const resolvers = {
  agents: (name) => path.join(ROOT, 'agents', `${name}.md`),
  skills: (name) => path.join(ROOT, 'skills', name, 'SKILL.md'),
  commands: (name) => path.join(ROOT, 'commands', `${name}.md`),
  hooks: (name) => path.join(ROOT, 'hooks', `${name}.json`),
  rules: (name) => path.join(ROOT, 'rules', `${name}.md`),
};

console.log(`\n📋 Installation Plan: "${manifest.name}"`);
console.log(`   ${manifest.description || ''}\n`);

let totalComponents = 0;
let missingComponents = 0;

for (const [category, items] of Object.entries(manifest.components || {})) {
  if (!Array.isArray(items) || items.length === 0) {continue;}

  const resolver = resolvers[category];
  if (!resolver) {
    console.log(`  ⚠️  Unknown category: ${category}`);
    continue;
  }

  console.log(`  ${category.toUpperCase()} (${items.length}):`);

  for (const item of items) {
    const filePath = resolver(item);
    const exists = fs.existsSync(filePath);
    const icon = exists ? '✅' : '❌';
    const relPath = path.relative(ROOT, filePath);

    console.log(`    ${icon} ${item.padEnd(35)} ${relPath}`);
    totalComponents++;
    if (!exists) {missingComponents++;}
  }
  console.log('');
}

console.log('─'.repeat(50));
console.log(`  Total components: ${totalComponents}`);
if (missingComponents > 0) {
  console.log(`  ❌ Missing: ${missingComponents} (run "npx sfdx-iq repair" to fix)`);
} else {
  console.log(`  ✅ All components available`);
}
console.log('');

if (args.includes('--dry-run')) {
  console.log('  ℹ️  Dry-run mode — no changes made.\n');
}

process.exit(missingComponents > 0 ? 1 : 0);
