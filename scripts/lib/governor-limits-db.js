#!/usr/bin/env node
'use strict';

/**
 * Reference database of all Salesforce governor limits.
 * Provides lookup, threshold checking, and formatted output.
 */

const LIMITS = {
  soqlQueries:      { sync: 100,      async: 200,      label: 'SOQL Queries' },
  dmlStatements:    { sync: 150,      async: 150,      label: 'DML Statements' },
  soqlRows:         { sync: 50000,    async: 50000,    label: 'Total SOQL Rows' },
  dmlRows:          { sync: 10000,    async: 10000,    label: 'Total DML Rows' },
  cpuTime:          { sync: 10000,    async: 60000,    label: 'CPU Time (ms)', unit: 'ms' },
  heapSize:         { sync: 6291456,  async: 12582912, label: 'Heap Size', unit: 'bytes' },
  callouts:         { sync: 100,      async: 100,      label: 'Callouts' },
  futureCalls:      { sync: 50,       async: 0,        label: 'Future Calls' },
  queueableJobs:    { sync: 50,       async: 1,        label: 'Queueable Jobs' },
  emailInvocations: { sync: 10,       async: 10,       label: 'Email Invocations' },
  soqlQueryLocators: { sync: 5,       async: 5,        label: 'Query Locators' },
  eventPublish:     { sync: 150,      async: 150,      label: 'Event Publish (immediate)' },
};

const WARN_THRESHOLD = 0.70;
const CRITICAL_THRESHOLD = 0.90;

/**
 * Get the limit definition for a given limit name.
 *
 * @param {string} name - Limit key from LIMITS
 * @param {string} [context='sync'] - Execution context ('sync' or 'async')
 * @returns {{ sync: number, async: number, label: string }|null}
 */
function getLimit(name, _context) {
  return LIMITS[name] || null;
}

/**
 * Check current usage against a governor limit.
 *
 * @param {string} name - Limit key from LIMITS
 * @param {number} currentValue - Current usage value
 * @param {string} [context='sync'] - Execution context ('sync' or 'async')
 * @returns {{ status: string, message: string, limit: number, used: number, percentage: number }}
 */
function checkLimit(name, currentValue, context) {
  const ctx = context || 'sync';
  const limitDef = LIMITS[name];

  if (!limitDef) {
    return { status: 'ok', message: `Unknown limit: ${name}`, limit: 0, used: currentValue, percentage: 0 };
  }

  const max = limitDef[ctx];
  if (max === 0) {
    return {
      status: currentValue > 0 ? 'critical' : 'ok',
      message: currentValue > 0 ? `${limitDef.label}: not allowed in ${ctx} context` : `${limitDef.label}: OK`,
      limit: max, used: currentValue, percentage: 0,
    };
  }

  const percentage = currentValue / max;
  let status = 'ok';
  let message = `${limitDef.label}: ${currentValue}/${max} (${Math.round(percentage * 100)}%)`;

  if (percentage >= CRITICAL_THRESHOLD) {
    status = 'critical';
    message = `${limitDef.label}: CRITICAL — ${currentValue}/${max} (${Math.round(percentage * 100)}%)`;
  } else if (percentage >= WARN_THRESHOLD) {
    status = 'warn';
    message = `${limitDef.label}: WARNING — ${currentValue}/${max} (${Math.round(percentage * 100)}%)`;
  }

  return { status, message, limit: max, used: currentValue, percentage: Math.round(percentage * 100) };
}

/**
 * Format a table showing all limits with current usage.
 *
 * @param {Object} usageMap - Map of limit name to current value
 * @param {string} [context='sync'] - Execution context
 * @returns {string} Formatted table string
 */
function formatLimitsTable(usageMap, context) {
  const ctx = context || 'sync';
  const header = `${'Limit'.padEnd(30)} ${'Used'.padStart(8)} ${'Max'.padStart(8)} ${'%'.padStart(5)}  Status`;
  const separator = '-'.repeat(header.length);
  const rows = [header, separator];

  for (const [name, limitDef] of Object.entries(LIMITS)) {
    const used = usageMap[name] || 0;
    const max = limitDef[ctx];
    const pct = max > 0 ? Math.round((used / max) * 100) : 0;
    let status = 'OK';
    if (max === 0 && used > 0) {
      status = 'CRITICAL';
    } else if (pct >= 90) {
      status = 'CRITICAL';
    } else if (pct >= 70) {
      status = 'WARN';
    }

    rows.push(
      `${limitDef.label.padEnd(30)} ${String(used).padStart(8)} ${String(max).padStart(8)} ${String(pct + '%').padStart(5)}  ${status}`
    );
  }

  return rows.join('\n');
}

module.exports = { LIMITS, checkLimit, formatLimitsTable, getLimit };
