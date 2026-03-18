#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const hooksDir = path.resolve(__dirname, '../../hooks');
let hasFailures = false;
let passed = 0;
let failed = 0;

console.log('Validating hook definitions...\n');

const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.json'));

if (files.length === 0) {
  console.error('No hook files found in hooks/');
  process.exit(1);
}

for (const file of files) {
  const filePath = path.join(hooksDir, file);
  const errors = [];

  let data;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`  FAIL  ${file} - invalid JSON: ${e.message}`);
    hasFailures = true;
    failed++;
    continue;
  }

  if (!data.hooks || !Array.isArray(data.hooks)) {
    errors.push('missing or invalid "hooks" (array required)');
  } else {
    for (let i = 0; i < data.hooks.length; i++) {
      const hook = data.hooks[i];

      if (!hook.matcher || typeof hook.matcher !== 'object') {
        errors.push(`hooks[${i}]: missing or invalid "matcher" (object required)`);
      } else if (!hook.matcher.event && !hook.matcher.filePattern) {
        errors.push(`hooks[${i}].matcher: must have "event" or "filePattern"`);
      }

      if (!hook.command || typeof hook.command !== 'string') {
        errors.push(`hooks[${i}]: missing or invalid "command" (string required)`);
      }
    }
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

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${files.length} hooks.`);

if (hasFailures) {
  process.exit(1);
}
