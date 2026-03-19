#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const { runWithFlags, PROFILES } = require('../../scripts/hooks/run-with-flags');

describe('run-with-flags', () => {
  const origEnv = {};

  beforeEach(() => {
    origEnv.CSIQ_HOOK_PROFILE = process.env.CSIQ_HOOK_PROFILE;
    origEnv.CSIQ_DISABLED_HOOKS = process.env.CSIQ_DISABLED_HOOKS;
  });

  afterEach(() => {
    if (origEnv.CSIQ_HOOK_PROFILE === undefined) delete process.env.CSIQ_HOOK_PROFILE;
    else process.env.CSIQ_HOOK_PROFILE = origEnv.CSIQ_HOOK_PROFILE;
    if (origEnv.CSIQ_DISABLED_HOOKS === undefined) delete process.env.CSIQ_DISABLED_HOOKS;
    else process.env.CSIQ_DISABLED_HOOKS = origEnv.CSIQ_DISABLED_HOOKS;
  });

  it('exports PROFILES with minimal, standard, strict', () => {
    assert.ok(PROFILES.minimal);
    assert.ok(PROFILES.standard);
    assert.ok(PROFILES.strict);
    assert.ok(PROFILES.minimal < PROFILES.standard);
    assert.ok(PROFILES.standard < PROFILES.strict);
  });

  it('runs hook when profile meets requirement', () => {
    process.env.CSIQ_HOOK_PROFILE = 'standard';
    let ran = false;
    const result = runWithFlags('test-hook', () => { ran = true; return 0; }, { minProfile: 'standard' });
    assert.strictEqual(ran, true);
    assert.strictEqual(result, 0);
  });

  it('skips hook when profile is below requirement', () => {
    process.env.CSIQ_HOOK_PROFILE = 'minimal';
    let ran = false;
    const result = runWithFlags('test-hook', () => { ran = true; return 0; }, { minProfile: 'standard' });
    assert.strictEqual(ran, false);
    assert.strictEqual(result, 0);
  });

  it('skips hook when hook ID is disabled', () => {
    process.env.CSIQ_HOOK_PROFILE = 'strict';
    process.env.CSIQ_DISABLED_HOOKS = 'test-hook,other-hook';
    let ran = false;
    const result = runWithFlags('test-hook', () => { ran = true; return 0; }, { minProfile: 'minimal' });
    assert.strictEqual(ran, false);
    assert.strictEqual(result, 0);
  });

  it('returns 1 when hook function throws', () => {
    process.env.CSIQ_HOOK_PROFILE = 'standard';
    delete process.env.CSIQ_DISABLED_HOOKS;
    const result = runWithFlags('test-hook', () => { throw new Error('boom'); }, { minProfile: 'standard' });
    assert.strictEqual(result, 1);
  });

  it('returns hook function return value', () => {
    process.env.CSIQ_HOOK_PROFILE = 'standard';
    delete process.env.CSIQ_DISABLED_HOOKS;
    const result = runWithFlags('test-hook', () => 42, { minProfile: 'minimal' });
    assert.strictEqual(result, 42);
  });

  it('defaults to standard profile when env not set', () => {
    delete process.env.CSIQ_HOOK_PROFILE;
    delete process.env.CSIQ_DISABLED_HOOKS;
    let ran = false;
    runWithFlags('test-hook', () => { ran = true; }, { minProfile: 'standard' });
    assert.strictEqual(ran, true);
  });

  it('defaults to standard when minProfile not set in options', () => {
    process.env.CSIQ_HOOK_PROFILE = 'standard';
    delete process.env.CSIQ_DISABLED_HOOKS;
    let ran = false;
    runWithFlags('test-hook', () => { ran = true; });
    assert.strictEqual(ran, true);
  });
});
