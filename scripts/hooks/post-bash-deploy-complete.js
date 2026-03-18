#!/usr/bin/env node
'use strict';

const fs = require('fs');

const COLORS = {
  RED: '\x1b[31m', GREEN: '\x1b[32m', YELLOW: '\x1b[33m',
  CYAN: '\x1b[36m', BOLD: '\x1b[1m', RESET: '\x1b[0m'
};

// Read JSON from file arg or stdin
let rawInput = '';

if (process.argv[2] && fs.existsSync(process.argv[2])) {
  rawInput = fs.readFileSync(process.argv[2], 'utf8');
} else {
  try {
    rawInput = fs.readFileSync('/dev/stdin', 'utf8');
  } catch (_e) {
    console.error('Usage: post-bash-deploy-complete.js <json-file> OR pipe JSON via stdin');
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
const status = result.status || 'Unknown';
const deployed = result.numberComponentsDeployed || 0;
const errors = result.numberComponentErrors || 0;
const testsCompleted = result.numberTestsCompleted || 0;
const testErrors = result.numberTestErrors || 0;

// Summary table
const statusColor = status === 'Succeeded' ? COLORS.GREEN : COLORS.RED;
console.log(`\n${COLORS.BOLD}=== Deploy Summary ===${COLORS.RESET}`);
console.log(`  Status:              ${statusColor}${status}${COLORS.RESET}`);
console.log(`  Components Deployed: ${COLORS.CYAN}${deployed}${COLORS.RESET}`);
console.log(`  Component Errors:    ${errors > 0 ? COLORS.RED : COLORS.GREEN}${errors}${COLORS.RESET}`);
console.log(`  Tests Completed:     ${COLORS.CYAN}${testsCompleted}${COLORS.RESET}`);
console.log(`  Test Errors:         ${testErrors > 0 ? COLORS.RED : COLORS.GREEN}${testErrors}${COLORS.RESET}`);

// Component errors
const componentFailures = result.details?.componentFailures || result.componentFailures || [];
const failureList = Array.isArray(componentFailures) ? componentFailures : [componentFailures];
if (failureList.length > 0 && failureList[0]) {
  console.log(`\n${COLORS.BOLD}${COLORS.RED}Component Errors:${COLORS.RESET}`);
  for (const f of failureList) {
    if (!f) {continue;}
    console.log(`  ${COLORS.YELLOW}${f.componentType || 'Unknown'}${COLORS.RESET} / ${f.fullName || 'Unknown'}`);
    console.log(`    ${f.problem || 'No details'}`);
  }
}

// Test failures
const testFailures = result.details?.runTestResult?.failures || result.runTestResult?.failures || [];
const testList = Array.isArray(testFailures) ? testFailures : [testFailures];
if (testList.length > 0 && testList[0]) {
  console.log(`\n${COLORS.BOLD}${COLORS.RED}Test Failures:${COLORS.RESET}`);
  for (const t of testList) {
    if (!t) {continue;}
    console.log(`  ${COLORS.YELLOW}${t.methodName || t.name || 'Unknown'}${COLORS.RESET}`);
    console.log(`    Message: ${t.message || 'No message'}`);
    if (t.stackTrace) {
      console.log(`    Stack:   ${t.stackTrace.split('\n')[0]}`);
    }
  }
}

console.log('');

if (status !== 'Succeeded') {
  process.exit(1);
}
