'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

function detectSoqlAntiPatterns(content) {
  const findings = [];

  // SELECT * equivalent (SELECT without specific fields from subquery context)
  if (/\bSELECT\s+\*\b/gi.test(content)) {
    findings.push({ rule: 'no-select-star', severity: 'error', message: 'SELECT * is not valid SOQL' });
  }

  // Missing WHERE clause on large objects
  const unboundedQuery = /\[SELECT\s+\w[\w,\s]*\bFROM\s+\w+\s*\]/gi;
  if (unboundedQuery.test(content)) {
    findings.push({ rule: 'unbounded-query', severity: 'warning', message: 'Query has no WHERE clause or LIMIT' });
  }

  // String concatenation in SOQL (injection risk)
  const injectionPattern = /\[SELECT[\s\S]*?'\s*\+\s*\w+/gi;
  if (injectionPattern.test(content)) {
    findings.push({ rule: 'soql-injection', severity: 'error', message: 'Possible SOQL injection via string concatenation' });
  }

  // Missing WITH SECURITY_ENFORCED or bind variables
  const queryPattern = /\[SELECT\b[\s\S]*?\]/g;
  const queries = content.match(queryPattern) || [];
  for (const query of queries) {
    if (!/WITH\s+SECURITY_ENFORCED/i.test(query) && !/stripInaccessible/i.test(content)) {
      findings.push({ rule: 'missing-security', severity: 'warning', message: 'Query missing WITH SECURITY_ENFORCED' });
    }
  }

  // SOQL in loop detection
  const soqlInLoop = /for\s*\([^)]*\)\s*\{[\s\S]*?\[SELECT\b/gi;
  if (soqlInLoop.test(content)) {
    findings.push({ rule: 'soql-in-loop', severity: 'error', message: 'SOQL query inside a loop' });
  }

  return findings;
}

describe('SOQL anti-pattern detection', () => {
  it('should detect unbounded queries', () => {
    const code = 'List<Account> accs = [SELECT Id, Name FROM Account];';
    const findings = detectSoqlAntiPatterns(code);
    assert.ok(findings.some(f => f.rule === 'unbounded-query'), 'Should detect unbounded query');
  });

  it('should detect SOQL injection risk', () => {
    const findings = detectSoqlAntiPatterns("String q = [SELECT Id FROM Account WHERE Name = '" + " + userInput];");
    const injection = findings.find(f => f.rule === 'soql-injection');
    assert.ok(injection, 'Should detect SOQL injection');
    assert.strictEqual(injection.severity, 'error');
  });

  it('should detect missing WITH SECURITY_ENFORCED', () => {
    const code = 'List<Account> accs = [SELECT Id FROM Account WHERE Id IN :ids];';
    const findings = detectSoqlAntiPatterns(code);
    assert.ok(findings.some(f => f.rule === 'missing-security'), 'Should detect missing security enforcement');
  });

  it('should pass for secure queries', () => {
    const code = 'List<Account> accs = [SELECT Id FROM Account WHERE Id IN :ids WITH SECURITY_ENFORCED];';
    const findings = detectSoqlAntiPatterns(code);
    const securityFindings = findings.filter(f => f.rule === 'missing-security');
    assert.strictEqual(securityFindings.length, 0, 'Secure query should not be flagged');
  });

  it('should detect SOQL in loops', () => {
    const code = `for (Id i : ids) {
      Account a = [SELECT Id FROM Account WHERE Id = :i];
    }`;
    const findings = detectSoqlAntiPatterns(code);
    assert.ok(findings.some(f => f.rule === 'soql-in-loop'), 'Should detect SOQL in loop');
  });
});
