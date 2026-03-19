#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '../../scripts/csiq.js');
const ROOT = path.resolve(__dirname, '../..');

describe('csiq CLI entry point', () => {
  function run(args = '') {
    return execSync(`node "${SCRIPT}" ${args}`, {
      encoding: 'utf8', cwd: ROOT, timeout: 15000
    });
  }

  it('shows help with no arguments', () => {
    const output = run();
    assert.ok(output.includes('claude-sfdx-iq'));
    assert.ok(output.includes('Usage'));
    assert.ok(output.includes('Commands'));
  });

  it('shows help with help command', () => {
    const output = run('help');
    assert.ok(output.includes('install'));
    assert.ok(output.includes('status'));
    assert.ok(output.includes('doctor'));
  });

  it('shows help with --help flag', () => {
    const output = run('--help');
    assert.ok(output.includes('Commands'));
  });

  it('shows help with -h flag', () => {
    const output = run('-h');
    assert.ok(output.includes('Commands'));
  });

  it('exits 1 for unknown command', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}" nonexistent-xyz`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    }, (err) => {
      assert.ok(err.stderr.includes('Unknown command'));
      return true;
    });
  });

  it('runs status command', () => {
    const output = run('status');
    assert.ok(output.includes('claude-sfdx-iq'));
    assert.ok(output.includes('Component Summary') || output.includes('Agents'));
  });

  it('lists profiles in help', () => {
    const output = run('help');
    assert.ok(output.includes('minimal'));
    assert.ok(output.includes('default'));
  });
});
