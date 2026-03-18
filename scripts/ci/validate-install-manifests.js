#!/usr/bin/env node
'use strict';

/**
 * validate-install-manifests.js
 *
 * Validates that every component referenced in a manifest file actually exists
 * on disk. This catches broken references (e.g., a manifest listing an agent
 * that was renamed or deleted).
 *
 * Checks:
 *   - agents/<name>.md exists
 *   - skills/<name>/SKILL.md exists
 *   - commands/<name>.md exists
 *   - hooks/<name>.json exists
 *   - rules/<path>.md exists
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const MANIFESTS_DIR = path.join(ROOT, 'manifests');

let totalPassed = 0;
let totalFailed = 0;

console.log('Validating install manifests (component references)...\n');

if (!fs.existsSync(MANIFESTS_DIR)) {
  console.error('manifests/ directory not found');
  process.exit(1);
}

const manifestFiles = fs.readdirSync(MANIFESTS_DIR).filter(f => f.endsWith('.json'));

if (manifestFiles.length === 0) {
  console.error('No manifest files found in manifests/');
  process.exit(1);
}

/**
 * Check that a file exists relative to root.
 * Returns an error string if missing, or null if ok.
 */
function checkExists(relPath) {
  const full = path.join(ROOT, relPath);
  return fs.existsSync(full) ? null : `missing: ${relPath}`;
}

/**
 * Resolve a component name to its expected file path.
 */
const resolvers = {
  agents: (name) => `agents/${name}.md`,
  skills: (name) => `skills/${name}/SKILL.md`,
  commands: (name) => `commands/${name}.md`,
  hooks: (name) => `hooks/${name}.json`,
  rules: (name) => `rules/${name}.md`,
};

for (const file of manifestFiles) {
  const filePath = path.join(MANIFESTS_DIR, file);
  const errors = [];

  let data;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`  FAIL  ${file} - invalid JSON: ${e.message}`);
    totalFailed++;
    continue;
  }

  // Validate structure
  if (!data.name || typeof data.name !== 'string') {
    errors.push('missing or invalid "name" field');
  }

  if (!data.components || typeof data.components !== 'object') {
    errors.push('missing or invalid "components" object');
  }

  // Validate each component reference exists on disk
  if (data.components) {
    for (const [category, items] of Object.entries(data.components)) {
      if (!resolvers[category]) {
        errors.push(`unknown component category: "${category}"`);
        continue;
      }

      if (!Array.isArray(items)) {
        errors.push(`"${category}" must be an array`);
        continue;
      }

      for (const item of items) {
        const relPath = resolvers[category](item);
        const err = checkExists(relPath);
        if (err) {
          errors.push(`${category}/${item} → ${err}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(`  FAIL  ${file} (${errors.length} issue${errors.length > 1 ? 's' : ''})`);
    for (const err of errors) {
      console.error(`        - ${err}`);
    }
    totalFailed++;
  } else {
    const componentCount = data.components
      ? Object.values(data.components).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
      : 0;
    console.log(`  PASS  ${file} (${componentCount} components verified)`);
    totalPassed++;
  }
}

console.log(`\nResults: ${totalPassed} passed, ${totalFailed} failed out of ${manifestFiles.length} manifests.`);

if (totalFailed > 0) {
  process.exit(1);
}
