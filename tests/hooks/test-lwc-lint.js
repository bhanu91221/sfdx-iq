#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'lwc-lint-test-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/hooks/lwc-lint.js');
const ROOT = path.resolve(__dirname, '../..');

describe('lwc-lint hook', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  function run(filePath) {
    return execSync(`node "${SCRIPT}" "${filePath}"`, { encoding: 'utf8', cwd: ROOT, timeout: 10000 });
  }

  it('detects innerHTML usage as CRITICAL', () => {
    const file = path.join(TEMP_DIR, 'test.js');
    fs.writeFileSync(file, `import { LightningElement } from 'lwc';
export default class Test extends LightningElement {
  connectedCallback() {
    this.template.innerHTML = '<b>XSS</b>';
  }
}`);
    assert.throws(() => run(file), (err) => {
      assert.ok(err.stdout.includes('innerHTML') || err.stdout.includes('no-innerhtml'));
      return true;
    });
  });

  it('detects @api property mutation as HIGH', () => {
    const file = path.join(TEMP_DIR, 'test2.js');
    fs.writeFileSync(file, `import { LightningElement, api } from 'lwc';
export default class Test extends LightningElement {
  @api myProp;
  connectedCallback() {
    this.myProp = 'mutated';
  }
}`);
    const output = run(file);
    assert.ok(output.includes('api') || output.includes('no-api-mutation'));
  });

  it('detects console.log as LOW', () => {
    const file = path.join(TEMP_DIR, 'test3.js');
    fs.writeFileSync(file, `import { LightningElement } from 'lwc';
export default class Test extends LightningElement {
  connectedCallback() {
    console.log('debug');
  }
}`);
    const output = run(file);
    assert.ok(output.includes('console') || output.includes('no-console'));
  });

  it('detects missing disconnectedCallback cleanup', () => {
    const file = path.join(TEMP_DIR, 'test4.js');
    fs.writeFileSync(file, `import { LightningElement } from 'lwc';
export default class Test extends LightningElement {
  connectedCallback() {
    window.addEventListener('resize', this.handler);
  }
}`);
    const output = run(file);
    assert.ok(output.includes('disconnectedCallback') || output.includes('require-disconnected-cleanup'));
  });

  it('reports no issues for clean LWC', () => {
    const file = path.join(TEMP_DIR, 'clean.js');
    fs.writeFileSync(file, `import { LightningElement } from 'lwc';
export default class Clean extends LightningElement {
  connectedCallback() {}
}`);
    const output = run(file);
    assert.ok(output.includes('No issues found'));
  });

  it('exits 1 for missing file argument', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    });
  });
});
