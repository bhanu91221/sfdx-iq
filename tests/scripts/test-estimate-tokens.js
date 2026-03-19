#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { estimateTokens, inferDomain, discoverSkills, discoverAgents, discoverRules } = require('../../scripts/estimate-tokens');

describe('estimate-tokens', () => {
  describe('estimateTokens', () => {
    it('estimates ~1 token per 4 characters', () => {
      assert.strictEqual(estimateTokens('1234'), 1);
      assert.strictEqual(estimateTokens('12345678'), 2);
    });

    it('rounds up for partial tokens', () => {
      assert.strictEqual(estimateTokens('12345'), 2);
    });

    it('returns 0 for empty string', () => {
      assert.strictEqual(estimateTokens(''), 0);
    });

    it('handles large content', () => {
      const content = 'a'.repeat(10000);
      assert.strictEqual(estimateTokens(content), 2500);
    });
  });

  describe('inferDomain', () => {
    it('returns apex for apex prefix', () => {
      assert.strictEqual(inferDomain('apex-patterns'), 'apex');
    });

    it('returns apex for trigger prefix', () => {
      assert.strictEqual(inferDomain('trigger-framework'), 'apex');
    });

    it('returns lwc for lwc prefix', () => {
      assert.strictEqual(inferDomain('lwc-testing'), 'lwc');
    });

    it('returns soql for soql prefix', () => {
      assert.strictEqual(inferDomain('soql-optimization'), 'soql');
    });

    it('returns flows for flow prefix', () => {
      assert.strictEqual(inferDomain('flow-best-practices'), 'flows');
    });

    it('returns metadata for metadata prefix', () => {
      assert.strictEqual(inferDomain('metadata-api'), 'metadata');
    });

    it('returns security for security prefix', () => {
      assert.strictEqual(inferDomain('security-review'), 'security');
    });

    it('returns devops for ci-cd prefix', () => {
      assert.strictEqual(inferDomain('ci-cd-pipeline'), 'devops');
    });

    it('returns common for unknown names', () => {
      assert.strictEqual(inferDomain('unknown-thing'), 'common');
    });

    it('handles exact matches', () => {
      assert.strictEqual(inferDomain('apex'), 'apex');
      assert.strictEqual(inferDomain('admin'), 'admin');
    });

    it('returns apex for governor prefix', () => {
      assert.strictEqual(inferDomain('governor-limits'), 'apex');
    });

    it('returns integration for rest-api prefix', () => {
      assert.strictEqual(inferDomain('rest-api-patterns'), 'integration');
    });

    it('returns platform for experience prefix', () => {
      assert.strictEqual(inferDomain('experience-cloud'), 'platform');
    });
  });

  describe('discoverSkills', () => {
    it('returns an array of skills', () => {
      const skills = discoverSkills();
      assert.ok(Array.isArray(skills));
      assert.ok(skills.length > 0);
    });

    it('each skill has required properties', () => {
      const skills = discoverSkills();
      for (const skill of skills) {
        assert.ok(skill.name, `Skill missing name`);
        assert.ok(skill.domain, `Skill ${skill.name} missing domain`);
        assert.ok(typeof skill.tokens === 'number', `Skill ${skill.name} missing tokens`);
        assert.ok(skill.filePath, `Skill ${skill.name} missing filePath`);
      }
    });

    it('skills are sorted by domain then name', () => {
      const skills = discoverSkills();
      for (let i = 1; i < skills.length; i++) {
        const cmp = skills[i - 1].domain.localeCompare(skills[i].domain) ||
                    skills[i - 1].name.localeCompare(skills[i].name);
        assert.ok(cmp <= 0, `Skills not sorted: ${skills[i - 1].name} > ${skills[i].name}`);
      }
    });
  });

  describe('discoverAgents', () => {
    it('returns an array of agents', () => {
      const agents = discoverAgents();
      assert.ok(Array.isArray(agents));
      assert.ok(agents.length > 0);
    });

    it('each agent has required properties', () => {
      const agents = discoverAgents();
      for (const agent of agents) {
        assert.ok(agent.name, `Agent missing name`);
        assert.ok(agent.domain, `Agent ${agent.name} missing domain`);
        assert.ok(typeof agent.tokens === 'number');
      }
    });
  });

  describe('discoverRules', () => {
    it('returns an array of rules', () => {
      const rules = discoverRules();
      assert.ok(Array.isArray(rules));
      assert.ok(rules.length > 0);
    });

    it('each rule has required properties', () => {
      const rules = discoverRules();
      for (const rule of rules) {
        assert.ok(rule.name, `Rule missing name`);
        assert.ok(rule.domain, `Rule ${rule.name} missing domain`);
        assert.ok(typeof rule.tokens === 'number');
      }
    });
  });
});
