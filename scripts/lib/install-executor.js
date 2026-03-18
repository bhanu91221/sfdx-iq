#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Installation utilities for copying and verifying plugin components.
 */

/**
 * Copy a component file to a destination directory.
 *
 * @param {string} srcPath - Source file path
 * @param {string} destDir - Destination directory
 * @param {Object} [options={}] - Copy options
 * @param {boolean} [options.dryRun=false] - If true, only report what would happen
 * @returns {{ success: boolean, destPath: string, error: string|null }}
 */
function copyComponent(srcPath, destDir, options = {}) {
  const fileName = path.basename(srcPath);
  const destPath = path.join(destDir, fileName);

  if (options.dryRun) {
    return { success: true, destPath, error: null };
  }

  try {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(srcPath, destPath);
    return { success: true, destPath, error: null };
  } catch (err) {
    return { success: false, destPath, error: err.message };
  }
}

/**
 * Verify that all manifest components exist in the target directory.
 *
 * @param {string[]} manifest - Array of expected relative file paths
 * @param {string} targetDir - Root directory to check against
 * @returns {{ valid: boolean, missing: string[], extra: string[] }}
 */
function verifyInstallation(manifest, targetDir) {
  const missing = [];
  const installed = new Set();

  for (const relativePath of manifest) {
    const fullPath = path.join(targetDir, relativePath);
    if (fs.existsSync(fullPath)) {
      installed.add(relativePath);
    } else {
      missing.push(relativePath);
    }
  }

  // Find extra files not in manifest
  const extra = [];
  const manifestSet = new Set(manifest);

  function walkDir(dir, base) {
    if (!fs.existsSync(dir)) {return;}
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(base, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, relativePath);
      } else if (!manifestSet.has(relativePath)) {
        extra.push(relativePath);
      }
    }
  }

  walkDir(targetDir, '');

  return { valid: missing.length === 0, missing, extra };
}

/**
 * Rollback an installation by removing installed files.
 *
 * @param {string[]} installedFiles - Array of absolute file paths to remove
 * @returns {{ removed: string[], errors: string[] }}
 */
function rollbackInstallation(installedFiles) {
  const removed = [];
  const errors = [];

  for (const filePath of installedFiles) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        removed.push(filePath);

        // Remove empty parent directories
        let dir = path.dirname(filePath);
        while (dir && fs.existsSync(dir)) {
          const entries = fs.readdirSync(dir);
          if (entries.length === 0) {
            fs.rmdirSync(dir);
            dir = path.dirname(dir);
          } else {
            break;
          }
        }
      }
    } catch (err) {
      errors.push(`${filePath}: ${err.message}`);
    }
  }

  return { removed, errors };
}

module.exports = { copyComponent, verifyInstallation, rollbackInstallation };
