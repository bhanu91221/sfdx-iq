#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const manifestsDir = path.resolve(__dirname, '../../manifests');
let hasFailures = false;
let passed = 0;
let failed = 0;

console.log('Validating manifest files...\n');

if (!fs.existsSync(manifestsDir)) {
  console.error('manifests/ directory not found');
  process.exit(1);
}

const files = fs.readdirSync(manifestsDir).filter(f => f.endsWith('.json'));

if (files.length === 0) {
  console.error('No manifest files found in manifests/');
  process.exit(1);
}

for (const file of files) {
  const filePath = path.join(manifestsDir, file);
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

  if (!data.name || typeof data.name !== 'string') {
    errors.push('missing or invalid "name" (string required)');
  }

  if (!data.components || typeof data.components !== 'object') {
    errors.push('missing or invalid "components" (object required)');
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

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${files.length} manifests.`);

if (hasFailures) {
  process.exit(1);
}
