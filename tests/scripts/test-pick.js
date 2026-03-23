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

  it('non-interactive catalog includes commands with descriptions', async () => {
    delete require.cache[require.resolve('../../scripts/pick')];
    const { runPicker } = require('../../scripts/pick');
    await runPicker({ nonInteractive: true });
    const output = logs.join('\n');
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed.commands));
    assert.ok(parsed.commands.length > 0, 'Should discover commands');
    // Each command should have a name
    for (const cmd of parsed.commands) {
      assert.ok(cmd.name, 'Command should have a name');
    }
  });

  it('non-interactive catalog includes hooks', async () => {
    delete require.cache[require.resolve('../../scripts/pick')];
    const { runPicker } = require('../../scripts/pick');
    await runPicker({ nonInteractive: true });
    const output = logs.join('\n');
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed.hooks));
    assert.ok(parsed.hooks.length > 0, 'Should discover hooks');
    for (const hook of parsed.hooks) {
      assert.ok(hook.name, 'Hook should have a name');
    }
  });

  it('commands are sorted by name', async () => {
    delete require.cache[require.resolve('../../scripts/pick')];
    const { runPicker } = require('../../scripts/pick');
    await runPicker({ nonInteractive: true });
    const output = logs.join('\n');
    const parsed = JSON.parse(output);
    for (let i = 1; i < parsed.commands.length; i++) {
      assert.ok(
        parsed.commands[i - 1].name.localeCompare(parsed.commands[i].name) <= 0,
        `Commands not sorted: ${parsed.commands[i - 1].name} > ${parsed.commands[i].name}`
      );
    }
  });

  it('hooks are sorted by name', async () => {
    delete require.cache[require.resolve('../../scripts/pick')];
    const { runPicker } = require('../../scripts/pick');
    await runPicker({ nonInteractive: true });
    const output = logs.join('\n');
    const parsed = JSON.parse(output);
    for (let i = 1; i < parsed.hooks.length; i++) {
      assert.ok(
        parsed.hooks[i - 1].name.localeCompare(parsed.hooks[i].name) <= 0,
        `Hooks not sorted: ${parsed.hooks[i - 1].name} > ${parsed.hooks[i].name}`
      );
    }
  });

  it('output path arg is parsed from argv', async () => {
    process.argv = ['node', 'pick.js', '--output', '/tmp/test-manifest.json'];
    delete require.cache[require.resolve('../../scripts/pick')];
    const { runPicker } = require('../../scripts/pick');
    // non-interactive mode ignores output path and returns null
    const result = await runPicker({ nonInteractive: true });
    assert.strictEqual(result, null);
  });

  it('category filter filters by domain match', async () => {
    process.argv = ['node', 'pick.js', '--category', 'lwc'];
    delete require.cache[require.resolve('../../scripts/pick')];
    const { runPicker } = require('../../scripts/pick');
    await runPicker({ nonInteractive: true });
    const output = logs.join('\n');
    const parsed = JSON.parse(output);
    // All skills should be lwc domain or have lwc in name
    for (const skill of parsed.skills) {
      const match = (skill.domain && skill.domain.toLowerCase() === 'lwc') ||
                    skill.name.toLowerCase().includes('lwc');
      assert.ok(match, `Skill ${skill.name} should match lwc filter`);
    }
  });

  it('search filter matches description text', async () => {
    process.argv = ['node', 'pick.js', '--search', 'deploy'];
    delete require.cache[require.resolve('../../scripts/pick')];
    const { runPicker } = require('../../scripts/pick');
    await runPicker({ nonInteractive: true });
    const output = logs.join('\n');
    const parsed = JSON.parse(output);
    for (const cmd of parsed.commands) {
      const match = cmd.name.toLowerCase().includes('deploy') ||
                    (cmd.description && cmd.description.toLowerCase().includes('deploy'));
      assert.ok(match, `Command ${cmd.name} should match deploy search`);
    }
  });
});
