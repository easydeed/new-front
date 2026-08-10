/**
 * The build fetches nothing from a third party.
 *
 * ═══ WHY THIS IS A PIN AND NOT A ONE-OFF FIX ═══
 *
 * `next/font/google` downloads the font AT BUILD TIME. That fetch failed
 * once in CI — `NextFontError: Failed to fetch Inter from Google Fonts`
 * — on a pull request that changed only backend files, and the re-run
 * was green.
 *
 * The cost of leaving it is not the reruns. **A gate that fails for
 * reasons unrelated to the diff trains people to re-run rather than
 * read**, and that is how a real failure eventually gets waved through.
 * A red build has to mean something or it means nothing.
 *
 * There is an honesty point underneath it. A build that can fail because
 * a third-party CDN is unreachable is not hermetic — and the same build
 * produces the PDFs this product's customers take to a county recorder.
 *
 * BRAND2 already self-hosted Plus Jakarta Sans and pinned it in
 * brandLogo.test.tsx. That pin protects ONE FILE. This one protects the
 * PROPERTY across the tree, so the next font somebody adds cannot
 * reintroduce the dependency in a file nobody thought to name.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');

function allSources(dir: string = SRC): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      out.push(...allSources(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('the build is hermetic — no third-party fetches at build time', () => {
  it('no source imports next/font/google', () => {
    // codeOnly, because the THIRTEENTH trip in this project's history was
    // this exact test failing on the comment in layout.tsx explaining
    // that `next/font/google` had been removed. The pin is right, the
    // code is right, and prose describing a defect necessarily quotes it.
    const offenders = allSources()
      .filter((f) => codeOnly(fs.readFileSync(f, 'utf8')).includes('next/font/google'))
      .map((f) => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });

  it('every font the app loads is a committed file', () => {
    // The PROPERTY: a `localFont({src: ...})` whose file is not in the
    // repo is the same build-time dependency wearing a different import.
    const missing: string[] = [];
    for (const file of allSources()) {
      const src = fs.readFileSync(file, 'utf8');
      if (!src.includes('next/font/local')) continue;
      for (const match of src.matchAll(/src:\s*'(\.\/[^']+\.woff2?)'/g)) {
        const resolved = path.join(path.dirname(file), match[1]);
        if (!fs.existsSync(resolved)) {
          missing.push(`${path.relative(SRC, file)} → ${match[1]}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('both faces are accounted for', () => {
    // Inter (the app's body face) and Plus Jakarta Sans (the wordmark).
    // Named so that removing one silently is a failing test rather than
    // a design change nobody reviewed.
    expect(fs.existsSync(path.join(SRC, 'app', 'fonts', 'Inter-latin-variable.woff2'))).toBe(true);
    expect(
      fs.existsSync(path.join(SRC, 'components', 'brand', 'fonts', 'PlusJakartaSans-ExtraBold-latin.woff2')),
    ).toBe(true);
  });

  it('the committed faces are real woff2 files, not placeholders', () => {
    // A zero-byte or HTML-error-page "font" would satisfy existsSync and
    // fail the build in a much more confusing way. wOF2 is the magic.
    for (const rel of [
      ['app', 'fonts', 'Inter-latin-variable.woff2'],
      ['components', 'brand', 'fonts', 'PlusJakartaSans-ExtraBold-latin.woff2'],
    ]) {
      const buf = fs.readFileSync(path.join(SRC, ...rel));
      expect(buf.subarray(0, 4).toString('latin1')).toBe('wOF2');
      expect(buf.length).toBeGreaterThan(1024);
    }
  });

  it('the body face declares a fallback stack', () => {
    // display:swap plus a fallback means a slow font never blanks the
    // page. Self-hosting makes that unlikely, not impossible.
    const layout = fs.readFileSync(path.join(SRC, 'app', 'layout.tsx'), 'utf8');
    expect(layout).toContain("display: 'swap'");
    expect(layout).toContain('fallback:');
  });
});
