#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const TEMP_DIR = path.join(os.tmpdir(), 'setup-project-test-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/setup-project.js');
const ROOT = path.resolve(__dirname, '../..');

describe('setup-project script', () => {
  beforeEach(() => {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  });

  it('exits 1 when sfdx-project.json is missing', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}" "${TEMP_DIR}"`, {
        encoding: 'utf8', cwd: ROOT, stdio: 'pipe', timeout: 15000
      });
    }, (err) => {
      assert.ok(err.stderr.includes('Not a Salesforce DX project') || err.stdout.includes('Not a Salesforce DX project'));
      return true;
    });
  });

  it('sets up project when sfdx-project.json exists', () => {
    // Create a fake sfdx-project.json
    fs.writeFileSync(path.join(TEMP_DIR, 'sfdx-project.json'), JSON.stringify({
      packageDirectories: [{ path: 'force-app', default: true }],
      sourceApiVersion: '59.0'
    }), 'utf8');

    const output = execSync(`node "${SCRIPT}" "${TEMP_DIR}"`, {
      encoding: 'utf8', cwd: ROOT, timeout: 15000
    });

    assert.ok(output.includes('SFDX project detected'));
    assert.ok(output.includes('Setup complete'));

    // Check rules were copied
    const rulesDir = path.join(TEMP_DIR, '.claude', 'rules');
    assert.ok(fs.existsSync(rulesDir), '.claude/rules/ should exist');
  });

  it('creates .claude directory if it does not exist', () => {
    fs.writeFileSync(path.join(TEMP_DIR, 'sfdx-project.json'), '{}', 'utf8');

    execSync(`node "${SCRIPT}" "${TEMP_DIR}"`, {
      encoding: 'utf8', cwd: ROOT, timeout: 15000
    });

    assert.ok(fs.existsSync(path.join(TEMP_DIR, '.claude')));
  });

  it('reports .claude directory already exists', () => {
    fs.writeFileSync(path.join(TEMP_DIR, 'sfdx-project.json'), '{}', 'utf8');
    fs.mkdirSync(path.join(TEMP_DIR, '.claude'), { recursive: true });

    const output = execSync(`node "${SCRIPT}" "${TEMP_DIR}"`, {
      encoding: 'utf8', cwd: ROOT, timeout: 15000
    });

    assert.ok(output.includes('.claude/ directory exists'));
  });

  it('backs up existing rules directory', () => {
    fs.writeFileSync(path.join(TEMP_DIR, 'sfdx-project.json'), '{}', 'utf8');
    const rulesDir = path.join(TEMP_DIR, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'old-rule.md'), 'old content', 'utf8');

    const output = execSync(`node "${SCRIPT}" "${TEMP_DIR}"`, {
      encoding: 'utf8', cwd: ROOT, timeout: 15000
    });

    assert.ok(output.includes('backup'));
    assert.ok(fs.existsSync(path.join(TEMP_DIR, '.claude', 'rules.backup')));
  });

  it('skips settings.json if it already exists', () => {
    fs.writeFileSync(path.join(TEMP_DIR, 'sfdx-project.json'), '{}', 'utf8');
    fs.mkdirSync(path.join(TEMP_DIR, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(TEMP_DIR, '.claude', 'settings.json'), '{"custom": true}', 'utf8');

    const output = execSync(`node "${SCRIPT}" "${TEMP_DIR}"`, {
      encoding: 'utf8', cwd: ROOT, timeout: 15000
    });

    assert.ok(output.includes('settings.json already exists'));
    // Verify it was NOT overwritten
    const content = JSON.parse(fs.readFileSync(path.join(TEMP_DIR, '.claude', 'settings.json'), 'utf8'));
    assert.strictEqual(content.custom, true);
  });

  it('skips CLAUDE.md if it already exists', () => {
    fs.writeFileSync(path.join(TEMP_DIR, 'sfdx-project.json'), '{}', 'utf8');
    fs.writeFileSync(path.join(TEMP_DIR, 'CLAUDE.md'), '# My Project', 'utf8');

    const output = execSync(`node "${SCRIPT}" "${TEMP_DIR}"`, {
      encoding: 'utf8', cwd: ROOT, timeout: 15000
    });

    assert.ok(output.includes('CLAUDE.md already exists'));
    // Verify it was NOT overwritten
    const content = fs.readFileSync(path.join(TEMP_DIR, 'CLAUDE.md'), 'utf8');
    assert.strictEqual(content, '# My Project');
  });

  it('copies settings.json when it does not exist', () => {
    fs.writeFileSync(path.join(TEMP_DIR, 'sfdx-project.json'), '{}', 'utf8');
    const templateSettings = path.join(ROOT, '.claude-project-template', 'settings.json');

    // Only test if the template exists
    if (!fs.existsSync(templateSettings)) return;

    execSync(`node "${SCRIPT}" "${TEMP_DIR}"`, {
      encoding: 'utf8', cwd: ROOT, timeout: 15000
    });

    assert.ok(fs.existsSync(path.join(TEMP_DIR, '.claude', 'settings.json')));
  });

  it('prints token optimization info', () => {
    fs.writeFileSync(path.join(TEMP_DIR, 'sfdx-project.json'), '{}', 'utf8');

    const output = execSync(`node "${SCRIPT}" "${TEMP_DIR}"`, {
      encoding: 'utf8', cwd: ROOT, timeout: 15000
    });

    assert.ok(output.includes('Token Optimization'));
    assert.ok(output.includes('context-assigner'));
  });

  it('prints next steps', () => {
    fs.writeFileSync(path.join(TEMP_DIR, 'sfdx-project.json'), '{}', 'utf8');

    const output = execSync(`node "${SCRIPT}" "${TEMP_DIR}"`, {
      encoding: 'utf8', cwd: ROOT, timeout: 15000
    });

    assert.ok(output.includes('Next steps'));
  });
});
