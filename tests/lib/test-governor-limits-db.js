#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { LIMITS, checkLimit, formatLimitsTable, getLimit } = require('../../scripts/lib/governor-limits-db');

describe('governor-limits-db', () => {
  it('LIMITS object has all expected keys', () => {
    const expectedKeys = [
      'soqlQueries', 'dmlStatements', 'soqlRows', 'dmlRows',
      'cpuTime', 'heapSize', 'callouts', 'futureCalls',
      'queueableJobs', 'emailInvocations', 'soqlQueryLocators', 'eventPublish',
    ];
    for (const key of expectedKeys) {
      assert.ok(LIMITS[key], `Missing limit: ${key}`);
      assert.ok(typeof LIMITS[key].sync === 'number', `${key} should have numeric sync value`);
      assert.ok(typeof LIMITS[key].async === 'number', `${key} should have numeric async value`);
      assert.ok(typeof LIMITS[key].label === 'string', `${key} should have string label`);
    }
  });

  it('checkLimit returns ok for low usage', () => {
    const result = checkLimit('soqlQueries', 10, 'sync');
    assert.strictEqual(result.status, 'ok');
    assert.strictEqual(result.limit, 100);
    assert.strictEqual(result.used, 10);
    assert.strictEqual(result.percentage, 10);
  });

  it('checkLimit returns warn at 70%', () => {
    const result = checkLimit('soqlQueries', 75, 'sync');
    assert.strictEqual(result.status, 'warn');
    assert.strictEqual(result.percentage, 75);
  });

  it('checkLimit returns critical at 90%', () => {
    const result = checkLimit('soqlQueries', 95, 'sync');
    assert.strictEqual(result.status, 'critical');
    assert.strictEqual(result.percentage, 95);
  });

  it('getLimit returns correct sync/async values', () => {
    const limit = getLimit('soqlQueries');
    assert.strictEqual(limit.sync, 100);
    assert.strictEqual(limit.async, 200);
    assert.strictEqual(limit.label, 'SOQL Queries');
  });

  it('getLimit returns null for unknown limit', () => {
    const result = getLimit('nonExistent');
    assert.strictEqual(result, null);
  });

  it('formatLimitsTable produces formatted output', () => {
    const usage = { soqlQueries: 50, dmlStatements: 10 };
    const table = formatLimitsTable(usage, 'sync');
    assert.ok(typeof table === 'string', 'Should return a string');
    assert.ok(table.includes('SOQL Queries'), 'Should contain limit labels');
    assert.ok(table.includes('DML Statements'), 'Should contain DML row');
    assert.ok(table.includes('50'), 'Should show usage value');
  });
});
