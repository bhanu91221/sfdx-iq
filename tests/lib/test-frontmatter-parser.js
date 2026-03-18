'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseFrontmatter, parseYamlBlock } = require('../../scripts/lib/frontmatter-parser');

describe('parseFrontmatter', () => {
    it('should parse valid frontmatter with key-value pairs', () => {
        const content = '---\nname: test-agent\ndescription: A test agent\n---\n\n# Body content';
        const result = parseFrontmatter(content);
        assert.strictEqual(result.data.name, 'test-agent');
        assert.strictEqual(result.data.description, 'A test agent');
        assert.ok(result.content.includes('# Body content'));
    });

    it('should parse frontmatter with array values', () => {
        const content = '---\nname: test-agent\ntools:\n  - sf\n  - grep\n  - read_file\n---\n\nBody';
        const result = parseFrontmatter(content);
        assert.strictEqual(result.data.name, 'test-agent');
        assert.ok(Array.isArray(result.data.tools), 'tools should be an array');
        assert.strictEqual(result.data.tools.length, 3);
        assert.strictEqual(result.data.tools[0], 'sf');
        assert.strictEqual(result.data.tools[2], 'read_file');
    });

    it('should return empty data for content without frontmatter', () => {
        const content = '# Just a heading\n\nSome paragraph text.';
        const result = parseFrontmatter(content);
        assert.deepStrictEqual(result.data, {});
        assert.strictEqual(result.content, content);
    });

    it('should return empty data for empty string', () => {
        const result = parseFrontmatter('');
        assert.deepStrictEqual(result.data, {});
        assert.strictEqual(result.content, '');
    });

    it('should return empty data for null input', () => {
        const result = parseFrontmatter(null);
        assert.deepStrictEqual(result.data, {});
    });

    it('should handle frontmatter with unclosed delimiters', () => {
        const content = '---\nname: broken\nNo closing delimiter here';
        const result = parseFrontmatter(content);
        assert.deepStrictEqual(result.data, {});
        assert.strictEqual(result.content, content);
    });

    it('should strip quotes from values', () => {
        const content = '---\nname: "quoted-value"\ndescription: \'single-quoted\'\n---\nBody';
        const result = parseFrontmatter(content);
        assert.strictEqual(result.data.name, 'quoted-value');
        assert.strictEqual(result.data.description, 'single-quoted');
    });
});

describe('parseYamlBlock', () => {
    it('should parse simple key-value pairs', () => {
        const block = 'name: hello\nversion: 1.0';
        const data = parseYamlBlock(block);
        assert.strictEqual(data.name, 'hello');
        assert.strictEqual(data.version, '1.0');
    });

    it('should handle empty value as null', () => {
        const block = 'name:\ndescription: has value';
        const data = parseYamlBlock(block);
        assert.strictEqual(data.name, null);
        assert.strictEqual(data.description, 'has value');
    });
});
