'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'apex-lint-test-' + Date.now());

function detectViolations(content) {
  const violations = [];

  // Detect SOQL in loops
  const loopPatterns = [
    /for\s*\([^)]*\)\s*\{[^}]*\[SELECT\b/gi,
    /while\s*\([^)]*\)\s*\{[^}]*\[SELECT\b/gi,
    /for\s*\([^)]*\)\s*\{[\s\S]*?\[SELECT\b/gi,
  ];
  for (const pattern of loopPatterns) {
    if (pattern.test(content)) {
      violations.push({ rule: 'no-soql-in-loop', severity: 'error' });
    }
  }

  // Detect DML in loops
  const dmlInLoopPattern = /for\s*\([^)]*\)\s*\{[\s\S]*?\b(insert|update|delete|upsert|undelete)\b/gi;
  if (dmlInLoopPattern.test(content)) {
    violations.push({ rule: 'no-dml-in-loop', severity: 'error' });
  }

  // Detect missing 'with sharing'
  const classPattern = /\bclass\s+\w+/g;
  const withSharingPattern = /\bwith sharing\b/gi;
  if (classPattern.test(content) && !withSharingPattern.test(content)) {
    violations.push({ rule: 'require-with-sharing', severity: 'warning' });
  }

  // Detect hardcoded IDs
  const hardcodedIdPattern = /['"][a-zA-Z0-9]{15,18}['"]/g;
  const idMatches = content.match(hardcodedIdPattern);
  if (idMatches) {
    for (const match of idMatches) {
      if (/^['"][0-9a-zA-Z]{15}['"]$/.test(match) || /^['"][0-9a-zA-Z]{18}['"]$/.test(match)) {
        violations.push({ rule: 'no-hardcoded-ids', severity: 'warning' });
      }
    }
  }

  return violations;
}

describe('Apex lint violation detection', () => {
  beforeEach(() => {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  });

  it('should detect SOQL in a for loop', () => {
    const code = `public class BadClass {
      public void process(List<Id> ids) {
        for (Id i : ids) {
          Account a = [SELECT Id FROM Account WHERE Id = :i];
        }
      }
    }`;
    const violations = detectViolations(code);
    const soqlViolation = violations.find(v => v.rule === 'no-soql-in-loop');
    assert.ok(soqlViolation, 'Should detect SOQL in loop');
    assert.strictEqual(soqlViolation.severity, 'error');
  });

  it('should detect DML in a for loop', () => {
    const code = `public class BadClass {
      public void process(List<Account> accs) {
        for (Account a : accs) {
          update a;
        }
      }
    }`;
    const violations = detectViolations(code);
    const dmlViolation = violations.find(v => v.rule === 'no-dml-in-loop');
    assert.ok(dmlViolation, 'Should detect DML in loop');
  });

  it('should detect missing with sharing', () => {
    const code = `public class UnsafeClass {
      public void doWork() {}
    }`;
    const violations = detectViolations(code);
    const sharingViolation = violations.find(v => v.rule === 'require-with-sharing');
    assert.ok(sharingViolation, 'Should detect missing with sharing');
  });

  it('should not flag class with sharing', () => {
    const code = `public with sharing class SafeClass {
      public void doWork() {}
    }`;
    const violations = detectViolations(code);
    const sharingViolation = violations.find(v => v.rule === 'require-with-sharing');
    assert.ok(!sharingViolation, 'Should not flag class that has with sharing');
  });

  it('should report no violations for clean code', () => {
    const code = `public with sharing class CleanClass {
      public List<Account> getAccounts(Set<Id> ids) {
        return [SELECT Id, Name FROM Account WHERE Id IN :ids WITH SECURITY_ENFORCED];
      }
    }`;
    const violations = detectViolations(code);
    assert.strictEqual(violations.length, 0, 'Clean code should have no violations');
  });
});
