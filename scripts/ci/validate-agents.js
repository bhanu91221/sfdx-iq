#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../lib/frontmatter-parser');

const agentsDir = path.resolve(__dirname, '../../agents');
let hasFailures = false;
let passed = 0;
let failed = 0;

console.log('Validating agent definitions...\n');

const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));

if (files.length === 0) {
  console.error('No agent files found in agents/');
  process.exit(1);
}

for (const file of files) {
  const filePath = path.join(agentsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const { data } = parseFrontmatter(content);
  const errors = [];

  if (!data.name || typeof data.name !== 'string') {
    errors.push('missing or invalid "name" (string required)');
  }

  if (!data.description || typeof data.description !== 'string') {
    errors.push('missing or invalid "description" (string required)');
  }

  if (!data.tools) {
    errors.push('missing "tools" field');
  }

  if (!data.model || typeof data.model !== 'string') {
    errors.push('missing or invalid "model" (string required)');
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

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${files.length} agents.`);

if (hasFailures) {
  process.exit(1);
}
