#!/usr/bin/env node
'use strict';

const COLORS = {
  CRITICAL: '\x1b[31m',  // red
  HIGH: '\x1b[33m',      // yellow
  MEDIUM: '\x1b[36m',    // cyan
  LOW: '\x1b[2m',        // dim
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
};

/**
 * Format a list of findings as colored console output.
 *
 * @param {Array<{file: string, line: number, severity: string, message: string, rule: string}>} findings
 * @returns {string} Formatted output string
 */
function formatFindings(findings) {
  if (!findings || findings.length === 0) {
    return `${COLORS.BOLD}No issues found.${COLORS.RESET}`;
  }

  const lines = [];

  // Group by file
  const byFile = {};
  for (const f of findings) {
    const key = f.file || 'unknown';
    if (!byFile[key]) {byFile[key] = [];}
    byFile[key].push(f);
  }

  for (const [file, fileFindings] of Object.entries(byFile)) {
    lines.push(`\n${COLORS.BOLD}${file}${COLORS.RESET}`);

    for (const finding of fileFindings) {
      const color = COLORS[finding.severity] || COLORS.RESET;
      const lineNum = finding.line ? `:${finding.line}` : '';
      const rule = finding.rule ? ` (${finding.rule})` : '';
      lines.push(`  ${color}${finding.severity}${COLORS.RESET}${lineNum} ${finding.message}${rule}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format a summary of finding counts by severity.
 *
 * @param {Array<{severity: string}>} findings
 * @returns {string} Summary string
 */
function formatSummary(findings) {
  if (!findings || findings.length === 0) {
    return `${COLORS.BOLD}0 issues found.${COLORS.RESET}`;
  }

  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const f of findings) {
    const sev = f.severity || 'LOW';
    counts[sev] = (counts[sev] || 0) + 1;
  }

  const parts = [];
  if (counts.CRITICAL > 0) {parts.push(`${COLORS.CRITICAL}${counts.CRITICAL} critical${COLORS.RESET}`);}
  if (counts.HIGH > 0) {parts.push(`${COLORS.HIGH}${counts.HIGH} high${COLORS.RESET}`);}
  if (counts.MEDIUM > 0) {parts.push(`${COLORS.MEDIUM}${counts.MEDIUM} medium${COLORS.RESET}`);}
  if (counts.LOW > 0) {parts.push(`${COLORS.LOW}${counts.LOW} low${COLORS.RESET}`);}

  const total = findings.length;
  return `${COLORS.BOLD}${total} issue${total !== 1 ? 's' : ''} found:${COLORS.RESET} ${parts.join(', ')}`;
}

module.exports = { formatFindings, formatSummary };
