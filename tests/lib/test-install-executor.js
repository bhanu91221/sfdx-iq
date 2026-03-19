#!/usr/bin/env node
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { copyComponent, verifyInstallation, rollbackInstallation } = require('../../scripts/lib/install-executor');

const TEMP_DIR = path.join(os.tmpdir(), 'install-exec-test-' + Date.now());

describe('install-executor', () => {
  beforeEach(() => {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  });

  describe('copyComponent', () => {
    it('copies a file to the destination directory', () => {
      const srcDir = path.join(TEMP_DIR, 'src');
      const destDir = path.join(TEMP_DIR, 'dest');
      fs.mkdirSync(srcDir, { recursive: true });
      const srcFile = path.join(srcDir, 'test.md');
      fs.writeFileSync(srcFile, 'hello');

      const result = copyComponent(srcFile, destDir);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.error, null);
      assert.ok(fs.existsSync(result.destPath));
      assert.strictEqual(fs.readFileSync(result.destPath, 'utf8'), 'hello');
    });

    it('creates destination directory if it does not exist', () => {
      const srcDir = path.join(TEMP_DIR, 'src2');
      const destDir = path.join(TEMP_DIR, 'deep', 'nested', 'dest');
      fs.mkdirSync(srcDir, { recursive: true });
      const srcFile = path.join(srcDir, 'test.md');
      fs.writeFileSync(srcFile, 'content');

      const result = copyComponent(srcFile, destDir);
      assert.strictEqual(result.success, true);
      assert.ok(fs.existsSync(destDir));
    });

    it('returns dryRun result without actually copying', () => {
      const srcFile = path.join(TEMP_DIR, 'nope.md');
      const destDir = path.join(TEMP_DIR, 'dryrun-dest');

      const result = copyComponent(srcFile, destDir, { dryRun: true });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.error, null);
      assert.ok(!fs.existsSync(destDir));
    });

    it('returns error on copy failure', () => {
      const srcFile = path.join(TEMP_DIR, 'nonexistent-src-file.md');
      const destDir = path.join(TEMP_DIR, 'dest-err');

      const result = copyComponent(srcFile, destDir);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('verifyInstallation', () => {
    it('returns valid when all manifest files exist', () => {
      const dir = path.join(TEMP_DIR, 'verify');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'a.md'), 'a');
      fs.writeFileSync(path.join(dir, 'b.md'), 'b');

      const result = verifyInstallation(['a.md', 'b.md'], dir);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.missing.length, 0);
    });

    it('reports missing files', () => {
      const dir = path.join(TEMP_DIR, 'verify-missing');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'a.md'), 'a');

      const result = verifyInstallation(['a.md', 'b.md'], dir);
      assert.strictEqual(result.valid, false);
      assert.deepStrictEqual(result.missing, ['b.md']);
    });

    it('reports extra files not in manifest', () => {
      const dir = path.join(TEMP_DIR, 'verify-extra');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'a.md'), 'a');
      fs.writeFileSync(path.join(dir, 'extra.md'), 'extra');

      const result = verifyInstallation(['a.md'], dir);
      assert.strictEqual(result.valid, true);
      assert.ok(result.extra.includes('extra.md'));
    });

    it('handles non-existent target directory', () => {
      const dir = path.join(TEMP_DIR, 'nope-dir');
      const result = verifyInstallation(['a.md'], dir);
      assert.strictEqual(result.valid, false);
      assert.deepStrictEqual(result.missing, ['a.md']);
    });
  });

  describe('rollbackInstallation', () => {
    it('removes installed files', () => {
      const dir = path.join(TEMP_DIR, 'rollback');
      fs.mkdirSync(dir, { recursive: true });
      const file1 = path.join(dir, 'a.md');
      const file2 = path.join(dir, 'b.md');
      fs.writeFileSync(file1, 'a');
      fs.writeFileSync(file2, 'b');

      const result = rollbackInstallation([file1, file2]);
      assert.strictEqual(result.removed.length, 2);
      assert.strictEqual(result.errors.length, 0);
      assert.ok(!fs.existsSync(file1));
      assert.ok(!fs.existsSync(file2));
    });

    it('removes empty parent directories', () => {
      const dir = path.join(TEMP_DIR, 'rollback-empty', 'sub');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, 'a.md');
      fs.writeFileSync(file, 'a');

      rollbackInstallation([file]);
      assert.ok(!fs.existsSync(dir));
    });

    it('handles non-existent files gracefully', () => {
      const result = rollbackInstallation([path.join(TEMP_DIR, 'nope.md')]);
      assert.strictEqual(result.removed.length, 0);
      assert.strictEqual(result.errors.length, 0);
    });
  });
});
