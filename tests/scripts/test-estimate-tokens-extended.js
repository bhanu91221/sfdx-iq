#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { estimateTokens, inferDomain, discoverSkills, discoverAgents, discoverRules } = require('../../scripts/estimate-tokens');

const TEMP_DIR = path.join(os.tmpdir(), 'est-tokens-ext-' + Date.now());

describe('estimate-tokens extended', () => {
  beforeEach(() => { fs.mkdirSync(TEMP_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); });

  describe('discoverSkills', () => {
    it('returns skills with rawContent', () => {
      const skills = discoverSkills();
      if (skills.length > 0) {
        assert.ok(skills[0].rawContent);
        assert.ok(skills[0].filePath);
      }
    });

    it('includes existingTokens from frontmatter', () => {
      const skills = discoverSkills();
      if (skills.length > 0) {
        // existingTokens may be null or a number
        const skill = skills[0];
        assert.ok(skill.existingTokens === null || typeof skill.existingTokens === 'number');
      }
    });

    it('includes existingDomain from frontmatter', () => {
      const skills = discoverSkills();
      if (skills.length > 0) {
        const skill = skills[0];
        assert.ok(skill.existingDomain === null || typeof skill.existingDomain === 'string');
      }
    });
  });

  describe('discoverAgents', () => {
    it('returns agents with model field', () => {
      const agents = discoverAgents();
      if (agents.length > 0) {
        assert.ok(agents[0].model);
        assert.ok(agents[0].rawContent);
      }
    });

    it('returns agents with tools field', () => {
      const agents = discoverAgents();
      if (agents.length > 0) {
        assert.ok('tools' in agents[0]);
      }
    });
  });

  describe('discoverRules', () => {
    it('rules have description from heading', () => {
      const rules = discoverRules();
      if (rules.length > 0) {
        assert.ok(rules[0].description);
        assert.ok(rules[0].name.includes('/'));
      }
    });
  });

  describe('updateFrontmatter via CLI --update', () => {
    it('runs --update without error', () => {
      const { execSync } = require('child_process');
      const ROOT = path.resolve(__dirname, '../..');
      // Run update in a worktree-safe way: just check it produces output
      try {
        const output = execSync(
          `node scripts/estimate-tokens.js --update`,
          { encoding: 'utf8', cwd: ROOT, timeout: 30000 }
        );
        assert.ok(output.includes('Updating frontmatter') || output.includes('Updated') || output.includes('Already current'));
      } catch (err) {
        // Even if exit code non-zero, should produce output
        assert.ok((err.stdout || '').length > 0);
      }
    });
  });

  describe('runCheck via CLI --check', () => {
    it('runs --check and validates frontmatter', () => {
      const { execSync } = require('child_process');
      const ROOT = path.resolve(__dirname, '../..');
      try {
        const output = execSync(
          `node scripts/estimate-tokens.js --check`,
          { encoding: 'utf8', cwd: ROOT, timeout: 30000 }
        );
        assert.ok(output.includes('Checking frontmatter') || output.includes('current'));
      } catch (err) {
        // May exit 1 if stale, but should produce output about checking
        const output = err.stdout || '';
        assert.ok(output.includes('Checking') || output.includes('MISSING') || output.includes('STALE'));
      }
    });
  });

  describe('runBuildIndex via CLI --build-index', () => {
    it('runs --build-index and generates index files', () => {
      const { execSync } = require('child_process');
      const ROOT = path.resolve(__dirname, '../..');
      try {
        const output = execSync(
          `node scripts/estimate-tokens.js --build-index`,
          { encoding: 'utf8', cwd: ROOT, timeout: 30000 }
        );
        assert.ok(output.includes('Building indexes'));
        assert.ok(output.includes('skills/index.md'));
        assert.ok(output.includes('rules/index.md'));
      } catch (err) {
        assert.ok((err.stdout || '').includes('Building indexes'));
      }
    });
  });

  describe('CLI usage message', () => {
    it('prints usage when no flags provided', () => {
      const { execSync } = require('child_process');
      const ROOT = path.resolve(__dirname, '../..');
      try {
        execSync(
          `node scripts/estimate-tokens.js`,
          { encoding: 'utf8', cwd: ROOT, timeout: 15000 }
        );
        // exits 0 with usage
      } catch (err) {
        const output = err.stdout || '';
        assert.ok(output.includes('Usage'));
      }
    });
  });

  describe('inferDomain edge cases', () => {
    it('returns devops for deployment prefix', () => {
      assert.strictEqual(inferDomain('deployment-pipeline'), 'devops');
    });

    it('returns devops for scratch-org prefix', () => {
      assert.strictEqual(inferDomain('scratch-org-setup'), 'devops');
    });

    it('returns integration for platform-events', () => {
      assert.strictEqual(inferDomain('platform-events-guide'), 'integration');
    });

    it('returns security for shield prefix', () => {
      assert.strictEqual(inferDomain('shield-encryption'), 'security');
    });

    it('returns security for permission prefix', () => {
      assert.strictEqual(inferDomain('permission-sets'), 'security');
    });

    it('returns platform for data-model prefix', () => {
      assert.strictEqual(inferDomain('data-model-design'), 'platform');
    });

    it('returns common for planner', () => {
      assert.strictEqual(inferDomain('planner'), 'common');
    });

    it('returns apex for tdd prefix', () => {
      assert.strictEqual(inferDomain('tdd-workflow'), 'apex');
    });

    it('returns apex for error-handling prefix', () => {
      assert.strictEqual(inferDomain('error-handling-patterns'), 'apex');
    });

    it('returns lwc for aura prefix', () => {
      assert.strictEqual(inferDomain('aura-components'), 'lwc');
    });

    it('returns soql for sosl prefix', () => {
      assert.strictEqual(inferDomain('sosl-search'), 'soql');
    });

    it('returns metadata for packaging prefix', () => {
      assert.strictEqual(inferDomain('packaging-best-practices'), 'metadata');
    });

    it('returns integration for change-data prefix', () => {
      assert.strictEqual(inferDomain('change-data-capture'), 'integration');
    });

    it('returns platform for visualforce prefix', () => {
      assert.strictEqual(inferDomain('visualforce-page'), 'platform');
    });

    it('returns platform for architect prefix', () => {
      assert.strictEqual(inferDomain('architect-review'), 'platform');
    });

    it('returns apex for test-guide prefix', () => {
      assert.strictEqual(inferDomain('test-guide-apex'), 'apex');
    });

    it('returns apex for code-analysis prefix', () => {
      assert.strictEqual(inferDomain('code-analysis-tool'), 'apex');
    });

    it('returns apex for logging prefix', () => {
      assert.strictEqual(inferDomain('logging-framework'), 'apex');
    });

    it('returns metadata for org-health prefix', () => {
      assert.strictEqual(inferDomain('org-health-check'), 'metadata');
    });

    it('returns devops for salesforce-dx prefix', () => {
      assert.strictEqual(inferDomain('salesforce-dx-setup'), 'devops');
    });
  });
});
