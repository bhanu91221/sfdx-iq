#!/usr/bin/env node
'use strict';

/**
 * run-all.js
 *
 * Test runner that discovers and executes all test files using Node.js
 * built-in test runner (node:test). Finds all files matching test-*.js
 * or *.test.js in the tests/ directory tree.
 *
 * Usage:
 *   node tests/run-all.js           # Run all tests
 *   node tests/run-all.js --filter  # Run with Node test runner filter
 *
 * Exit codes:
 *   0 — All tests passed
 *   1 — One or more tests failed
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TESTS_DIR = path.resolve(__dirname);
const ROOT = path.resolve(__dirname, '..');

/**
 * Recursively find all test files in a directory.
 * Matches: test-*.js, *.test.js
 */
function findTestFiles(dir) {
  const results = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...findTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      // Match test-*.js or *.test.js (but not run-all.js itself)
      if (
        (entry.name.startsWith('test-') || entry.name.endsWith('.test.js')) &&
        entry.name !== 'run-all.js'
      ) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

// Discover test files
const testFiles = findTestFiles(TESTS_DIR).sort();

if (testFiles.length === 0) {
  console.error('No test files found in tests/');
  process.exit(1);
}

console.log(`\nDiscovered ${testFiles.length} test file${testFiles.length > 1 ? 's' : ''}:\n`);
for (const file of testFiles) {
  const rel = path.relative(ROOT, file);
  console.log(`  ${rel}`);
}
console.log('');

// Run all test files using Node.js built-in test runner
// --test flag enables node:test runner for the specified files
let hasFailures = false;

try {
  const fileArgs = testFiles.map(f => `"${f}"`).join(' ');
  const cmd = `node --test ${fileArgs}`;

  execSync(cmd, {
    stdio: 'inherit',
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'test' },
    timeout: 60000, // 60 second timeout
  });

  console.log('\n All tests passed.');
} catch (_e) {
  // execSync throws if the command exits non-zero
  hasFailures = true;
  console.error('\n Some tests failed.');
}

process.exit(hasFailures ? 1 : 0);
