#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');

/**
 * Run a Salesforce CLI (sf) command and return parsed results.
 *
 * @param {string} command - The sf command (e.g., "project deploy start")
 * @param {string[]} [args=[]] - Additional arguments
 * @returns {{ success: boolean, result: any, error: string|null }}
 */
function runSfCommand(command, args = []) {
  const fullArgs = [command, ...args, '--json'].join(' ');
  const cmd = `sf ${fullArgs}`;

  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      timeout: 300000, // 5 minute timeout
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const parsed = JSON.parse(output);
    return {
      success: parsed.status === 0,
      result: parsed.result || parsed,
      error: null,
    };
  } catch (err) {
    // Try to parse JSON from stderr or stdout
    let errorMessage = err.message;
    let result = null;

    const rawOutput = err.stdout || err.stderr || '';
    try {
      const parsed = JSON.parse(rawOutput);
      errorMessage = parsed.message || parsed.name || errorMessage;
      result = parsed.result || null;
    } catch (_e) {
      // Not JSON output, keep raw error
    }

    return {
      success: false,
      result: result,
      error: errorMessage,
    };
  }
}

module.exports = { runSfCommand };
