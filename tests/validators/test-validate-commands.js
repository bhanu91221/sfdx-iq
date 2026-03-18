'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const COMMANDS_DIR = path.resolve(__dirname, '..', '..', 'commands');

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

describe('Command file validation', () => {
  const commandFiles = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md'));

  it('should have at least one command file', () => {
    assert.ok(commandFiles.length > 0, 'No command files found in commands/');
  });

  it('should use lowercase-hyphen naming', () => {
    for (const file of commandFiles) {
      const name = file.replace('.md', '');
      assert.match(name, /^[a-z][a-z0-9-]*$/, `Command "${file}" must be lowercase with hyphens`);
    }
  });

  for (const file of commandFiles) {
    describe(`commands/${file}`, () => {
      const content = fs.readFileSync(path.join(COMMANDS_DIR, file), 'utf-8');
      const frontmatter = parseFrontmatter(content);

      it('should have frontmatter with description field', () => {
        assert.ok(frontmatter, `${file} is missing frontmatter`);
        assert.ok(frontmatter.description, `${file} is missing "description" in frontmatter`);
        assert.ok(frontmatter.description.length > 0, `${file} has empty description`);
      });

      it('should have body content after frontmatter', () => {
        const body = content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
        assert.ok(body.length > 0, `${file} has no body content`);
      });
    });
  }
});
