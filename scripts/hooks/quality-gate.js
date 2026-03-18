#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { execSync } = require('child_process');
const { formatFindings, formatSummary } = require('../lib/report-formatter');

const COLORS = {
  RED: '\x1b[31m', GREEN: '\x1b[32m', BOLD: '\x1b[1m', RESET: '\x1b[0m'
};

const blockLevel = (process.env.CSIQ_QUALITY_GATE_BLOCK || 'CRITICAL').toUpperCase();
const blockSeverities = blockLevel === 'HIGH' ? ['CRITICAL', 'HIGH'] : ['CRITICAL'];

// Get staged .cls files
let stagedFiles = [];
try {
  const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' }).trim();
  stagedFiles = output.split('\n').filter(f => f.endsWith('.cls'));
} catch (_e) {
  console.error('Failed to get staged files. Are you in a git repository?');
  process.exit(1);
}

if (stagedFiles.length === 0) {
  console.log(`${COLORS.GREEN}\u2705 No staged Apex files to check.${COLORS.RESET}`);
  process.exit(0);
}

const allFindings = [];

for (const filePath of stagedFiles) {
  if (!fs.existsSync(filePath)) {continue;}

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const isTestClass = /Test\.cls$/i.test(filePath) || /@isTest/i.test(content);

  // --- Apex lint checks ---
  // SOQL in loops
  let inLoop = false;
  let braceDepth = 0;
  let loopStartDepth = -1;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const lineNum = idx + 1;

    if (/^\s*(for|while|do)\s*[\({]/.test(trimmed)) {
      if (!inLoop) { inLoop = true; loopStartDepth = braceDepth; }
    }

    for (const ch of trimmed) {
      if (ch === '{') {braceDepth++;}
      if (ch === '}') {braceDepth--;}
    }

    if (inLoop && braceDepth <= loopStartDepth) {
      inLoop = false; loopStartDepth = -1;
    }

    if (inLoop) {
      if (/\[SELECT\b/i.test(trimmed)) {
        allFindings.push({ file: filePath, line: lineNum, severity: 'CRITICAL',
          message: 'SOQL query inside a loop.', rule: 'no-soql-in-loop' });
      }
      const dmlKeywords = ['insert', 'update', 'delete', 'upsert', 'undelete', 'merge'];
      for (const kw of dmlKeywords) {
        if (new RegExp(`^\\s*${kw}\\s+`, 'i').test(trimmed)) {
          allFindings.push({ file: filePath, line: lineNum, severity: 'CRITICAL',
            message: `DML "${kw}" inside a loop.`, rule: 'no-dml-in-loop' });
        }
      }
    }

    // --- Security checks ---
    if (/Database\.query\s*\(/i.test(trimmed) && /\+/.test(trimmed)) {
      allFindings.push({ file: filePath, line: lineNum, severity: 'CRITICAL',
        message: 'Dynamic SOQL with string concatenation.', rule: 'no-soql-injection' });
    }

    if (!isTestClass && /(?:password|secret|token|apikey)\s*=\s*['"]/i.test(trimmed)) {
      allFindings.push({ file: filePath, line: lineNum, severity: 'CRITICAL',
        message: 'Possible hardcoded credential.', rule: 'no-hardcoded-secrets' });
    }

    if (/without\s+sharing/i.test(trimmed)) {
      const prevLine = idx > 0 ? lines[idx - 1].trim() : '';
      if (!/\/\//.test(trimmed) && !/\/\//.test(prevLine)) {
        allFindings.push({ file: filePath, line: lineNum, severity: 'HIGH',
          message: '"without sharing" without justification.', rule: 'without-sharing-justification' });
      }
    }
  });

  // Missing sharing keyword
  const classRegex = /\b(public|private|global)\s+(virtual\s+|abstract\s+|with\s+sharing\s+|without\s+sharing\s+|inherited\s+sharing\s+)*class\b/gi;
  let match;
  while ((match = classRegex.exec(content)) !== null) {
    if (!/with\s+sharing|without\s+sharing|inherited\s+sharing/i.test(match[0])) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      allFindings.push({ file: filePath, line: lineNum, severity: 'HIGH',
        message: 'Class missing sharing keyword.', rule: 'require-sharing-keyword' });
    }
  }

  // Missing CRUD/FLS
  const hasSOQL = /\[SELECT\b/i.test(content) || /Database\.query/i.test(content);
  const hasFLS = /WITH\s+SECURITY_ENFORCED|WITH\s+USER_MODE|stripInaccessible/i.test(content);
  if (hasSOQL && !hasFLS && !isTestClass) {
    allFindings.push({ file: filePath, line: 1, severity: 'HIGH',
      message: 'SOQL without CRUD/FLS enforcement.', rule: 'require-crud-fls' });
  }
}

// Report
if (allFindings.length > 0) {
  console.log(formatFindings(allFindings));
  console.log('\n' + formatSummary(allFindings));

  const blockingFindings = allFindings.filter(f => blockSeverities.includes(f.severity));
  if (blockingFindings.length > 0) {
    console.log(`\n${COLORS.RED}${COLORS.BOLD}\u274c Quality gate FAILED: ${blockingFindings.length} blocking finding(s) at ${blockLevel}+ severity.${COLORS.RESET}`);
    console.log(`${COLORS.RED}Fix these issues before committing. Set CSIQ_QUALITY_GATE_BLOCK to adjust threshold.${COLORS.RESET}\n`);
    process.exit(1);
  } else {
    console.log(`\n${COLORS.GREEN}\u2705 Quality gate passed (warnings only, no ${blockLevel}+ findings).${COLORS.RESET}\n`);
  }
} else {
  console.log(`${COLORS.GREEN}\u2705 Quality gate passed: ${stagedFiles.length} file(s) checked, no issues found.${COLORS.RESET}`);
}
