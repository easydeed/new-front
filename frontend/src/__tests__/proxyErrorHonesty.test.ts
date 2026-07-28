/**
 * Doctrine sweep: proxies never swallow failures into fake successes.
 *
 * Two proxy diseases have bitten in production:
 *  - bug #12b: the partners selectlist returned 200-[] on every failure, so
 *    the UI showed "No partners yet" over real errors;
 *  - the AI chat proxy returned success:true with canned text from its
 *    catch, so outage copy rendered as if the assistant had said it.
 *
 * This test source-scans every app-router proxy and pins the class dead:
 *  1. no proxy returns a bare empty-array JSON body;
 *  2. no catch block fabricates success (success: true) or returns a
 *     NextResponse.json without an explicit non-2xx status.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const API_ROOT = path.join(__dirname, '..', 'app', 'api');

function collectRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectRouteFiles(full));
    else if (entry.name === 'route.ts' || entry.name === 'route.tsx') out.push(full);
  }
  return out;
}

/** Strip // and /* comments so prose about a disease can't trip the scan. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** Extract the body of every catch block via brace matching. */
function catchBodies(source: string): string[] {
  const bodies: string[] = [];
  const re = /catch\s*(\([^)]*\))?\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') depth--;
      i++;
    }
    bodies.push(source.slice(start, i - 1));
  }
  return bodies;
}

describe('proxy error honesty (doctrine sweep)', () => {
  const files = collectRouteFiles(API_ROOT);

  it('finds the proxy routes', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files.map((f) => [path.relative(API_ROOT, f), f]))(
    '%s never swallows failures',
    (_rel, file) => {
      const src = stripComments(fs.readFileSync(file as string, 'utf8'));

      // 1. The 200-[] disease: no bare empty-array responses.
      expect(src).not.toMatch(/\.json\(\s*\[\s*\]/);

      // 2. Catch blocks must not fabricate success or default to 200.
      for (const body of catchBodies(src)) {
        expect(body).not.toMatch(/success:\s*true/);
        const returnsJson = /NextResponse\.json|Response\.json/.test(body);
        if (returnsJson) {
          expect(body).toMatch(/status:\s*(4\d\d|5\d\d)/);
        }
      }
    }
  );
});
