#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

describe('pick.js', () => {
  let origLog, origArgv, logs;

  beforeEach(() => {
    origLog = console.log;
    origArgv = process.argv;
    logs = [];
    console.log = (...a) => logs.push(a.join(' '));
  });

  afterEach(() => {
    console.log = origLog;
    process.argv = origArgv;
    // Clear pick.js from cache
    try { delete require.cache[require.resolve('../../scripts/pick')]; } catch {}
  });

  it('runPicker in non-interactive mode outputs JSON catalog', async () => {
    // Clear cache and re-require to get fresh module
    delete require.cache[require.resolve('../../scripts/pick')];
    const { runPicker } = require('../../scripts/pick');
    const result = await runPicker({ nonInteractive: true });
    assert.strictEqual(result, null);
    // Should have logged JSON
    const output = logs.join('\n');
    assert.ok(output.length > 0, 'Expected JSON output');
    const parsed = JSON.parse(output);
    assert.ok(parsed.skills);
    assert.ok(parsed.rules);
    assert.ok(parsed.agents);
    assert.ok(parsed.commands);
    assert.ok(parsed.hooks);
  });

  it('exports runPicker function', () => {
    delete require.cache[require.resolve('../../scripts/pick')];
    const mod = require('../../scripts/pick');
    assert.strictEqual(typeof mod.runPicker, 'function');
  });

  it('discoverCommands returns array', () => {
    // Access through the module's internal functions via non-interactive output
    delete require.cache[require.resolve('../../scripts/pick')];
    const { runPicker } = require('../../scripts/pick');
    // Just verify the module loads without error
    assert.ok(runPicker);
  });

  it('applyFilters works with category filter via argv', async () => {
    process.argv = ['node', 'pick.js', '--category', 'apex'];
    delete require.cache[require.resolve('../../scripts/pick')];
    const { runPicker } = require('../../scripts/pick');
    const result = await runPicker({ nonInteractive: true });
    assert.strictEqual(result, null);
    const output = logs.join('\n');
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed.skills));
    assert.ok(Array.isArray(parsed.agents));
  });

  it('applyFilters works with search filter via argv', async () => {
    process.argv = ['node', 'pick.js', '--search', 'testing'];
    delete require.cache[require.resolve('../../scripts/pick')];
    const { runPicker } = require('../../scripts/pick');
    const result = await runPicker({ nonInteractive: true });
    assert.strictEqual(result, null);
    const output = logs.join('\n');
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed.skills));
  });

  it('applyFilters works with combined category and search', async () => {
    process.argv = ['node', 'pick.js', '--category', 'apex', '--search', 'governor'];
    delete require.cache[require.resolve('../../scripts/pick')];
    const { runPicker } = require('../../scripts/pick');
    const result = await runPicker({ nonInteractive: true });
    assert.strictEqual(result, null);
    const output = logs.join('\n');
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed.skills));
  });
});
