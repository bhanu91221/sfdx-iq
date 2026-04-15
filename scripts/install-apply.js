#!/usr/bin/env node
'use strict';

/**
 * install-apply.js — Install sfdx-iq components into a target SFDX project
 *
 * Copies/symlinks selected components from the plugin into the user's project.
 * Components are installed to .claude/ directory in the target project.
 *
 * Usage:
 *   node scripts/install-apply.js --profile default [--target /path/to/project]
 *   node scripts/install-apply.js --manifest manifests/custom.json
 *   node scripts/install-apply.js --profile default --dry-run
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFESTS_DIR = path.join(ROOT, 'manifests');

// Parse arguments
const args = process.argv.slice(2);
let profileName = 'default';
let manifestPath = null;
let targetDir = process.cwd();
const dryRun = args.includes('--dry-run');
const interactive = args.includes('--interactive');

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--profile' && args[i + 1]) {
    profileName = args[i + 1];
    i++;
  } else if (args[i] === '--manifest' && args[i + 1]) {
    manifestPath = args[i + 1];
    i++;
  } else if (args[i] === '--target' && args[i + 1]) {
    targetDir = path.resolve(args[i + 1]);
    i++;
  }
}

if (dryRun) {
  // Redirect to install-plan
  process.argv = [process.argv[0], path.resolve(__dirname, 'install-plan.js'), ...args];
  require('./install-plan.js');
  return;
}

// Interactive mode: let user pick components before installing
if (interactive) {
  const { runPicker } = require('./pick');
  runPicker().then(manifest => {
    if (!manifest) {
      console.log('No components selected. Aborting.');
      process.exit(0);
    }
    // Save custom manifest for reuse
    const customPath = path.join(MANIFESTS_DIR, 'custom.json');
    fs.writeFileSync(customPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log(`\n  Custom manifest saved to: ${customPath}`);
    // Re-run install with the custom manifest
    process.argv = [process.argv[0], __filename, '--manifest', customPath, '--target', targetDir];
    delete require.cache[require.resolve(__filename)];
    require(__filename);
  }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
  return;
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

// Source resolution
const sourceResolvers = {
  agents: (name) => path.join(ROOT, 'agents', `${name}.md`),
  skills: (name) => path.join(ROOT, 'skills', name, 'SKILL.md'),
  commands: (name) => path.join(ROOT, 'commands', `${name}.md`),
  hooks: (name) => path.join(ROOT, 'hooks', `${name}.json`),
  rules: (name) => path.join(ROOT, 'rules', `${name}.md`),
};

// Target resolution — install into .claude/ directory of target project
// Skills go to skills-available/ (NOT skills/) to prevent auto-loading by Claude Code
const targetResolvers = {
  agents: (name) => path.join(targetDir, '.claude', 'agents', `${name}.md`),
  skills: (name) => path.join(targetDir, '.claude', 'skills-available', name, 'SKILL.md'),
  commands: (name) => path.join(targetDir, '.claude', 'commands', `${name}.md`),
  hooks: (name) => path.join(targetDir, '.claude', 'hooks', `${name}.json`),
  rules: (name) => path.join(targetDir, '.claude', 'rules', `${name}.md`),
};

/**
 * Copy a file, creating parent directories as needed.
 */
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

console.log(`\n🚀 Installing profile "${manifest.name}" into ${targetDir}\n`);

let installed = 0;
let skipped = 0;
let errors = 0;

for (const [category, items] of Object.entries(manifest.components || {})) {
  if (!Array.isArray(items) || items.length === 0) {continue;}

  const sourceResolver = sourceResolvers[category];
  const targetResolver = targetResolvers[category];
  if (!sourceResolver || !targetResolver) {continue;}

  console.log(`  ${category.toUpperCase()}:`);

  for (const item of items) {
    const src = sourceResolver(item);
    const dest = targetResolver(item);

    if (!fs.existsSync(src)) {
      console.log(`    ❌ ${item} — source not found`);
      errors++;
      continue;
    }

    if (fs.existsSync(dest)) {
      // Check if content is identical
      const srcContent = fs.readFileSync(src, 'utf8');
      const destContent = fs.readFileSync(dest, 'utf8');
      if (srcContent === destContent) {
        console.log(`    ⏭️  ${item} — already installed (identical)`);
        skipped++;
        continue;
      }
    }

    try {
      copyFile(src, dest);
      console.log(`    ✅ ${item}`);
      installed++;
    } catch (e) {
      console.log(`    ❌ ${item} — ${e.message}`);
      errors++;
    }
  }
  console.log('');
}

