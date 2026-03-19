#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '../../scripts/install-plan.js');
const ROOT = path.resolve(__dirname, '../..');

describe('install-plan script', () => {
  function run(args = '') {
    return execSync(`node "${SCRIPT}" ${args}`, {
      encoding: 'utf8', cwd: ROOT, timeout: 15000
    });
  }

  it('shows plan for default profile', () => {
    try {
      const output = run('--profile default');
      assert.ok(output.includes('Installation Plan'));
    } catch (err) {
      // May exit 1 if some components are missing
      const output = err.stdout || '';
      assert.ok(output.includes('Installation Plan'));
    }
  });

  it('shows plan for minimal profile', () => {
    try {
      const output = run('--profile minimal');
      assert.ok(output.includes('Installation Plan') || output.includes('minimal'));
    } catch (err) {
      const output = err.stdout || '';
      assert.ok(output.includes('Installation Plan') || output.includes('minimal'));
    }
  });

  it('exits 1 for non-existent profile', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}" --profile nonexistent-xyz`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    }, (err) => {
      assert.ok(err.stderr.includes('not found'));
      return true;
    });
  });

  it('shows total component count', () => {
    try {
      const output = run('--profile default');
      assert.ok(output.includes('Total components'));
    } catch (err) {
      assert.ok((err.stdout || '').includes('Total components'));
    }
  });

  it('lists available profiles on error', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}" --profile nonexistent-xyz`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    }, (err) => {
      assert.ok(err.stderr.includes('Available profiles'));
      return true;
    });
  });
});
