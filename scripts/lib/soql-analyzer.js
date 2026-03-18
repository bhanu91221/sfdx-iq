#!/usr/bin/env node
'use strict';

/**
 * SOQL extraction and analysis from Apex files.
 * Detects injection risks, missing limits, and security issues.
 */

/**
 * Extract SOQL queries from Apex content.
 * Finds both bracket-style [SELECT ...] and Database.query() patterns.
 *
 * @param {string} content - Apex source code
 * @returns {Array<{query: string, line: number}>}
 */
function extractQueries(content) {
  const queries = [];

  // Bracket-style: [SELECT ... ]
  const bracketRe = /\[\s*(SELECT\b[^\]]+)\]/gi;
  let match;
  while ((match = bracketRe.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    queries.push({ query: match[1].trim(), line });
  }

  // Database.query() style
  const dbQueryRe = /Database\.query\s*\(\s*['"]([^'"]+)['"]/gi;
  while ((match = dbQueryRe.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    queries.push({ query: match[1].trim(), line });
  }

  // Database.query() with variable concatenation
  const dbQueryConcatRe = /Database\.query\s*\(\s*([^)]+)\)/gi;
  while ((match = dbQueryConcatRe.exec(content)) !== null) {
    const arg = match[1].trim();
    if (arg.includes('+') && /SELECT/i.test(arg)) {
      const line = content.substring(0, match.index).split('\n').length;
      // Extract the query portion from the concatenation
      const queryParts = arg.replace(/['"`]/g, ' ').trim();
      queries.push({ query: queryParts, line });
    }
  }

  return queries;
}

/**
 * Count fields in a SELECT clause.
 *
 * @param {string} query - SOQL query string
 * @returns {number}
 */
function countSelectFields(query) {
  const selectMatch = query.match(/SELECT\s+(.+?)\s+FROM/i);
  if (!selectMatch) {return 0;}
  return selectMatch[1].split(',').length;
}

/**
 * Analyze a single SOQL query for issues.
 *
 * @param {string} query - SOQL query string
 * @param {number} line - Line number in source
 * @param {string} [filePath=''] - Source file path
 * @returns {{ findings: Array<{line: number, severity: string, message: string, rule: string}> }}
 */
function analyzeQuery(query, line, filePath) {
  const findings = [];
  const upper = query.toUpperCase();

  // Missing LIMIT (skip aggregates and known batch patterns)
  const isAggregate = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(query);
  const hasBatch = /\bDatabase\.(query|getQueryLocator)/i.test(filePath || '');
  if (!isAggregate && !hasBatch && !/\bLIMIT\b/i.test(upper)) {
    findings.push({
      line, severity: 'MEDIUM',
      message: 'SOQL query missing LIMIT clause',
      rule: 'soql-missing-limit',
    });
  }

  // String concatenation (injection risk)
  if (/\+\s*\w/.test(query) || /\w\s*\+/.test(query)) {
    findings.push({
      line, severity: 'CRITICAL',
      message: 'Possible SOQL injection — string concatenation in query',
      rule: 'soql-injection-risk',
    });
  }

  // Missing bind variable in WHERE with concatenation
  if (/WHERE/i.test(upper) && !/:\w/.test(query) && /\+/.test(query)) {
    findings.push({
      line, severity: 'HIGH',
      message: 'WHERE clause uses concatenation without bind variables',
      rule: 'soql-use-bind-vars',
    });
  }

  // Missing security clause
  if (!/WITH\s+SECURITY_ENFORCED/i.test(query) && !/WITH\s+USER_MODE/i.test(query)) {
    findings.push({
      line, severity: 'MEDIUM',
      message: 'SOQL query missing WITH SECURITY_ENFORCED or WITH USER_MODE',
      rule: 'soql-missing-security',
    });
  }

  // Excessive fields (>15)
  const fieldCount = countSelectFields(query);
  if (fieldCount > 15) {
    findings.push({
      line, severity: 'LOW',
      message: `SOQL query selects ${fieldCount} fields (recommend ≤15)`,
      rule: 'soql-excessive-fields',
    });
  }

  // Subquery depth > 1
  const subqueryDepth = (query.match(/\(\s*SELECT/gi) || []).length;
  if (subqueryDepth > 1) {
    findings.push({
      line, severity: 'MEDIUM',
      message: `SOQL query has ${subqueryDepth} levels of subqueries (recommend ≤1)`,
      rule: 'soql-deep-subquery',
    });
  }

  return { findings };
}

/**
 * Analyze all SOQL queries in an Apex file.
 *
 * @param {string} content - Apex source code
 * @param {string} [filePath=''] - File path for context
 * @returns {{ findings: Array<{line: number, severity: string, message: string, rule: string}> }}
 */
function analyzeFile(content, filePath) {
  const queries = extractQueries(content);
  const findings = [];

  for (const q of queries) {
    const result = analyzeQuery(q.query, q.line, filePath);
    findings.push(...result.findings);
  }

  return { findings };
}

module.exports = { extractQueries, analyzeQuery, analyzeFile };
