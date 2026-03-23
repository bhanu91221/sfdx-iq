#!/usr/bin/env node

/**
 * Claude SFDX IQ — Project Setup Script
 *
 * Sets up a Salesforce DX project with claude-sfdx-iq configuration.
 *
 * Usage:
 *   npx claude-sfdx-iq setup-project [target-directory]
 *   npx claude-sfdx-iq setup-project /path/to/sfdx-project
 *   npx claude-sfdx-iq setup-project  (uses current directory)
 *
 * What it does:
 *   1. Verifies target is an SFDX project (sfdx-project.json exists)
 *   2. Creates .claude/ directory if it doesn't exist
 *   3. Copies all 44 rules to .claude/rules/
 *   4. Copies settings.json to .claude/
 *   5. Copies CLAUDE.md to project root
 */

const fs = require('fs');
const path = require('path');

// Determine target directory
const targetDir = process.argv[2] || process.cwd();
const absoluteTargetDir = path.resolve(targetDir);

// Determine plugin directory
const pluginDir = path.dirname(__dirname); // Parent of scripts/

console.log('\n📦 Claude SFDX IQ — Project Setup\n');
console.log(`Target directory: ${absoluteTargetDir}`);

// Step 1: Verify it's an SFDX project
const sfdxProjectPath = path.join(absoluteTargetDir, 'sfdx-project.json');
if (!fs.existsSync(sfdxProjectPath)) {
  console.error('\n❌ ERROR: Not a Salesforce DX project');
  console.error(`   sfdx-project.json not found in: ${absoluteTargetDir}`);
  console.error('\n   Please run this command from an SFDX project root, or specify the path:');
  console.error('   npx claude-sfdx-iq setup-project /path/to/sfdx-project\n');
  process.exit(1);
}

console.log('✅ SFDX project detected');

// Step 2: Create .claude/ directory
const claudeDir = path.join(absoluteTargetDir, '.claude');
if (!fs.existsSync(claudeDir)) {
  fs.mkdirSync(claudeDir, { recursive: true });
  console.log('✅ Created .claude/ directory');
} else {
  console.log('✅ .claude/ directory exists');
}

// Step 3: Copy rules directory
const sourceRulesDir = path.join(pluginDir, 'rules');
const targetRulesDir = path.join(claudeDir, 'rules');

if (!fs.existsSync(sourceRulesDir)) {
  console.error('\n❌ ERROR: Rules directory not found in plugin');
  console.error(`   Expected: ${sourceRulesDir}`);
  console.error('   This might indicate the plugin is not properly installed.\n');
  process.exit(1);
}

console.log('\n📋 Copying rules...');
if (fs.existsSync(targetRulesDir)) {
  console.log('⚠️  .claude/rules/ already exists — backing up to .claude/rules.backup');
  const backupDir = path.join(claudeDir, 'rules.backup');
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
  fs.renameSync(targetRulesDir, backupDir);
}

fs.cpSync(sourceRulesDir, targetRulesDir, { recursive: true });
console.log(`✅ Copied 44 rules to .claude/rules/ (~43k tokens total)`);

// Step 4: Copy settings.json
const sourceSettingsPath = path.join(pluginDir, '.claude-project-template', 'settings.json');
const targetSettingsPath = path.join(claudeDir, 'settings.json');

if (fs.existsSync(targetSettingsPath)) {
  console.log('\n⚠️  .claude/settings.json already exists — skipping (to preserve your config)');
  console.log('   Template available at: .claude-project-template/settings.json');
} else {
  fs.copyFileSync(sourceSettingsPath, targetSettingsPath);
  console.log('✅ Copied settings.json to .claude/');
}

// Step 5: Copy CLAUDE.md
const sourceClaudeMdPath = path.join(pluginDir, '.claude-project-template', 'CLAUDE.md');
const targetClaudeMdPath = path.join(claudeDir, 'CLAUDE.md');

if (fs.existsSync(targetClaudeMdPath)) {
  console.log('\n⚠️  CLAUDE.md already exists in project root — skipping (to preserve your docs)');
  console.log('   Template available at: .claude-project-template/CLAUDE.md');
  console.log('   You can manually merge the template content if needed.');
} else {
  fs.copyFileSync(sourceClaudeMdPath, targetClaudeMdPath);
  console.log('✅ Copied CLAUDE.md to .claude/');
}

// Step 6: Summary
console.log('\n✨ Setup complete!\n');
console.log('📂 Installed files:');
console.log(`   .claude/rules/          (44 rules)`);
if (!fs.existsSync(targetSettingsPath)) {
  console.log(`   .claude/settings.json   (plugin configuration)`);
}
if (!fs.existsSync(targetClaudeMdPath)) {
  console.log(`   CLAUDE.md               (project documentation)`);
}

console.log('\n🎯 Token Optimization:');
console.log('   • 44 rules available (~43k tokens if all loaded)');
console.log('   • context-assigner agent loads only 5-8 rules per task');
console.log('   • Typical usage: 5k-15k tokens (saves ~30k tokens per session)');

console.log('\n🚀 Next steps:');
console.log('   1. Open your project in Claude Code');
console.log('   2. Run /csiq-help to see all available commands');
console.log('   3. Try /apex-review to review your Apex code');
console.log('   4. Use /tdd to start test-driven development');

console.log('\n📖 Documentation:');
console.log('   • Project docs: CLAUDE.md');
console.log('   • Rules catalog: .claude/rules/index.md');
console.log('   • Plugin repo: https://github.com/bhanu91221/claude-sfdx-iq');

console.log('\n💡 Tip: Use --custom rules in your message to manually select specific rules\n');
