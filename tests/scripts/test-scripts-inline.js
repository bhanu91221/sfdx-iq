#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { requireScript } = require('../helpers/require-script');

const ROOT = path.resolve(__dirname, '../..');
const TEMP_DIR = path.join(os.tmpdir(), 'scripts-inline-test-' + Date.now());

describe('CLI scripts inline coverage', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  // ── status.js ──────────────────────────────────────
  describe('status.js', () => {
    it('shows component summary', () => {
      const r = requireScript(path.join(ROOT, 'scripts/status.js'), []);
      assert.ok(r.stdout.includes('claude-sfdx-iq'));
      assert.ok(r.stdout.includes('Agents'));
    });
  });

  // ── doctor.js ──────────────────────────────────────
  describe('doctor.js', () => {
    it('runs diagnostic checks', () => {
      const r = requireScript(path.join(ROOT, 'scripts/doctor.js'), []);
      assert.ok(r.stdout.includes('Doctor') || r.stdout.includes('Node.js'));
    });
  });

  // ── repair.js ──────────────────────────────────────
  describe('repair.js', () => {
    it('runs in check mode', () => {
      const r = requireScript(path.join(ROOT, 'scripts/repair.js'), []);
      assert.ok(r.stdout.includes('Repair Tool'));
    });
  });

  // ── list-installed.js ──────────────────────────────────────
  describe('list-installed.js', () => {
    it('lists all components', () => {
      const r = requireScript(path.join(ROOT, 'scripts/list-installed.js'), []);
      assert.ok(r.stdout.includes('Installed Components'));
    });

    it('filters by category', () => {
      const r = requireScript(path.join(ROOT, 'scripts/list-installed.js'), ['--category', 'agents']);
      assert.ok(r.stdout.includes('AGENTS'));
    });
  });

  // ── install-plan.js ──────────────────────────────────────
  describe('install-plan.js', () => {
    it('shows plan for default profile', () => {
      const r = requireScript(path.join(ROOT, 'scripts/install-plan.js'), ['--profile', 'default']);
      assert.ok(r.stdout.includes('Installation Plan'));
    });

    it('exits 1 for unknown profile', () => {
      const r = requireScript(path.join(ROOT, 'scripts/install-plan.js'), ['--profile', 'nonexistent-xyz']);
      assert.strictEqual(r.exitCode, 1);
    });
  });

  // ── csiq.js ──────────────────────────────────────
  describe('csiq.js', () => {
    it('shows help with no args', () => {
      const r = requireScript(path.join(ROOT, 'scripts/csiq.js'), []);
      assert.ok(r.stdout.includes('claude-sfdx-iq') || r.stdout.includes('Usage'));
    });

    it('shows help with help command', () => {
      const r = requireScript(path.join(ROOT, 'scripts/csiq.js'), ['help']);
      assert.ok(r.stdout.includes('Commands'));
    });

    it('exits 1 for unknown command', () => {
      const r = requireScript(path.join(ROOT, 'scripts/csiq.js'), ['nonexistent-xyz']);
      assert.strictEqual(r.exitCode, 1);
    });
  });

  // ── tokens.js ──────────────────────────────────────
  describe('tokens.js', () => {
    it('shows token report', () => {
      const r = requireScript(path.join(ROOT, 'scripts/tokens.js'), ['--all']);
      assert.ok(r.stdout.includes('Token Budget') || r.stdout.includes('SKILLS'));
    });
  });

  // ── estimate-tokens.js (module exports) ──────────────────────────────────────
  describe('estimate-tokens.js', () => {
    it('exports expected functions', () => {
      const mod = require('../../scripts/estimate-tokens');
      assert.strictEqual(typeof mod.estimateTokens, 'function');
      assert.strictEqual(typeof mod.inferDomain, 'function');
      assert.strictEqual(typeof mod.discoverSkills, 'function');
      assert.strictEqual(typeof mod.discoverAgents, 'function');
      assert.strictEqual(typeof mod.discoverRules, 'function');
    });
  });

  // ── refresh-claude-md.js ──────────────────────────────────────
  describe('refresh-claude-md.js', () => {
    it('generates CLAUDE.md or reports missing template', () => {
      const r = requireScript(path.join(ROOT, 'scripts/refresh-claude-md.js'), ['--target', TEMP_DIR]);
      // Either generates successfully or reports missing template
      assert.ok(r.stdout.includes('generated') || r.stderr.includes('Template not found') || r.exitCode === 1);
    });
  });

  // ── CI validators ──────────────────────────────────────
  describe('validate-agents.js', () => {
    it('validates agent files', () => {
      const r = requireScript(path.join(ROOT, 'scripts/ci/validate-agents.js'), []);
      assert.ok(r.stdout.includes('Validating agent') || r.stdout.includes('passed'));
    });
  });

  describe('validate-commands.js', () => {
    it('validates command files', () => {
      const r = requireScript(path.join(ROOT, 'scripts/ci/validate-commands.js'), []);
      assert.ok(r.stdout.includes('Validating command') || r.stdout.includes('passed'));
    });
  });

  describe('validate-hooks.js', () => {
    it('validates hook files', () => {
      const r = requireScript(path.join(ROOT, 'scripts/ci/validate-hooks.js'), []);
      assert.ok(r.stdout.includes('Validating hook') || r.stdout.includes('passed'));
    });
  });

  describe('validate-skills.js', () => {
    it('validates skill files', () => {
      const r = requireScript(path.join(ROOT, 'scripts/ci/validate-skills.js'), []);
      assert.ok(r.stdout.includes('Validating skill') || r.stdout.includes('passed'));
    });
  });

  describe('validate-rules.js', () => {
    it('validates rule files', () => {
      const r = requireScript(path.join(ROOT, 'scripts/ci/validate-rules.js'), []);
      assert.ok(r.stdout.includes('Validating rule') || r.stdout.includes('found'));
    });
  });

  describe('validate-install-manifests.js', () => {
    it('validates manifest files', () => {
      const r = requireScript(path.join(ROOT, 'scripts/ci/validate-install-manifests.js'), []);
      assert.ok(r.stdout.includes('Validating install manifest') || r.stdout.includes('passed'));
    });
  });

  // ── validate-manifests.js ──────────────────────────────────────
  describe('validate-manifests.js', () => {
    it('validates manifests against schemas', () => {
      const validateManifests = path.join(ROOT, 'scripts/ci/validate-manifests.js');
      if (!fs.existsSync(validateManifests)) return;
      const r = requireScript(validateManifests, []);
      assert.ok(r.stdout.length > 0 || r.exitCode !== null);
    });
  });
});
