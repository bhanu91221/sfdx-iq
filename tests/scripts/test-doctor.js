#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '../../scripts/doctor.js');
const ROOT = path.resolve(__dirname, '../..');

describe('doctor script', () => {
  it('runs diagnostic checks and produces output', () => {
    try {
      const output = execSync(`node "${SCRIPT}"`, {
        encoding: 'utf8', cwd: ROOT, timeout: 30000
      });
      assert.ok(output.includes('claude-sfdx-iq Doctor'));
      assert.ok(output.includes('Node.js'));
      assert.ok(output.includes('Pass') || output.includes('Warn') || output.includes('Fail'));
    } catch (err) {
      // Doctor might exit 1 if some checks fail, but should still produce output
      const output = err.stdout || '';
      assert.ok(output.includes('claude-sfdx-iq Doctor'));
      assert.ok(output.includes('Node.js'));
    }
  });

  it('checks Node.js version', () => {
    try {
      const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 30000 });
      assert.ok(output.includes('Node.js'));
    } catch (err) {
      assert.ok((err.stdout || '').includes('Node.js'));
    }
  });

  it('checks plugin integrity', () => {
    try {
      const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 30000 });
      assert.ok(output.includes('Plugin') || output.includes('plugin'));
    } catch (err) {
      assert.ok((err.stdout || '').includes('Plugin') || (err.stdout || '').includes('plugin'));
    }
  });

  it('prints a summary line', () => {
    try {
      const output = execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, timeout: 30000 });
      assert.ok(output.includes('Pass:') || output.includes('Fail:') || output.includes('Warn:'));
    } catch (err) {
      const output = err.stdout || '';
      assert.ok(output.includes('Pass:') || output.includes('Fail:') || output.includes('Warn:'));
    }
  });
});
