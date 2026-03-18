#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { formatFindings, formatSummary } = require('../lib/report-formatter');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: post-edit-pmd-scan.js <file>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const findings = [];

// Try sf scanner first
let scannerAvailable = false;
try {
  const result = execSync(
    `sf scanner run --engine pmd --target "${filePath}" --format json 2>/dev/null`,
    { encoding: 'utf8', timeout: 30000 }
  );
  scannerAvailable = true;
  const violations = JSON.parse(result);
  if (Array.isArray(violations)) {
    for (const v of violations) {
      findings.push({
        file: filePath,
        line: v.line || 0,
        severity: v.severity <= 2 ? 'CRITICAL' : v.severity <= 3 ? 'HIGH' : 'MEDIUM',
        message: `[PMD] ${v.ruleName}: ${v.message}`,
        rule: v.ruleName || 'pmd'
      });
    }
  }
} catch (_e) {
  // sf scanner not available, fall back to regex analysis
}

if (!scannerAvailable) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // ExcessiveClassLength: class > 500 lines
  if (lines.length > 500) {
    findings.push({
      file: filePath, line: 1, severity: 'MEDIUM',
      message: `Class is ${lines.length} lines long (threshold: 500). Consider refactoring.`,
      rule: 'ExcessiveClassLength'
    });
  }

  // Per-method analysis
  let methodStart = -1;
  let methodName = '';
  let braceDepth = 0;
  let methodBraceDepth = -1;
  let nestingDepth = 0;
  let maxNesting = 0;
  let complexityCount = 0;
  const complexityTokens = /\b(if|else\s+if|for|while|catch|case)\b|\&\&|\|\|/g;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const methodMatch = trimmed.match(/\b(public|private|protected|global)\s+.*?\s+(\w+)\s*\(/);

    if (methodMatch && !trimmed.includes(';') && methodStart === -1) {
      methodStart = idx;
      methodName = methodMatch[2];
      methodBraceDepth = braceDepth;
      complexityCount = 1;
      maxNesting = 0;
      nestingDepth = 0;
    }

    for (const ch of trimmed) {
      if (ch === '{') {
        braceDepth++;
        if (methodStart !== -1) {nestingDepth++;}
        if (nestingDepth > maxNesting) {maxNesting = nestingDepth;}
      }
      if (ch === '}') {
        braceDepth--;
        if (methodStart !== -1) {nestingDepth--;}
      }
    }

    if (methodStart !== -1) {
      while (complexityTokens.exec(trimmed) !== null) {
        complexityCount++;
      }
    }

    if (methodStart !== -1 && braceDepth <= methodBraceDepth) {
      const methodLength = idx - methodStart + 1;

      if (methodLength > 50) {
        findings.push({
          file: filePath, line: methodStart + 1, severity: 'MEDIUM',
          message: `Method "${methodName}" is ${methodLength} lines (threshold: 50).`,
          rule: 'ExcessiveMethodLength'
        });
      }
      if (complexityCount > 10) {
        findings.push({
          file: filePath, line: methodStart + 1, severity: 'HIGH',
          message: `Method "${methodName}" has cyclomatic complexity of ${complexityCount} (threshold: 10).`,
          rule: 'CyclomaticComplexity'
        });
      }
      if (maxNesting > 4) {
        findings.push({
          file: filePath, line: methodStart + 1, severity: 'HIGH',
          message: `Method "${methodName}" has nesting depth of ${maxNesting} (threshold: 4).`,
          rule: 'AvoidDeeplyNestedIfStmts'
        });
      }

      methodStart = -1;
      methodBraceDepth = -1;
    }
  });
}

if (findings.length > 0) {
  console.log(formatFindings(findings));
  console.log('\n' + formatSummary(findings));
  const hasCritical = findings.some(f => f.severity === 'CRITICAL');
  process.exit(hasCritical ? 1 : 0);
} else {
  console.log(`\u2705 ${path.basename(filePath)}: PMD scan clean.`);
}
