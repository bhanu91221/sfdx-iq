#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const path = require('path');

// Get staged files
const staged = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);

let hasErrors = false;

// Run apex-lint on staged .cls files
const apexFiles = staged.filter(f => f.endsWith('.cls'));
for (const file of apexFiles) {
  try {
    execSync(`node ${path.join(__dirname, 'apex-lint.js')} "${file}"`, { stdio: 'inherit' });
  } catch (_e) {
    hasErrors = true;
  }
}

// Run trigger-lint on staged .trigger files
const triggerFiles = staged.filter(f => f.endsWith('.trigger'));
for (const file of triggerFiles) {
  try {
    execSync(`node ${path.join(__dirname, 'trigger-lint.js')} "${file}"`, { stdio: 'inherit' });
  } catch (_e) {
    hasErrors = true;
  }
}

// Run lwc-lint on staged LWC JS files
const lwcFiles = staged.filter(f => f.includes('/lwc/') && f.endsWith('.js') && !f.endsWith('.test.js'));
for (const file of lwcFiles) {
  try {
    execSync(`node ${path.join(__dirname, 'lwc-lint.js')} "${file}"`, { stdio: 'inherit' });
  } catch (_e) {
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\n❌ Pre-commit checks found issues. Fix them before committing.');
  process.exit(1);
}

console.log('✅ Pre-commit checks passed.');
process.exit(0);
