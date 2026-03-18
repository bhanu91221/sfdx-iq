#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { getProfile, getProfileLevel, getDisabledHooks, isHookEnabled } = require('../../scripts/lib/hook-flags');

describe('hook-flags', () => {
  let savedProfile;
  let savedDisabled;

  beforeEach(() => {
    savedProfile = process.env.CSIQ_HOOK_PROFILE;
    savedDisabled = process.env.CSIQ_DISABLED_HOOKS;
    delete process.env.CSIQ_HOOK_PROFILE;
    delete process.env.CSIQ_DISABLED_HOOKS;
  });

  afterEach(() => {
    if (savedProfile !== undefined) {process.env.CSIQ_HOOK_PROFILE = savedProfile;}
    else {delete process.env.CSIQ_HOOK_PROFILE;}
    if (savedDisabled !== undefined) {process.env.CSIQ_DISABLED_HOOKS = savedDisabled;}
    else {delete process.env.CSIQ_DISABLED_HOOKS;}
  });

  it('getProfile returns standard by default', () => {
    assert.strictEqual(getProfile(), 'standard');
  });

  it('getProfile reads CSIQ_HOOK_PROFILE env var', () => {
    process.env.CSIQ_HOOK_PROFILE = 'strict';
    assert.strictEqual(getProfile(), 'strict');
  });

  it('getProfile falls back to standard for invalid value', () => {
    process.env.CSIQ_HOOK_PROFILE = 'turbo';
    assert.strictEqual(getProfile(), 'standard');
  });

  it('getProfileLevel returns correct numeric levels', () => {
    assert.strictEqual(getProfileLevel('minimal'), 1);
    assert.strictEqual(getProfileLevel('standard'), 2);
    assert.strictEqual(getProfileLevel('strict'), 3);
  });

  it('isHookEnabled returns false for disabled hooks', () => {
    process.env.CSIQ_DISABLED_HOOKS = 'pmd-scan,security-check';
    assert.strictEqual(isHookEnabled('pmd-scan'), false);
    assert.strictEqual(isHookEnabled('other-hook'), true);
  });

  it('isHookEnabled respects profile levels', () => {
    process.env.CSIQ_HOOK_PROFILE = 'minimal';
    assert.strictEqual(isHookEnabled('hook1', 'minimal'), true);
    assert.strictEqual(isHookEnabled('hook1', 'standard'), false);
    assert.strictEqual(isHookEnabled('hook1', 'strict'), false);
  });

  it('getDisabledHooks parses comma-separated string', () => {
    process.env.CSIQ_DISABLED_HOOKS = 'hook-a, hook-b , hook-c';
    const disabled = getDisabledHooks();
    assert.deepStrictEqual(disabled, ['hook-a', 'hook-b', 'hook-c']);
  });

  it('getDisabledHooks returns empty array when not set', () => {
    assert.deepStrictEqual(getDisabledHooks(), []);
  });
});
