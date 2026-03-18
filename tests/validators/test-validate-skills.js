'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.resolve(__dirname, '..', '..', 'skills');
const REQUIRED_FRONTMATTER_FIELDS = ['name', 'description', 'origin'];

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

describe('Skill directory validation', () => {
  const skillDirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  it('should have at least one skill directory', () => {
    assert.ok(skillDirs.length > 0, 'No skill directories found');
  });

  it('should use lowercase-hyphen naming for directories', () => {
    for (const dir of skillDirs) {
      assert.match(dir, /^[a-z][a-z0-9-]*$/, `Skill dir "${dir}" must be lowercase with hyphens`);
    }
  });

  for (const dir of skillDirs) {
    describe(`skills/${dir}`, () => {
      const skillMdPath = path.join(SKILLS_DIR, dir, 'SKILL.md');

      it('should contain a SKILL.md file', () => {
        assert.ok(fs.existsSync(skillMdPath), `${dir}/ is missing SKILL.md`);
      });

      it('should have valid frontmatter with required fields', () => {
        if (!fs.existsSync(skillMdPath)) {return;}
        const content = fs.readFileSync(skillMdPath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        assert.ok(frontmatter, `${dir}/SKILL.md is missing frontmatter`);

        for (const field of REQUIRED_FRONTMATTER_FIELDS) {
          assert.ok(frontmatter[field], `${dir}/SKILL.md missing required field "${field}"`);
          assert.ok(frontmatter[field].length > 0, `${dir}/SKILL.md field "${field}" is empty`);
        }
      });

      it('should have body content after frontmatter', () => {
        if (!fs.existsSync(skillMdPath)) {return;}
        const content = fs.readFileSync(skillMdPath, 'utf-8');
        const body = content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
        assert.ok(body.length > 0, `${dir}/SKILL.md has no body content`);
      });
    });
  }
});
