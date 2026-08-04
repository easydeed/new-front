/**
 * codeOnly() — pinned, including the two bugs it replaces.
 *
 * A helper every forbidden-pattern pin depends on is load-bearing in an
 * unusual way: strip too much and the pins pass for the WRONG reason,
 * so the thing they guard can walk out of the codebase unnoticed. That
 * failure is silent, which is why the over-stripping cases matter more
 * than the under-stripping ones.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const TESTS_DIR = __dirname;

describe('it removes prose', () => {
  it('strips a line comment', () => {
    expect(codeOnly('// we used to claim SOC 2\nconst x = 1')).not.toContain('SOC 2');
  });

  it('strips a trailing comment', () => {
    expect(codeOnly('const x = 1 // the old 99.9% SLA')).not.toContain('99.9');
  });

  it('strips a block comment across lines', () => {
    const src = '/*\n * Removed: ALTA Best Practices\n */\nconst x = 1';
    expect(codeOnly(src)).not.toContain('ALTA');
  });

  it('strips a JSX comment', () => {
    expect(codeOnly('<div>{/* was SoftPro integration */}</div>')).not.toContain('SoftPro');
  });
});

describe('...and nothing else — the dangerous direction', () => {
  it('a URL in a string SURVIVES', () => {
    /**
     * THE bug in six of the fourteen files this replaces.
     *
     *   /\/\/[^\n]*​/g
     *
     * turned  const url = "https://api.openai.com/v1/chat";
     * into    const url = "https:
     *
     * It truncated the string, left an unterminated quote, and deleted
     * the rest of the line. Files using it test proxy and docs code
     * whose content is largely URLs, so those pins were asserting
     * against mangled text and nobody could tell.
     */
    const src = 'const url = "https://api.openai.com/v1/chat";';
    expect(codeOnly(src)).toBe(src);
  });

  it('a URL in a template literal survives', () => {
    const src = 'const u = `${BASE}//api.example.com/v1`;';
    expect(codeOnly(src)).toBe(src);
  });

  it('a protocol-relative URL survives', () => {
    const src = "const u = '//cdn.example.com/x.js';";
    expect(codeOnly(src)).toBe(src);
  });

  it('a comment marker inside a single-quoted string survives', () => {
    const src = "const s = 'a /* not a comment */ b';";
    expect(codeOnly(src)).toBe(src);
  });

  it('a division expression is not mistaken for a regex', () => {
    const src = 'const r = total / count / 2;';
    expect(codeOnly(src)).toBe(src);
  });

  it('a regex literal containing slashes survives', () => {
    const src = 'const re = /https:\\/\\/[a-z]+/g;';
    expect(codeOnly(src)).toBe(src);
  });

  it('line numbers do not move', () => {
    /**
     * The other replaced variant, /^\s*\/\/.*$​/gm, ate a blank line
     * along with the comment because `\s` matches `\n` — the same bug
     * found independently in the banned-claims checker.
     */
    const src = 'const a = 1;\n\n\n// a comment\nconst b = 2;\n';
    const out = codeOnly(src);
    expect(out.split('\n').length).toBe(src.split('\n').length);
    expect(out.split('\n')[4]).toBe('const b = 2;');
  });

  it('column positions do not move either', () => {
    const src = 'const x = 1;  // trailing\nconst y = 2;';
    const out = codeOnly(src);
    expect(out.split('\n')[0].startsWith('const x = 1;')).toBe(true);
    expect(out.split('\n')[0].length).toBe(src.split('\n')[0].length);
  });
});

describe('the meta-pin', () => {
  /**
   * The rule eight comment-quoting trips earned: a pin that greps raw
   * source will eventually trip on the comment explaining the very
   * thing it forbids. There is now one utility that prevents that, so
   * an inline stripper is a defect the suite reports on itself.
   */
  const files = fs
    .readdirSync(TESTS_DIR)
    .filter((f) => f.endsWith('.test.ts') || f.endsWith('.test.tsx'))
    .filter((f) => f !== 'sourceText.test.ts');

  it('no test file defines its own comment stripper', () => {
    const offenders = files.filter((f) => {
      const src = fs.readFileSync(path.join(TESTS_DIR, f), 'utf8');
      return /replace\(\s*\/\\\/\\\*/.test(src) || /replace\(\s*\/\^?\[?\^?\\s\*\\\/\\\//.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it('no test file strips comments with a hand-rolled regex at all', () => {
    const offenders = files.filter((f) => {
      const src = fs.readFileSync(path.join(TESTS_DIR, f), 'utf8');
      // Any regex replace that mentions an escaped `//` or `/*`.
      return /\.replace\([^)]*\\\/\\[*/]/.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it('the helper itself is what everyone imports', () => {
    const importers = files.filter((f) =>
      fs.readFileSync(path.join(TESTS_DIR, f), 'utf8').includes("../test-support/sourceText")
    );
    // Not every test reads source; the ones that do must use it.
    expect(importers.length).toBeGreaterThan(8);
  });
});
