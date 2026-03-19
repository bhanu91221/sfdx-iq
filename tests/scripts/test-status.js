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
    assert.ok(output.includes('claude-sfdx-iq'));
    assert.ok(output.includes('Component Summary'));
  });

  it('lists agents count', () => {
    const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
    assert.ok(output.includes('Agents'));
  });

  it('lists skills count', () => {
    const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
    assert.ok(output.includes('Skills'));
  });

  it('lists commands count', () => {
    const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
    assert.ok(output.includes('Commands'));
  });

  it('lists rules count', () => {
    const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
    assert.ok(output.includes('Rules'));
  });

  it('shows rules by category', () => {
    const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
    assert.ok(output.includes('Rules by Category'));
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
