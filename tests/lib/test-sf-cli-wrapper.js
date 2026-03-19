#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { runSfCommand } = require('../../scripts/lib/sf-cli-wrapper');

describe('sf-cli-wrapper', () => {
  it('exports runSfCommand function', () => {
    assert.strictEqual(typeof runSfCommand, 'function');
  });

  it('returns error result for non-existent command', () => {
    const result = runSfCommand('nonexistent-command-xyz');
    assert.strictEqual(result.success, false);
    assert.ok(result.error);
  });

  it('returns structured result with success, result, error fields', () => {
    const result = runSfCommand('version');
    assert.ok('success' in result);
    assert.ok('result' in result);
    assert.ok('error' in result);
  });

  it('accepts additional args array', () => {
    const result = runSfCommand('nonexistent-command-xyz', ['--some-flag']);
    assert.strictEqual(result.success, false);
    assert.ok(result.error);
  });
});
