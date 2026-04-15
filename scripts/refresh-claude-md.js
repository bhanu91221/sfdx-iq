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
 *   npx sfdx-iq refresh
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
  console.error('Run "npx sfdx-iq repair" to restore missing files.');
  process.exit(1);
}

let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// Read active profile or manifest for profile name
let activeProfileName = 'default';

const activeProfilePath = path.join(targetDir, '.claude', 'active-profile.json');

if (fs.existsSync(activeProfilePath)) {
  try {
    const profile = JSON.parse(fs.readFileSync(activeProfilePath, 'utf8'));
    activeProfileName = profile.baseProfile || 'custom';
  } catch (e) {
    console.warn('  Warning: Could not parse active-profile.json, using defaults.');
  }
}

// If --profile flag is set, use that manifest
if (profileName) {
  const manifestPath = path.join(MANIFESTS_DIR, `${profileName}.json`);
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      activeProfileName = manifest.name || profileName;
    } catch (e) {
      console.warn(`  Warning: Could not parse ${profileName}.json manifest.`);
    }
  }
}

// Replace placeholders
template = template.replace('{{ACTIVE_PROFILE_NAME}}', activeProfileName);

// Write output
const outputDir = path.join(targetDir, '.claude');
const outputPath = path.join(outputDir, 'CLAUDE.md');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, template, 'utf8');

console.log(`\n  CLAUDE.md generated successfully.`);
console.log(`  Profile: ${activeProfileName}`);
console.log(`  Output:  ${outputPath}\n`);

module.exports = { generateClaudeMd: function(opts) {
  // Programmatic API for use by install-apply.js
  const tDir = opts.targetDir || process.cwd();
  const tProfile = opts.profileName || 'default';

  const manifestPath = path.join(MANIFESTS_DIR, `${tProfile}.json`);
  let tpl = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  let pName = 'default';

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    pName = manifest.name || tProfile;
  }

  tpl = tpl.replace('{{ACTIVE_PROFILE_NAME}}', pName);

  const outDir = path.join(tDir, '.claude');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outDir, 'CLAUDE.md'), tpl, 'utf8');

  return { profileName: pName };
}};
