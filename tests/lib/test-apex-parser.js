#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { analyzeApexFile, isTestClass } = require('../../scripts/lib/apex-parser');

describe('apex-parser', () => {
  it('detects SOQL in for loop as CRITICAL', () => {
    const code = `
public class MyClass {
  public void doWork() {
    for (Account a : accounts) {
      List<Contact> contacts = [SELECT Id FROM Contact WHERE AccountId = :a.Id];
    }
  }
}`;
    const result = analyzeApexFile(code, 'MyClass.cls');
    const soqlFindings = result.findings.filter(f => f.rule === 'no-soql-in-loop');
    assert.ok(soqlFindings.length > 0, 'Should detect SOQL in loop');
    assert.strictEqual(soqlFindings[0].severity, 'CRITICAL');
  });

  it('detects DML in while loop as CRITICAL', () => {
    const code = `
public class MyClass {
  public void doWork() {
    while (hasMore) {
      insert newRecord;
    }
  }
}`;
    const result = analyzeApexFile(code, 'MyClass.cls');
    const dmlFindings = result.findings.filter(f => f.rule === 'no-dml-in-loop');
    assert.ok(dmlFindings.length > 0, 'Should detect DML in loop');
    assert.strictEqual(dmlFindings[0].severity, 'CRITICAL');
  });

  it('detects missing with sharing as HIGH', () => {
    const code = `public class AccountHandler {\n  public void process() {}\n}`;
    const result = analyzeApexFile(code, 'AccountHandler.cls');
    const sharingFindings = result.findings.filter(f => f.rule === 'require-sharing-keyword');
    assert.ok(sharingFindings.length > 0, 'Should detect missing sharing keyword');
    assert.strictEqual(sharingFindings[0].severity, 'HIGH');
  });

  it('detects System.debug as LOW', () => {
    const code = `public with sharing class MyClass {\n  public void run() {\n    System.debug('test');\n  }\n}`;
    const result = analyzeApexFile(code, 'MyClass.cls');
    const debugFindings = result.findings.filter(f => f.rule === 'no-system-debug');
    assert.ok(debugFindings.length > 0, 'Should detect System.debug');
    assert.strictEqual(debugFindings[0].severity, 'LOW');
  });

  it('skips System.debug in test classes', () => {
    const code = `@isTest\npublic class MyClassTest {\n  static void testMethod1() {\n    System.debug('ok in test');\n  }\n}`;
    const result = analyzeApexFile(code, 'MyClassTest.cls');
    const debugFindings = result.findings.filter(f => f.rule === 'no-system-debug');
    assert.strictEqual(debugFindings.length, 0, 'Should skip System.debug in test class');
  });

  it('detects hardcoded Salesforce IDs', () => {
    const code = `public with sharing class MyClass {\n  String acctId = '001000000000001';\n}`;
    const result = analyzeApexFile(code, 'MyClass.cls');
    const idFindings = result.findings.filter(f => f.rule === 'no-hardcoded-ids');
    assert.ok(idFindings.length > 0, 'Should detect hardcoded ID');
    assert.strictEqual(idFindings[0].severity, 'HIGH');
  });

  it('detects method longer than 50 lines as MEDIUM', () => {
    const bodyLines = Array.from({ length: 55 }, (_, i) => `    Integer x${i} = ${i};`).join('\n');
    const code = `public with sharing class MyClass {\n  public void longMethod() {\n${bodyLines}\n  }\n}`;
    const result = analyzeApexFile(code, 'MyClass.cls');
    const longFindings = result.findings.filter(f => f.rule === 'method-too-long');
    assert.ok(longFindings.length > 0, 'Should detect long method');
    assert.strictEqual(longFindings[0].severity, 'MEDIUM');
  });

  it('returns no findings for clean code', () => {
    const code = `public with sharing class CleanClass {\n  public void doWork() {\n    List<Account> accts = [SELECT Id FROM Account LIMIT 10];\n  }\n}`;
    const result = analyzeApexFile(code, 'CleanClass.cls');
    const nonDebugFindings = result.findings.filter(f => f.rule !== 'no-system-debug');
    assert.strictEqual(nonDebugFindings.length, 0, 'Clean code should have no findings');
  });

  it('isTestClass correctly identifies test classes', () => {
    assert.strictEqual(isTestClass('@isTest\npublic class Test {}'), true);
    assert.strictEqual(isTestClass('public class Regular {}'), false);
  });
});
