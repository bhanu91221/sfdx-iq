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
  console.error('Usage: apex-lint.js <file>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
const findings = [];

// Check for SOQL in for loops
const soqlInLoopRegex = /for\s*\(.*\{[\s\S]*?\[SELECT/gi;
if (soqlInLoopRegex.test(content)) {
  // Find approximate line numbers
  lines.forEach((line, idx) => {
    if (/\[SELECT\b/i.test(line)) {
      findings.push({
        file: filePath,
        line: idx + 1,
        severity: 'CRITICAL',
        message: 'Possible SOQL query inside a loop. Move query outside the loop to avoid governor limits.',
        rule: 'no-soql-in-loop'
      });
    }
  });
}

// Check for DML in loops
const dmlKeywords = ['insert', 'update', 'delete', 'upsert', 'undelete', 'merge'];
let inLoop = false;
let braceDepth = 0;
let loopStartDepth = -1;

lines.forEach((line, idx) => {
  const trimmed = line.trim();

  if (/^\s*(for|while|do)\s*[\({]/.test(trimmed)) {
    if (!inLoop) {
      inLoop = true;
      loopStartDepth = braceDepth;
    }
  }

  for (const ch of trimmed) {
    if (ch === '{') {braceDepth++;}
    if (ch === '}') {braceDepth--;}
  }

  if (inLoop && braceDepth <= loopStartDepth) {
    inLoop = false;
    loopStartDepth = -1;
  }

  if (inLoop) {
    for (const kw of dmlKeywords) {
      const dmlRegex = new RegExp(`^\\s*${kw}\\s+`, 'i');
      if (dmlRegex.test(trimmed)) {
        findings.push({
          file: filePath,
          line: idx + 1,
          severity: 'CRITICAL',
          message: `DML statement "${kw}" found inside a loop. Collect records and perform DML outside the loop.`,
          rule: 'no-dml-in-loop'
        });
      }
    }
  }
});

// Check for missing 'with sharing'
const classRegex = /\b(public|private|global)\s+(virtual\s+|abstract\s+|with\s+sharing\s+|without\s+sharing\s+|inherited\s+sharing\s+)*class\b/gi;
let match;
while ((match = classRegex.exec(content)) !== null) {
  const classDecl = match[0];
  if (!/with\s+sharing|without\s+sharing|inherited\s+sharing/i.test(classDecl)) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    findings.push({
      file: filePath,
      line: lineNum,
      severity: 'HIGH',
      message: 'Class declaration missing sharing keyword. Use "with sharing" by default.',
      rule: 'require-sharing-keyword'
    });
  }
}

// Check for hardcoded Salesforce IDs (15 or 18 character)
const idRegex = /['"]([a-zA-Z0-9]{15}|[a-zA-Z0-9]{18})['"]/g;
const sfIdPrefixes = ['001', '003', '005', '006', '00D', '00G', '00e', '012', '01I', '01p', '01q', '0DM', '0012', 'a0'];
while ((match = idRegex.exec(content)) !== null) {
  const possibleId = match[1];
  const isLikelySfId = sfIdPrefixes.some(prefix => possibleId.startsWith(prefix));
  if (isLikelySfId) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    findings.push({
      file: filePath,
      line: lineNum,
      severity: 'HIGH',
      message: `Possible hardcoded Salesforce ID detected: "${possibleId}". Use Custom Metadata or Custom Settings instead.`,
      rule: 'no-hardcoded-ids'
    });
  }
}

if (findings.length > 0) {
  console.log(formatFindings(findings));
  const hasCritical = findings.some(f => f.severity === 'CRITICAL');
  process.exit(hasCritical ? 1 : 0);
} else {
  console.log(`\u2705 ${path.basename(filePath)}: No issues found.`);
}
