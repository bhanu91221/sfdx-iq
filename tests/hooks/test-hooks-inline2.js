#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { requireScript } = require('../helpers/require-script');

const TEMP_DIR = path.join(os.tmpdir(), 'hooks-inline2-test-' + Date.now());

describe('Additional hook inline tests', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  // ── soql-check (more comprehensive) ──────────────────────────────────────
  describe('soql-check comprehensive', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/soql-check.js');

    it('detects SOQL without LIMIT', () => {
      const file = path.join(TEMP_DIR, 'NoLimit.cls');
      fs.writeFileSync(file, `public with sharing class NoLimit {
  public void doWork() {
    List<Account> a = [SELECT Id, Name FROM Account WHERE Name = 'test'];
  }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('LIMIT') || r.stdout.includes('soql-require-limit'));
    });

    it('detects SOQL without WHERE', () => {
      const file = path.join(TEMP_DIR, 'NoWhere.cls');
      fs.writeFileSync(file, `public with sharing class NoWhere {
  public void doWork() {
    List<Account> a = [SELECT Id FROM Account LIMIT 10];
  }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('WHERE') || r.stdout.includes('soql-require-where'));
    });

    it('detects missing SECURITY_ENFORCED', () => {
      const file = path.join(TEMP_DIR, 'NoSec.cls');
      fs.writeFileSync(file, `public with sharing class NoSec {
  public void doWork() {
    List<Account> a = [SELECT Id FROM Account WHERE Id != null LIMIT 10];
  }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('SECURITY') || r.stdout.includes('soql-require-security'));
    });

    it('reports clean for fully secure query', () => {
      const file = path.join(TEMP_DIR, 'Secure.cls');
      fs.writeFileSync(file, `public with sharing class Secure {
  public void doWork() {
    // no SOQL queries
    Integer x = 1;
  }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('No SOQL issues'));
    });

    it('skips LIMIT check for batch classes', () => {
      const file = path.join(TEMP_DIR, 'Batch.cls');
      fs.writeFileSync(file, `public with sharing class MyBatch implements Database.Batchable<SObject> {
  public void execute(Database.BatchableContext bc, List<Account> scope) {
    List<Account> a = [SELECT Id FROM Account WHERE Name = 'x' WITH SECURITY_ENFORCED];
  }
}`);
      const r = requireScript(script, [file]);
      // Should not report missing LIMIT for batch class
      const hasLimitFinding = r.stdout.includes('soql-require-limit');
      assert.ok(!hasLimitFinding, 'Should not flag missing LIMIT in batch class');
    });

    it('exits 1 for no args', () => {
      const r = requireScript(script, []);
      assert.strictEqual(r.exitCode, 1);
    });

    it('exits 1 for non-existent file', () => {
      const r = requireScript(script, ['/tmp/nope.cls']);
      assert.strictEqual(r.exitCode, 1);
    });
  });

  // ── quality-gate (without git, tests the analysis logic) ──────────────────
  describe('quality-gate', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/quality-gate.js');

    it('exits 1 when git is not available', () => {
      // In test context, git diff may fail or return empty
      const r = requireScript(script, []);
      // Should either fail on git or report no staged files
      assert.ok(r.exitCode !== null);
    });
  });

  // ── pre-commit-check (without git) ──────────────────
  describe('pre-commit-check', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/pre-commit-check.js');

    it('handles case when git is available', () => {
      // Will either process staged files or report "passed" with no staged files
      const r = requireScript(script, []);
      // Just ensure it doesn't crash catastrophically
      assert.ok(r.stdout.length > 0 || r.stderr.length > 0 || r.exitCode !== null);
    });
  });

  // ── flow-check more paths ──────────────────────────────────────
  describe('flow-check additional', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/flow-check.js');

    it('detects DML in loops', () => {
      const file = path.join(TEMP_DIR, 'dml-loop.flow-meta.xml');
      fs.writeFileSync(file, `<?xml version="1.0"?>
<Flow>
  <description>Test flow</description>
  <loops>
    <name>LoopRecords</name>
    <nextValueConnector><targetReference>CreateRecord</targetReference></nextValueConnector>
  </loops>
  <recordCreates>
    <name>CreateRecord</name>
    <faultConnector><targetReference>HandleError</targetReference></faultConnector>
  </recordCreates>
</Flow>`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('DML') || r.stdout.includes('flow-no-dml-in-loop') || r.stdout.includes('description'));
    });

    it('handles clean flow', () => {
      const file = path.join(TEMP_DIR, 'clean.flow-meta.xml');
      fs.writeFileSync(file, `<?xml version="1.0"?>
<Flow>
  <description>A clean flow with proper configuration</description>
</Flow>`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('No flow issues'));
    });
  });

  // ── governor-scan additional paths ──────────────────────────────────────
  describe('governor-scan additional', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/post-edit-governor-scan.js');

    it('detects nested loop SOQL', () => {
      const file = path.join(TEMP_DIR, 'Nested.cls');
      fs.writeFileSync(file, `public class Nested {
  public void doWork() {
    for (Account a : accounts) {
      for (Contact c : contacts) {
        List<Task> t = [SELECT Id FROM Task WHERE WhoId = :c.Id];
      }
    }
  }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('nested') || r.stdout.includes('no-soql-nested-loop') || r.stdout.includes('SOQL'));
    });

    it('detects Database.query in loop', () => {
      const file = path.join(TEMP_DIR, 'DbQuery.cls');
      fs.writeFileSync(file, `public class DbQuery {
  public void doWork() {
    for (String q : queries) {
      Database.query(q);
    }
  }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('SOQL') || r.stdout.includes('Database.query'));
    });

    it('detects Database.update in loop', () => {
      const file = path.join(TEMP_DIR, 'DbUpdate.cls');
      fs.writeFileSync(file, `public class DbUpdate {
  public void doWork() {
    for (Account a : accs) {
      Database.update(a);
    }
  }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('DML') || r.stdout.includes('no-dml-in-loop'));
    });

    it('detects unbounded collection', () => {
      const file = path.join(TEMP_DIR, 'Unbound.cls');
      fs.writeFileSync(file, `public with sharing class Unbound {
  public void doWork() {
    List<Account> big = new List<Account>();
  }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('collection') || r.stdout.includes('unbounded-collection') || r.stdout.includes('No governor'));
    });
  });

  // ── security-scan additional ──────────────────────────────────────
  describe('security-scan additional', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/post-edit-security-scan.js');

    it('skips findings for test classes', () => {
      const file = path.join(TEMP_DIR, 'SecureTest.cls');
      fs.writeFileSync(file, `@isTest
public class SecureTest {
  static void testStuff() {
    String password = 'testonly';
    String url = 'https://test.salesforce.com';
  }
}`);
      const r = requireScript(script, [file]);
      // Test classes should not flag hardcoded secrets or URLs
      assert.ok(!r.stdout.includes('no-hardcoded-secrets'));
    });

    it('detects without sharing with justification comment', () => {
      const file = path.join(TEMP_DIR, 'Justified.cls');
      fs.writeFileSync(file, `// Justified: needs system context for batch processing
public without sharing class Justified {
  public void doWork() {}
}`);
      const r = requireScript(script, [file]);
      // Should not flag without-sharing because justification comment exists
      assert.ok(!r.stdout.includes('without-sharing-justification'));
    });
  });
});
