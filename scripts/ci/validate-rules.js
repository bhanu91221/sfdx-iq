#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rulesDir = path.resolve(__dirname, '../../rules');
let hasFailures = false;
let passed = 0;
let missing = 0;

console.log('Validating rule files...\n');

const expectedRules = {
  'common': ['security.md', 'testing.md', 'governor-limits.md', 'patterns.md', 'coding-style.md', 'development-workflow.md', 'git-workflow.md', 'agents.md', 'hooks.md'],
  'apex': ['coding-style.md', 'patterns.md', 'bulkification.md', 'governor-limits.md', 'error-handling.md', 'security.md', 'testing.md', 'performance.md', 'hooks.md'],
  'lwc': ['coding-style.md', 'hooks.md', 'patterns.md', 'performance.md', 'security.md', 'testing.md'],
  'soql': ['anti-patterns.md', 'performance.md', 'query-patterns.md', 'security.md', 'coding-style.md', 'hooks.md'],
  'flows': ['best-practices.md', 'patterns.md', 'performance.md', 'security.md', 'coding-style.md', 'hooks.md'],
  'metadata': ['deployment.md', 'naming-conventions.md', 'organization.md', 'version-control.md', 'coding-style.md', 'patterns.md', 'security.md', 'hooks.md'],
};

for (const [category, files] of Object.entries(expectedRules)) {
  const categoryDir = path.join(rulesDir, category);

  if (!fs.existsSync(categoryDir)) {
    console.error(`  FAIL  rules/${category}/ - directory missing`);
    hasFailures = true;
    missing += files.length;
    continue;
  }

  for (const file of files) {
    const filePath = path.join(categoryDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`  PASS  rules/${category}/${file}`);
      passed++;
    } else {
      console.error(`  FAIL  rules/${category}/${file} - file missing`);
      hasFailures = true;
      missing++;
    }
  }
}

const total = passed + missing;
console.log(`\nResults: ${passed} found, ${missing} missing out of ${total} expected rule files.`);

if (hasFailures) {
  process.exit(1);
}
