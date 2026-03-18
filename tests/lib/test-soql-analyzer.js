#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { extractQueries, analyzeQuery, analyzeFile } = require('../../scripts/lib/soql-analyzer');

describe('soql-analyzer', () => {
  describe('extractQueries', () => {
    it('finds bracket-style [SELECT ...] queries', () => {
      const code = `List<Account> accts = [SELECT Id, Name FROM Account WHERE Name != null];`;
      const queries = extractQueries(code);
      assert.ok(queries.length >= 1, 'Should find at least one query');
      assert.ok(queries[0].query.includes('SELECT Id, Name FROM Account'), 'Should extract query text');
      assert.strictEqual(queries[0].line, 1);
    });

    it('finds Database.query() patterns', () => {
      const code = `String result = Database.query('SELECT Id FROM Contact LIMIT 10');`;
      const queries = extractQueries(code);
      assert.ok(queries.length >= 1, 'Should find Database.query pattern');
      assert.ok(queries[0].query.includes('SELECT Id FROM Contact'), 'Should extract query text');
    });
  });

  describe('analyzeQuery', () => {
    it('detects missing LIMIT as MEDIUM', () => {
      const result = analyzeQuery('SELECT Id, Name FROM Account', 1, 'Test.cls');
      const limitFindings = result.findings.filter(f => f.rule === 'soql-missing-limit');
      assert.ok(limitFindings.length > 0, 'Should detect missing LIMIT');
      assert.strictEqual(limitFindings[0].severity, 'MEDIUM');
    });

    it('detects string concatenation as CRITICAL', () => {
      const result = analyzeQuery('SELECT Id FROM Account WHERE Name = ' + "'" + ' + userInput + ' + "'", 5, 'Test.cls');
      const injectionFindings = result.findings.filter(f => f.rule === 'soql-injection-risk');
      assert.ok(injectionFindings.length > 0, 'Should detect injection risk');
      assert.strictEqual(injectionFindings[0].severity, 'CRITICAL');
    });

    it('detects missing security clause as MEDIUM', () => {
      const result = analyzeQuery('SELECT Id FROM Account LIMIT 10', 1, 'Test.cls');
      const secFindings = result.findings.filter(f => f.rule === 'soql-missing-security');
      assert.ok(secFindings.length > 0, 'Should detect missing security clause');
      assert.strictEqual(secFindings[0].severity, 'MEDIUM');
    });

    it('accepts query with WITH SECURITY_ENFORCED as clean', () => {
      const result = analyzeQuery('SELECT Id FROM Account WITH SECURITY_ENFORCED LIMIT 10', 1, 'Test.cls');
      const secFindings = result.findings.filter(f => f.rule === 'soql-missing-security');
      assert.strictEqual(secFindings.length, 0, 'Should not flag query with SECURITY_ENFORCED');
    });

    it('accepts query with WITH USER_MODE as clean', () => {
      const result = analyzeQuery('SELECT Id FROM Account WITH USER_MODE LIMIT 10', 1, 'Test.cls');
      const secFindings = result.findings.filter(f => f.rule === 'soql-missing-security');
      assert.strictEqual(secFindings.length, 0, 'Should not flag query with USER_MODE');
    });
  });

  describe('analyzeFile', () => {
    it('combines extraction and analysis', () => {
      const code = `
public class MyClass {
  public void run() {
    List<Account> accts = [SELECT Id FROM Account];
  }
}`;
      const result = analyzeFile(code, 'MyClass.cls');
      assert.ok(result.findings.length > 0, 'Should produce findings from file analysis');
    });
  });
});
