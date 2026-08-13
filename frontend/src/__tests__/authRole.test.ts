/**
 * ROLE1 — one definition of admin, including the half the sweep could
 * not see.
 *
 * ═══ THE PIN THAT WAS MISSING ═══
 *
 * ROLE1 converged three Python gates onto `auth.ADMIN_ROLES` and pinned
 * it with a sweep over `backend/**.py`. The sweep was as wide as its
 * language and no wider. TypeScript held the same four spellings, typed
 * out as a literal array, in three more files — one of which decides
 * whether the admin console opens.
 *
 * Six definitions, not three. They agreed, which is the condition under
 * which nobody notices the seventh.
 *
 * The sweep below is the other half of `test_no_file_hard_codes_an_admin_
 * spelling_any_more`, and the cross-language test reads `backend/auth.py`
 * rather than trusting a comment that says the two match.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import { join } from 'path';

import { ADMIN_ROLES, isAdminRole } from '@/lib/authRole';
import { codeOnly } from '@/test-support/sourceText';

const SRC = join(process.cwd(), 'src');
const REPO = join(process.cwd(), '..');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...sourceFiles(p));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

describe('the vocabulary', () => {
  it('is the same four spellings the server recognizes', () => {
    const py = fs.readFileSync(join(REPO, 'backend', 'auth.py'), 'utf8');
    const match = py.match(/^ADMIN_ROLES = \(([^)]*)\)/m);
    expect(match).not.toBeNull();
    const serverSide = (match as RegExpMatchArray)[1]
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .filter(Boolean);
    expect([...ADMIN_ROLES]).toEqual(serverSide);
  });

  it('answers the question the same way for every spelling', () => {
    for (const spelling of ADMIN_ROLES) {
      expect(isAdminRole(spelling)).toBe(true);
      expect(isAdminRole(spelling.toUpperCase())).toBe(true);
      expect(isAdminRole(`  ${spelling}  `)).toBe(true);
    }
  });

  it('says no to everything else, including a job title', () => {
    // ROLE1 step 3 — the token's role claim is an authorization answer
    // now, so these arrive only from a cached user object or a token
    // minted before the change. Both are real, and both must be refused.
    for (const other of ['Escrow Officer', 'Title Agent', 'user', 'adminn',
                         'administrater', '', null, undefined]) {
      expect(isAdminRole(other)).toBe(false);
    }
  });
});

describe('nothing else spells it out', () => {
  it('has no second copy of the admin vocabulary anywhere in src', () => {
    // The spelling that gives the copies away: any file that knows
    // `super_admin` is a file deciding who is an admin, and there is one
    // place for that.
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      if (file.endsWith(join('lib', 'authRole.ts'))) continue; // the definition
      const body = codeOnly(fs.readFileSync(file, 'utf8'));
      if (body.includes('super_admin') || body.includes('superadmin')) {
        offenders.push(file.slice(SRC.length + 1));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('routes the three call sites through the one function', () => {
    for (const file of ['app/login/page.tsx', 'app/admin/layout.tsx',
                        'utils/auth.ts']) {
      const body = codeOnly(fs.readFileSync(join(SRC, file), 'utf8'));
      expect(body).toContain('isAdminRole');
      expect(body).toContain('authRole');
    }
  });
});
