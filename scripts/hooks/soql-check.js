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
  console.error('Usage: soql-check.js <file>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const findings = [];
const isBatchClass = /implements\s+(Database\.Batchable|Database\.Stateful)/i.test(content);

// Find all SOQL queries
const soqlRegex = /\[SELECT\b[^\]]*\]/gi;
let match;

while ((match = soqlRegex.exec(content)) !== null) {
  const query = match[0];
  const lineNum = content.substring(0, match.index).split('\n').length;

  // Check for missing LIMIT (skip Batch classes)
  if (!isBatchClass && !/\bLIMIT\b/i.test(query)) {
    findings.push({
      file: filePath,
      line: lineNum,
      severity: 'MEDIUM',
      message: 'SOQL query missing LIMIT clause. Add LIMIT to prevent fetching excessive rows.',
      rule: 'soql-require-limit'
    });
  }

  // Check for string concatenation in query (potential SOQL injection)
  if (/'\s*\+\s*\w+|\w+\s*\+\s*'/.test(query)) {
    findings.push({
      file: filePath,
      line: lineNum,
      severity: 'CRITICAL',
      message: 'String concatenation detected in SOQL query. Use bind variables (:var) to prevent SOQL injection.',
      rule: 'soql-no-injection'
    });
  }

  // Check for SELECT * equivalent (many fields)
  const selectFieldsMatch = query.match(/SELECT\s+([\s\S]*?)\s+FROM/i);
  if (selectFieldsMatch) {
    const fields = selectFieldsMatch[1].split(',');
    if (fields.length > 20) {
      findings.push({
        file: filePath,
        line: lineNum,
        severity: 'MEDIUM',
        message: `SOQL query selects ${fields.length} fields. Query only the fields you need to reduce heap usage.`,
        rule: 'soql-selective-fields'
      });
    }
  }

  // Check for missing WHERE clause on non-aggregate queries
  if (!/\bWHERE\b/i.test(query) && !/\bCOUNT\s*\(/i.test(query) && !/\bGROUP\s+BY\b/i.test(query)) {
    findings.push({
      file: filePath,
      line: lineNum,
      severity: 'MEDIUM',
      message: 'SOQL query has no WHERE clause. Add filters to limit the result set.',
      rule: 'soql-require-where'
    });
  }

  // Check for missing WITH SECURITY_ENFORCED or USER_MODE
  if (!/WITH\s+SECURITY_ENFORCED/i.test(query) && !/WITH\s+USER_MODE/i.test(query)) {
    findings.push({
      file: filePath,
      line: lineNum,
      severity: 'HIGH',
      message: 'SOQL query missing WITH SECURITY_ENFORCED or WITH USER_MODE. Add FLS enforcement.',
      rule: 'soql-require-security'
    });
  }
}

if (findings.length > 0) {
  console.log(formatFindings(findings));
  const hasCritical = findings.some(f => f.severity === 'CRITICAL');
  process.exit(hasCritical ? 1 : 0);
} else {
  console.log(`\u2705 ${path.basename(filePath)}: No SOQL issues found.`);
}
