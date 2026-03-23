#!/usr/bin/env node
'use strict';

/**
 * doctor.js — Diagnose environment for claude-sfdx-iq
 *
 * Checks: Node.js, Salesforce CLI, authentication, DevHub, project structure.
 *
 * Usage:
 *   node scripts/doctor.js
 *   npx claude-sfdx-iq doctor
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CWD = process.cwd();

let passCount = 0;
let warnCount = 0;
let failCount = 0;

function check(label, fn) {
  try {
    const result = fn();
    if (result.status === 'pass') {
      console.log(`  ✅ ${label}: ${result.message}`);
      passCount++;
    } else if (result.status === 'warn') {
      console.log(`  ⚠️  ${label}: ${result.message}`);
      warnCount++;
    } else {
      console.log(`  ❌ ${label}: ${result.message}`);
      failCount++;
    }
  } catch (e) {
    console.log(`  ❌ ${label}: ${e.message}`);
    failCount++;
  }
}

function tryExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000 }).trim();
  } catch (_e) {
    return null;
  }
}

console.log('\n🩺 claude-sfdx-iq Doctor\n');
console.log('  Checking environment...\n');

// 1. Node.js version
check('Node.js', () => {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  if (major >= 18) {
    return { status: 'pass', message: `${version} (>= 18 required)` };
  }
  return { status: 'fail', message: `${version} — Node.js 18+ required` };
});

// 2. npm
check('npm', () => {
  const version = tryExec('npm --version');
  if (version) {
    return { status: 'pass', message: `v${version}` };
  }
  return { status: 'fail', message: 'npm not found' };
});

// 3. Salesforce CLI
check('Salesforce CLI (sf)', () => {
  const version = tryExec('sf --version');
  if (version) {
    const match = version.match(/@salesforce\/cli\/(\S+)/);
    const ver = match ? match[1] : version.split('\n')[0];
    return { status: 'pass', message: ver };
  }
  return { status: 'fail', message: 'sf CLI not found — install: npm install -g @salesforce/cli' };
});

// 4. Git
check('Git', () => {
  const version = tryExec('git --version');
  if (version) {
    return { status: 'pass', message: version };
  }
  return { status: 'fail', message: 'git not found' };
});

// 5. SFDX Scanner (optional)
check('Salesforce Code Analyzer', () => {
  const result = tryExec('sf scanner --version');
  if (result) {
    return { status: 'pass', message: result.split('\n')[0] };
  }
  return { status: 'warn', message: 'Not installed (optional) — install: sf plugins install @salesforce/sfdx-scanner' };
});

// 6. Default org
check('Default Target Org', () => {
  const result = tryExec('sf config get target-org --json');
  if (result) {
    try {
      const data = JSON.parse(result);
      const orgValue = data.result && data.result[0] && data.result[0].value;
      if (orgValue) {
        return { status: 'pass', message: orgValue };
      }
    } catch (_e) { /* parse failed */ }
  }
  return { status: 'warn', message: 'No default org set — run: sf config set target-org <alias>' };
});

// 7. DevHub
check('DevHub', () => {
  const result = tryExec('sf config get target-dev-hub --json');
  if (result) {
    try {
      const data = JSON.parse(result);
      const hubValue = data.result && data.result[0] && data.result[0].value;
      if (hubValue) {
        return { status: 'pass', message: hubValue };
      }
    } catch (_e) { /* parse failed */ }
  }
  return { status: 'warn', message: 'No DevHub set — needed for scratch orgs: sf config set target-dev-hub <alias>' };
});

// 8. SFDX Project
check('SFDX Project (sfdx-project.json)', () => {
  const projectFile = path.join(CWD, 'sfdx-project.json');
  if (fs.existsSync(projectFile)) {
    try {
      const project = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
      const apiVersion = project.sourceApiVersion || 'not set';
      const pkgCount = (project.packageDirectories || []).length;
      return { status: 'pass', message: `API v${apiVersion}, ${pkgCount} package director${pkgCount === 1 ? 'y' : 'ies'}` };
    } catch (e) {
      return { status: 'fail', message: `Invalid JSON: ${e.message}` };
    }
  }
  return { status: 'warn', message: `Not found in ${CWD} — run from an SFDX project directory` };
});

// 9. Plugin integrity
check('claude-sfdx-iq Plugin', () => {
  const pluginJson = path.join(ROOT, '.claude-plugin', 'plugin.json');
  if (fs.existsSync(pluginJson)) {
    const agentCount = fs.readdirSync(path.join(ROOT, 'agents')).filter(f => f.endsWith('.md')).length;
    const cmdCount = fs.readdirSync(path.join(ROOT, 'commands')).filter(f => f.endsWith('.md')).length;
    return { status: 'pass', message: `${agentCount} agents, ${cmdCount} commands loaded` };
  }
  return { status: 'fail', message: 'plugin.json not found — plugin may be corrupted' };
});

// Summary
console.log('\n' + '─'.repeat(40));
console.log(`  ✅ Pass: ${passCount}  ⚠️  Warn: ${warnCount}  ❌ Fail: ${failCount}`);

if (failCount > 0) {
  console.log('\n  Some checks failed. Fix the issues above and run "npx claude-sfdx-iq doctor" again.\n');
  process.exit(1);
} else if (warnCount > 0) {
  console.log('\n  Environment is functional with some warnings.\n');
  process.exit(0);
} else {
  console.log('\n  Environment is fully configured! 🎉\n');
  process.exit(0);
}
