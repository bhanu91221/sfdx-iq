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

      it('should have a hooks array', () => {
        const data = JSON.parse(raw);
        assert.ok(Array.isArray(data.hooks), `${file} must have a "hooks" array`);
        assert.ok(data.hooks.length > 0, `${file} hooks array is empty`);
      });

      it('should have matcher and command in each hook entry', () => {
        const data = JSON.parse(raw);
        for (let i = 0; i < data.hooks.length; i++) {
          const hook = data.hooks[i];
          assert.ok(hook.matcher, `${file} hooks[${i}] missing "matcher"`);
          assert.ok(hook.command, `${file} hooks[${i}] missing "command"`);
          assert.ok(typeof hook.matcher === 'object', `${file} hooks[${i}] matcher must be an object`);
          assert.ok(typeof hook.command === 'string', `${file} hooks[${i}] command must be a string`);
        }
      });
    });
  }
});
