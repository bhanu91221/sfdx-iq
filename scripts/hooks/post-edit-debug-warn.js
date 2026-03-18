#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { formatFindings, formatSummary } = require('../lib/report-formatter');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: post-edit-debug-warn.js <file>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
const findings = [];

// Skip test classes
const isTestClass = /Test\.cls$/i.test(filePath) || /@isTest/i.test(content);
if (isTestClass) {
  console.log(`\u2705 ${path.basename(filePath)}: Test class — debug statements allowed.`);
  process.exit(0);
}

const profile = (process.env.CSIQ_HOOK_PROFILE || 'standard').toLowerCase();
const severity = profile === 'strict' ? 'MEDIUM' : 'LOW';

lines.forEach((line, idx) => {
  if (/System\.debug\s*\(/i.test(line)) {
    findings.push({
      file: filePath,
      line: idx + 1,
      severity: severity,
      message: 'System.debug() statement found. Remove before production deployment.',
      rule: 'no-debug-statements'
    });
  }
});

if (findings.length > 0) {
  console.log(formatFindings(findings));
  console.log('\n' + formatSummary(findings));
  // Never exit 1 — debug statements are warnings only
  process.exit(0);
} else {
  console.log(`\u2705 ${path.basename(filePath)}: No debug statements found.`);
}
