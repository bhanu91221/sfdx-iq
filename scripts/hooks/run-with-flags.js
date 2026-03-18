#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');

const PROFILES = { minimal: 1, standard: 2, strict: 3 };

/**
 * Run a hook function if allowed by profile and disabled-hooks settings.
 *
 * @param {string} hookId - Unique identifier for the hook
 * @param {Function} hookFn - The hook function to execute
 * @param {Object} options - Configuration options
 * @param {string} [options.minProfile='standard'] - Minimum profile level to run
 * @returns {number} Exit code (0 = ran or skipped, 1 = hook failed)
 */
function runWithFlags(hookId, hookFn, options = {}) {
  const currentProfile = (process.env.CSIQ_HOOK_PROFILE || 'standard').toLowerCase();
  const disabledHooks = (process.env.CSIQ_DISABLED_HOOKS || '')
    .split(',')
    .map(h => h.trim())
    .filter(Boolean);

  const minProfile = (options.minProfile || 'standard').toLowerCase();
  const currentLevel = PROFILES[currentProfile] || PROFILES.standard;
  const requiredLevel = PROFILES[minProfile] || PROFILES.standard;

  if (disabledHooks.includes(hookId)) {
    console.log(`\u23ed Skipping hook "${hookId}" (disabled via CSIQ_DISABLED_HOOKS)`);
    return 0;
  }

  if (currentLevel < requiredLevel) {
    console.log(`\u23ed Skipping hook "${hookId}" (requires "${minProfile}" profile, current: "${currentProfile}")`);
    return 0;
  }

  try {
    const result = hookFn();
    return typeof result === 'number' ? result : 0;
  } catch (err) {
    console.error(`\u274c Hook "${hookId}" failed: ${err.message}`);
    return 1;
  }
}

// CLI mode: node run-with-flags.js <hookId> <minProfile> <command...>
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: run-with-flags.js <hookId> <minProfile> <command...>');
    process.exit(1);
  }

  const hookId = args[0];
  const minProfile = args[1];
  const command = args.slice(2).join(' ');

  const exitCode = runWithFlags(hookId, () => {
    execSync(command, { stdio: 'inherit' });
    return 0;
  }, { minProfile });

  process.exit(exitCode);
}

module.exports = { runWithFlags, PROFILES };
