#!/usr/bin/env node
'use strict';

const fs = require('fs');

const COLORS = {
  RED: '\x1b[31m', GREEN: '\x1b[32m', YELLOW: '\x1b[33m',
  CYAN: '\x1b[36m', DIM: '\x1b[2m', BOLD: '\x1b[1m', RESET: '\x1b[0m'
};

// Read JSON from file arg or stdin
let rawInput = '';

if (process.argv[2] && fs.existsSync(process.argv[2])) {
  rawInput = fs.readFileSync(process.argv[2], 'utf8');
} else {
  try {
    rawInput = fs.readFileSync('/dev/stdin', 'utf8');
  } catch (_e) {
    console.error('Usage: post-bash-test-complete.js <json-file> OR pipe JSON via stdin');
    process.exit(1);
  }
}

let data;
try {
  data = JSON.parse(rawInput);
} catch (e) {
  console.error('Failed to parse JSON input: ' + e.message);
  process.exit(1);
}

const result = data.result || data;
const summary = result.summary || {};
const tests = result.tests || [];
const coverage = result.coverage?.coverage || result.coverage?.records || [];

// Count outcomes
let passing = 0, failing = 0, skipped = 0;
for (const t of tests) {
  const outcome = (t.Outcome || t.outcome || '').toLowerCase();
  if (outcome === 'pass') {passing++;}
  else if (outcome === 'fail') {failing++;}
  else if (outcome === 'skip') {skipped++;}
}

// Summary
console.log(`\n${COLORS.BOLD}=== Apex Test Results ===${COLORS.RESET}`);
console.log(`  ${COLORS.GREEN}Passing: ${summary.passing || passing}${COLORS.RESET}`);
console.log(`  ${COLORS.RED}Failing: ${summary.failing || failing}${COLORS.RESET}`);
console.log(`  ${COLORS.DIM}Skipped: ${summary.skipped || skipped}${COLORS.RESET}`);

// Per-class results (failures only for brevity, all if few)
const failures = tests.filter(t => (t.Outcome || t.outcome || '').toLowerCase() === 'fail');
if (failures.length > 0) {
  console.log(`\n${COLORS.BOLD}${COLORS.RED}Failed Tests:${COLORS.RESET}`);
  for (const t of failures) {
    const name = t.MethodName || t.methodName || t.FullName || 'Unknown';
    const time = t.RunTime || t.runTime || 0;
    console.log(`  ${COLORS.RED}\u2717${COLORS.RESET} ${name} ${COLORS.DIM}(${time}ms)${COLORS.RESET}`);
    if (t.Message || t.message) {
      console.log(`    ${t.Message || t.message}`);
    }
    if (t.StackTrace || t.stackTrace) {
      console.log(`    ${COLORS.DIM}${(t.StackTrace || t.stackTrace).split('\n')[0]}${COLORS.RESET}`);
    }
  }
}

// Coverage report
if (coverage.length > 0) {
  console.log(`\n${COLORS.BOLD}=== Code Coverage ===${COLORS.RESET}`);
  const belowThreshold = [];

  for (const c of coverage) {
    const name = c.name || c.ApexClassOrTrigger?.Name || 'Unknown';
    const numLoc = c.numLocations || c.NumLinesCovered + c.NumLinesUncovered || 0;
    const numUncovered = c.numLocationsNotCovered || c.NumLinesUncovered || 0;
    const pct = numLoc > 0 ? Math.round(((numLoc - numUncovered) / numLoc) * 100) : 100;
    const color = pct < 75 ? COLORS.RED : pct < 90 ? COLORS.YELLOW : COLORS.GREEN;

    if (pct < 75) {
      belowThreshold.push({ name, pct });
    }

    console.log(`  ${color}${String(pct).padStart(3)}%${COLORS.RESET} ${name} ${COLORS.DIM}(${numLoc - numUncovered}/${numLoc} lines)${COLORS.RESET}`);
  }

  if (belowThreshold.length > 0) {
    console.log(`\n  ${COLORS.RED}${COLORS.BOLD}\u26a0 ${belowThreshold.length} class(es) below 75% coverage threshold:${COLORS.RESET}`);
    for (const c of belowThreshold) {
      console.log(`    ${COLORS.RED}${c.name}: ${c.pct}%${COLORS.RESET}`);
    }
  }

  // Overall org coverage
  const orgCoverage = summary.orgWideCoverage || summary.testRunCoverage;
  if (orgCoverage) {
    console.log(`\n  ${COLORS.BOLD}Org-wide Coverage: ${orgCoverage}${COLORS.RESET}`);
  }
}

console.log('');

if (failing > 0 || (summary.failing && summary.failing > 0)) {
  process.exit(1);
}
