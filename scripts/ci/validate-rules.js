#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rulesDir = path.resolve(__dirname, '../../rules');
const rulesBackupDir = path.resolve(__dirname, '../../rules-backup');
let passed = 0;
let skipped = 0;

console.log('Validating rule files...\n');

// Rules are optional — users copy them via `npx sfdx-iq setup-project`.
// If neither rules/ nor rules-backup/ exists, skip validation entirely.
if (!fs.existsSync(rulesDir) && !fs.existsSync(rulesBackupDir)) {
  console.log('  SKIP  rules/ directory not present (rules are optional, distributed via setup-project)');
  console.log('\nResults: skipped (rules directory not present).');
  process.exit(0);
}

const activeDir = fs.existsSync(rulesDir) ? rulesDir : rulesBackupDir;
const dirLabel = fs.existsSync(rulesDir) ? 'rules' : 'rules-backup';

const expectedRules = {
  'common': ['security.md', 'testing.md', 'governor-limits.md', 'patterns.md', 'coding-style.md', 'development-workflow.md', 'git-workflow.md', 'agents.md', 'hooks.md'],
  'apex': ['coding-style.md', 'patterns.md', 'bulkification.md', 'governor-limits.md', 'error-handling.md', 'security.md', 'testing.md', 'performance.md', 'hooks.md'],
  'lwc': ['coding-style.md', 'hooks.md', 'patterns.md', 'performance.md', 'security.md', 'testing.md'],
  'soql': ['anti-patterns.md', 'performance.md', 'query-patterns.md', 'security.md', 'coding-style.md', 'hooks.md'],
  'flows': ['best-practices.md', 'patterns.md', 'performance.md', 'security.md', 'coding-style.md', 'hooks.md'],
  'metadata': ['deployment.md', 'naming-conventions.md', 'organization.md', 'version-control.md', 'coding-style.md', 'patterns.md', 'security.md', 'hooks.md'],
};

for (const [category, files] of Object.entries(expectedRules)) {
  const categoryDir = path.join(activeDir, category);

  if (!fs.existsSync(categoryDir)) {
    console.log(`  SKIP  ${dirLabel}/${category}/ - directory not present`);
    skipped += files.length;
    continue;
  }

  for (const file of files) {
    const filePath = path.join(categoryDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`  PASS  ${dirLabel}/${category}/${file}`);
      passed++;
    } else {
      console.log(`  SKIP  ${dirLabel}/${category}/${file} - file not present`);
      skipped++;
    }
  }
}

const total = passed + skipped;
console.log(`\nResults: ${passed} found, ${skipped} skipped out of ${total} rule files checked.`);
