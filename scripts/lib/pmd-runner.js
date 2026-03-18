#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');

/**
 * PMD severity mapping from PMD rule names to our severity levels.
 */
const PMD_SEVERITY_MAP = {
  CyclomaticComplexity: 'HIGH',
  AvoidDeeplyNestedIfStmts: 'MEDIUM',
  ExcessiveMethodLength: 'MEDIUM',
  ExcessiveClassLength: 'LOW',
  NcssMethodCount: 'MEDIUM',
};

/**
 * Map PMD numeric priority to our severity.
 *
 * @param {number} priority - PMD priority (1-5)
 * @returns {string} Severity level
 */
function mapPriority(priority) {
  if (priority <= 1) {return 'CRITICAL';}
  if (priority <= 2) {return 'HIGH';}
  if (priority <= 3) {return 'MEDIUM';}
  return 'LOW';
}

/**
 * Check if sf scanner plugin is available.
 *
 * @returns {boolean}
 */
function isAvailable() {
  try {
    execSync('sf scanner --help', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * Run PMD analysis via sf scanner on a target path.
 *
 * @param {string} targetPath - File or directory to scan
 * @param {Object} [options={}] - Scan options
 * @param {string[]} [options.rulesets] - PMD rulesets to use
 * @param {string} [options.format='json'] - Output format
 * @returns {{ findings: Array<{file: string, line: number, severity: string, message: string, rule: string}>, source: string, message?: string }}
 */
function runPmd(targetPath, options = {}) {
  const format = options.format || 'json';

  try {
    const args = [
      'sf scanner run',
      '--engine pmd',
      `--target "${targetPath}"`,
      `--format ${format}`,
    ];

    if (options.rulesets && options.rulesets.length > 0) {
      args.push(`--pmdconfig "${options.rulesets.join(',')}"`);
    }

    const output = execSync(args.join(' '), {
      encoding: 'utf8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const violations = JSON.parse(output);
    const findings = [];

    if (Array.isArray(violations)) {
      for (const v of violations) {
        const ruleName = v.ruleName || v.rule || '';
        const severity = PMD_SEVERITY_MAP[ruleName] || mapPriority(v.priority || 3);

        findings.push({
          file: v.fileName || targetPath,
          line: v.line || v.beginLine || 0,
          severity,
          message: v.message || v.description || ruleName,
          rule: ruleName,
        });
      }
    }

    return { findings, source: 'scanner' };
  } catch (_err) {
    return {
      findings: [],
      source: 'unavailable',
      message: 'Install @salesforce/sfdx-scanner',
    };
  }
}

module.exports = { runPmd, isAvailable };
