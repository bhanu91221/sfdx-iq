#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'destructive-warn-test-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/hooks/pre-bash-destructive-warn.js');
const ROOT = path.resolve(__dirname, '../..');

describe('pre-bash-destructive-warn hook', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  function run(args) {
    return execSync(`node "${SCRIPT}" ${args}`, {
      encoding: 'utf8', cwd: TEMP_DIR, timeout: 10000
    });
  }

  it('exits 0 for non-destructive commands', () => {
    const output = run('sf project deploy start');
    // Should exit 0 with no output (non-destructive)
    assert.strictEqual(output, '');
  });

  it('warns about destructiveChanges command', () => {
    const output = run('sf project deploy start --manifest destructiveChanges.xml');
    assert.ok(output.includes('DESTRUCTIVE'));
  });

  it('warns about --purge-on-delete', () => {
    const output = run('sf project deploy start --purge-on-delete');
    assert.ok(output.includes('DESTRUCTIVE'));
  });

  it('warns about source:delete', () => {
    const output = run('sf source:delete -p force-app');
    assert.ok(output.includes('DESTRUCTIVE'));
  });

  it('parses destructiveChanges.xml if present', () => {
    const xmlContent = `<?xml version="1.0"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>OldClass</members>
    <name>ApexClass</name>
  </types>
</Package>`;
    fs.writeFileSync(path.join(TEMP_DIR, 'destructiveChanges.xml'), xmlContent);
    const output = run('sf project deploy start --manifest destructiveChanges.xml');
    assert.ok(output.includes('OldClass') || output.includes('component'));
  });

  it('exits 1 with no arguments', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: TEMP_DIR, stdio: 'pipe' });
    });
  });
});
