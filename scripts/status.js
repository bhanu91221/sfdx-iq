#!/usr/bin/env node
'use strict';

/**
 * status.js — Show claude-sfdx-iq plugin status and component counts
 *
 * Usage:
 *   node scripts/status.js
 *   npx claude-sfdx-iq status
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function countFiles(dir, filter) {
  if (!fs.existsSync(dir)) {return 0;}
  return fs.readdirSync(dir).filter(filter).length;
}

function countRecursive(dir, filter) {
  if (!fs.existsSync(dir)) {return 0;}
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countRecursive(path.join(dir, entry.name), filter);
    } else if (filter(entry.name)) {
      count++;
    }
  }
  return count;
}

function countSkills(dir) {
  if (!fs.existsSync(dir)) {return 0;}
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => fs.existsSync(path.join(dir, d.name, 'SKILL.md')))
    .length;
}

// Read plugin metadata
const pluginJsonPath = path.join(ROOT, '.claude-plugin', 'plugin.json');
if (fs.existsSync(pluginJsonPath)) {
  try {
    JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
  } catch (_e) { /* use defaults */ }
}

// Read package.json for version
const packageJsonPath = path.join(ROOT, 'package.json');
let version = '1.2.0';
if (fs.existsSync(packageJsonPath)) {
  try {
    version = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version || version;
  } catch (_e) { /* use defaults */ }
}

// Count components
const agents = countFiles(path.join(ROOT, 'agents'), f => f.endsWith('.md'));
const skills = countSkills(path.join(ROOT, 'skills'));
const commands = countFiles(path.join(ROOT, 'commands'), f => f.endsWith('.md'));
const hooks = countFiles(path.join(ROOT, 'hooks'), f => f.endsWith('.json'));
const rules = countRecursive(path.join(ROOT, 'rules'), f => f.endsWith('.md') && f !== 'README.md');
const schemas = countFiles(path.join(ROOT, 'schemas'), f => f.endsWith('.json'));
const manifests = countFiles(path.join(ROOT, 'manifests'), f => f.endsWith('.json'));
const mcpConfigs = countFiles(path.join(ROOT, 'mcp-configs'), f => f.endsWith('.json'));
const scripts = countRecursive(path.join(ROOT, 'scripts'), f => f.endsWith('.js'));
const tests = countRecursive(path.join(ROOT, 'tests'), f => f.endsWith('.js'));
const docs = countFiles(path.join(ROOT, 'docs'), f => f.endsWith('.md'));
const examples = countRecursive(path.join(ROOT, 'examples'), _f => true);

// Count rules by category
const ruleCategories = {};
const rulesDir = path.join(ROOT, 'rules');
if (fs.existsSync(rulesDir)) {
  for (const cat of fs.readdirSync(rulesDir, { withFileTypes: true }).filter(d => d.isDirectory())) {
    ruleCategories[cat.name] = fs.readdirSync(path.join(rulesDir, cat.name))
      .filter(f => f.endsWith('.md')).length;
  }
}

// Display
console.log(`
╔══════════════════════════════════════════╗
║      claude-sfdx-iq  v${version.padEnd(18)}║
║  Salesforce DX plugin for Claude Code    ║
╚══════════════════════════════════════════╝
`);

console.log('  📊 Component Summary:\n');
console.log(`    Agents       ${String(agents).padStart(3)}   Specialized Salesforce subagents`);
console.log(`    Skills       ${String(skills).padStart(3)}   Domain knowledge modules`);
console.log(`    Commands     ${String(commands).padStart(3)}   Slash commands (/deploy, /test, etc.)`);
console.log(`    Rules        ${String(rules).padStart(3)}   Always-follow guidelines`);
console.log(`    Hooks        ${String(hooks).padStart(3)}   Automated triggers`);
console.log(`    Schemas      ${String(schemas).padStart(3)}   JSON Schema validators`);
console.log(`    Manifests    ${String(manifests).padStart(3)}   Installation profiles`);
console.log(`    MCP Configs  ${String(mcpConfigs).padStart(3)}   Tool integrations`);
console.log(`    Scripts      ${String(scripts).padStart(3)}   CLI and hook scripts`);
console.log(`    Tests        ${String(tests).padStart(3)}   Validation tests`);
console.log(`    Docs         ${String(docs).padStart(3)}   Documentation files`);
console.log(`    Examples     ${String(examples).padStart(3)}   Code examples`);

const total = agents + skills + commands + rules + hooks + schemas + manifests + mcpConfigs + scripts + tests + docs + examples;
console.log(`\n    ${'─'.repeat(36)}`);
console.log(`    Total      ${String(total).padStart(4)}   components\n`);

console.log('  📏 Rules by Category:\n');
for (const [cat, count] of Object.entries(ruleCategories).sort()) {
  console.log(`    ${cat.padEnd(15)} ${count} rules`);
}

console.log('\n  📦 Available Profiles:\n');
const manifestsDir = path.join(ROOT, 'manifests');
if (fs.existsSync(manifestsDir)) {
  for (const mf of fs.readdirSync(manifestsDir).filter(fn => fn.endsWith('.json')).sort()) {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(manifestsDir, mf), 'utf8'));
      const compCount = Object.values(m.components || {}).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);
      console.log(`    ${m.name.padEnd(15)} ${String(compCount).padStart(3)} components — ${m.description || ''}`);
    } catch (_e) {
      console.log(`    ${mf}`);
    }
  }
}

console.log('');
