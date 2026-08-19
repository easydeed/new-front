/**
 * The public environment this site needs, declared — and checked at boot.
 *
 * ═══ WHY THIS EXISTS, IN THE OWNER'S WORDS ═══
 *
 * HOME2 shipped a footer contact block that rendered NOTHING when its
 * three variables were unset, on the reasoning that "absence is neutral".
 * The ruling that followed:
 *
 *   "'Absence is neutral' is right for DATA — an unmeasured value, an
 *   empty list, a county nobody set. A missing contact address isn't
 *   absent data, it's a BROKEN DEPLOY, and the page is about to be
 *   forwarded by a title rep whose escrows will look for a way to reach
 *   you. This is ALLOWED_ORIGINS in a footer."
 *
 * That is the distinction this module is built on. `SetupChecklist` shows
 * a grey "Not set" because not-set is a real state an officer can be in.
 * There is no state of the world in which DeedPro has no legal name.
 *
 * ═══ THE SHAPE IS DELIBERATELY THE BACKEND'S ═══
 *
 * `backend/services/environment.py` already solved this problem for the
 * API: a manifest with a REQUIRED/OPTIONAL classification, a consequence
 * sentence per entry written in the words a reader needs, an unmissable
 * block at boot, and `STRICT_ENV=1` to turn the warning into a refusal.
 * This is the same instrument for the site, on purpose — a second design
 * for the same problem is a second thing to learn.
 *
 * ═══ ONE ASYMMETRY, AND IT RUNS THE OTHER WAY ═══
 *
 * The backend defaults to warn-not-refuse for a stated reason: a process
 * that will not start on an unverified condition turns a wrong redirect
 * into a total outage — "the refusal is then the incident".
 *
 * **That reasoning does not transfer, and the difference is worth
 * naming.** A frontend build or server boot that refuses does not take
 * the site down; the previously deployed build keeps serving. Strict is
 * therefore CHEAPER here than it is in the API, and the case for making
 * it the default is stronger.
 *
 * It is still off today, for a different and smaller reason: **the values
 * do not exist yet.** The owner supplies the entity name. Turning strict
 * on before it is supplied would block every deploy, starting with the
 * one that carries this file. It flips in the ticket that sets the three
 * variables — one line in the deploy config — and that ticket is the one
 * that has verified them, exactly as `STRICT_ENV` was sequenced.
 *
 * ═══ THE NEXT.JS TRAP THAT FORCES THE `VALUES` TABLE BELOW ═══
 *
 * `NEXT_PUBLIC_*` variables are not read at runtime in the browser. They
 * are TEXTUALLY SUBSTITUTED at build time, and only where the source
 * literally says `process.env.NEXT_PUBLIC_THING`. A dynamic lookup —
 * `process.env[v.key]` — is substituted by nothing and evaluates to
 * `undefined` in every browser, forever, silently.
 *
 * A manifest that iterated its own keys to read them would therefore
 * report EVERY variable missing while the footer rendered fine. So the
 * literal reads live once, in `VALUES`, and `publicEnvValue()` is the
 * only accessor. `publicEnvironment.test.ts` pins both halves: that every
 * manifest key appears in `VALUES`, and that no other module reads these
 * names directly (§14.3 — one declaration, not one screen).
 *
 * Because the substitution happens at BUILD time, the boot report
 * describes the build that produced this bundle, not the environment the
 * server happens to be holding now. That is the correct thing to report:
 * the baked value is what the visitor gets.
 */

export const REQUIRED = 'required';
export const OPTIONAL = 'optional';

export type EnvLevel = typeof REQUIRED | typeof OPTIONAL;

export interface PublicEnvVar {
  key: string;
  level: EnvLevel;
  /** What goes wrong when it is missing, in a reader's words. */
  consequence: string;
}

/**
 * The literal reads. THE ONLY PLACE IN THE APP THAT NAMES THESE.
 *
 * See the trap above: each line has to be a literal member access or the
 * bundler cannot substitute it.
 */
const VALUES: Record<string, string | undefined> = {
  NEXT_PUBLIC_LEGAL_ENTITY: process.env.NEXT_PUBLIC_LEGAL_ENTITY,
  NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  NEXT_PUBLIC_CONTACT_ADDRESS: process.env.NEXT_PUBLIC_CONTACT_ADDRESS,
  NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
};

/**
 * REQUIRED means: absent, the page tells a visitor something WRONG —
 * including by omission, when the omission is indistinguishable from "no
 * such company". OPTIONAL means: absent, a capability is off and
 * everything else is unaffected.
 */
