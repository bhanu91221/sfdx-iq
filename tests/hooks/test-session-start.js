#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'session-start-test-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/hooks/session-start.js');

describe('session-start hook', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  it('prints message when no sfdx-project.json found', () => {
    const output = execSync(`node "${SCRIPT}"`, {
      encoding: 'utf8', cwd: TEMP_DIR, timeout: 20000
    });
    assert.ok(output.includes('No sfdx-project.json'));
  });

  it('detects sfdx-project.json and prints project info', () => {
    const projectJson = {
      sourceApiVersion: '59.0',
      packageDirectories: [{ path: 'force-app', default: true }],
      namespace: 'myns'
    };
    fs.writeFileSync(path.join(TEMP_DIR, 'sfdx-project.json'), JSON.stringify(projectJson));
    const output = execSync(`node "${SCRIPT}"`, {
      encoding: 'utf8', cwd: TEMP_DIR, timeout: 20000
    });
    assert.ok(output.includes('SFDX Project Detected'));
    assert.ok(output.includes('59.0'));
    assert.ok(output.includes('myns'));
  });

  it('handles sfdx-project.json without namespace', () => {
    const projectJson = {
      sourceApiVersion: '58.0',
      packageDirectories: [{ path: 'force-app' }]
    };
    fs.writeFileSync(path.join(TEMP_DIR, 'sfdx-project.json'), JSON.stringify(projectJson));
    const output = execSync(`node "${SCRIPT}"`, {
      encoding: 'utf8', cwd: TEMP_DIR, timeout: 20000
    });
    assert.ok(output.includes('58.0'));
    // Should not crash without namespace
  });

  it('exits 1 for invalid sfdx-project.json', () => {
    fs.writeFileSync(path.join(TEMP_DIR, 'sfdx-project.json'), 'not json');
    assert.throws(() => {
      execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: TEMP_DIR, stdio: 'pipe', timeout: 20000 });
    });
  });
});
