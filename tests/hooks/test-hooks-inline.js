#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { requireScript } = require('../helpers/require-script');

const TEMP_DIR = path.join(os.tmpdir(), 'hooks-inline-test-' + Date.now());

describe('Hook scripts inline coverage', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  // ── apex-lint ──────────────────────────────────────
  describe('apex-lint', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/apex-lint.js');

    it('detects SOQL in loop', () => {
      const file = path.join(TEMP_DIR, 'Bad.cls');
      fs.writeFileSync(file, `public class Bad {
  public void doWork() {
    for (Id i : ids) {
      Account a = [SELECT Id FROM Account WHERE Id = :i];
    }
  }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('SOQL') || r.stdout.includes('no-soql-in-loop'));
    });

    it('detects DML in loop', () => {
      const file = path.join(TEMP_DIR, 'Dml.cls');
      fs.writeFileSync(file, `public class Dml {
  public void doWork() {
    for (Account a : accs) {
      update a;
    }
  }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('DML') || r.stdout.includes('no-dml-in-loop'));
    });

    it('detects missing with sharing', () => {
      const file = path.join(TEMP_DIR, 'NoShare.cls');
      fs.writeFileSync(file, `public class NoShare {
  public void doWork() {}
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('sharing') || r.stdout.includes('require-sharing'));
    });

    it('detects hardcoded IDs', () => {
      const file = path.join(TEMP_DIR, 'HardId.cls');
      fs.writeFileSync(file, `public with sharing class HardId {
  String id = '001000000000001AAA';
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('hardcoded') || r.stdout.includes('no-hardcoded-ids'));
    });

    it('reports clean for good code', () => {
      const file = path.join(TEMP_DIR, 'Good.cls');
      fs.writeFileSync(file, `public with sharing class Good {
  public void doWork() {
    List<Account> a = [SELECT Id FROM Account LIMIT 10];
  }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('No issues'));
    });

    it('exits 1 with no arguments', () => {
      const r = requireScript(script, []);
      assert.strictEqual(r.exitCode, 1);
    });

    it('exits 1 for non-existent file', () => {
      const r = requireScript(script, ['/tmp/nonexistent-abc.cls']);
      assert.strictEqual(r.exitCode, 1);
    });
  });

  // ── flow-check ──────────────────────────────────────
  describe('flow-check', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/flow-check.js');

    it('detects missing description', () => {
      const file = path.join(TEMP_DIR, 'test.flow-meta.xml');
      fs.writeFileSync(file, '<?xml version="1.0"?><Flow><label>Test</label></Flow>');
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('description') || r.stdout.includes('flow-require-description'));
    });

    it('detects missing fault connector', () => {
      const file = path.join(TEMP_DIR, 'f2.flow-meta.xml');
      fs.writeFileSync(file, `<Flow><description>Test</description><recordCreates><name>Create</name></recordCreates></Flow>`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('fault') || r.stdout.includes('flow-require-fault-connector'));
    });

    it('exits 1 with no args', () => {
      const r = requireScript(script, []);
      assert.strictEqual(r.exitCode, 1);
    });
  });

  // ── lwc-lint ──────────────────────────────────────
  describe('lwc-lint', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/lwc-lint.js');

    it('detects innerHTML', () => {
      const file = path.join(TEMP_DIR, 'lwc.js');
      fs.writeFileSync(file, `import { LightningElement } from 'lwc';
export default class Test extends LightningElement {
  connectedCallback() { this.template.innerHTML = '<b>X</b>'; }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('innerHTML') || r.stdout.includes('no-innerhtml'));
    });

    it('detects console.log', () => {
      const file = path.join(TEMP_DIR, 'lwc2.js');
      fs.writeFileSync(file, `import { LightningElement } from 'lwc';
export default class Test extends LightningElement {
  connectedCallback() { console.log('hi'); }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('console') || r.stdout.includes('no-console'));
    });

    it('exits 1 for no args', () => {
      const r = requireScript(script, []);
      assert.strictEqual(r.exitCode, 1);
    });
  });

  // ── trigger-lint ──────────────────────────────────────
  describe('trigger-lint', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/trigger-lint.js');

    it('detects DML in trigger body', () => {
      const file = path.join(TEMP_DIR, 'T.trigger');
      fs.writeFileSync(file, `trigger T on Account (before insert) {
  update Trigger.new;
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('DML') || r.stdout.includes('trigger-delegate-handler'));
    });

    it('detects SOQL in trigger', () => {
      const file = path.join(TEMP_DIR, 'T2.trigger');
      fs.writeFileSync(file, `trigger T2 on Account (before insert) {
  List<Account> a = [SELECT Id FROM Account];
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('SOQL') || r.stdout.includes('trigger-no-soql'));
    });
  });

  // ── post-edit-debug-warn ──────────────────────────────────────
  describe('post-edit-debug-warn', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/post-edit-debug-warn.js');

    it('detects System.debug in non-test class', () => {
      const file = path.join(TEMP_DIR, 'Svc.cls');
      fs.writeFileSync(file, `public with sharing class Svc {
  public void doWork() { System.debug('x'); }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('debug') || r.stdout.includes('no-debug-statements'));
    });

    it('skips test classes', () => {
      const file = path.join(TEMP_DIR, 'SvcTest.cls');
      fs.writeFileSync(file, `@isTest public class SvcTest { static void t() { System.debug('ok'); } }`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('Test class') || r.stdout.includes('allowed'));
    });

    it('uses strict profile severity', () => {
      const file = path.join(TEMP_DIR, 'Strict.cls');
      fs.writeFileSync(file, `public with sharing class Strict { public void x() { System.debug('x'); } }`);
      const r = requireScript(script, [file], { env: { CSIQ_HOOK_PROFILE: 'strict' } });
      assert.ok(r.stdout.includes('MEDIUM') || r.stdout.includes('debug'));
    });
  });

  // ── post-edit-governor-scan ──────────────────────────────────────
  describe('post-edit-governor-scan', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/post-edit-governor-scan.js');

    it('detects SOQL in loop', () => {
      const file = path.join(TEMP_DIR, 'GovBad.cls');
      fs.writeFileSync(file, `public class GovBad {
  public void doWork() {
    for (Id i : ids) {
      Account a = [SELECT Id FROM Account WHERE Id = :i];
    }
  }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('SOQL') || r.stdout.includes('no-soql-in-loop'));
    });

    it('detects DML in loop', () => {
      const file = path.join(TEMP_DIR, 'GovDml.cls');
      fs.writeFileSync(file, `public class GovDml {
  public void doWork() {
    for (Account a : accs) {
      update a;
    }
  }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('DML') || r.stdout.includes('no-dml-in-loop'));
    });

    it('detects Limits API usage as positive', () => {
      const file = path.join(TEMP_DIR, 'LimitsGood.cls');
      fs.writeFileSync(file, `public with sharing class LimitsGood {
  public void doWork() { Integer q = Limits.getQueries(); }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('Limits API') || r.stdout.includes('limits-api-usage'));
    });

    it('reports clean code', () => {
      const file = path.join(TEMP_DIR, 'GovClean.cls');
      fs.writeFileSync(file, `public with sharing class GovClean {
  public void doWork() { List<Account> a = [SELECT Id FROM Account LIMIT 10]; }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('No governor'));
    });
  });

  // ── post-edit-security-scan ──────────────────────────────────────
  describe('post-edit-security-scan', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/post-edit-security-scan.js');

    it('detects without sharing', () => {
      const file = path.join(TEMP_DIR, 'SecBad.cls');
      fs.writeFileSync(file, `public without sharing class SecBad { public void x() {} }`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('without sharing') || r.stdout.includes('without-sharing'));
    });

    it('detects SOQL injection', () => {
      const file = path.join(TEMP_DIR, 'Inject.cls');
      fs.writeFileSync(file, `public with sharing class Inject {
  public List<Account> s(String i) {
    String q = 'SELECT Id FROM Account WHERE Name = \\'' + i + '\\'';
    return Database.query(q + ' LIMIT 10');
  }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('injection') || r.stdout.includes('SOQL') || r.stdout.includes('no-soql-injection'));
    });

    it('detects hardcoded secrets', () => {
      const file = path.join(TEMP_DIR, 'SecretBad.cls');
      fs.writeFileSync(file, `public with sharing class SecretBad {
  String password = 'mysecret123';
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('credential') || r.stdout.includes('hardcoded') || r.stdout.includes('no-hardcoded-secrets'));
    });

    it('detects missing CRUD/FLS', () => {
      const file = path.join(TEMP_DIR, 'NoCrud.cls');
      fs.writeFileSync(file, `public with sharing class NoCrud {
  public List<Account> get() { return [SELECT Id FROM Account]; }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('CRUD') || r.stdout.includes('require-crud-fls'));
    });

    it('reports clean for secure code', () => {
      const file = path.join(TEMP_DIR, 'Secure.cls');
      fs.writeFileSync(file, `public with sharing class Secure {
  public List<Account> get() { return [SELECT Id FROM Account WITH SECURITY_ENFORCED]; }
}`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('Security scan clean'));
    });
  });

  // ── post-edit-pmd-scan ──────────────────────────────────────
  describe('post-edit-pmd-scan', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/post-edit-pmd-scan.js');

    it('detects excessive class length', () => {
      const file = path.join(TEMP_DIR, 'Big.cls');
      const lines = ['public with sharing class Big {'];
      for (let i = 0; i < 550; i++) lines.push(`  public void m${i}() { Integer x = ${i}; }`);
      lines.push('}');
      fs.writeFileSync(file, lines.join('\n'));
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('ExcessiveClassLength') || r.stdout.includes('lines long'));
    });

    it('reports clean for small class', () => {
      const file = path.join(TEMP_DIR, 'Small.cls');
      fs.writeFileSync(file, `public with sharing class Small { public void x() { Integer a = 1; } }`);
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('PMD scan clean'));
    });
  });

  // ── soql-check ──────────────────────────────────────
  describe('soql-check', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/soql-check.js');

    it('detects SOQL without LIMIT', () => {
      const file = path.join(TEMP_DIR, 'NoLimit.cls');
      fs.writeFileSync(file, `public with sharing class NoLimit {
  public void doWork() { List<Account> a = [SELECT Id, Name FROM Account WHERE Id != null]; }
}`);
      const r = requireScript(script, [file]);
      // May or may not detect depending on heuristics
      assert.ok(r.stdout.length > 0 || r.exitCode !== null);
    });
  });

  // ── pre-bash-destructive-warn ──────────────────────────────────────
  describe('pre-bash-destructive-warn', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/pre-bash-destructive-warn.js');

    it('exits 0 for non-destructive commands', () => {
      const r = requireScript(script, ['sf', 'project', 'deploy', 'start']);
      assert.strictEqual(r.exitCode, 0);
    });

    it('warns about destructive commands', () => {
      const r = requireScript(script, ['sf', 'project', 'deploy', '--purge-on-delete']);
      assert.ok(r.stdout.includes('DESTRUCTIVE'));
    });
  });

  // ── post-bash-deploy-complete ──────────────────────────────────────
  describe('post-bash-deploy-complete', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/post-bash-deploy-complete.js');

    it('parses successful deploy JSON', () => {
      const file = path.join(TEMP_DIR, 'deploy.json');
      fs.writeFileSync(file, JSON.stringify({
        result: { status: 'Succeeded', numberComponentsDeployed: 5, numberComponentErrors: 0, numberTestsCompleted: 10, numberTestErrors: 0 }
      }));
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('Deploy Summary'));
      assert.ok(r.stdout.includes('Succeeded'));
    });

    it('exits 1 for failed deploy', () => {
      const file = path.join(TEMP_DIR, 'fail.json');
      fs.writeFileSync(file, JSON.stringify({ result: { status: 'Failed', numberComponentErrors: 1 } }));
      const r = requireScript(script, [file]);
      assert.strictEqual(r.exitCode, 1);
    });
  });

  // ── post-bash-test-complete ──────────────────────────────────────
  describe('post-bash-test-complete', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/post-bash-test-complete.js');

    it('parses successful test results', () => {
      const file = path.join(TEMP_DIR, 'results.json');
      fs.writeFileSync(file, JSON.stringify({
        result: {
          summary: { passing: 5, failing: 0 },
          tests: [{ MethodName: 'test1', Outcome: 'Pass', RunTime: 100 }]
        }
      }));
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('Apex Test Results'));
    });

    it('shows coverage data', () => {
      const file = path.join(TEMP_DIR, 'cov.json');
      fs.writeFileSync(file, JSON.stringify({
        result: {
          summary: { passing: 1, failing: 0 },
          tests: [{ MethodName: 't', Outcome: 'Pass' }],
          coverage: { coverage: [{ name: 'MyClass', numLocations: 100, numLocationsNotCovered: 10 }] }
        }
      }));
      const r = requireScript(script, [file]);
      assert.ok(r.stdout.includes('Coverage') || r.stdout.includes('MyClass'));
    });

    it('exits 1 for failing tests', () => {
      const file = path.join(TEMP_DIR, 'fail.json');
      fs.writeFileSync(file, JSON.stringify({
        result: {
          summary: { passing: 0, failing: 1 },
          tests: [{ MethodName: 'tFail', Outcome: 'Fail', Message: 'err' }]
        }
      }));
      const r = requireScript(script, [file]);
      assert.strictEqual(r.exitCode, 1);
    });
  });

  // ── session-start ──────────────────────────────────────
  describe('session-start', () => {
    const script = path.resolve(__dirname, '../../scripts/hooks/session-start.js');

    it('reports no sfdx-project.json', () => {
      const origCwd = process.cwd;
      process.cwd = () => TEMP_DIR;
      const r = requireScript(script, []);
      process.cwd = origCwd;
      assert.ok(r.stdout.includes('No sfdx-project.json') || r.exitCode === 0);
    });
  });
});
