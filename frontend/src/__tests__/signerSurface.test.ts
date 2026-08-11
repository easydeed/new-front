/**
 * NOTARY2 — the design constraints on the last major surfaces.
 *
 * The backend pins WHAT reaches each party (allowlists, key-set
 * equality). These pin HOW it reads, because the signer page is the only
 * screen a non-professional will ever see and it represents the officer
 * to her own client. A leak is a bug; the wrong register is a different
 * kind of failure and it has no test unless somebody writes one.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const flat = (s: string) => s.replace(/\s+/g, ' ');

const TOKEN_PAGE = read('app', 'signing', '[token]', 'page.tsx');
const CREATE = read('features', 'signing', 'RequestSigningModal.tsx');
const AGENDA = read('app', 'signings', 'page.tsx');
/** FLOW1 item 7: the one place a wall-clock time gets its offset. */
const HELPER = read('lib', 'wallClock.ts');

describe('the signer page speaks to a person, not to the industry', () => {
  it('uses no jargon a buyer would have to look up', () => {
    // The PROPERTY: words that belong to the trade. A consumer reading
    // "notarial execution" about their own house learns nothing and
    // trusts us less.
    const code = codeOnly(TOKEN_PAGE).toLowerCase();
    for (const jargon of ['notarial execution', 'notarial act', 'grantor', 'grantee',
                          'vesting', 'apn', 'legal description', 'instrument',
                          'conveyance', 'execute the deed']) {
      expect(code).not.toContain(jargon);
    }
  });

  it('leads with the officer, not with us', () => {
    // She is who this person trusts. A product that puts its own name
    // above hers is borrowing her relationship with her own client.
    const header = TOKEN_PAGE.slice(TOKEN_PAGE.indexOf('function SignerView'));
    const officerAt = header.indexOf('A message from');
    const brandAt = header.indexOf('DeedPro');
    expect(officerAt).toBeGreaterThan(-1);
    expect(brandAt === -1 || officerAt < brandAt).toBe(true);
  });

  it('names DeedPro once, quietly, in the footer', () => {
    expect(flat(TOKEN_PAGE)).toContain('Scheduling by DeedPro');
    expect((TOKEN_PAGE.match(/DeedPro/g) || []).length).toBe(1);
  });

  it('is mobile-first: one column, full-width taps, no table', () => {
    expect(TOKEN_PAGE).toContain('max-w-lg mx-auto');
    expect(TOKEN_PAGE).toContain('w-full flex items-center justify-between');
    expect(codeOnly(TOKEN_PAGE)).not.toContain('<table');
  });

  it('sends the signer back to the officer for anything else', () => {
    expect(flat(TOKEN_PAGE)).toContain('Questions about the paperwork? Ask {who}');
  });
});

describe('no surface composes its own account of a scheduling state', () => {
  // §13 rule 3. `summary` is the server's sentence; these render it.
  for (const [name, src] of [['token page', TOKEN_PAGE], ['agenda', AGENDA]] as const) {
    it(`${name} renders the server's summary verbatim`, () => {
      expect(src).toContain('summary}');
      const code = codeOnly(src);
      expect(code).not.toMatch(/scheduled for/i);
      expect(code).not.toMatch(/will (happen|take place|be signed)/i);
    });
  }

  it('no surface formats a date itself', () => {
    // Every time shown is the server's label, rendered in the REQUEST's
    // timezone. A second formatter is a second chance to print the wrong
    // hour, and the wrong hour is somebody at an empty office.
    for (const src of [TOKEN_PAGE, AGENDA]) {
      const code = codeOnly(src);
      expect(code).not.toContain('toLocaleTimeString');
      expect(code).not.toContain('toLocaleDateString');
    }
  });

  it('times sent to the server carry their offset', () => {
    // #149's parse_window REFUSES a naive time rather than guessing.
    //
    // FLOW1 item 7 moved the stamping into `lib/wallClock.ts`, because
    // the officer's dispatch form needed it too and the first instinct
    // was to copy the eight lines — which is how `phoneSearchKey` came
    // to be wrong in one language and right in the other. So the pin
    // asks the question in two parts now: the helper does the stamping,
    // and every surface that sends a time calls it.
    expect(HELPER).toContain('getTimezoneOffset');
    expect(TOKEN_PAGE).toContain('withOffset(start)');
    expect(TOKEN_PAGE).toContain('withOffset(r.start)');
    expect(CREATE).toContain('withOffset(start)');
    // And nobody keeps a private copy.
    for (const src of [TOKEN_PAGE, CREATE]) {
      expect(codeOnly(src)).not.toContain('getTimezoneOffset');
      expect(src).toContain("from '@/lib/wallClock'");
    }
  });
});

