#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'test-complete-test-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/hooks/post-bash-test-complete.js');
const ROOT = path.resolve(__dirname, '../..');

describe('post-bash-test-complete hook', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  it('parses successful test results', () => {
    const data = {
      result: {
        summary: { passing: 10, failing: 0, skipped: 0 },
        tests: [
          { MethodName: 'testOne', Outcome: 'Pass', RunTime: 100 },
          { MethodName: 'testTwo', Outcome: 'Pass', RunTime: 50 }
        ]
      }
    };
    const file = path.join(TEMP_DIR, 'results.json');
    fs.writeFileSync(file, JSON.stringify(data));
    const output = execSync(`node "${SCRIPT}" "${file}"`, { encoding: 'utf8', cwd: ROOT });
    assert.ok(output.includes('Apex Test Results'));
    assert.ok(output.includes('Passing'));
  });

  it('exits 1 when tests fail', () => {
    const data = {
      result: {
        summary: { passing: 1, failing: 1, skipped: 0 },
        tests: [
          { MethodName: 'testPass', Outcome: 'Pass', RunTime: 100 },
          { MethodName: 'testFail', Outcome: 'Fail', RunTime: 50, Message: 'Assert failed', StackTrace: 'line 5' }
        ]
      }
    };
    const file = path.join(TEMP_DIR, 'fail-results.json');
    fs.writeFileSync(file, JSON.stringify(data));
    assert.throws(() => {
      execSync(`node "${SCRIPT}" "${file}"`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    }, (err) => {
      assert.ok(err.stdout.includes('testFail') || err.stdout.includes('Failed Tests'));
      return true;
    });
  });

  it('shows coverage report when present', () => {
    const data = {
      result: {
        summary: { passing: 2, failing: 0 },
        tests: [{ MethodName: 'test1', Outcome: 'Pass' }],
        coverage: {
          coverage: [
            { name: 'MyClass', numLocations: 100, numLocationsNotCovered: 10 }
          ]
        }
      }
    };
    const file = path.join(TEMP_DIR, 'coverage.json');
    fs.writeFileSync(file, JSON.stringify(data));
    const output = execSync(`node "${SCRIPT}" "${file}"`, { encoding: 'utf8', cwd: ROOT });
    assert.ok(output.includes('Code Coverage') || output.includes('MyClass'));
  });

  it('flags classes below 75% coverage', () => {
    const data = {
      result: {
        summary: { passing: 1, failing: 0 },
        tests: [{ MethodName: 'test1', Outcome: 'Pass' }],
        coverage: {
          coverage: [
            { name: 'LowCoverage', numLocations: 100, numLocationsNotCovered: 50 }
          ]
        }
      }
    };
    const file = path.join(TEMP_DIR, 'low-cov.json');
    fs.writeFileSync(file, JSON.stringify(data));
    const output = execSync(`node "${SCRIPT}" "${file}"`, { encoding: 'utf8', cwd: ROOT });
    assert.ok(output.includes('LowCoverage') || output.includes('below'));
  });

  it('exits 1 for invalid JSON', () => {
    const file = path.join(TEMP_DIR, 'bad.json');
    fs.writeFileSync(file, 'not json at all');
    assert.throws(() => {
      execSync(`node "${SCRIPT}" "${file}"`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    });
  });
});
