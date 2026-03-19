#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'trigger-lint-test-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/hooks/trigger-lint.js');
const ROOT = path.resolve(__dirname, '../..');

describe('trigger-lint hook', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  function run(filePath) {
    return execSync(`node "${SCRIPT}" "${filePath}"`, { encoding: 'utf8', cwd: ROOT, timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] });
  }

  it('detects DML in trigger body', () => {
    const file = path.join(TEMP_DIR, 'Bad.trigger');
    fs.writeFileSync(file, `trigger BadTrigger on Account (before insert) {
  update Trigger.new;
}`);
    assert.throws(() => run(file), (err) => {
      const output = err.stdout || '';
      assert.ok(output.includes('DML') || output.includes('trigger-delegate-handler'));
      return true;
    });
  });

  it('detects SOQL in trigger body', () => {
    const file = path.join(TEMP_DIR, 'Soql.trigger');
    fs.writeFileSync(file, `trigger SoqlTrigger on Account (before insert) {
  List<Account> accs = [SELECT Id FROM Account];
}`);
    assert.throws(() => run(file), (err) => {
      const output = err.stdout || '';
      assert.ok(output.includes('SOQL') || output.includes('trigger-no-soql'));
      return true;
    });
  });

  it('detects complex logic in trigger', () => {
    const file = path.join(TEMP_DIR, 'Complex.trigger');
    fs.writeFileSync(file, `trigger ComplexTrigger on Account (before insert) {
  if (true) {}
  if (true) {}
  if (true) {}
  for (Account a : Trigger.new) {}
}`);
    // Complex logic is MEDIUM severity, exits 0
    const output = run(file);
    assert.ok(output.includes('trigger-minimal-logic') || output.includes('significant logic'));
  });

  it('always emits one-trigger-per-object informational finding', () => {
    const file = path.join(TEMP_DIR, 'Simple.trigger');
    fs.writeFileSync(file, `trigger SimpleTrigger on Account (before insert) {
  AccountTriggerHandler.handle(Trigger.new);
}`);
    // This will still have one-trigger-per-object LOW finding, which does NOT cause exit 1
    const output = run(file);
    assert.ok(output.includes('one-trigger-per-object') || output.includes('SimpleTrigger'));
  });

  it('exits 1 for missing file argument', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    });
  });
});
