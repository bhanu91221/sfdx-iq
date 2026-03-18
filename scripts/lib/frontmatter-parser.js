#!/usr/bin/env node
'use strict';

/**
 * Parse YAML frontmatter from markdown content.
 * Splits on --- markers, parses simple YAML key:value pairs.
 * Handles strings, arrays with "- item" syntax.
 *
 * @param {string} content - Raw file content with optional YAML frontmatter
 * @returns {{ data: Object, content: string }}
 */
function parseFrontmatter(content) {
  const result = { data: {}, content: content };

  if (!content || !content.startsWith('---')) {
    return result;
  }

  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) {
    return result;
  }

  const frontmatterBlock = content.substring(3, endIndex).trim();
  const body = content.substring(endIndex + 3).trim();

  result.content = body;
  result.data = parseYamlBlock(frontmatterBlock);

  return result;
}

/**
 * Parse a simple YAML block into a key-value object.
 * Supports strings, arrays (- item), and nested simple values.
 *
 * @param {string} block - YAML text block
 * @returns {Object}
 */
function parseYamlBlock(block) {
  const data = {};
  const lines = block.split('\n');
  let currentKey = null;
  let currentArray = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Array item line (starts with whitespace + "- ")
    const arrayMatch = line.match(/^\s+- (.+)$/);
    if (arrayMatch && currentKey) {
      if (!currentArray) {
        currentArray = [];
      }
      currentArray.push(arrayMatch[1].trim().replace(/^["']|["']$/g, ''));
      data[currentKey] = currentArray;
      continue;
    }

    // Key-value line
    const kvMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      // Save previous array if any
      if (currentKey && currentArray) {
        data[currentKey] = currentArray;
      }

      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();
      currentArray = null;

      if (value === '' || value === '|' || value === '>') {
        // Value might be an array or multiline on next lines
        data[currentKey] = value === '' ? null : value;
      } else {
        // Remove surrounding quotes
        data[currentKey] = value.replace(/^["']|["']$/g, '');
      }
      continue;
    }
  }

  return data;
}

module.exports = { parseFrontmatter, parseYamlBlock };
