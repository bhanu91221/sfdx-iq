#!/usr/bin/env node
'use strict';

/**
 * repair.js — Fix broken configurations and verify plugin integrity
 *
 * Checks all expected files exist and reports/fixes issues.
 *
 * Usage:
 *   node scripts/repair.js [--fix]
 *   npx csiq repair [--fix]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const shouldFix = process.argv.includes('--fix');

let issues = 0;
let fixed = 0;

console.log('\n🔧 claude-sfdx-iq Repair Tool\n');
console.log(`  Mode: ${shouldFix ? 'FIX (will attempt repairs)' : 'CHECK (read-only, use --fix to repair)'}\n`);

// ──────────────────────────────────────
// 1. Required directories
// ──────────────────────────────────────
const requiredDirs = [
  'agents', 'skills', 'commands', 'hooks', 'rules',
  'rules/common', 'rules/apex', 'rules/lwc', 'rules/soql', 'rules/flows', 'rules/metadata',
  'scripts', 'scripts/hooks', 'scripts/ci', 'scripts/lib',
  'schemas', 'manifests', 'mcp-configs', 'tests', 'docs', 'examples',
  '.claude-plugin',
];

console.log('  Checking directories...');
for (const dir of requiredDirs) {
  const fullPath = path.join(ROOT, dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`    ❌ Missing: ${dir}/`);
    if (shouldFix) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`       ✅ Created: ${dir}/`);
      fixed++;
    }
    issues++;
  }
}
if (issues === 0) {console.log('    ✅ All directories present');}

// ──────────────────────────────────────
// 2. Critical files
// ──────────────────────────────────────
const criticalFiles = [
  '.claude-plugin/plugin.json',
  'CLAUDE.md',
  'AGENTS.md',
  'package.json',
];

console.log('\n  Checking critical files...');
for (const file of criticalFiles) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`    ❌ Missing: ${file}`);
    issues++;
  } else {
    // Check if file is valid (non-empty)
    const content = fs.readFileSync(fullPath, 'utf8').trim();
    if (content.length === 0) {
      console.log(`    ⚠️  Empty: ${file}`);
      issues++;
    }
  }
}

// ──────────────────────────────────────
// 3. Validate manifests reference real files
// ──────────────────────────────────────
const resolvers = {
  agents: (name) => path.join(ROOT, 'agents', `${name}.md`),
  skills: (name) => path.join(ROOT, 'skills', name, 'SKILL.md'),
  commands: (name) => path.join(ROOT, 'commands', `${name}.md`),
  hooks: (name) => path.join(ROOT, 'hooks', `${name}.json`),
  rules: (name) => path.join(ROOT, 'rules', `${name}.md`),
};

console.log('\n  Checking manifest references...');
const manifestsDir = path.join(ROOT, 'manifests');
if (fs.existsSync(manifestsDir)) {
  const manifestFiles = fs.readdirSync(manifestsDir).filter(f => f.endsWith('.json'));
  for (const mf of manifestFiles) {
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(path.join(manifestsDir, mf), 'utf8'));
    } catch (_e) {
      console.log(`    ❌ Invalid JSON: ${mf}`);
      issues++;
      continue;
    }

    let brokenRefs = 0;
    for (const [category, items] of Object.entries(manifest.components || {})) {
      const resolver = resolvers[category];
      if (!resolver || !Array.isArray(items)) {continue;}
      for (const item of items) {
        if (!fs.existsSync(resolver(item))) {
          brokenRefs++;
        }
      }
    }

    if (brokenRefs > 0) {
      console.log(`    ⚠️  ${mf}: ${brokenRefs} broken reference${brokenRefs > 1 ? 's' : ''}`);
      issues++;
    } else {
      console.log(`    ✅ ${mf}`);
    }
  }
}

// ──────────────────────────────────────
// 4. Script executability
// ──────────────────────────────────────
console.log('\n  Checking scripts...');
const scriptFiles = [
  'scripts/csiq.js',
  'scripts/install-apply.js',
  'scripts/install-plan.js',
  'scripts/doctor.js',
  'scripts/status.js',
  'scripts/list-installed.js',
  'scripts/repair.js',
];

for (const sf of scriptFiles) {
  const fullPath = path.join(ROOT, sf);
  if (!fs.existsSync(fullPath)) {
    console.log(`    ❌ Missing: ${sf}`);
    issues++;
  }
}

// ──────────────────────────────────────
// 5. JSON validity
// ──────────────────────────────────────
console.log('\n  Checking JSON files...');
const jsonDirs = ['hooks', 'schemas', 'manifests', 'mcp-configs'];
for (const dir of jsonDirs) {
  const dirPath = path.join(ROOT, dir);
  if (!fs.existsSync(dirPath)) {continue;}
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  let valid = 0;
  for (const f of files) {
    try {
      JSON.parse(fs.readFileSync(path.join(dirPath, f), 'utf8'));
      valid++;
    } catch (e) {
      console.log(`    ❌ Invalid JSON: ${dir}/${f} — ${e.message}`);
      issues++;
    }
  }
  if (valid === files.length && files.length > 0) {
    console.log(`    ✅ ${dir}/ (${valid} files valid)`);
  }
}

// ──────────────────────────────────────
// Summary
// ──────────────────────────────────────
console.log('\n' + '─'.repeat(40));
if (issues === 0) {
  console.log('  ✅ No issues found — plugin is healthy!\n');
  process.exit(0);
} else {
  console.log(`  Found ${issues} issue${issues > 1 ? 's' : ''}.`);
  if (shouldFix) {
    console.log(`  Fixed ${fixed} issue${fixed > 1 ? 's' : ''}.`);
    if (issues - fixed > 0) {
      console.log(`  ${issues - fixed} issue${issues - fixed > 1 ? 's' : ''} require manual intervention.\n`);
    }
  } else {
    console.log('  Run "npx csiq repair --fix" to attempt automatic repairs.\n');
  }
  process.exit(1);
}
