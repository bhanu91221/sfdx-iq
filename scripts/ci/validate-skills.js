#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../lib/frontmatter-parser');

const skillsDir = path.resolve(__dirname, '../../skills');
let hasFailures = false;
let passed = 0;
let failed = 0;

console.log('Validating skill definitions...\n');

const dirs = fs.readdirSync(skillsDir).filter(d => {
  return fs.statSync(path.join(skillsDir, d)).isDirectory();
});

if (dirs.length === 0) {
  console.error('No skill directories found in skills/');
  process.exit(1);
}

for (const dir of dirs) {
  const skillFile = path.join(skillsDir, dir, 'SKILL.md');

  if (!fs.existsSync(skillFile)) {
    console.error(`  FAIL  ${dir}/ - missing SKILL.md`);
    hasFailures = true;
    failed++;
    continue;
  }

  const content = fs.readFileSync(skillFile, 'utf8');
  const { data } = parseFrontmatter(content);
  const errors = [];

  if (!data.name || typeof data.name !== 'string') {
    errors.push('missing or invalid "name" (string required)');
  }

  if (!data.description || typeof data.description !== 'string') {
    errors.push('missing or invalid "description" (string required)');
  }

  if (!data.origin || typeof data.origin !== 'string') {
    errors.push('missing or invalid "origin" (string required)');
  }

  if (errors.length > 0) {
    console.error(`  FAIL  ${dir}/SKILL.md`);
    for (const err of errors) {
      console.error(`        - ${err}`);
    }
    hasFailures = true;
    failed++;
  } else {
    console.log(`  PASS  ${dir}/SKILL.md`);
    passed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${dirs.length} skills.`);

if (hasFailures) {
  process.exit(1);
}
