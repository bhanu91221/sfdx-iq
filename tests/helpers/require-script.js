#!/usr/bin/env node
'use strict';

/**
 * Helper to safely require standalone scripts that use process.argv and process.exit.
 * Captures console output and prevents process.exit from killing the test runner.
 */

/**
 * Execute a script by requiring it with mocked process.argv and process.exit.
 *
 * @param {string} scriptPath - Absolute path to the script
 * @param {string[]} args - Arguments to pass (simulates process.argv[2:])
 * @param {Object} opts - Options
 * @param {Object} opts.env - Environment variables to set
 * @returns {{ stdout: string, stderr: string, exitCode: number|null }}
 */
function requireScript(scriptPath, args = [], opts = {}) {
  const logs = [];
  const errors = [];
  let exitCode = null;

  // Save originals
  const origArgv = process.argv;
  const origExit = process.exit;
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;
  const origEnv = {};

  // Set env vars
  if (opts.env) {
    for (const [key, value] of Object.entries(opts.env)) {
      origEnv[key] = process.env[key];
      process.env[key] = value;
    }
  }

  // Mock
  process.argv = ['node', scriptPath, ...args];
  process.exit = (code) => {
    exitCode = code || 0;
    throw new Error(`__EXIT_${code || 0}__`);
  };
  console.log = (...a) => logs.push(a.join(' '));
  console.error = (...a) => errors.push(a.join(' '));
  console.warn = (...a) => logs.push(a.join(' '));

  try {
    // Clear require cache so the script runs fresh
    delete require.cache[require.resolve(scriptPath)];
    require(scriptPath);
  } catch (e) {
    if (!e.message.startsWith('__EXIT_')) {
      errors.push(e.message);
    }
  } finally {
    // Restore
    process.argv = origArgv;
    process.exit = origExit;
    console.log = origLog;
    console.error = origError;
    console.warn = origWarn;

    if (opts.env) {
      for (const [key] of Object.entries(opts.env)) {
        if (origEnv[key] === undefined) delete process.env[key];
        else process.env[key] = origEnv[key];
      }
    }
  }

  return {
    stdout: logs.join('\n'),
    stderr: errors.join('\n'),
    exitCode,
  };
}

module.exports = { requireScript };
