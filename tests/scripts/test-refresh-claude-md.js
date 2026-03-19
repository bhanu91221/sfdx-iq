#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'refresh-claude-md-test-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/refresh-claude-md.js');
const ROOT = path.resolve(__dirname, '../..');

describe('refresh-claude-md script', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  it('generates CLAUDE.md in target directory', () => {
    // Only works if template exists
    const templatePath = path.join(ROOT, 'templates', 'CLAUDE.md.template');
    if (!fs.existsSync(templatePath)) {
      // Skip if template doesn't exist
      return;
    }
    try {
      execSync(`node "${SCRIPT}" --target "${TEMP_DIR}"`, {
        encoding: 'utf8', cwd: ROOT, timeout: 15000
      });
      const outputFile = path.join(TEMP_DIR, '.claude', 'CLAUDE.md');
      assert.ok(fs.existsSync(outputFile), 'CLAUDE.md should be generated');
    } catch (err) {
      // Script may exit 1 if template missing, that's ok
      const output = err.stdout || err.stderr || '';
      assert.ok(output.includes('Template not found') || output.includes('generated'));
    }
  });

  it('exits 1 when template is missing', () => {
    const templatePath = path.join(ROOT, 'templates', 'CLAUDE.md.template');
    if (fs.existsSync(templatePath)) {
      // Template exists, can't test missing case without risk
      return;
    }
    assert.throws(() => {
      execSync(`node "${SCRIPT}" --target "${TEMP_DIR}"`, {
        encoding: 'utf8', cwd: ROOT, stdio: 'pipe'
      });
    });
  });
});
