#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { formatFindings } = require('../lib/report-formatter');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: flow-check.js <file>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const findings = [];
const fileName = path.basename(filePath);

// Check for DML elements inside loop elements
// Flow XML structure: <loops> elements contain loop definitions
// DML elements: <recordCreates>, <recordUpdates>, <recordDeletes>, <recordLookups>
const dmlTags = ['recordCreates', 'recordUpdates', 'recordDeletes', 'recordLookups'];
const loopRegex = /<loops>[\s\S]*?<\/loops>/gi;
let loopMatch;

while ((loopMatch = loopRegex.exec(content)) !== null) {
  const loopContent = loopMatch[0];

  // Extract the loop's next value reference to find elements inside the loop
  const nextValueRefMatch = loopContent.match(/<nextValueConnector>[\s\S]*?<targetReference>([\s\S]*?)<\/targetReference>/);
  if (nextValueRefMatch) {

    // Check if any DML elements reference loop body
    for (const dmlTag of dmlTags) {
      const dmlRegex = new RegExp(`<${dmlTag}>[\\s\\S]*?</${dmlTag}>`, 'gi');
      let dmlMatch;
      while ((dmlMatch = dmlRegex.exec(content)) !== null) {
        const dmlContent = dmlMatch[0];
        const dmlLineNum = content.substring(0, dmlMatch.index).split('\n').length;
        const nameMatch = dmlContent.match(/<name>([\s\S]*?)<\/name>/);
        const dmlName = nameMatch ? nameMatch[1].trim() : 'unknown';

        // Simple heuristic: if DML element name is referenced in loop body
        if (loopContent.includes(dmlName)) {
          findings.push({
            file: filePath,
            line: dmlLineNum,
            severity: 'CRITICAL',
            message: `DML element "${dmlName}" (${dmlTag}) appears to be inside a loop. Move DML operations outside loops.`,
            rule: 'flow-no-dml-in-loop'
          });
        }
      }
    }
  }
}

// Check for missing fault connectors on DML and action elements
const actionElements = [...dmlTags, 'actionCalls', 'subflows'];
for (const tag of actionElements) {
  const elementRegex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'gi');
  let elemMatch;
  while ((elemMatch = elementRegex.exec(content)) !== null) {
    const elemContent = elemMatch[1];
    const elemLineNum = content.substring(0, elemMatch.index).split('\n').length;
    const nameMatch = elemContent.match(/<name>([\s\S]*?)<\/name>/);
    const elemName = nameMatch ? nameMatch[1].trim() : 'unknown';

    if (!/<faultConnector>/.test(elemContent)) {
      findings.push({
        file: filePath,
        line: elemLineNum,
        severity: 'HIGH',
        message: `Element "${elemName}" (${tag}) is missing a fault connector. Add error handling.`,
        rule: 'flow-require-fault-connector'
      });
    }
  }
}

// Check for missing description on the flow itself
if (!/<description>/.test(content) || /<description>\s*<\/description>/.test(content)) {
  findings.push({
    file: filePath,
    line: 1,
    severity: 'MEDIUM',
    message: 'Flow is missing a description. Add a description for documentation.',
    rule: 'flow-require-description'
  });
}

// Check for missing element descriptions
const allElements = content.match(/<(decisions|loops|assignments|recordCreates|recordUpdates|recordDeletes|recordLookups|actionCalls|subflows)>[\s\S]*?<\/\1>/gi) || [];
for (const elem of allElements) {
  const nameMatch = elem.match(/<name>([\s\S]*?)<\/name>/);
  const elemName = nameMatch ? nameMatch[1].trim() : 'unknown';
  if (!/<description>/.test(elem) || /<description>\s*<\/description>/.test(elem)) {
    findings.push({
      file: filePath,
      line: 1,
      severity: 'LOW',
      message: `Flow element "${elemName}" is missing a description.`,
      rule: 'flow-element-description'
    });
  }
}

if (findings.length > 0) {
  console.log(formatFindings(findings));
  const hasCritical = findings.some(f => f.severity === 'CRITICAL');
  process.exit(hasCritical ? 1 : 0);
} else {
  console.log(`\u2705 ${fileName}: No flow issues found.`);
}
