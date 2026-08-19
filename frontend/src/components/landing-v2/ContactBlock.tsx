/**
 * The footer contact block — and what it does when it has nothing.
 *
 * ═══ THE RULING THIS REPLACES ═══
 *
 * HOME2 shipped this as three inline `process.env &&` guards that
 * rendered nothing when unset, and flagged the choice. The owner
 * overturned it:
 *
 *   "'Absence is neutral' governs DATA — an unmeasured value, an empty
 *   list, an unset county — but a missing contact address is a broken
 *   deploy, not absent data, and this page is about to be forwarded by a
 *   title rep whose escrows will look for a way to reach us. Visible
 *   placeholder outside production; in production, surface it the way the
 *   boot check surfaces a missing required variable."
 *
 * ═══ WHY TWO DIFFERENT BEHAVIOURS, AND NOT ONE LOUD ONE ═══
 *
 * The two audiences are different people and only one of them can fix
 * anything. Outside production the reader is us, so the gap is rendered
 * where the work happens — naming the exact variables, so the fix is the
 * next thing you do rather than something you go and look up.
 *
 * In production the reader is a stranger, and a box reading MISSING
 * CONTACT DETAILS tells them the deploy is broken while still not giving
 * them an address. So the loud channel there is the deploy log
 * (`instrumentation.ts`), and `STRICT_PUBLIC_ENV=1` escalates it to a
 * refusal to start. **Nothing about that is a quiet fallback:** the
 * variables are declared REQUIRED in `lib/publicEnvironment.ts` with a
 * consequence sentence apiece, and the boot report names them.
 *
 * WHAT REMAINS EXPOSED, SAID PLAINLY: in production with strict off and
 * nobody reading the deploy log, a visitor still sees a footer with no
 * contact. That is the residual the strict flag closes, and it closes
 * on the day the owner supplies the entity name — one flag, already
 * built, deliberately not defaulted on while the values are missing.
 *
 * ═══ WHY IT STILL INVENTS NOTHING ═══
 *
 * Unchanged from HOME2, and it was never the part in dispute: a guessed
 * legal entity is worse than an absent one, because an absent one is
 * obviously missing and a wrong one looks answered. The placeholder names
 * VARIABLES, never a plausible-looking company.
 */
'use client';

import { isProduction, missingPublicEnv, publicEnvValue } from '@/lib/publicEnvironment';

const ENTITY = 'NEXT_PUBLIC_LEGAL_ENTITY';
const EMAIL = 'NEXT_PUBLIC_CONTACT_EMAIL';
const ADDRESS = 'NEXT_PUBLIC_CONTACT_ADDRESS';

export default function ContactBlock() {
  const entity = publicEnvValue(ENTITY);
  const email = publicEnvValue(EMAIL);
  const address = publicEnvValue(ADDRESS);
  const gone = missingPublicEnv();

  if (gone.length && !isProduction()) {
    return (
      <div data-testid="contact-block-missing"
           className="mt-12 pt-8 border-t border-red-500/40 text-sm">
        <h3 className="font-bold text-red-400 mb-3">
          Contact details are not configured
        </h3>
        <p className="mb-2 max-w-prose text-gray-300">
          This block is empty on this build because the variables below are
          unset. In production it is empty in the same way, silently, to a
          reader who came here looking for a way to reach us.
        </p>
        <ul className="space-y-1 font-mono text-[12.5px] text-red-300">
          {gone.map((v) => <li key={v.key}>{v.key}</li>)}
        </ul>
      </div>
    );
  }

  // Production with something missing: the deploy log is the surface, and
  // an incomplete-but-honest block still beats none — an email with no
  // mailing address is reachable.
  if (!entity && !email && !address) return null;

  return (
    <div data-testid="contact-block" className="mt-12 pt-8 border-t border-gray-800 text-sm">
      <h3 className="font-bold text-white mb-3">Contact</h3>
      {entity && <div className="mb-1">{entity}</div>}
      {address && <div className="mb-1 whitespace-pre-line">{address}</div>}
      {email && (
        <a href={`mailto:${email}`} className="hover:text-[#7C4DFF] transition-colors">
          {email}
        </a>
      )}
    </div>
  );
}
