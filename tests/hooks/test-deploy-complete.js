#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'deploy-complete-test-' + Date.now());
const SCRIPT = path.resolve(__dirname, '../../scripts/hooks/post-bash-deploy-complete.js');
const ROOT = path.resolve(__dirname, '../..');

describe('post-bash-deploy-complete hook', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  it('parses successful deploy JSON', () => {
    const data = {
      result: {
        status: 'Succeeded',
        numberComponentsDeployed: 5,
        numberComponentErrors: 0,
        numberTestsCompleted: 10,
        numberTestErrors: 0
      }
    };
    const file = path.join(TEMP_DIR, 'deploy.json');
    fs.writeFileSync(file, JSON.stringify(data));
    const output = execSync(`node "${SCRIPT}" "${file}"`, { encoding: 'utf8', cwd: ROOT });
    assert.ok(output.includes('Deploy Summary'));
    assert.ok(output.includes('Succeeded'));
  });

  it('exits 1 for failed deploy', () => {
    const data = {
      result: {
        status: 'Failed',
        numberComponentsDeployed: 0,
        numberComponentErrors: 3,
        numberTestsCompleted: 0,
        numberTestErrors: 0,
        details: {
          componentFailures: [{ componentType: 'ApexClass', fullName: 'BadClass', problem: 'Compile error' }]
        }
      }
    };
    const file = path.join(TEMP_DIR, 'deploy-fail.json');
    fs.writeFileSync(file, JSON.stringify(data));
    assert.throws(() => {
      execSync(`node "${SCRIPT}" "${file}"`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    }, (err) => {
      assert.ok(err.stdout.includes('Failed') || err.stdout.includes('Component Errors'));
      return true;
    });
  });

  it('exits 1 for invalid JSON', () => {
    const file = path.join(TEMP_DIR, 'bad.json');
    fs.writeFileSync(file, 'not json');
    assert.throws(() => {
      execSync(`node "${SCRIPT}" "${file}"`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    });
  });

  it('shows test failures when present', () => {
    const data = {
      result: {
        status: 'Failed',
        numberTestErrors: 1,
        details: {
          runTestResult: {
            failures: [{ methodName: 'testFailing', message: 'Assert failed', stackTrace: 'line 10' }]
          }
        }
      }
    };
    const file = path.join(TEMP_DIR, 'test-fail.json');
    fs.writeFileSync(file, JSON.stringify(data));
    assert.throws(() => {
      execSync(`node "${SCRIPT}" "${file}"`, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    }, (err) => {
      assert.ok(err.stdout.includes('testFailing') || err.stdout.includes('Test Failures'));
      return true;
    });
  });
});
