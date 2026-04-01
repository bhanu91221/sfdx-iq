'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const HOOKS_DIR = path.resolve(__dirname, '..', '..', 'hooks');

describe('Hook file validation', () => {
  const hookFiles = fs.readdirSync(HOOKS_DIR).filter(f => f.endsWith('.json'));

  it('should have at least one hook file', () => {
    assert.ok(hookFiles.length > 0, 'No hook JSON files found in hooks/');
  });

  it('should use lowercase-hyphen naming', () => {
    for (const file of hookFiles) {
      const name = file.replace('.json', '');
      assert.match(name, /^[a-z][a-z0-9-]*$/, `Hook "${file}" must be lowercase with hyphens`);
    }
  });

  for (const file of hookFiles) {
    describe(`hooks/${file}`, () => {
      const raw = fs.readFileSync(path.join(HOOKS_DIR, file), 'utf-8');

      it('should be valid JSON', () => {
        assert.doesNotThrow(() => JSON.parse(raw), `${file} is not valid JSON`);
      });

      it('should have a hooks object', () => {
        const data = JSON.parse(raw);
        assert.ok(data.hooks, `${file} must have a "hooks" property`);
        assert.ok(typeof data.hooks === 'object' && !Array.isArray(data.hooks), `${file} hooks must be an object`);
      });

      it('should have matcher and command in each hook entry', () => {
        const data = JSON.parse(raw);
        for (const [eventName, entries] of Object.entries(data.hooks)) {
          assert.ok(Array.isArray(entries), `${file} hooks.${eventName} must be an array`);
          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            assert.ok(typeof entry.matcher === 'string', `${file} hooks.${eventName}[${i}] matcher must be a string`);
            assert.ok(Array.isArray(entry.hooks), `${file} hooks.${eventName}[${i}] inner hooks must be an array`);
            for (let j = 0; j < entry.hooks.length; j++) {
              const h = entry.hooks[j];
              assert.strictEqual(h.type, 'command', `${file} hooks.${eventName}[${i}].hooks[${j}] type must be command`);
              assert.ok(typeof h.command === 'string', `${file} hooks.${eventName}[${i}].hooks[${j}] command must be a string`);
            }
          }
        }
      });
    });
  }
});
