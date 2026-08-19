/**
 * The public environment, and what the footer does without it.
 *
 * ═══ THE RULING BEING PINNED ═══
 *
 * "'Absence is neutral' governs DATA — an unmeasured value, an empty
 * list, an unset county — but a missing contact address is a broken
 * deploy, not absent data, and this page is about to be forwarded by a
 * title rep whose escrows will look for a way to reach us. Visible
 * placeholder outside production; in production, surface it the way the
 * boot check surfaces a missing required variable. This is
 * ALLOWED_ORIGINS in a footer."
 *
 * ═══ WHAT IS ASSERTED HERE IS THE PROPERTY, NOT THE COPY ═══
 *
 * §14.1.1: nothing below quotes the placeholder's wording or the report's
 * headline. The assertions are (a) the missing variables are NAMED
 * wherever the gap is surfaced, (b) production and non-production surface
 * it differently, and (c) strict turns the boot warning into a refusal.
 * Rewording the placeholder should not turn this file red; removing the
 * variable names from it must.
 */
import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { codeOnly } from '../test-support/sourceText';

const SRC = join(__dirname, '..');
const MODULE = join(SRC, 'lib', 'publicEnvironment.ts');
const CONTACT = ['NEXT_PUBLIC_LEGAL_ENTITY', 'NEXT_PUBLIC_CONTACT_EMAIL',
  'NEXT_PUBLIC_CONTACT_ADDRESS'];

const KEPT = { ...process.env };

/**
 * The module reads `process.env` once, at import, into its `VALUES`
 * table — because that is the only shape Next can substitute (see the
 * module header). So a test that changes the environment has to reload
 * it, and every one below goes through here.
 */
function load(env: Record<string, string | undefined>) {
  jest.resetModules();
  for (const key of Object.keys(env)) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../lib/publicEnvironment');
}

const BLANK = {
  NEXT_PUBLIC_LEGAL_ENTITY: undefined,
  NEXT_PUBLIC_CONTACT_EMAIL: undefined,
  NEXT_PUBLIC_CONTACT_ADDRESS: undefined,
  NEXT_PUBLIC_VERCEL_ENV: undefined,
  STRICT_PUBLIC_ENV: undefined,
};

const SET = {
  ...BLANK,
  NEXT_PUBLIC_VERCEL_ENV: 'production',
  NEXT_PUBLIC_LEGAL_ENTITY: 'Example Holdings, LLC',
  NEXT_PUBLIC_CONTACT_EMAIL: 'hello@example.com',
  NEXT_PUBLIC_CONTACT_ADDRESS: '1 Example Plaza\nLos Angeles, CA 90071',
};

beforeEach(() => { process.env = { ...KEPT }; });
afterEach(() => { process.env = { ...KEPT }; jest.resetModules(); });

describe('the manifest', () => {
  it('classifies the contact variables as required, not optional', () => {
    /** The whole ruling in one assertion: these are not data that may be
     *  absent, they are configuration whose absence is a defect. */
    const { REQUIRED_PUBLIC_KEYS } = load(BLANK);
    for (const key of CONTACT) expect(REQUIRED_PUBLIC_KEYS).toContain(key);
  });

  it('says what breaks, in words a reader can act on', () => {
    /** Mirrors the backend manifest's rule that a classification without
     *  a reason is a guess somebody will re-guess differently. Length is
     *  a proxy for "a sentence" rather than "used by the footer". */
    const { PUBLIC_MANIFEST } = load(BLANK);
    for (const v of PUBLIC_MANIFEST) {
      expect(v.consequence.length).toBeGreaterThan(60);
    }
  });

  it('reads every declared key as a literal, because nothing else works', () => {
    /**
     * THE NEXT.JS TRAP, PINNED.
     *
     * `NEXT_PUBLIC_*` values are substituted textually at build time and
     * ONLY where the source literally says `process.env.NEXT_PUBLIC_X`.
     * A manifest that looked its own keys up dynamically would report
     * every variable missing in every browser while the site rendered
     * fine — a check that fails open, invisibly.
     *
     * So: every key in the manifest must appear as a literal read in this
     * module. A key added to the list and not to `VALUES` fails here
     * rather than in production.
     */
    const { PUBLIC_MANIFEST } = load(BLANK);
    const src = codeOnly(readFileSync(MODULE, 'utf8'));
    for (const v of PUBLIC_MANIFEST) {
      expect(src).toContain(`process.env.${v.key}`);
    }
  });

  it('is the only module that names them (§14.3)', () => {
    /** One DECLARATION, not one screen. A second `process.env.NEXT_PUBLIC_
     *  CONTACT_EMAIL` somewhere would be a second opinion about whether
     *  the value is present — and the one that skips the check. */
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry !== '__tests__' && entry !== 'node_modules') walk(full);
        } else if (/\.tsx?$/.test(entry)) files.push(full);
      }
    };
    walk(SRC);
    const carriers = files.filter((f) => {
      const src = codeOnly(readFileSync(f, 'utf8'));
      return CONTACT.some((k) => src.includes(`process.env.${k}`));
    });
    expect(carriers.map((f) => f.replace(SRC, ''))).toEqual(['/lib/publicEnvironment.ts']);
  });
});

