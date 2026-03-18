'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.resolve(__dirname, '..', '..', 'agents');
const EXPECTED_AGENT_COUNT = 15;
const REQUIRED_FRONTMATTER_FIELDS = ['name', 'description', 'tools', 'model'];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {return null;}
  const fields = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      fields[key] = value;
    }
  }
  return fields;
}

describe('Agent file validation', () => {
  const agentFiles = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));

  it(`should have exactly ${EXPECTED_AGENT_COUNT} agent files`, () => {
    assert.strictEqual(
      agentFiles.length,
      EXPECTED_AGENT_COUNT,
      `Expected ${EXPECTED_AGENT_COUNT} agent files, found ${agentFiles.length}: ${agentFiles.join(', ')}`
    );
  });

  it('should use lowercase-hyphen naming convention', () => {
    for (const file of agentFiles) {
      const name = file.replace('.md', '');
      assert.match(name, /^[a-z][a-z0-9-]*$/, `Agent filename "${file}" must be lowercase with hyphens`);
    }
  });

  for (const file of agentFiles) {
    describe(`agents/${file}`, () => {
      const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf-8');
      const frontmatter = parseFrontmatter(content);

      it('should have valid YAML frontmatter delimited by ---', () => {
        assert.ok(frontmatter, `${file} is missing --- delimited frontmatter`);
      });

      for (const field of REQUIRED_FRONTMATTER_FIELDS) {
        it(`should have required field: ${field}`, () => {
          assert.ok(frontmatter, `${file} has no frontmatter`);
          assert.ok(frontmatter[field], `${file} is missing required field "${field}"`);
          assert.ok(frontmatter[field].length > 0, `${file} field "${field}" is empty`);
        });
      }

      it('should have body content after frontmatter', () => {
        const body = content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
        assert.ok(body.length > 0, `${file} has no content after frontmatter`);
      });
    });
  }
});
