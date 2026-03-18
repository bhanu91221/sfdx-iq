'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { formatFindings, formatSummary } = require('../../scripts/lib/report-formatter');

describe('formatFindings', () => {
    it('should return no-issues message for empty array', () => {
        const output = formatFindings([]);
        assert.ok(output.includes('No issues found'), 'Should indicate no issues');
    });

    it('should return no-issues message for null input', () => {
        const output = formatFindings(null);
        assert.ok(output.includes('No issues found'));
    });

    it('should format a single finding with file and message', () => {
        const findings = [{
            file: 'AccountService.cls',
            line: 42,
            severity: 'HIGH',
            message: 'SOQL in loop detected',
            rule: 'no-soql-in-loop'
        }];
        const output = formatFindings(findings);
        assert.ok(output.includes('AccountService.cls'), 'Should contain filename');
        assert.ok(output.includes('SOQL in loop detected'), 'Should contain message');
        assert.ok(output.includes(':42'), 'Should contain line number');
        assert.ok(output.includes('no-soql-in-loop'), 'Should contain rule name');
    });

    it('should group multiple findings by file', () => {
        const findings = [
            { file: 'A.cls', line: 1, severity: 'HIGH', message: 'Issue 1', rule: 'r1' },
            { file: 'A.cls', line: 5, severity: 'LOW', message: 'Issue 2', rule: 'r2' },
            { file: 'B.cls', line: 3, severity: 'CRITICAL', message: 'Issue 3', rule: 'r3' }
        ];
        const output = formatFindings(findings);
        assert.ok(output.includes('A.cls'), 'Should contain first file');
        assert.ok(output.includes('B.cls'), 'Should contain second file');
    });

    it('should handle findings without line numbers', () => {
        const findings = [{
            file: 'MyClass.cls',
            severity: 'MEDIUM',
            message: 'Missing documentation'
        }];
        const output = formatFindings(findings);
        assert.ok(output.includes('Missing documentation'));
        assert.ok(!output.includes(':undefined'), 'Should not show undefined line');
    });
});

describe('formatSummary', () => {
    it('should return zero count for empty array', () => {
        const output = formatSummary([]);
        assert.ok(output.includes('0 issues found'));
    });

    it('should return zero count for null input', () => {
        const output = formatSummary(null);
        assert.ok(output.includes('0 issues found'));
    });

    it('should count findings by severity', () => {
        const findings = [
            { severity: 'CRITICAL' },
            { severity: 'HIGH' },
            { severity: 'HIGH' },
            { severity: 'MEDIUM' },
            { severity: 'LOW' },
            { severity: 'LOW' }
        ];
        const output = formatSummary(findings);
        assert.ok(output.includes('6 issues found'), 'Should show total count');
        assert.ok(output.includes('1 critical'), 'Should count critical');
        assert.ok(output.includes('2 high'), 'Should count high');
        assert.ok(output.includes('1 medium'), 'Should count medium');
        assert.ok(output.includes('2 low'), 'Should count low');
    });

    it('should use singular form for single issue', () => {
        const findings = [{ severity: 'HIGH' }];
        const output = formatSummary(findings);
        assert.ok(output.includes('1 issue found'), 'Should use singular "issue"');
    });
});
