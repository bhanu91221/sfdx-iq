#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { formatFindings, formatSummary } = require('../lib/report-formatter');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: post-edit-security-scan.js <file>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
const findings = [];
const isTestClass = /Test\.cls$/i.test(filePath) || /@isTest/i.test(content);

// Check for 'without sharing' without justification comment
lines.forEach((line, idx) => {
  const lineNum = idx + 1;
  const trimmed = line.trim();

  if (/without\s+sharing/i.test(trimmed)) {
    const prevLine = idx > 0 ? lines[idx - 1].trim() : '';
    const hasJustification = /\/\//.test(trimmed) || /\/\//.test(prevLine) ||
                             /\/\*/.test(prevLine) || /\*\//.test(trimmed);
    if (!hasJustification) {
      findings.push({
        file: filePath, line: lineNum, severity: 'HIGH',
        message: '"without sharing" used without comment justification. Add a comment explaining why.',
        rule: 'without-sharing-justification'
      });
    }
  }

  // Dynamic SOQL with string concatenation (CRITICAL)
  if (/Database\.query\s*\(/i.test(trimmed)) {
    if (/\+\s*['"]/.test(trimmed) || /['"]\s*\+/.test(trimmed) || /\+\s*\w+/.test(trimmed.replace(/Database\.query\s*\(\s*/, ''))) {
      findings.push({
        file: filePath, line: lineNum, severity: 'CRITICAL',
        message: 'Dynamic SOQL with string concatenation detected. Use bind variables to prevent SOQL injection.',
        rule: 'no-soql-injection'
      });
    }
  }

  // String-built queries: 'SELECT ... ' + variable
  if (/['"]SELECT\s+/i.test(trimmed) && /\+/.test(trimmed)) {
    findings.push({
      file: filePath, line: lineNum, severity: 'CRITICAL',
      message: 'SOQL string built with concatenation. Use bind variables or escapeSingleQuotes().',
      rule: 'no-soql-injection'
    });
  }

  // Hardcoded URLs (not in test classes)
  if (!isTestClass && /https?:\/\/[^\s'"]+/i.test(trimmed)) {
    if (!/\/\/\s/.test(trimmed.split('http')[0])) { // Not in a comment preceding http
      findings.push({
        file: filePath, line: lineNum, severity: 'MEDIUM',
        message: 'Hardcoded URL detected. Use Custom Metadata, Named Credentials, or Custom Settings.',
        rule: 'no-hardcoded-urls'
      });
    }
  }

  // Hardcoded passwords/tokens/secrets (CRITICAL)
  const secretPattern = /(?:password|secret|token|apikey|api_key)\s*=\s*['"]/i;
  if (secretPattern.test(trimmed) && !isTestClass) {
    findings.push({
      file: filePath, line: lineNum, severity: 'CRITICAL',
      message: 'Possible hardcoded credential in string assignment. Use Named Credentials or Protected Custom Metadata.',
      rule: 'no-hardcoded-secrets'
    });
  }

  // innerHTML/innerText usage (XSS risk in Aura/LWC helpers)
  if (/\.innerHTML\s*=|\.innerText\s*=/i.test(trimmed)) {
    findings.push({
      file: filePath, line: lineNum, severity: 'HIGH',
      message: 'innerHTML/innerText assignment detected. XSS risk in Aura/LWC. Use secure DOM APIs.',
      rule: 'no-inner-html'
    });
  }
});

// Check: class has SOQL but no security enforcement anywhere
const hasSOQL = /\[SELECT\b/i.test(content) || /Database\.query/i.test(content);
const hasSecurityEnforcement = /WITH\s+SECURITY_ENFORCED/i.test(content) ||
                                /WITH\s+USER_MODE/i.test(content) ||
                                /stripInaccessible/i.test(content) ||
                                /Security\.stripInaccessible/i.test(content);

if (hasSOQL && !hasSecurityEnforcement && !isTestClass) {
  findings.push({
    file: filePath, line: 1, severity: 'HIGH',
    message: 'Class contains SOQL but no CRUD/FLS enforcement (WITH SECURITY_ENFORCED, WITH USER_MODE, or stripInaccessible).',
    rule: 'require-crud-fls'
  });
}

if (findings.length > 0) {
  console.log(formatFindings(findings));
  console.log('\n' + formatSummary(findings));
  const hasCritical = findings.some(f => f.severity === 'CRITICAL');
  process.exit(hasCritical ? 1 : 0);
} else {
  console.log(`\u2705 ${path.basename(filePath)}: Security scan clean.`);
}
