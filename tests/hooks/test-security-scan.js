#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'sec-scan-test-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/hooks/post-edit-security-scan.js');
const ROOT = path.resolve(__dirname, '../..');

describe('post-edit-security-scan hook', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  function run(filePath) {
    return execSync(`node "${SCRIPT}" "${filePath}"`, {
      encoding: 'utf8', cwd: ROOT, timeout: 10000, stdio: ['pipe', 'pipe', 'pipe']
    });
  }

  it('detects without sharing without justification', () => {
    const file = path.join(TEMP_DIR, 'Test.cls');
    fs.writeFileSync(file, `public without sharing class Test {
  public void doWork() {}
}`);
    const output = run(file);
    assert.ok(output.includes('without sharing') || output.includes('without-sharing-justification'));
  });

  it('detects SOQL injection via Database.query with concatenation', () => {
    const file = path.join(TEMP_DIR, 'Injection.cls');
    fs.writeFileSync(file, `public with sharing class Injection {
  public List<Account> search(String input) {
    String q = 'SELECT Id FROM Account WHERE Name = \\'' + input + '\\'';
    return Database.query(q + ' LIMIT 10');
  }
}`);
    assert.throws(() => run(file), (err) => {
      const output = err.stdout || '';
      assert.ok(output.includes('injection') || output.includes('no-soql-injection') || output.includes('SOQL'));
      return true;
    });
  });

  it('detects hardcoded secrets', () => {
    const file = path.join(TEMP_DIR, 'Secrets.cls');
    fs.writeFileSync(file, `public with sharing class Secrets {
  String password = 'mysecretpassword';
}`);
    assert.throws(() => run(file), (err) => {
      const output = err.stdout || '';
      assert.ok(output.includes('hardcoded') || output.includes('no-hardcoded-secrets') || output.includes('credential'));
      return true;
    });
  });

  it('detects hardcoded URLs', () => {
    const file = path.join(TEMP_DIR, 'Urls.cls');
    fs.writeFileSync(file, `public with sharing class Urls {
  String endpoint = 'https://api.example.com/v1/data';
}`);
    const output = run(file);
    assert.ok(output.includes('URL') || output.includes('no-hardcoded-urls'));
  });

  it('detects missing CRUD/FLS enforcement', () => {
    const file = path.join(TEMP_DIR, 'NoCrud.cls');
    fs.writeFileSync(file, `public with sharing class NoCrud {
  public List<Account> getAccounts() {
    return [SELECT Id, Name FROM Account];
  }
}`);
    const output = run(file);
    assert.ok(output.includes('CRUD') || output.includes('require-crud-fls'));
  });

  it('detects innerHTML XSS risk', () => {
    const file = path.join(TEMP_DIR, 'Xss.cls');
    fs.writeFileSync(file, `public with sharing class Xss {
  public void render() {
    element.innerHTML = userInput;
  }
}`);
    const output = run(file);
    assert.ok(output.includes('innerHTML') || output.includes('no-inner-html') || output.includes('XSS'));
  });

  it('reports clean for secure code', () => {
    const file = path.join(TEMP_DIR, 'Secure.cls');
    fs.writeFileSync(file, `public with sharing class Secure {
  public List<Account> getAccounts() {
    return [SELECT Id FROM Account WITH SECURITY_ENFORCED];
  }
}`);
    const output = run(file);
    assert.ok(output.includes('Security scan clean'));
  });

  it('exits 1 for missing argument', () => {
    assert.throws(() => {
      execSync(`node "${SCRIPT}"`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    });
  });
});
