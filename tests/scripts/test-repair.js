#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '../../scripts/repair.js');
const ROOT = path.resolve(__dirname, '../..');

describe('repair script', () => {
  it('runs in check mode by default', () => {
    try {
      const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
      assert.ok(output.includes('Repair Tool'));
      assert.ok(output.includes('CHECK'));
    } catch (err) {
      // May exit 1 if issues found, but should still produce output
      const output = err.stdout || '';
      assert.ok(output.includes('Repair Tool'));
    }
  });

  it('checks directories', () => {
    try {
      const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
      assert.ok(output.includes('directories'));
    } catch (err) {
      assert.ok((err.stdout || '').includes('directories'));
    }
  });

  it('checks critical files', () => {
    try {
      const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
      assert.ok(output.includes('critical files'));
    } catch (err) {
      assert.ok((err.stdout || '').includes('critical files'));
    }
  });

  it('checks manifest references', () => {
    try {
      const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
      assert.ok(output.includes('manifest'));
    } catch (err) {
      assert.ok((err.stdout || '').includes('manifest'));
    }
  });

  it('checks JSON files', () => {
    try {
      const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
      assert.ok(output.includes('JSON'));
    } catch (err) {
      assert.ok((err.stdout || '').includes('JSON'));
    }
  });

  it('checks scripts exist', () => {
    try {
      const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 15000 });
      assert.ok(output.includes('scripts') || output.includes('Checking'));
    } catch (err) {
      assert.ok((err.stdout || '').includes('scripts') || (err.stdout || '').includes('Checking'));
    }
  });
});
