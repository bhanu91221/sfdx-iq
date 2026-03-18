'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const RULES_DIR = path.resolve(__dirname, '..', '..', 'rules');

const EXPECTED_RULES = {
  common: ['security.md', 'testing.md'],
  apex: [
    'coding-style.md', 'patterns.md', 'bulkification.md',
    'governor-limits.md', 'error-handling.md', 'security.md'
  ],
  lwc: [
    'coding-style.md', 'patterns.md', 'security.md',
    'testing.md', 'performance.md', 'hooks.md'
  ],
  soql: ['query-patterns.md', 'performance.md', 'security.md'],
  flows: ['best-practices.md', 'performance.md', 'patterns.md', 'security.md'],
  metadata: ['organization.md', 'deployment.md']
};

describe('Rule file validation', () => {
  it('should have a rules directory', () => {
    assert.ok(fs.existsSync(RULES_DIR), 'rules/ directory does not exist');
  });

  for (const [category, files] of Object.entries(EXPECTED_RULES)) {
    describe(`rules/${category}/`, () => {
      const categoryDir = path.join(RULES_DIR, category);

      it(`should have ${category}/ subdirectory`, () => {
        assert.ok(fs.existsSync(categoryDir), `rules/${category}/ does not exist`);
      });

      for (const file of files) {
        it(`should contain ${file}`, () => {
          const filePath = path.join(categoryDir, file);
          assert.ok(fs.existsSync(filePath), `rules/${category}/${file} does not exist`);
        });

        it(`${file} should have meaningful content`, () => {
          const filePath = path.join(categoryDir, file);
          if (!fs.existsSync(filePath)) {return;}
          const content = fs.readFileSync(filePath, 'utf-8').trim();
          assert.ok(content.length > 50, `rules/${category}/${file} has too little content (${content.length} chars)`);
        });
      }
    });
  }

  it('should have only markdown files in rule subdirectories', () => {
    for (const category of Object.keys(EXPECTED_RULES)) {
      const categoryDir = path.join(RULES_DIR, category);
      if (!fs.existsSync(categoryDir)) {continue;}
      const files = fs.readdirSync(categoryDir);
      for (const file of files) {
        assert.ok(file.endsWith('.md'), `Unexpected non-markdown file: rules/${category}/${file}`);
      }
    }
  });
});
