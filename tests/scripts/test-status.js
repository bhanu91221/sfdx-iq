#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '../../scripts/status.js');
const ROOT = path.resolve(__dirname, '../..');

describe('status script', () => {
  it('shows component summary', () => {
    const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
    assert.ok(output.includes('sfdx-iq'));
    assert.ok(output.includes('Component Summary'));
  });

  it('lists agents count', () => {
    const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
    assert.ok(output.includes('Agents'));
  });

  it('lists commands count', () => {
    const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
    assert.ok(output.includes('Commands'));
  });

  it('shows available profiles', () => {
    const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
    assert.ok(output.includes('Available Profiles'));
  });

  it('shows total component count', () => {
    const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
    assert.ok(output.includes('Total'));
  });
});
