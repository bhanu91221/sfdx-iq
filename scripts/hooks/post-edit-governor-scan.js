#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { formatFindings, formatSummary } = require('../lib/report-formatter');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: post-edit-governor-scan.js <file>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
const findings = [];

// Track loop context with brace depth
let inLoop = false;
let loopDepth = 0;
let braceDepth = 0;
const loopStartDepths = [];

lines.forEach((line, idx) => {
  const trimmed = line.trim();
  const lineNum = idx + 1;

  // Detect loop starts: for, while, do
  if (/^\s*(for|while|do)\s*[\({]/.test(trimmed) || /^\s*(for|while)\s*\(/.test(trimmed)) {
    loopStartDepths.push(braceDepth);
    inLoop = true;
    loopDepth++;
  }

  // Count braces
  for (const ch of trimmed) {
    if (ch === '{') {braceDepth++;}
    if (ch === '}') {
      braceDepth--;
      // Check if we exited a loop
      while (loopStartDepths.length > 0 && braceDepth <= loopStartDepths[loopStartDepths.length - 1]) {
        loopStartDepths.pop();
        loopDepth--;
      }
      inLoop = loopDepth > 0;
    }
  }

  if (inLoop) {
    // SOQL in loops (CRITICAL)
    if (/\[SELECT\b/i.test(trimmed) || /Database\.query\s*\(/i.test(trimmed)) {
      findings.push({
        file: filePath, line: lineNum, severity: 'CRITICAL',
        message: 'SOQL query inside a loop. Move query before the loop and use a collection.',
        rule: 'no-soql-in-loop'
      });
    }

    // DML in loops (CRITICAL)
    const dmlKeywords = ['insert', 'update', 'delete', 'upsert', 'undelete', 'merge'];
    for (const kw of dmlKeywords) {
      if (new RegExp(`^\\s*${kw}\\s+`, 'i').test(trimmed) ||
          new RegExp(`Database\\.${kw}\\s*\\(`, 'i').test(trimmed)) {
        findings.push({
          file: filePath, line: lineNum, severity: 'CRITICAL',
          message: `DML "${kw}" inside a loop. Collect records and perform DML after the loop.`,
          rule: 'no-dml-in-loop'
        });
      }
    }

    // System.enqueueJob inside loops (HIGH)
    if (/System\.enqueueJob\s*\(/i.test(trimmed)) {
      findings.push({
        file: filePath, line: lineNum, severity: 'HIGH',
        message: 'System.enqueueJob() inside a loop. Risk of hitting queueable limits.',
        rule: 'no-enqueue-in-loop'
      });
    }

    // Callout inside loops (CRITICAL)
    if (/HttpRequest\.send\s*\(|Http\.send\s*\(|\.send\s*\(\s*req/i.test(trimmed)) {
      findings.push({
        file: filePath, line: lineNum, severity: 'CRITICAL',
        message: 'HTTP callout inside a loop. Risk of hitting callout governor limits.',
        rule: 'no-callout-in-loop'
      });
    }

    // Nested loops with SOQL/DML (already caught above but flag nesting specifically)
    if (loopDepth >= 2) {
      if (/\[SELECT\b/i.test(trimmed)) {
        findings.push({
          file: filePath, line: lineNum, severity: 'CRITICAL',
          message: 'SOQL in nested loop. Exponential query consumption risk.',
          rule: 'no-soql-nested-loop'
        });
      }
    }
  }

  // Large unbounded collections (MEDIUM) - outside loop context too
  if (/new\s+(List|Map|Set)\s*</.test(trimmed) && /\(\s*\)/.test(trimmed)) {
    // Check if there is no .size() or limit nearby (simple heuristic)
    const surroundingLines = lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 3)).join(' ');
    if (!/\.size\(\)|Limits\.|LIMIT\s+\d/i.test(surroundingLines)) {
      findings.push({
        file: filePath, line: lineNum, severity: 'MEDIUM',
        message: 'Large collection initialized without clear bounds. Consider checking Limits.getHeapSize().',
        rule: 'unbounded-collection'
      });
    }
  }

  // Acknowledge good pattern: Limits.getQueries() usage
  if (/Limits\.get(Queries|DmlStatements|CpuTime|HeapSize)\s*\(/i.test(trimmed)) {
    findings.push({
      file: filePath, line: lineNum, severity: 'LOW',
      message: 'Good: Limits API usage detected for governor limit awareness.',
      rule: 'limits-api-usage'
    });
  }
});

if (findings.length > 0) {
  console.log(formatFindings(findings));
  console.log('\n' + formatSummary(findings));
  const hasCritical = findings.some(f => f.severity === 'CRITICAL');
  process.exit(hasCritical ? 1 : 0);
} else {
  console.log(`\u2705 ${path.basename(filePath)}: No governor limit risks found.`);
}
