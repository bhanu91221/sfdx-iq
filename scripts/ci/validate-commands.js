#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../lib/frontmatter-parser');

const commandsDir = path.resolve(__dirname, '../../commands');
let hasFailures = false;
let passed = 0;
let failed = 0;

console.log('Validating command definitions...\n');

const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md'));

if (files.length === 0) {
  console.error('No command files found in commands/');
  process.exit(1);
}

for (const file of files) {
  const filePath = path.join(commandsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const { data } = parseFrontmatter(content);
  const errors = [];

  if (!data.description || typeof data.description !== 'string') {
    errors.push('missing or invalid "description" (string required)');
  }

  if (errors.length > 0) {
    console.error(`  FAIL  ${file}`);
    for (const err of errors) {
      console.error(`        - ${err}`);
    }
    hasFailures = true;
    failed++;
  } else {
    console.log(`  PASS  ${file}`);
    passed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${files.length} commands.`);

if (hasFailures) {
  process.exit(1);
}
