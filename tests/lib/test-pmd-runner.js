#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

// We can test the module's exported functions but need to handle
// that isAvailable/runPmd depend on execSync. Test the logic indirectly.
const { runPmd, isAvailable } = require('../../scripts/lib/pmd-runner');

describe('pmd-runner', () => {
  it('exports runPmd and isAvailable functions', () => {
    assert.strictEqual(typeof runPmd, 'function');
    assert.strictEqual(typeof isAvailable, 'function');
  });

  it('isAvailable returns a boolean', () => {
    const result = isAvailable();
    assert.strictEqual(typeof result, 'boolean');
  });

  it('runPmd returns findings array and source on unavailable scanner', () => {
    // Run against a non-existent file — scanner likely not available in test env
    const result = runPmd('/tmp/nonexistent-test-file.cls');
    assert.ok(Array.isArray(result.findings));
    assert.ok(typeof result.source === 'string');
  });

  it('runPmd accepts options with rulesets', () => {
    const result = runPmd('/tmp/nonexistent-test-file.cls', { rulesets: ['apex-ruleset.xml'] });
    assert.ok(Array.isArray(result.findings));
  });

  it('runPmd returns unavailable message when scanner is missing', () => {
    const result = runPmd('/tmp/nonexistent-test-file.cls');
    if (result.source === 'unavailable') {
      assert.ok(result.message);
    }
  });
});
