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

  const validEvents = ['PostEditFile', 'PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStop'];

  if (!data.hooks || typeof data.hooks !== 'object' || Array.isArray(data.hooks)) {
    errors.push('missing or invalid "hooks" (record/object required, not array)');
  } else {
    for (const [eventName, entries] of Object.entries(data.hooks)) {
      if (!validEvents.includes(eventName)) {
        errors.push(`hooks: unknown event "${eventName}" (valid: ${validEvents.join(', ')})`);
      }
      if (!Array.isArray(entries)) {
        errors.push(`hooks.${eventName}: must be an array`);
        continue;
      }
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (typeof entry.matcher !== 'string') {
          errors.push(`hooks.${eventName}[${i}]: missing or invalid "matcher" (string required)`);
        }
        if (!Array.isArray(entry.hooks) || entry.hooks.length === 0) {
          errors.push(`hooks.${eventName}[${i}]: missing or invalid "hooks" (non-empty array required)`);
        } else {
          for (let j = 0; j < entry.hooks.length; j++) {
            const h = entry.hooks[j];
            if (h.type !== 'command') {
              errors.push(`hooks.${eventName}[${i}].hooks[${j}]: "type" must be "command"`);
            }
            if (!h.command || typeof h.command !== 'string') {
              errors.push(`hooks.${eventName}[${i}].hooks[${j}]: missing or invalid "command" (string required)`);
            }
          }
        }
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