// Copy skill index to .claude/skills/index.md (this IS auto-loaded by Claude Code)
const skillIndexSrc = path.join(ROOT, 'skills', 'index.md');
const skillIndexDest = path.join(targetDir, '.claude', 'skills', 'index.md');
if (fs.existsSync(skillIndexSrc)) {
  try {
    copyFile(skillIndexSrc, skillIndexDest);
    console.log('  ✅ skills/index.md (skill catalog for context-assigner)\n');
    installed++;
  } catch (e) {
    console.log(`  ❌ skills/index.md — ${e.message}\n`);
    errors++;
  }
}

// Copy rule index to .claude/rules/index.md
const ruleIndexSrc = path.join(ROOT, 'rules', 'index.md');
const ruleIndexDest = path.join(targetDir, '.claude', 'rules', 'index.md');
if (fs.existsSync(ruleIndexSrc)) {
  try {
    copyFile(ruleIndexSrc, ruleIndexDest);
    console.log('  ✅ rules/index.md (rule catalog for context-assigner)\n');
    installed++;
  } catch (e) {
    console.log(`  ❌ rules/index.md — ${e.message}\n`);
    errors++;
  }
}

// Generate dynamic CLAUDE.md from template (replaces static CLAUDE.md copy)
try {
  const { generateClaudeMd } = require('./refresh-claude-md');
  const result = generateClaudeMd({ targetDir, profileName: manifest.name });
  console.log(`  ✅ CLAUDE.md generated (profile: ${result.profileName}, dynamic context loading enabled)\n`);
  installed++;
} catch (e) {
  // Fallback: copy static CLAUDE.md if template generation fails
  const targetClaudeMd = path.join(targetDir, '.claude', 'CLAUDE.md');
  const srcClaudeMd = path.join(ROOT, 'CLAUDE.md');
  if (!fs.existsSync(targetClaudeMd) && fs.existsSync(srcClaudeMd)) {
    copyFile(srcClaudeMd, targetClaudeMd);
    console.log('  ✅ CLAUDE.md copied (static fallback)\n');
    installed++;
  }
}

// Write active-profile.json for token tracking
const activeProfilePath = path.join(targetDir, '.claude', 'active-profile.json');
const activeProfile = {
  version: '1',
  installedFrom: 'sfdx-iq@2.0.2',
  baseProfile: manifest.name,
  active: {
    skills: manifest.components.skills || [],
    rules: manifest.components.rules || [],
    agents: manifest.components.agents || [],
    hooks: manifest.components.hooks || [],
  },
  inactive: {
    skills: [],
    rules: [],
    agents: [],
    hooks: [],
  },
  savedProfiles: {},
  tokenBudget: {
    active: manifest.tokenEstimate || 0,
    installed: manifest.tokenEstimate || 0,
    potential: 143684,
  },
  lastRefreshed: new Date().toISOString(),
};

try {
  const profileDir = path.dirname(activeProfilePath);
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }
  fs.writeFileSync(activeProfilePath, JSON.stringify(activeProfile, null, 2) + '\n', 'utf8');
  console.log('  ✅ active-profile.json (token tracking + profile state)\n');
  installed++;
} catch (e) {
  console.log(`  ❌ active-profile.json — ${e.message}\n`);
  errors++;
}

console.log('─'.repeat(50));
console.log(`  Installed: ${installed}`);
console.log(`  Skipped:   ${skipped} (already up-to-date)`);
if (errors > 0) {
  console.log(`  Errors:    ${errors}`);
}
console.log(`\n  Profile "${manifest.name}" installation complete.`);
console.log(`  Skills installed to .claude/skills-available/ (loaded on-demand by context-assigner)`);
console.log(`  Run "npx sfdx-iq status" to verify.\n`);

process.exit(errors > 0 ? 1 : 0);
