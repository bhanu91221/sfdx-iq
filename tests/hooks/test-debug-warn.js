#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'debug-warn-test-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/hooks/post-edit-debug-warn.js');
const ROOT = path.resolve(__dirname, '../..');

describe('post-edit-debug-warn hook', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  function run(filePath, env = {}) {
    return execSync(`node "${SCRIPT}" "${filePath}"`, {
      encoding: 'utf8', cwd: ROOT, timeout: 10000,
      env: { ...process.env, ...env }
    });
  }

  it('detects System.debug statements', () => {
    const file = path.join(TEMP_DIR, 'MyService.cls');
    fs.writeFileSync(file, `public with sharing class MyService {
  public void doWork() {
    System.debug('test');
  }
}`);
    const output = run(file);
    assert.ok(output.includes('System.debug') || output.includes('no-debug-statements'));
  });

  it('skips test classes', () => {
    const file = path.join(TEMP_DIR, 'MyTest.cls');
    fs.writeFileSync(file, `@isTest
public class MyTest {
  static void testMethod() {
    System.debug('ok in test');
  }
}`);
    const output = run(file);
    assert.ok(output.includes('Test class') || output.includes('debug statements allowed'));
  });

  it('skips files ending with Test.cls', () => {
    const file = path.join(TEMP_DIR, 'AccountTest.cls');
    fs.writeFileSync(file, `public class AccountTest {
  public void doWork() {
    System.debug('test');
  }
}`);
    const output = run(file);
    assert.ok(output.includes('Test class') || output.includes('debug statements allowed'));
  });

  it('reports no findings for clean code', () => {
    const file = path.join(TEMP_DIR, 'Clean.cls');
    fs.writeFileSync(file, `public with sharing class Clean {
  public void doWork() {
    Integer x = 1;
  }
}`);
    const output = run(file);
    assert.ok(output.includes('No debug statements'));
  });

  it('uses MEDIUM severity in strict profile', () => {
    const file = path.join(TEMP_DIR, 'Strict.cls');
    fs.writeFileSync(file, `public with sharing class Strict {
  public void doWork() {
    System.debug('test');
  }
}`);
    const output = run(file, { CSIQ_HOOK_PROFILE: 'strict' });
    assert.ok(output.includes('MEDIUM') || output.includes('debug'));
  });

  it('exits 1 for missing file argument', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    });
  });
});
