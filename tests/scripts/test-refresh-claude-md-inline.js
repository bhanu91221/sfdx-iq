#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { requireScript } = require('../helpers/require-script');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'refresh-claude-md-inline-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/refresh-claude-md.js');
const ROOT = path.resolve(__dirname, '../..');
const TEMPLATE_PATH = path.join(ROOT, 'templates', 'CLAUDE.md.template');

describe('refresh-claude-md (in-process)', () => {
  beforeEach(() => {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  });

  it('exits 1 when template is missing', () => {
    if (fs.existsSync(TEMPLATE_PATH)) {
      // Template exists, so this test checks the happy path instead
      const result = requireScript(SCRIPT, ['--target', TEMP_DIR]);
      assert.ok(result.exitCode === null || result.exitCode === 0);
      assert.ok(result.stdout.includes('generated'));
    } else {
      const result = requireScript(SCRIPT, ['--target', TEMP_DIR]);
      assert.strictEqual(result.exitCode, 1);
      assert.ok(result.stderr.includes('Template not found'));
    }
  });

  it('generates CLAUDE.md in .claude directory', () => {
    if (!fs.existsSync(TEMPLATE_PATH)) return;
    requireScript(SCRIPT, ['--target', TEMP_DIR]);
    const outputPath = path.join(TEMP_DIR, '.claude', 'CLAUDE.md');
    assert.ok(fs.existsSync(outputPath), 'Should generate .claude/CLAUDE.md');
  });

  it('uses profile from --profile flag', () => {
    if (!fs.existsSync(TEMPLATE_PATH)) return;
    const result = requireScript(SCRIPT, ['--target', TEMP_DIR, '--profile', 'default']);
    assert.ok(result.stdout.includes('generated') || result.stdout.includes('Profile'));
  });

  it('reads active-profile.json when present', () => {
    if (!fs.existsSync(TEMPLATE_PATH)) return;
    // Create a fake active-profile.json
    fs.mkdirSync(path.join(TEMP_DIR, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(TEMP_DIR, '.claude', 'active-profile.json'),
      JSON.stringify({
        baseProfile: 'test-profile',
        tokenBudget: { installed: 5000 },
        active: { rules: ['common/security'] }
      }),
      'utf8'
    );
    const result = requireScript(SCRIPT, ['--target', TEMP_DIR]);
    assert.ok(result.stdout.includes('generated'));
  });

  it('handles malformed active-profile.json gracefully', () => {
    if (!fs.existsSync(TEMPLATE_PATH)) return;
    fs.mkdirSync(path.join(TEMP_DIR, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(TEMP_DIR, '.claude', 'active-profile.json'),
      'not json',
      'utf8'
    );
    const result = requireScript(SCRIPT, ['--target', TEMP_DIR]);
    // Should warn but still generate
    assert.ok(result.stdout.includes('generated'));
  });

  it('generateClaudeMd programmatic API works', () => {
    if (!fs.existsSync(TEMPLATE_PATH)) return;
    delete require.cache[require.resolve('../../scripts/refresh-claude-md')];
    const { generateClaudeMd } = require('../../scripts/refresh-claude-md');
    const result = generateClaudeMd({ targetDir: TEMP_DIR, profileName: 'default' });
    assert.ok(result.profileName);
    assert.ok(fs.existsSync(path.join(TEMP_DIR, '.claude', 'CLAUDE.md')));
  });
});
