#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'flow-check-test-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/hooks/flow-check.js');
const ROOT = path.resolve(__dirname, '../..');

describe('flow-check hook', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  function run(filePath) {
    return execSync(`node "${SCRIPT}" "${filePath}"`, { encoding: 'utf8', cwd: ROOT, timeout: 10000 });
  }

  it('detects missing flow description', () => {
    const file = path.join(TEMP_DIR, 'test.flow-meta.xml');
    fs.writeFileSync(file, '<?xml version="1.0"?><Flow><label>Test</label></Flow>');
    const output = run(file);
    assert.ok(output.includes('flow-require-description') || output.includes('missing a description'));
  });

  it('detects missing fault connector on DML elements', () => {
    const file = path.join(TEMP_DIR, 'test2.flow-meta.xml');
    fs.writeFileSync(file, `<?xml version="1.0"?><Flow>
      <description>Test flow</description>
      <recordCreates><name>CreateRecord</name></recordCreates>
    </Flow>`);
    const output = run(file);
    assert.ok(output.includes('fault connector') || output.includes('flow-require-fault-connector'));
  });

  it('detects missing element descriptions', () => {
    const file = path.join(TEMP_DIR, 'test3.flow-meta.xml');
    fs.writeFileSync(file, `<?xml version="1.0"?><Flow>
      <description>Test flow</description>
      <decisions><name>MyDecision</name><faultConnector/></decisions>
    </Flow>`);
    const output = run(file);
    assert.ok(output.includes('flow-element-description') || output.includes('missing a description'));
  });

  it('exits 1 when no file arg is given', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    });
  });

  it('exits 1 for non-existent file', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}" "/tmp/nonexistent.flow"`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    });
  });
});
