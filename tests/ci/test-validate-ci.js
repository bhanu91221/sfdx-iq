#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

describe('CI validators', () => {
  describe('validate-agents', () => {
    it('passes all agent validations', () => {
      const output = execSync(`node "${path.join(ROOT, 'scripts/ci/validate-agents.js')}"`, {
        encoding: 'utf8', cwd: ROOT, timeout: 15000
      });
      assert.ok(output.includes('Validating agent'));
      assert.ok(output.includes('passed'));
      assert.ok(!output.includes('FAIL'));
    });
  });

  describe('validate-commands', () => {
    it('passes all command validations', () => {
      const output = execSync(`node "${path.join(ROOT, 'scripts/ci/validate-commands.js')}"`, {
        encoding: 'utf8', cwd: ROOT, timeout: 15000
      });
      assert.ok(output.includes('Validating command'));
      assert.ok(output.includes('passed'));
    });
  });

  describe('validate-hooks', () => {
    it('passes all hook validations', () => {
      const output = execSync(`node "${path.join(ROOT, 'scripts/ci/validate-hooks.js')}"`, {
        encoding: 'utf8', cwd: ROOT, timeout: 15000
      });
      assert.ok(output.includes('Validating hook'));
      assert.ok(output.includes('passed'));
    });
  });

  describe('validate-skills', () => {
    it('passes all skill validations', () => {
      const output = execSync(`node "${path.join(ROOT, 'scripts/ci/validate-skills.js')}"`, {
        encoding: 'utf8', cwd: ROOT, timeout: 15000
      });
      assert.ok(output.includes('Validating skill'));
      assert.ok(output.includes('passed'));
    });
  });

  describe('validate-rules', () => {
    it('passes all rule validations', () => {
      const output = execSync(`node "${path.join(ROOT, 'scripts/ci/validate-rules.js')}"`, {
        encoding: 'utf8', cwd: ROOT, timeout: 15000
      });
      assert.ok(output.includes('Validating rule'));
      assert.ok(output.includes('found'));
    });
  });

  describe('validate-install-manifests', () => {
    it('passes all manifest validations', () => {
      const output = execSync(`node "${path.join(ROOT, 'scripts/ci/validate-install-manifests.js')}"`, {
        encoding: 'utf8', cwd: ROOT, timeout: 15000
      });
      assert.ok(output.includes('Validating install manifest'));
      assert.ok(output.includes('passed'));
    });
  });
});
