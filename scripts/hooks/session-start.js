#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  GREEN: '\x1b[32m', YELLOW: '\x1b[33m', CYAN: '\x1b[36m',
  DIM: '\x1b[2m', BOLD: '\x1b[1m', RESET: '\x1b[0m'
};

const projectFile = path.join(process.cwd(), 'sfdx-project.json');

if (!fs.existsSync(projectFile)) {
  console.log(`${COLORS.DIM}[claude-sfdx-iq] Not an SFDX project - plugin commands available but context not loaded${COLORS.RESET}`);
  console.log(`${COLORS.DIM}[claude-sfdx-iq] To use in a Salesforce project: cd your-sfdx-project && npx claude-sfdx-iq setup-project (or /setup-project)${COLORS.RESET}`);
  process.exit(0);
}

let project;
try {
  project = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
} catch (e) {
  console.error(`Failed to parse sfdx-project.json: ${e.message}`);
  process.exit(1);
}

const apiVersion = project.sourceApiVersion || 'Unknown';
const packages = (project.packageDirectories || []).map(p => p.path || p.default);
const namespace = project.namespace || '';

console.log(`\n${COLORS.BOLD}=== SFDX Project Detected ===${COLORS.RESET}`);
console.log(`  API Version:   ${COLORS.CYAN}v${apiVersion}${COLORS.RESET}`);
console.log(`  Packages:      ${COLORS.CYAN}${packages.join(', ') || 'None'}${COLORS.RESET}`);
if (namespace) {
  console.log(`  Namespace:     ${COLORS.CYAN}${namespace}${COLORS.RESET}`);
}

// Try to get default org info
let defaultOrg = null;
try {
  const orgJson = execSync('sf org display --json 2>/dev/null', { encoding: 'utf8', timeout: 15000 });
  const orgData = JSON.parse(orgJson);
  const orgResult = orgData.result || {};
  defaultOrg = {
    alias: orgResult.alias || orgResult.username || 'Unknown',
    username: orgResult.username || 'Unknown',
    instanceUrl: orgResult.instanceUrl || ''
  };
  console.log(`  Default Org:   ${COLORS.GREEN}${defaultOrg.alias}${COLORS.RESET} ${COLORS.DIM}(${defaultOrg.username})${COLORS.RESET}`);
} catch (_e) {
  console.log(`  Default Org:   ${COLORS.YELLOW}Not set or unavailable${COLORS.RESET}`);
}

// Try to check DevHub
try {
  const devhubJson = execSync('sf org display --json --target-org devhub 2>/dev/null', { encoding: 'utf8', timeout: 15000 });
  const devhubData = JSON.parse(devhubJson);
  const devhubResult = devhubData.result || {};
  const devhubAlias = devhubResult.alias || devhubResult.username || 'Unknown';
  console.log(`  DevHub:        ${COLORS.GREEN}${devhubAlias}${COLORS.RESET}`);
} catch (_e) {
  console.log(`  DevHub:        ${COLORS.DIM}Not configured${COLORS.RESET}`);
}

// One-line summary
const orgLabel = defaultOrg ? defaultOrg.alias : 'no default org';
console.log(`\n${COLORS.BOLD}SFDX Project: API v${apiVersion}, ${packages.length} package(s), ${orgLabel}${COLORS.RESET}\n`);
