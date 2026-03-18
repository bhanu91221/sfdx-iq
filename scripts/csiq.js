#!/usr/bin/env node
'use strict';

/**
 * csiq — CLI entry point for claude-sfdx-iq plugin
 *
 * Usage:
 *   npx csiq install [--profile <name>] [--dry-run]
 *   npx csiq status
 *   npx csiq list
 *   npx csiq doctor
 *   npx csiq repair
 *   npx csiq help
 */

const path = require('path');

const COMMANDS = {
  install: {
    description: 'Install components from a profile/manifest',
    script: './install-apply.js',
  },
  plan: {
    description: 'Preview what a profile would install (dry-run)',
    script: './install-plan.js',
  },
  status: {
    description: 'Show plugin status and component counts',
    script: './status.js',
  },
  list: {
    description: 'List installed components',
    script: './list-installed.js',
  },
  doctor: {
    description: 'Diagnose environment (sf CLI, Node, auth, DevHub)',
    script: './doctor.js',
  },
  repair: {
    description: 'Fix broken configurations and missing files',
    script: './repair.js',
  },
  pick: {
    description: 'Interactively select components for a custom manifest',
    script: './pick.js',
  },
  tokens: {
    description: 'Show token budget for installed or profile components',
    script: './tokens.js',
  },
  refresh: {
    description: 'Regenerate .claude/CLAUDE.md from template + active profile',
    script: './refresh-claude-md.js',
  },
  help: {
    description: 'Show this help message',
    script: null,
  },
};

const PROFILES = ['minimal', 'default', 'apex-only', 'lwc-only', 'admin'];

function showBanner() {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║      claude-sfdx-iq  v1.0.0             ║
  ║  Salesforce DX plugin for Claude Code    ║
  ╚══════════════════════════════════════════╝
`);
}

function showHelp() {
  showBanner();
  console.log('Usage: npx csiq <command> [options]\n');
  console.log('Commands:');
  for (const [name, cmd] of Object.entries(COMMANDS)) {
    console.log(`  ${name.padEnd(12)} ${cmd.description}`);
  }
  console.log('\nProfiles:');
  for (const p of PROFILES) {
    console.log(`  ${p}`);
  }
  console.log('\nExamples:');
  console.log('  npx csiq install --profile developer');
  console.log('  npx csiq install --profile minimal --dry-run');
  console.log('  npx csiq status');
  console.log('  npx csiq doctor');
  console.log('  npx csiq pick --category apex');
  console.log('  npx csiq pick --output manifests/custom.json');
  console.log('  npx csiq install --interactive');
  console.log('  npx csiq tokens --profile default');
  console.log('  npx csiq tokens --all');
  console.log('  npx csiq refresh --profile minimal');
  console.log('');
}

// Parse arguments
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help' || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

if (!COMMANDS[command]) {
  console.error(`Unknown command: "${command}"\n`);
  console.error('Available commands: ' + Object.keys(COMMANDS).join(', '));
  console.error('Run "npx csiq help" for usage information.');
  process.exit(1);
}

// Special case: install with --dry-run redirects to plan
let targetCommand = command;
if (command === 'install' && args.includes('--dry-run')) {
  targetCommand = 'plan';
}

// Load and execute the command script
const scriptPath = path.resolve(__dirname, COMMANDS[targetCommand].script);

try {
  // Pass remaining args via process.argv manipulation
  process.argv = [process.argv[0], scriptPath, ...args.slice(1)];
  require(scriptPath);
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.error(`Command script not found: ${scriptPath}`);
    console.error('Run "npx csiq repair" to fix missing files.');
    process.exit(1);
  }
  throw err;
}