describe('the officer create flow asks the right questions', () => {
  it('picks the notary from her rolodex', () => {
    expect(CREATE).toContain('PartnerRecipientPicker');
    expect(CREATE).toContain('suggestCategory="notary"');
  });

  it('never asks her to guess at the notary\'s availability', () => {
    // ═══ THIS PIN'S PREMISE WAS PARTLY OVERTURNED — READ BEFORE
    //     TRUSTING IT ═══
    //
    // It used to assert `datetime-local` was ABSENT from the create
    // form. The reasoning was §13.1's: NOTARY1 made the officer propose
    // three windows because the notary had no way to speak, and once the
    // notary could speak, asking the officer anyway was asking her to do
    // the work the reversal removed.
    //
    // FLOW1 item 7 (DISPATCH) reverses HALF of that, on owner research
    // into escrow practice: the officer schedules with her signers
    // directly, usually by phone, and dispatches a notary for that time.
    // She is not guessing at anybody's availability — she is stating an
    // arrangement she has already made.
    //
    // So the property is NOT "she never sees a time field". It is:
    //
    //   SHE IS NEVER ASKED TO PROPOSE A SET OF CANDIDATE TIMES ON
    //   SOMEBODY ELSE'S BEHALF.
    //
    // ONE time she has arranged is a fact. THREE windows she hopes suit
    // a notary she has not asked is the guesswork §13.1 removed, and it
    // stays removed: `proposed_windows` — NOTARY1's plural field — is
    // still forbidden, and there is no way to add a second time.
    const code = codeOnly(CREATE);
    expect(code).not.toContain('proposed_windows');
    expect(code).not.toContain('MAX_WINDOWS');
    // Exactly one start and one end. A repeater here would be NOTARY1
    // arriving by a different door.
    expect((code.match(/datetime-local/g) || [])).toHaveLength(2);
  });

  it('offers dispatch first and availability second, both reachable', () => {
    const text = flat(CREATE);
    expect(text).toContain('I have a time');
    expect(text).toContain('Ask for availability');
    // Dispatch is the DEFAULT — she reaches the ordinary case by doing
    // nothing — and the fallback is one press away, never removed.
    expect(codeOnly(CREATE)).toContain("useState<'dispatch' | 'availability'>('dispatch')");
  });

  it('asks for the signers agreement in words, and records it as hers', () => {
    // Ticking the box writes an answer on the signers' behalf. That is a
    // question with words, not a silent consequence of typing a time —
    // and the copy says whose word it is.
    const text = flat(CREATE);
    expect(text).toContain('I have already agreed this time with the signers');
    expect(text).toContain('Recorded as your word, not theirs');
    expect(codeOnly(CREATE)).toContain('signers_already_agreed');
  });

  it('promises nothing is booked until the notary accepts', () => {
    // §13 at the moment it is most tempting to break: she has a time,
    // her signers have agreed, and the arrangement is still incomplete
    // because the person who has to show up has not answered.
    expect(flat(CREATE)).toContain('Nothing is booked until the notary accepts');
  });

  it('defaults the location and the timezone rather than leaving blanks', () => {
    expect(CREATE).toContain('propertyAddress || ');
    expect(CREATE).toContain("id: 'America/Los_Angeles'");
  });

  it('tells her what happens to her signers details', () => {
    // She is about to type somebody else's client's email into a product
    // they have never heard of. §13.1's promise, in her words.
    const text = flat(CREATE);
    expect(text).toContain('kept on this request only');
    expect(text).toContain('deleted automatically');
  });

  it('seeds signer rows from names only', () => {
    expect(CREATE).toContain('suggestedSigners');
    expect(codeOnly(CREATE)).not.toMatch(/suggested\w*(Email|Phone)/i);
  });
});

describe('the agenda leads with what is stuck', () => {
  it('counts and marks requests that have gone quiet', () => {
    expect(AGENDA).toContain('STUCK_AFTER_DAYS');
    expect(AGENDA).toContain('function isStuck');
    expect(flat(AGENDA)).toContain('gone quiet');
  });

  it('says nothing has expired, because nothing has', () => {
    // The stuck marker is a prompt, not a deadline. Saying so keeps it
    // from reading as a state the system imposed.
    expect(flat(AGENDA)).toContain('Nothing has expired');
  });

  it('uses amber for needs-a-human, per BRAND2', () => {
    expect(AGENDA).toContain('bg-amber-50');
    expect(AGENDA).toContain('border-amber-300');
  });

  it('introduces no new palette', () => {
    // BRAND2: brand purple, slate, and the doctrinal amber. A fifth
    // colour on a new screen is how a design system stops being one.
    const colours = new Set(
      (codeOnly(AGENDA).match(/\b(?:bg|text|border)-([a-z]+)-\d{2,3}\b/g) || [])
        .map((c) => c.split('-')[1]),
    );
    for (const c of colours) {
      expect(['slate', 'amber', 'red', 'green', 'purple', 'gray']).toContain(c);
    }
  });
});
