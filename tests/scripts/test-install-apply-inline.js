#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { requireScript } = require('../helpers/require-script');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'install-apply-inline-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/install-apply.js');
const ROOT = path.resolve(__dirname, '../..');

describe('install-apply (in-process)', () => {
  beforeEach(() => {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  });

  it('exits 1 for unknown profile', () => {
    const result = requireScript(SCRIPT, ['--profile', 'nonexistent-xyz-profile', '--target', TEMP_DIR]);
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('not found'));
  });

  it('lists available profiles on unknown profile error', () => {
    const result = requireScript(SCRIPT, ['--profile', 'nonexistent-xyz-profile', '--target', TEMP_DIR]);
    assert.ok(result.stderr.includes('Available profiles'));
  });

  it('installs default profile components', () => {
    const result = requireScript(SCRIPT, ['--profile', 'default', '--target', TEMP_DIR]);
    // Should produce installation output
    assert.ok(result.stdout.includes('Installing') || result.stdout.includes('install'));
    // Should create .claude directory
    assert.ok(fs.existsSync(path.join(TEMP_DIR, '.claude')));
  });

  it('installs minimal profile', () => {
    const result = requireScript(SCRIPT, ['--profile', 'minimal', '--target', TEMP_DIR]);
    assert.ok(result.stdout.includes('Installing') || result.stdout.includes('install'));
  });

  it('reports installed count', () => {
    const result = requireScript(SCRIPT, ['--profile', 'default', '--target', TEMP_DIR]);
    assert.ok(result.stdout.includes('Installed:'));
  });

  it('skips identical files on second install', () => {
    // Install once
    requireScript(SCRIPT, ['--profile', 'default', '--target', TEMP_DIR]);
    // Install again
    const result = requireScript(SCRIPT, ['--profile', 'default', '--target', TEMP_DIR]);
    assert.ok(result.stdout.includes('already installed') || result.stdout.includes('Skipped'));
  });

  it('redirects to install-plan in dry-run mode', () => {
    const result = requireScript(SCRIPT, ['--profile', 'default', '--target', TEMP_DIR, '--dry-run']);
    assert.ok(result.stdout.includes('Installation Plan') || result.stdout.includes('dry-run') || result.stdout.includes('Plan'));
  });

  it('writes active-profile.json', () => {
    requireScript(SCRIPT, ['--profile', 'default', '--target', TEMP_DIR]);
    const profilePath = path.join(TEMP_DIR, '.claude', 'active-profile.json');
    assert.ok(fs.existsSync(profilePath), 'active-profile.json should be created');
    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    assert.ok(profile.version);
    assert.ok(profile.active);
  });

  it('handles manifest path via --manifest flag', () => {
    const manifestPath = path.join(ROOT, 'manifests', 'default.json');
    if (!fs.existsSync(manifestPath)) return;
    const result = requireScript(SCRIPT, ['--manifest', manifestPath, '--target', TEMP_DIR]);
    assert.ok(result.stdout.includes('Installing') || result.stdout.includes('install'));
  });
});
