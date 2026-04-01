#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { formatFindings } = require('../lib/report-formatter');

// Claude Code passes hook input as JSON on stdin; fall back to argv for direct CLI use
function getFilePath() {
  if (process.argv[2]) return process.argv[2];
  try {
    const stdin = fs.readFileSync('/dev/stdin', 'utf8');
    const data = JSON.parse(stdin);
    return (data.tool_input && (data.tool_input.file_path || data.tool_input.path)) || null;
  } catch (_) {
    return null;
  }
}

const filePath = getFilePath();

if (!filePath) {
  console.error('Usage: lwc-lint.js <file>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
const findings = [];

// Check for innerHTML usage (XSS risk)
lines.forEach((line, idx) => {
  if (/\.innerHTML\s*=/.test(line)) {
    findings.push({
      file: filePath,
      line: idx + 1,
      severity: 'CRITICAL',
      message: 'Direct innerHTML assignment detected. Use lwc:dom="manual" or template directives to prevent XSS.',
      rule: 'no-innerhtml'
    });
  }
});

// Check for @api property mutation
const apiProperties = [];
lines.forEach((line, idx) => {
  const apiMatch = line.match(/@api\s+(\w+)/);
  if (apiMatch) {
    apiProperties.push({ name: apiMatch[1], line: idx + 1 });
  }
});

lines.forEach((line, idx) => {
  for (const prop of apiProperties) {
    const mutationRegex = new RegExp(`this\\.${prop.name}\\s*=`, 'g');
    if (mutationRegex.test(line)) {
      findings.push({
        file: filePath,
        line: idx + 1,
        severity: 'HIGH',
        message: `Mutation of @api property "${prop.name}". Public properties should not be reassigned by the component.`,
        rule: 'no-api-mutation'
      });
    }
  }
});

// Check for missing disconnectedCallback cleanup
const hasConnectedCallback = /connectedCallback\s*\(\s*\)/.test(content);
const hasDisconnectedCallback = /disconnectedCallback\s*\(\s*\)/.test(content);
const hasEventListener = /addEventListener\s*\(/.test(content);
const hasSetInterval = /setInterval\s*\(/.test(content);
const hasSetTimeout = /setTimeout\s*\(/.test(content);

if (hasConnectedCallback && !hasDisconnectedCallback && (hasEventListener || hasSetInterval || hasSetTimeout)) {
  findings.push({
    file: filePath,
    line: 1,
    severity: 'HIGH',
    message: 'Component has connectedCallback with listeners/timers but no disconnectedCallback for cleanup.',
    rule: 'require-disconnected-cleanup'
  });
}

// Check for console.log left in code
lines.forEach((line, idx) => {
  if (/console\.(log|debug|info|warn|error)\s*\(/.test(line)) {
    // Skip if it looks like it is commented out
    const trimmed = line.trim();
    if (!trimmed.startsWith('//') && !trimmed.startsWith('*')) {
      findings.push({
        file: filePath,
        line: idx + 1,
        severity: 'LOW',
        message: 'console statement found. Remove before deployment.',
        rule: 'no-console'
      });
    }
  }
});

if (findings.length > 0) {
  console.log(formatFindings(findings));
  const hasCritical = findings.some(f => f.severity === 'CRITICAL');
  process.exit(hasCritical ? 1 : 0);
} else {
  console.log(`\u2705 ${path.basename(filePath)}: No issues found.`);
}
