#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'gov-scan-test-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/hooks/post-edit-governor-scan.js');
const ROOT = path.resolve(__dirname, '../..');

describe('post-edit-governor-scan hook', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  function run(filePath) {
    return execSync(`node "${SCRIPT}" "${filePath}"`, {
      encoding: 'utf8', cwd: ROOT, timeout: 10000, stdio: ['pipe', 'pipe', 'pipe']
    });
  }

  it('detects SOQL in loop as CRITICAL', () => {
    const file = path.join(TEMP_DIR, 'Test.cls');
    fs.writeFileSync(file, `public class Test {
  public void doWork() {
    for (Id i : ids) {
      Account a = [SELECT Id FROM Account WHERE Id = :i];
    }
  }
}`);
    assert.throws(() => run(file), (err) => {
      assert.ok(err.stdout.includes('SOQL') || err.stdout.includes('no-soql-in-loop'));
      return true;
    });
  });

  it('detects DML in loop as CRITICAL', () => {
    const file = path.join(TEMP_DIR, 'Test2.cls');
    fs.writeFileSync(file, `public class Test2 {
  public void doWork() {
    for (Account a : accs) {
      update a;
    }
  }
}`);
    assert.throws(() => run(file), (err) => {
      assert.ok(err.stdout.includes('DML') || err.stdout.includes('no-dml-in-loop'));
      return true;
    });
  });

  it('detects HTTP callout in loop', () => {
    const file = path.join(TEMP_DIR, 'Test3.cls');
    fs.writeFileSync(file, `public class Test3 {
  public void doWork() {
    for (Integer i = 0; i < 10; i++) {
      Http h = new Http();
      HttpRequest req = new HttpRequest();
      h.send(req);
    }
  }
}`);
    assert.throws(() => run(file), (err) => {
      const output = err.stdout || '';
      assert.ok(output.includes('callout') || output.includes('no-callout-in-loop') || output.includes('HTTP'));
      return true;
    });
  });

  it('detects enqueueJob in loop', () => {
    const file = path.join(TEMP_DIR, 'Test4.cls');
    fs.writeFileSync(file, `public class Test4 {
  public void doWork() {
    for (Integer i = 0; i < 10; i++) {
      System.enqueueJob(new MyQueueable());
    }
  }
}`);
    // enqueueJob is HIGH not CRITICAL, so script exits 0
    const output = run(file);
    assert.ok(output.includes('enqueueJob') || output.includes('no-enqueue-in-loop'));
  });

  it('recognizes Limits API usage as good pattern', () => {
    const file = path.join(TEMP_DIR, 'Good.cls');
    fs.writeFileSync(file, `public with sharing class Good {
  public void doWork() {
    Integer q = Limits.getQueries();
  }
}`);
    const output = run(file);
    assert.ok(output.includes('Limits API') || output.includes('limits-api-usage'));
  });

  it('reports no findings for clean code', () => {
    const file = path.join(TEMP_DIR, 'Clean.cls');
    fs.writeFileSync(file, `public with sharing class Clean {
  public void doWork() {
    List<Account> accts = [SELECT Id FROM Account LIMIT 10];
  }
}`);
    const output = run(file);
    assert.ok(output.includes('No governor limit risks'));
  });

  it('exits 1 for missing argument', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    });
  });
});
