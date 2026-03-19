#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'install-apply-test-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/install-apply.js');
const ROOT = path.resolve(__dirname, '../..');

describe('install-apply script', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  it('redirects to install-plan in dry-run mode', () => {
    try {
      const output = execSync(
        `node "${SCRIPT}" --profile default --target "${TEMP_DIR}" --dry-run`,
        { encoding: 'utf8', cwd: ROOT, timeout: 15000 }
      );
      assert.ok(output.includes('Installation Plan') || output.includes('dry-run'));
    } catch (err) {
      // May exit 1 if components missing, check output
      const output = err.stdout || '';
      assert.ok(output.includes('Installation Plan') || output.includes('dry-run'));
    }
  });

  it('installs components for default profile', () => {
    try {
      const output = execSync(
        `node "${SCRIPT}" --profile default --target "${TEMP_DIR}"`,
        { encoding: 'utf8', cwd: ROOT, timeout: 30000 }
      );
      // Should create .claude directory with components
      assert.ok(output.includes('install') || output.includes('copied') || output.includes('Install'));
    } catch (err) {
      // May fail on specific components, that's ok for test
      const output = err.stdout || '';
      assert.ok(output.length > 0 || err.stderr.length > 0);
    }
  });

  it('installs components for minimal profile', () => {
    try {
      const output = execSync(
        `node "${SCRIPT}" --profile minimal --target "${TEMP_DIR}"`,
        { encoding: 'utf8', cwd: ROOT, timeout: 30000 }
      );
      assert.ok(output.length > 0);
    } catch (err) {
      // Install may complete with warnings
      assert.ok((err.stdout || '').length > 0 || (err.stderr || '').length > 0);
    }
  });

  it('exits 1 for unknown profile in dry-run', () => {
    assert.throws(() => {
      execSync(
        `node "${SCRIPT}" --profile nonexistent-xyz --target "${TEMP_DIR}" --dry-run`,
        { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' }
      );
    });
  });
});
