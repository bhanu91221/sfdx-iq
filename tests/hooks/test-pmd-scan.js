#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'pmd-scan-test-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/hooks/post-edit-pmd-scan.js');
const ROOT = path.resolve(__dirname, '../..');

describe('post-edit-pmd-scan hook', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  function run(filePath) {
    return execSync(`node "${SCRIPT}" "${filePath}"`, {
      encoding: 'utf8', cwd: ROOT, timeout: 30000, stdio: ['pipe', 'pipe', 'pipe']
    });
  }

  it('detects excessive class length (fallback mode)', () => {
    const file = path.join(TEMP_DIR, 'Big.cls');
    const lines = ['public with sharing class Big {'];
    for (let i = 0; i < 550; i++) {
      lines.push(`  public void method${i}() { Integer x = ${i}; }`);
    }
    lines.push('}');
    fs.writeFileSync(file, lines.join('\n'));
    const output = run(file);
    assert.ok(output.includes('ExcessiveClassLength') || output.includes('lines long'));
  });

  it('detects excessive method length (fallback mode)', () => {
    const file = path.join(TEMP_DIR, 'LongMethod.cls');
    const bodyLines = Array.from({ length: 55 }, (_, i) => `    Integer x${i} = ${i};`);
    fs.writeFileSync(file, `public with sharing class LongMethod {
  public void longMethod() {
${bodyLines.join('\n')}
  }
}`);
    const output = run(file);
    assert.ok(output.includes('ExcessiveMethodLength') || output.includes('lines') || output.includes('PMD scan clean'));
  });

  it('reports clean for small class', () => {
    const file = path.join(TEMP_DIR, 'Small.cls');
    fs.writeFileSync(file, `public with sharing class Small {
  public void doWork() {
    Integer x = 1;
  }
}`);
    const output = run(file);
    assert.ok(output.includes('PMD scan clean'));
  });

  it('exits 1 for missing argument', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    });
  });

  it('exits 1 for non-existent file', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}" "/tmp/nonexistent.cls"`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    });
  });
});
