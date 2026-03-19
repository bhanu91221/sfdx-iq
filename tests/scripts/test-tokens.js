#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '../../scripts/tokens.js');
const ROOT = path.resolve(__dirname, '../..');

describe('tokens script', () => {
  function run(args = '') {
    return execSync(`node "${SCRIPT}" ${args}`, {
      encoding: 'utf8', cwd: ROOT, timeout: 15000
    });
  }

  it('shows token budget report', () => {
    const output = run('--all');
    assert.ok(output.includes('Token Budget Report'));
  });

  it('shows skills section', () => {
    const output = run('--all');
    assert.ok(output.includes('SKILLS'));
  });

  it('shows rules section', () => {
    const output = run('--all');
    assert.ok(output.includes('RULES'));
  });

  it('shows agents section', () => {
    const output = run('--all');
    assert.ok(output.includes('AGENTS'));
  });

  it('shows startup and lazy cost totals', () => {
    const output = run('--all');
    assert.ok(output.includes('STARTUP COST'));
    assert.ok(output.includes('LAZY COST'));
    assert.ok(output.includes('TOTAL'));
  });

  it('shows savings estimate', () => {
    const output = run('--all');
    assert.ok(output.includes('dynamic context loading'));
  });

  it('exits 1 for unknown profile', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}" --profile nonexistent-xyz`, {
        encoding: 'utf8', cwd: ROOT, stdio: 'pipe'
      });
    });
  });

  it('shows report for specific profile', () => {
    try {
      const output = run('--profile minimal');
      assert.ok(output.includes('Token Budget Report') || output.includes('Profile'));
    } catch (err) {
      // Profile may not exist
      assert.ok(err.stderr.includes('not found'));
    }
  });
});
