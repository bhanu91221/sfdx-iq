#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { requireScript } = require('../helpers/require-script');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '../../scripts/doctor.js');

describe('doctor (in-process)', () => {
  it('prints Doctor header', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(result.stdout.includes('sfdx-iq Doctor'));
  });

  it('checks Node.js version', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(result.stdout.includes('Node.js'));
  });

  it('checks npm', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(result.stdout.includes('npm'));
  });

  it('checks Git', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(result.stdout.includes('Git'));
  });

  it('checks plugin integrity', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(result.stdout.includes('Plugin') || result.stdout.includes('plugin'));
  });

  it('checks Salesforce CLI', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(result.stdout.includes('Salesforce CLI'));
  });

  it('checks SFDX project', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(result.stdout.includes('SFDX Project'));
  });

  it('prints summary with pass/warn/fail counts', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(result.stdout.includes('Pass:'));
  });
});
