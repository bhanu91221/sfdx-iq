#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { requireScript } = require('../helpers/require-script');
const path = require('path');

const CI_DIR = path.resolve(__dirname, '../../scripts/ci');

describe('CI validators (in-process)', () => {
  describe('validate-agents.js', () => {
    it('passes validation with exit code null (success)', () => {
      const result = requireScript(path.join(CI_DIR, 'validate-agents.js'));
      assert.ok(result.exitCode === null || result.exitCode === 0, `Expected success, got exit code ${result.exitCode}`);
      assert.ok(result.stdout.includes('Validating agent'));
      assert.ok(result.stdout.includes('passed'));
    });

    it('outputs PASS for each agent', () => {
      const result = requireScript(path.join(CI_DIR, 'validate-agents.js'));
      assert.ok(result.stdout.includes('PASS'));
      assert.ok(!result.stderr.includes('FAIL'));
    });
  });

  describe('validate-commands.js', () => {
    it('passes validation with exit code null (success)', () => {
      const result = requireScript(path.join(CI_DIR, 'validate-commands.js'));
      assert.ok(result.exitCode === null || result.exitCode === 0, `Expected success, got exit code ${result.exitCode}`);
      assert.ok(result.stdout.includes('Validating command'));
      assert.ok(result.stdout.includes('passed'));
    });

    it('outputs PASS for each command', () => {
      const result = requireScript(path.join(CI_DIR, 'validate-commands.js'));
      assert.ok(result.stdout.includes('PASS'));
    });
  });

  describe('validate-hooks.js', () => {
    it('passes validation', () => {
      const result = requireScript(path.join(CI_DIR, 'validate-hooks.js'));
      assert.ok(result.exitCode === null || result.exitCode === 0);
      assert.ok(result.stdout.includes('Validating hook'));
      assert.ok(result.stdout.includes('passed'));
    });

    it('validates hook structure', () => {
      const result = requireScript(path.join(CI_DIR, 'validate-hooks.js'));
      assert.ok(result.stdout.includes('PASS'));
    });
  });

  describe('validate-skills.js', () => {
    it('passes validation', () => {
      const result = requireScript(path.join(CI_DIR, 'validate-skills.js'));
      assert.ok(result.exitCode === null || result.exitCode === 0);
      assert.ok(result.stdout.includes('Validating skill'));
      assert.ok(result.stdout.includes('passed'));
    });
  });

  describe('validate-rules.js', () => {
    it('passes validation', () => {
      const result = requireScript(path.join(CI_DIR, 'validate-rules.js'));
      assert.ok(result.exitCode === null || result.exitCode === 0);
      assert.ok(result.stdout.includes('Validating rule'));
      assert.ok(result.stdout.includes('found'));
    });
  });

  describe('validate-manifests.js', () => {
    it('passes validation', () => {
      const result = requireScript(path.join(CI_DIR, 'validate-manifests.js'));
      assert.ok(result.exitCode === null || result.exitCode === 0);
      assert.ok(result.stdout.includes('Validating manifest'));
      assert.ok(result.stdout.includes('passed'));
    });
  });

  describe('validate-install-manifests.js', () => {
    it('passes validation', () => {
      const result = requireScript(path.join(CI_DIR, 'validate-install-manifests.js'));
      assert.ok(result.exitCode === null || result.exitCode === 0);
      assert.ok(result.stdout.includes('Validating install manifest'));
      assert.ok(result.stdout.includes('passed'));
    });

    it('reports component count', () => {
      const result = requireScript(path.join(CI_DIR, 'validate-install-manifests.js'));
      assert.ok(result.stdout.includes('components verified'));
    });
  });
});