export const PUBLIC_MANIFEST: ReadonlyArray<PublicEnvVar> = [
  {
    key: 'NEXT_PUBLIC_LEGAL_ENTITY',
    level: REQUIRED,
    consequence:
      'The site names no legal entity. Every other surface — the deed '
      + 'footer, the terms, the invoice — is issued by a company, and the '
      + 'public page that is forwarded to escrows would be the one place '
      + 'that names nobody. Also the copyright line, which falls back to '
      + '"DeedPro" and so LOOKS correct while asserting a brand rather '
      + 'than an entity.',
  },
  {
    key: 'NEXT_PUBLIC_CONTACT_EMAIL',
    level: REQUIRED,
    consequence:
      'THE REASON THIS MODULE EXISTS. A title rep forwards this page to '
      + 'escrow officers who need a way to reach us, and there is none. '
      + 'The failure is invisible from the inside: the page renders, '
      + 'nothing errors, and the loss is a message nobody sent.',
  },
  {
    key: 'NEXT_PUBLIC_CONTACT_ADDRESS',
    level: REQUIRED,
    consequence:
      'No mailing address. Owner-classified REQUIRED against the '
      + 'narrower reading that a footer with a name and an email degrades '
      + 'honestly: this product prepares instruments that carry a '
      + 'RECORDING REQUESTED BY address, and a preparer with no findable '
      + 'address of its own reads as a shell to the exact audience being '
      + 'asked to trust it.',
  },
  {
    key: 'NEXT_PUBLIC_VERCEL_ENV',
    level: OPTIONAL,
    consequence:
      'Exposed automatically by Vercel ("production" | "preview" | '
      + '"development"). Absent, `isProduction()` falls back to '
      + 'NODE_ENV, so a PREVIEW build reads as production and hides the '
      + 'placeholder that a preview exists to show. Nothing a visitor '
      + 'sees on production changes, which is why it is OPTIONAL — the '
      + 'cost of its absence is a check that is quieter than intended.',
  },
];

export const REQUIRED_PUBLIC_KEYS = PUBLIC_MANIFEST
  .filter((v) => v.level === REQUIRED).map((v) => v.key);

/** The build-time value of a declared variable, trimmed, or undefined. */
export function publicEnvValue(key: string): string | undefined {
  return (VALUES[key] || '').trim() || undefined;
}

/**
 * Production means "a stranger is reading this", not "NODE_ENV says so".
 *
 * A Vercel preview build is NODE_ENV=production too, so NODE_ENV alone
 * would suppress the placeholder on exactly the deploys built to catch
 * this. `NEXT_PUBLIC_VERCEL_ENV` distinguishes them; NODE_ENV is the
 * fallback for `next start` on a box that is not Vercel.
 */
export function isProduction(): boolean {
  const vercel = publicEnvValue('NEXT_PUBLIC_VERCEL_ENV');
  if (vercel) return vercel === 'production';
  return process.env.NODE_ENV === 'production';
}

export function missingPublicEnv(level: EnvLevel = REQUIRED): PublicEnvVar[] {
  return PUBLIC_MANIFEST.filter((v) => v.level === level && !publicEnvValue(v.key));
}

/** `STRICT_PUBLIC_ENV=1` turns the boot report into a refusal to start. */
export function strictPublicEnv(): boolean {
  return ['1', 'true', 'True'].includes((process.env.STRICT_PUBLIC_ENV || '').trim());
}

/**
 * The block printed at boot. Empty string when nothing is missing.
 *
 * Written to be unmissable in a deploy log, for the same reason the
 * backend's is: a one-line warning among startup chatter is a warning
 * nobody reads, and this instrument exists because the last failure was
 * silent.
 */
export function publicEnvReport(): string {
  const goneRequired = missingPublicEnv(REQUIRED);
  const goneOptional = missingPublicEnv(OPTIONAL);
  if (!goneRequired.length && !goneOptional.length) return '';

  const lines: string[] = ['', '='.repeat(72)];
  if (goneRequired.length) {
    lines.push('!! MISSING REQUIRED PUBLIC ENVIRONMENT — the site will tell '
      + 'visitors something WRONG, not merely less');
    lines.push('='.repeat(72));
    for (const v of goneRequired) {
      lines.push(`  ${v.key}`);
      lines.push(`      ${v.consequence}`);
    }
    lines.push('');
    lines.push('  These are BUILD-TIME values. Setting them on the running '
      + 'service is not enough —');
    lines.push('  the site has to be rebuilt for a visitor to see them.');
  }
  if (goneOptional.length) {
    lines.push('-'.repeat(72));
    lines.push('Optional variables absent — a capability is off, nothing is wrong:');
    for (const v of goneOptional) lines.push(`  ${v.key} — ${v.consequence}`);
  }
  lines.push('='.repeat(72));
  lines.push('');
  return lines.join('\n');
}

export class PublicEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublicEnvironmentError';
  }
}

/**
 * Print the report; refuse to boot under `STRICT_PUBLIC_ENV`.
 *
 * Returns the missing REQUIRED variables so a caller can decide for
 * itself, which is how the backend's `check()` behaves and how the
 * contact block asks its question.
 */
export function checkPublicEnv(): PublicEnvVar[] {
  const text = publicEnvReport();
  if (text) {
    // eslint-disable-next-line no-console
    console.error(text);
  }
  const gone = missingPublicEnv(REQUIRED);
  if (gone.length && strictPublicEnv()) {
    throw new PublicEnvironmentError(
      'STRICT_PUBLIC_ENV is set and these required variables are missing: '
      + gone.map((v) => v.key).join(', '),
    );
  }
  return gone;
}