describe('the boot report', () => {
  it('is empty when nothing is missing', () => {
    const { publicEnvReport } = load(SET);
    expect(publicEnvReport()).toBe('');
  });

  it('names every missing required variable', () => {
    const { publicEnvReport } = load(BLANK);
    const text = publicEnvReport();
    for (const key of CONTACT) expect(text).toContain(key);
  });

  it('says the values are frozen at build time', () => {
    /**
     * Not decoration. Setting a `NEXT_PUBLIC_` variable on the running
     * service changes nothing until a rebuild, so the next thing that
     * happens without this line is "I set it and it did not work" —
     * which is how a fixed deploy gets read as a broken instrument.
     */
    expect(load(BLANK).publicEnvReport()).toContain('BUILD-TIME');
  });

  it('separates a missing capability from a missing requirement', () => {
    /** The optional half must not be printed under the required
     *  headline: a report that shouts about everything is read as
     *  shouting about nothing. */
    const { publicEnvReport } = load({ ...SET, NEXT_PUBLIC_VERCEL_ENV: undefined });
    const text = publicEnvReport();
    expect(text).toContain('NEXT_PUBLIC_VERCEL_ENV');
    expect(text).not.toContain('MISSING REQUIRED');
  });
});

describe('strict mode', () => {
  it('is off by default — a refusal today would block the deploy that fixes it', () => {
    const { checkPublicEnv } = load(BLANK);
    expect(() => checkPublicEnv()).not.toThrow();
  });

  it('refuses to boot when it is on and a required variable is missing', () => {
    const { checkPublicEnv } = load({ ...BLANK, STRICT_PUBLIC_ENV: '1' });
    expect(() => checkPublicEnv()).toThrow(/NEXT_PUBLIC_LEGAL_ENTITY/);
  });

  it('is silent when it is on and everything is set', () => {
    const { checkPublicEnv } = load({ ...SET, STRICT_PUBLIC_ENV: '1' });
    expect(checkPublicEnv()).toEqual([]);
  });

  it('is what the server boot hook calls', () => {
    /** The surface the ruling asked for: "surface it the way the boot
     *  check surfaces a missing required variable". `register()` is the
     *  only moment this app has that corresponds to the API's boot. */
    const src = codeOnly(readFileSync(join(SRC, 'instrumentation.ts'), 'utf8'));
    expect(src).toContain('export function register');
    expect(src).toContain('checkPublicEnv()');
  });
});

describe('production is a question about the reader, not NODE_ENV', () => {
  it('treats a Vercel preview as non-production', () => {
    /** A preview build is NODE_ENV=production too, so NODE_ENV alone
     *  would suppress the placeholder on exactly the deploys that exist
     *  to surface it. */
    expect(load({ ...BLANK, NEXT_PUBLIC_VERCEL_ENV: 'preview' }).isProduction()).toBe(false);
    expect(load({ ...BLANK, NEXT_PUBLIC_VERCEL_ENV: 'production' }).isProduction()).toBe(true);
  });
});

describe('the contact block', () => {
  function mount(env: Record<string, string | undefined>) {
    load(env);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Block = require('../components/landing-v2/ContactBlock').default;
    return render(<Block />);
  }

  it('shows the real details when they are configured', () => {
    mount(SET);
    expect(screen.getByText('Example Holdings, LLC')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'hello@example.com' }))
      .toHaveAttribute('href', 'mailto:hello@example.com');
  });

  it('names the missing variables outside production', () => {
    mount({ ...BLANK, NEXT_PUBLIC_VERCEL_ENV: 'preview' });
    for (const key of CONTACT) expect(screen.getByText(key)).toBeInTheDocument();
  });

  it('invents nothing — no placeholder entity, ever', () => {
    /**
     * The half of HOME2 that was NOT overturned. A guessed legal entity
     * is worse than an absent one: an absent one is obviously missing
     * and a wrong one looks answered. The placeholder names VARIABLES.
     */
    const { container } = mount({ ...BLANK, NEXT_PUBLIC_VERCEL_ENV: 'preview' });
    expect(container.textContent).not.toMatch(/\b(Inc\.?|LLC|Corp\.?)\b/);
    expect(container.textContent).not.toMatch(/@[a-z0-9-]+\.(com|io|net)/i);
  });

  it('does not show the developer placeholder to a visitor in production', () => {
    /** The other half of the ruling. A box reading MISSING CONTACT
     *  DETAILS tells a stranger the deploy is broken and still gives
     *  them no address; the loud channel there is the deploy log. */
    const { container } = mount({ ...BLANK, NEXT_PUBLIC_VERCEL_ENV: 'production' });
    expect(screen.queryByTestId('contact-block-missing')).toBeNull();
    expect(container.textContent || '').not.toMatch(/NEXT_PUBLIC_/);
  });

  it('still renders what it does have in production', () => {
    /** Partial configuration is not the failure case: an email with no
     *  mailing address is reachable, and reachable was the point. */
    mount({ ...BLANK, NEXT_PUBLIC_VERCEL_ENV: 'production',
      NEXT_PUBLIC_CONTACT_EMAIL: 'hello@example.com' });
    expect(screen.getByTestId('contact-block')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'hello@example.com' })).toBeInTheDocument();
  });
});
