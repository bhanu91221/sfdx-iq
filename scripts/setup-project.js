#!/usr/bin/env node

/**
 * Claude SFDX IQ — Project Setup Script
 *
 * Sets up a Salesforce DX project with sfdx-iq configuration.
 *
 * Usage:
 *   npx sfdx-iq setup-project [target-directory]
 *   npx sfdx-iq setup-project /path/to/sfdx-project
 *   npx sfdx-iq setup-project  (uses current directory)
 *
 * What it does:
 *   1. Verifies target is an SFDX project (sfdx-project.json exists)
 *   2. Creates .claude/ directory if it doesn't exist
 *   3. Copies settings.json to .claude/
 *   4. Copies CLAUDE.md to .claude/
 */

const fs = require('fs');
const path = require('path');

// Determine target directory
const targetDir = process.argv[2] || process.cwd();
const absoluteTargetDir = path.resolve(targetDir);

// Determine plugin directory
const pluginDir = path.dirname(__dirname); // Parent of scripts/

console.log('\nClaude SFDX IQ — Project Setup\n');
console.log(`Target directory: ${absoluteTargetDir}`);

// Step 1: Verify it's an SFDX project
const sfdxProjectPath = path.join(absoluteTargetDir, 'sfdx-project.json');
if (!fs.existsSync(sfdxProjectPath)) {
  console.error('\nERROR: Not a Salesforce DX project');
  console.error(`   sfdx-project.json not found in: ${absoluteTargetDir}`);
  console.error('\n   Please run this command from an SFDX project root, or specify the path:');
  console.error('   npx sfdx-iq setup-project /path/to/sfdx-project\n');
  process.exit(1);
}

console.log('SFDX project detected');

// Step 2: Create .claude/ directory
const claudeDir = path.join(absoluteTargetDir, '.claude');
if (!fs.existsSync(claudeDir)) {
  fs.mkdirSync(claudeDir, { recursive: true });
  console.log('Created .claude/ directory');
} else {
  console.log('.claude/ directory exists');
}

// Step 3: Copy settings.json
const sourceSettingsPath = path.join(pluginDir, '.claude-project-template', 'settings.json');
const targetSettingsPath = path.join(claudeDir, 'settings.json');

if (fs.existsSync(targetSettingsPath)) {
  console.log('\n.claude/settings.json already exists — skipping (to preserve your config)');
  console.log('   Template available at: .claude-project-template/settings.json');
} else {
  fs.copyFileSync(sourceSettingsPath, targetSettingsPath);
  console.log('Copied settings.json to .claude/');
}

// Step 4: Copy CLAUDE.md
const sourceClaudeMdPath = path.join(pluginDir, '.claude-project-template', 'CLAUDE.md');
const targetClaudeMdPath = path.join(claudeDir, 'CLAUDE.md');

if (fs.existsSync(targetClaudeMdPath)) {
  console.log('\n.claude/CLAUDE.md already exists — skipping (to preserve your docs)');
  console.log('   Template available at: .claude-project-template/CLAUDE.md');
  console.log('   You can manually merge the template content if needed.');
} else {
  fs.copyFileSync(sourceClaudeMdPath, targetClaudeMdPath);
  console.log('Copied CLAUDE.md to .claude/');
}

// Step 5: Summary
console.log('\nSetup complete!\n');
console.log('Installed files:');
if (!fs.existsSync(targetSettingsPath)) {
  console.log('   .claude/settings.json   (plugin configuration)');
}
if (!fs.existsSync(targetClaudeMdPath)) {
  console.log('   .claude/CLAUDE.md       (project documentation)');
}

console.log('\nNext steps:');
console.log('   1. Open your project in Claude Code');
console.log('   2. Run /csiq-help to see all available commands');
console.log('   3. Try /apex-class --review to review your Apex code');
console.log('   4. Use /code-review to review all changed files');

console.log('\nDocumentation:');
console.log('   Project docs: .claude/CLAUDE.md');
console.log('   Plugin repo: https://github.com/bhanu91221/sfdx-iq');
