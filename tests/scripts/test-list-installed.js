#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '../../scripts/list-installed.js');
const ROOT = path.resolve(__dirname, '../..');

describe('list-installed script', () => {
  function run(args = '') {
    return execSync(`node "${SCRIPT}" ${args}`, {
      encoding: 'utf8', cwd: ROOT, timeout: 15000
    });
  }

  it('lists all components', () => {
    const output = run();
    assert.ok(output.includes('Installed Components'));
    assert.ok(output.includes('AGENTS'));
    assert.ok(output.includes('SKILLS'));
    assert.ok(output.includes('COMMANDS'));
    assert.ok(output.includes('RULES'));
  });

  it('filters by agents category', () => {
    const output = run('--category agents');
    assert.ok(output.includes('AGENTS'));
  });

  it('filters by skills category', () => {
    const output = run('--category skills');
    assert.ok(output.includes('SKILLS'));
  });

  it('filters by commands category', () => {
    const output = run('--category commands');
    assert.ok(output.includes('COMMANDS'));
  });

  it('filters by rules category', () => {
    const output = run('--category rules');
    assert.ok(output.includes('RULES'));
  });

  it('shows total count', () => {
    const output = run();
    assert.ok(output.includes('Total'));
  });

  it('shows warning for unknown category', () => {
    const output = run('--category nonexistent');
    assert.ok(output.includes('Unknown category'));
  });
});
