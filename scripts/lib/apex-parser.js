#!/usr/bin/env node
'use strict';

/**
 * Regex-based Apex code analysis engine.
 * Detects common Salesforce anti-patterns and coding violations.
 */

const HARDCODED_ID_RE = /['"]([a-zA-Z0-9]{15}|[a-zA-Z0-9]{18})['"]/g;
const KNOWN_ID_PREFIXES = ['001', '003', '005', '006', '00D', '01I', '01p', '012', '0012'];

/**
 * Check if Apex content is a test class.
 *
 * @param {string} content - Apex file content
 * @returns {boolean}
 */
function isTestClass(content) {
  return /@isTest/i.test(content) || /testMethod/i.test(content);
}

/**
 * Count lines in a string range.
 *
 * @param {string} content - Full content
 * @param {number} charIndex - Character offset
 * @returns {number} Line number (1-based)
 */
function lineAt(content, charIndex) {
  return content.substring(0, charIndex).split('\n').length;
}

/**
 * Analyze Apex file content for common issues.
 *
 * @param {string} content - Apex source code
 * @param {string} [filePath=''] - File path for context
 * @returns {{ findings: Array<{line: number, severity: string, message: string, rule: string}> }}
 */
function analyzeApexFile(content, _filePath) {
  const findings = [];
  const lines = content.split('\n');
  const testClass = isTestClass(content);

  // Track loop nesting for SOQL/DML in loop detection
  let loopDepth = 0;
  const braceStack = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Track loop entry
    if (/\b(for|while)\s*\(/.test(trimmed) || /\bdo\s*\{/.test(trimmed)) {
      loopDepth++;
      braceStack.push('loop');
    } else if (trimmed.includes('{') && loopDepth > 0) {
      braceStack.push('block');
    }

    // Track loop exit
    if (trimmed.includes('}') && braceStack.length > 0) {
      const popped = braceStack.pop();
      if (popped === 'loop') {
        loopDepth--;
      }
    }

    // SOQL in loop
    if (loopDepth > 0 && /\[[\s]*SELECT\b/i.test(trimmed)) {
      findings.push({
        line: lineNum, severity: 'CRITICAL',
        message: 'SOQL query inside loop — risk of governor limit violation',
        rule: 'no-soql-in-loop',
      });
    }

    // DML in loop
    if (loopDepth > 0 && /\b(insert|update|delete|upsert)\s+/i.test(trimmed) && !/^\s*\/\//.test(trimmed)) {
      findings.push({
        line: lineNum, severity: 'CRITICAL',
        message: 'DML statement inside loop — risk of governor limit violation',
        rule: 'no-dml-in-loop',
      });
    }

    // Missing with sharing on class declaration
    if (/\bclass\s+\w+/i.test(trimmed) && !/\b(with|without|inherited)\s+sharing\b/i.test(trimmed) && !/^\s*\/\//.test(trimmed)) {
      findings.push({
        line: lineNum, severity: 'HIGH',
        message: 'Class declaration missing sharing keyword (with sharing recommended)',
        rule: 'require-sharing-keyword',
      });
    }

    // without sharing without justification comment
    if (/\bwithout\s+sharing\b/i.test(trimmed)) {
      const prevLine = i > 0 ? lines[i - 1].trim() : '';
      if (!/\/\/.*reason|\/\/.*justif|\/\/.*required/i.test(prevLine) && !/\/\/.*reason|\/\/.*justif|\/\/.*required/i.test(trimmed)) {
        findings.push({
          line: lineNum, severity: 'HIGH',
          message: 'Class uses "without sharing" without justification comment on preceding line',
          rule: 'justify-without-sharing',
        });
      }
    }

    // System.debug (skip in test classes)
    if (!testClass && /System\.debug\s*\(/i.test(trimmed) && !/^\s*\/\//.test(trimmed)) {
      findings.push({
        line: lineNum, severity: 'LOW',
        message: 'System.debug statement found — remove before production',
        rule: 'no-system-debug',
      });
    }

    // Hardcoded Salesforce IDs
    let idMatch;
    HARDCODED_ID_RE.lastIndex = 0;
    while ((idMatch = HARDCODED_ID_RE.exec(trimmed)) !== null) {
      const id = idMatch[1];
      const prefix = id.substring(0, 3);
      if (KNOWN_ID_PREFIXES.includes(prefix)) {
        findings.push({
          line: lineNum, severity: 'HIGH',
          message: `Hardcoded Salesforce ID detected: ${id.substring(0, 5)}...`,
          rule: 'no-hardcoded-ids',
        });
      }
    }
  }

  // Method line count > 50
  const methodRe = /\b(public|private|protected|global)\s+.*?\s+\w+\s*\([^)]*\)\s*\{/gi;
  let methodMatch;
  while ((methodMatch = methodRe.exec(content)) !== null) {
    const startLine = lineAt(content, methodMatch.index);
    let braces = 1;
    let pos = content.indexOf('{', methodMatch.index) + 1;
    while (pos < content.length && braces > 0) {
      if (content[pos] === '{') {braces++;}
      if (content[pos] === '}') {braces--;}
      pos++;
    }
    const endLine = lineAt(content, pos);
    const methodLines = endLine - startLine;
    if (methodLines > 50) {
      findings.push({
        line: startLine, severity: 'MEDIUM',
        message: `Method is ${methodLines} lines long (max recommended: 50)`,
        rule: 'method-too-long',
      });
    }
  }

  // Class line count > 500
  if (lines.length > 500) {
    findings.push({
      line: 1, severity: 'MEDIUM',
      message: `Class is ${lines.length} lines long (max recommended: 500)`,
      rule: 'class-too-long',
    });
  }

  return { findings };
}

module.exports = { analyzeApexFile, isTestClass };
