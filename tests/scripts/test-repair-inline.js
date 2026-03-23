#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { requireScript } = require('../helpers/require-script');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '../../scripts/repair.js');

describe('repair (in-process)', () => {
  it('runs in check mode by default', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(result.stdout.includes('Repair Tool'));
    assert.ok(result.stdout.includes('CHECK'));
  });

  it('checks directories section', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(result.stdout.includes('Checking directories'));
  });

  it('checks critical files section', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(result.stdout.includes('Checking critical files'));
  });

  it('checks manifest references section', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(result.stdout.includes('Checking manifest references'));
  });

  it('checks scripts section', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(result.stdout.includes('Checking scripts'));
  });

  it('checks JSON files section', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(result.stdout.includes('Checking JSON files'));
  });

  it('shows fix mode label when --fix is passed', () => {
    const result = requireScript(SCRIPT, ['--fix']);
    assert.ok(result.stdout.includes('FIX'));
  });

  it('reports summary with issue count or healthy status', () => {
    const result = requireScript(SCRIPT, []);
    assert.ok(
      result.stdout.includes('No issues found') || result.stdout.includes('Found'),
      'Should show summary'
    );
  });
});
