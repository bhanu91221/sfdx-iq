#!/usr/bin/env node
'use strict';

/**
 * Profile-based hook enable/disable system.
 * Controls which hooks run based on environment configuration.
 */

const PROFILES = { minimal: 1, standard: 2, strict: 3 };

/**
 * Get the current hook profile from environment.
 * Defaults to 'standard' if not set or invalid.
 *
 * @returns {string} Profile name
 */
function getProfile() {
  const p = (process.env.CSIQ_HOOK_PROFILE || 'standard').toLowerCase();
  return PROFILES[p] ? p : 'standard';
}

/**
 * Get the numeric level for a profile name.
 *
 * @param {string} profile - Profile name
 * @returns {number} Profile level (1-3)
 */
function getProfileLevel(profile) {
  return PROFILES[profile] || 2;
}

/**
 * Get the list of explicitly disabled hook IDs from environment.
 *
 * @returns {string[]} Array of disabled hook IDs
 */
function getDisabledHooks() {
  const raw = process.env.CSIQ_DISABLED_HOOKS || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Check if a hook should run given the current profile and disabled list.
 *
 * @param {string} hookId - Hook identifier
 * @param {string} [minProfile='minimal'] - Minimum profile level required
 * @returns {boolean} Whether the hook is enabled
 */
function isHookEnabled(hookId, minProfile) {
  if (getDisabledHooks().includes(hookId)) {return false;}
  return getProfileLevel(getProfile()) >= getProfileLevel(minProfile || 'minimal');
}

module.exports = { getProfile, getProfileLevel, getDisabledHooks, isHookEnabled, PROFILES };
