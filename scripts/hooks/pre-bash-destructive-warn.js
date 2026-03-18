#!/usr/bin/env node
'use strict';

const fs = require('fs');

const COLORS = {
  RED: '\x1b[31m', YELLOW: '\x1b[33m', BOLD: '\x1b[1m', RESET: '\x1b[0m'
};

const command = process.argv.slice(2).join(' ');

if (!command) {
  console.error('Usage: pre-bash-destructive-warn.js <command...>');
  process.exit(1);
}

const destructiveKeywords = [
  'destructiveChanges',
  '--purge-on-delete',
  'mdapi:deploy.*destructive',
  'source:delete',
  'force:source:delete',
  'project deploy.*--purge'
];

const isDestructive = destructiveKeywords.some(kw => new RegExp(kw, 'i').test(command));

if (!isDestructive) {
  // Not a destructive command, nothing to warn about
  process.exit(0);
}

console.log(`\n${COLORS.RED}${COLORS.BOLD}\u26a0\ufe0f  DESTRUCTIVE OPERATION DETECTED${COLORS.RESET}`);
console.log(`${COLORS.YELLOW}Command: ${command}${COLORS.RESET}\n`);

// Try to find and parse destructiveChanges.xml
const xmlMatch = command.match(/(?:--manifest|--destructive-changes|-x)\s+["']?([^\s"']+)/);
const defaultPaths = ['destructiveChanges.xml', 'destructiveChangesPre.xml', 'destructiveChangesPost.xml'];
const pathsToCheck = xmlMatch ? [xmlMatch[1]] : defaultPaths;

let found = false;
for (const xmlPath of pathsToCheck) {
  if (fs.existsSync(xmlPath)) {
    found = true;
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    const members = xmlContent.match(/<members>([^<]+)<\/members>/g) || [];
    const types = xmlContent.match(/<name>([^<]+)<\/name>/g) || [];

    console.log(`${COLORS.BOLD}Destructive manifest: ${xmlPath}${COLORS.RESET}`);
    if (types.length > 0) {
      console.log(`  Metadata types: ${types.map(t => t.replace(/<\/?name>/g, '')).join(', ')}`);
    }
    console.log(`  ${COLORS.RED}${members.length} component(s) will be DELETED:${COLORS.RESET}`);
    for (const m of members.slice(0, 20)) {
      console.log(`    - ${m.replace(/<\/?members>/g, '')}`);
    }
    if (members.length > 20) {
      console.log(`    ... and ${members.length - 20} more`);
    }
    console.log('');
  }
}

if (!found) {
  console.log(`${COLORS.YELLOW}Could not locate destructiveChanges manifest to list components.${COLORS.RESET}\n`);
}

console.log(`${COLORS.YELLOW}Proceed with caution. This operation cannot be easily undone.${COLORS.RESET}\n`);
process.exit(0);
