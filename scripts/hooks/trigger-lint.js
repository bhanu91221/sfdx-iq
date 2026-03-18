#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { formatFindings } = require('../lib/report-formatter');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: trigger-lint.js <file>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
const findings = [];

// Extract trigger name and object
const triggerDeclRegex = /trigger\s+(\w+)\s+on\s+(\w+)\s*\(/i;
const triggerMatch = triggerDeclRegex.exec(content);
const triggerName = triggerMatch ? triggerMatch[1] : 'Unknown';
const triggerObject = triggerMatch ? triggerMatch[2] : 'Unknown';

// Check for direct logic in trigger body (should delegate to handler)
// Look for DML statements directly in the trigger
const dmlKeywords = ['insert', 'update', 'delete', 'upsert', 'undelete', 'merge'];
lines.forEach((line, idx) => {
  const trimmed = line.trim();
  for (const kw of dmlKeywords) {
    const dmlRegex = new RegExp(`^\\s*${kw}\\s+`, 'i');
    if (dmlRegex.test(trimmed)) {
      findings.push({
        file: filePath,
        line: idx + 1,
        severity: 'HIGH',
        message: `DML statement "${kw}" found directly in trigger body. Delegate to a handler class.`,
        rule: 'trigger-delegate-handler'
      });
    }
  }
});

// Check for SOQL in trigger body
lines.forEach((line, idx) => {
  if (/\[SELECT\b/i.test(line)) {
    findings.push({
      file: filePath,
      line: idx + 1,
      severity: 'HIGH',
      message: 'SOQL query found directly in trigger body. Move queries to a handler class.',
      rule: 'trigger-no-soql'
    });
  }
});

// Check for complex logic in trigger (if/else blocks, loops)
let logicLineCount = 0;
lines.forEach((line, _idx) => {
  const trimmed = line.trim();
  if (/^(if|else|for|while)\s*[\({]/.test(trimmed)) {
    logicLineCount++;
  }
});

if (logicLineCount > 2) {
  findings.push({
    file: filePath,
    line: 1,
    severity: 'MEDIUM',
    message: `Trigger "${triggerName}" contains significant logic (${logicLineCount} control structures). Delegate to a handler class.`,
    rule: 'trigger-minimal-logic'
  });
}

// Warn about multiple triggers per object (informational)
findings.push({
  file: filePath,
  line: 1,
  severity: 'LOW',
  message: `Trigger "${triggerName}" on ${triggerObject}. Ensure only one trigger exists per object.`,
  rule: 'one-trigger-per-object'
});

if (findings.length > 0) {
  console.log(formatFindings(findings));
  const hasCritical = findings.some(f => f.severity === 'CRITICAL' || f.severity === 'HIGH');
  process.exit(hasCritical ? 1 : 0);
} else {
  console.log(`\u2705 ${path.basename(filePath)}: No issues found.`);
}
