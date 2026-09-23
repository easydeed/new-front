/**
 * TRY Stage 3 — `/try`, pinned.
 *
 * The page's entire argument is that nothing on it is faked, which makes
 * its own copy the thing most worth guarding: every pin here closes a
 * way the demo could claim more than it does.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import { API_DEED_TYPES } from '../lib/apiDocs';

const PAGE = path.join(__dirname, '..', 'app', 'try', 'page.tsx');
const RAW = fs.readFileSync(PAGE, 'utf8');
const CODE = codeOnly(RAW);

/** What the page SAYS — entities decoded, tags dropped, wrapping
 *  collapsed. Source prose is hard-wrapped and JSX escapes apostrophes,
 *  so a contiguous substring match misses a page that says exactly what
 *  the pin demands (§14.1: the property, not the spelling). */
const SPOKEN = codeOnly(RAW)
  .replace(/<[^>]*>/g, ' ')
  .replace(/&apos;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&mdash;/g, '—')
  .replace(/\s+/g, ' ');

describe('TRY — what "real" is allowed to mean', () => {
  it('the hero says the real API CODE runs, never that a request was sent', () => {
    /**
     * OWNER-RULED, and it is the page's first sentence. The browser
     * posts to `/try/deed`, which runs the real validation, handler,
     * database and render — but NOT the partner route's HTTP auth path.
     * "Sends a real request to the API" would be the one inaccurate
     * claim on a page whose whole argument is that nothing is faked.
     */
    expect(SPOKEN).toContain('runs the real API code against the DeedPro sandbox');
    expect(SPOKEN).not.toContain('sends a real request');
  });

  it('the console labels its payload as what the partner API RECEIVES', () => {
    expect(SPOKEN).toContain('the request the partner API receives');
  });

  it('the page never claims to have sent an Authorization header', () => {
    expect(CODE).not.toContain('Authorization: Bearer');
    expect(CODE).not.toContain('dp_test_');
  });

  it('the browser sends three selectors and holds no key', () => {
    /**
     * `variant` joined the body in TRY-FIX so the tamper act can ask
     * for a SECOND, DIFFERENT draft — the old one repeated the sample
     * exactly, the two hashed the same, and the guard it claimed to
     * demonstrate could never fire.
     *
     * It does not widen what the browser may say. Like `trap_id` it is
     * a key into a server-side table; the payload is still built from
     * constants the page cannot reach.
     */
    expect(CODE).toContain(
      "JSON.stringify({ trap_id: trapId, approver_name: approverName, variant })");
    expect(CODE).toContain('/try/deed');
  });
});

describe('TRY — the traps derive from the catalog', () => {
  it('no instrument slug is typed into the page', () => {
    /**
     * TRY-3, the same move the homepage makes. If an instrument stops
     * fixing its own vesting, the trap stops naming it rather than
     * demonstrating a refusal that no longer happens.
     */
    expect(CODE).toContain("API_DEED_TYPES.find((t) => t.vesting === 'fixed-by-instrument')");

    /* BARE, not quoted. The first version checked `'slug'` and `"slug"`
       only, and a mutation probe walked straight through it: these
       labels are TEMPLATE LITERALS, so a hard-coded slug lands unquoted
       and the pin passed while the derivation was gone. Four probes
       fired and this one did not — §14.29, a gate's coverage is a
       measurement rather than an inference from the fact that it
       exists. */
    for (const t of API_DEED_TYPES) {
      expect(CODE).not.toContain(t.slug);
    }
  });

  it('no expected refusal message is hard-coded', () => {
    /** The page renders whatever the API returns, so a reworded refusal
     *  updates the demo instead of contradicting it.
     *
     *  `fixes its own vesting` used to head this list. That prefix was
     *  removed from the API on 2026-09-23 — it duplicated the catalog
     *  note that followed it — and this pin would have gone on passing
     *  while guarding a phrase that no longer existed anywhere. §14.29:
     *  a gate's coverage is a measurement, not an inference from the
     *  fact that it exists. Replaced with sentences the API still
     *  sends. */
    for (const sentence of ['Vesting is fixed by the instrument',
                            'Remove grantee.vesting',
                            'is required for this deed type',
                            'recites facts about the grantor', 'Field required']) {
      expect(SPOKEN).not.toContain(sentence);
    }
  });

  it('trap 4 carries its doctrine in prose, not a ticket number', () => {
    /** OWNER-RULED. Its refusal string is `Field required` — a framework
     *  string with no doctrine in it — so the doctrine goes in the gloss.
     *
     *  RENAMED 2026-09-23. The gloss used to OPEN with `REQUIRED1:`, an
     *  internal ticket identifier naming nothing a prospect could look
     *  up, and the banned-claims gate missed it because its prefix list
     *  was hand-typed and `REQUIRED` was never added. The doctrine is
     *  the sentence; the label was carrying nothing. */
    expect(SPOKEN).toContain('endpoint that PRINTS is where legal decisions are enforced');
    expect(SPOKEN).not.toContain('REQUIRED1');
    const gloss = CODE.slice(CODE.indexOf('const GLOSS'), CODE.indexOf('type ApiError'));
    const taxGloss = gloss.slice(gloss.indexOf('no_transfer_tax'));
    expect(taxGloss).not.toContain('vesting');
  });
});

describe('TRY — colour is doctrine', () => {
  it('amber appears ONLY on the pending draft', () => {
    /**
     * Amber means unconfirmed external data awaiting a human. Failure is
     * red, absence is grey. A rate limit borrowing amber would say "a
     * person still has to look at this" about a refusal.
     */
    /* Positional rather than sliced: the first `</pre>` in this file is
       in Act 1, BEFORE the draft panel, so slicing between markers gave
       an empty range that any assertion passes. Measure where each
       amber token actually sits instead. */
    const pendingAt = CODE.indexOf('pending_confirmation');
    expect(pendingAt).toBeGreaterThan(-1);

    const ambers: number[] = [];
    const rx = /amber-\d{3}/g;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(CODE)) !== null) ambers.push(m.index);
    expect(ambers.length).toBeGreaterThan(0);

    for (const at of ambers) {
      expect(Math.abs(at - pendingAt)).toBeLessThan(600);
    }
  });

  it('the rate limit is red and the expired draft is grey', () => {
    const failureBlock = CODE.slice(CODE.indexOf('Shared failure surface') >= 0
      ? CODE.indexOf('{failure && (') : 0, CODE.indexOf('id="act-1"'));
    expect(failureBlock).toContain('red-');
    expect(failureBlock).not.toContain('amber-');

    const expired = CODE.slice(CODE.indexOf("phone === 'expired'"));
    expect(expired.slice(0, 400)).toContain('gray-');
    expect(expired.slice(0, 400)).not.toContain('amber-');
  });

  it('every status carries a glyph as well as a colour', () => {
    for (const glyph of ['✓', '◔', '✕', '◷', '↻', '—']) {
      expect(RAW).toContain(glyph);
    }
  });
});

describe('TRY — presenter mode', () => {
  it('keeps the timer', () => {
    /** OWNER-RULED: the hero promises "about ninety seconds", and a
     *  visible clock corroborates that in front of the prospect rather
     *  than exposing machinery. */
    expect(CODE).toContain('mmss(clock)');
    expect(SPOKEN).toContain('Presenter mode');
  });

  it('carries NO script line — stage directions are visible on a shared screen', () => {
    /**
     * THE PIN THIS SECTION EXISTS FOR. The handoff put one "Say:" line
     * per act in the presenter strip. Anyone watching a shared or
     * turned-around screen reads them, and they read as a performance
     * when seen. The lines live outside this repository entirely.
     */
    expect(CODE).not.toContain('Say:');
    for (const line of ['try to break it', 'cannot build in a weekend',
                        'Take your phone out', 'your risk team gets']) {
      expect(RAW).not.toContain(line);
    }
  });

  it('keeps the non-visual affordances', () => {
    expect(CODE).toContain('Reset demo');
    expect(CODE).toContain('presenter || trapsFired.size > 0');
  });
});

describe('TRY — the close counts what actually happened', () => {
  it('no literal trap count appears in the copy', () => {
    /**
     * The handoff's close read "Four traps refused" as a fixed sentence.
     * A visitor who fired one trap and left would be told a story about
     * a session they did not have.
     */
    expect(SPOKEN).not.toContain('Four traps refused');
    expect(CODE).toContain('trapsFired.size');
    expect(CODE).toContain("You have not fired a trap yet");
  });

  it('the confirmation and the tamper are counted only if they happened', () => {
    /* Ends at the useMemo dependency array, which is unambiguous —
       `return (` occurs several times earlier in this file. */
    const start = CODE.indexOf('const closeLine');
    const close = CODE.slice(start, CODE.indexOf('[trapsFired, phone, tamperRefused]', start));
    expect(close).toContain("phone === 'completed'");
    /**
     * `tamperRefused` — which is `409 AND DRAFT_MISMATCH`, not either
     * alone. The close may only report a refusal that the API actually
     * sent; the version this replaces sat beside a panel that printed
     * one whatever came back.
     */
    expect(close).toContain('if (tamperRefused) parts.push(');
    expect(CODE).toContain(
      "const tamperRefused = tamper?.status === 409 && tamper.error?.code === 'DRAFT_MISMATCH'");
  });
});

describe('TRY — the honest limits are on the page', () => {
  it('polling is named as a poll and never as a push', () => {
    expect(SPOKEN).toContain('No webhooks');
    expect(CODE).not.toContain('webhook_url');
  });

  it('the polled endpoint is the one actually called', () => {
    /**
     * The handoff drew `GET /api/v1/deeds/{deed_id}`, which needs an API
     * key this browser deliberately does not have. The page polls the
     * PUBLIC `/confirm/{token}` — the same state the phone changes — and
     * says so, rather than naming a call it cannot make.
     */
    expect(CODE).toContain('`${API()}/confirm/${token}`');
    /* The endpoint, not the cadence. `every 3s` came out on 2026-09-23
       because the browser, not this page, decides how often a hidden
       tab's timer fires — see the poll-honesty block at the foot of
       this file. What this pin guards is that the page names the call
       it actually makes. */
    expect(SPOKEN).toContain('Polling GET /confirm/{token}');
  });

  it('the warming state has a ceiling and never restarts', () => {
    expect(CODE).toContain('WARM_CEILING_SECONDS');
    expect(CODE).toContain('Skip the wait');
    expect(SPOKEN).toContain('This is our infrastructure, not your connection');
  });

  it('a timeout says what it cannot tell you', () => {
    expect(SPOKEN).toContain('We cannot tell whether it reached us');
  });

  it('the footer states sample data and the not-a-law-firm line', () => {
    expect(SPOKEN).toContain('SAMPLE — NOT FOR RECORDING');
    expect(SPOKEN).toContain('DeedPro is software, not a law firm');
  });
});

describe('TRY — the QR, and the rule it does not touch', () => {
  it('renders urls.confirmation, and only that', () => {
    /**
     * TRY-6, built after the refusal was reversed. Act 2's moment is the
     * prospect's own phone, and on a screen-shared call a QR is the only
     * clean path from the presenter's screen to their device — "send
     * yourself the link" serves a solo visitor and breaks a live demo.
     */
    expect(CODE).toContain("encodeQR(confirmationUrl, 'svg')");
    expect(CODE).toContain('@paulmillr/qr');
  });

  it('the standing no-QR rule is untouched — nothing recorded carries one', () => {
    /**
     * THE PIN THAT MATTERS MORE THAN THE FEATURE. Recorded pages and
     * PDFs carry no QR, no verification URL and no document id, by rule.
     * This encoder may therefore appear on exactly one page.
     */
    const appDir = path.join(__dirname, '..', 'app');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name)) {
          const body = fs.readFileSync(full, 'utf8');
          if (body.includes('@paulmillr/qr') && !full.includes(`${path.sep}try${path.sep}`)) {
            offenders.push(path.relative(appDir, full));
          }
        }
      }
    };
    walk(appDir);
    expect(offenders).toEqual([]);
  });

  it('the QR is hidden on phones — it is for a screen somebody else sees', () => {
    /** A QR on the device you are already holding is useless, and the
     *  open-link button is the whole answer there. */
    /* Scoped to the QR ELEMENT, not the card around it. The first
       version sliced the whole card and passed with `hidden` deleted
       from the QR, because the caption beside it carries the same two
       classes — a mutation probe walked straight through. Three probes
       fired and this one did not; §14.29, twice in this file now. */
    const at = CODE.indexOf('dangerouslySetInnerHTML');
    expect(at).toBeGreaterThan(-1);
    const openTag = CODE.lastIndexOf('<div', at);
    const element = CODE.slice(openTag, at);

    /* TOKENS, not substrings. The element carries `aria-hidden`, which
       CONTAINS the string "hidden" — so a substring check passed with
       the class deleted. §14.1 in the pin written to guard the fix for
       the previous §14.29 miss: match the property, never the spelling.
       Parse the class list and look for the class itself. */
    const className = /className="([^"]*)"/.exec(element)?.[1] ?? '';
    const classes = className.split(/\s+/).filter(Boolean);

    expect(classes).toContain('hidden');
    expect(classes).toContain('sm:block');
  });

  it('the open-link button is kept beside it', () => {
    expect(SPOKEN).toContain('Open the confirmation link');
  });
});

describe('TRY — reachable, and reusing rather than forking', () => {
  it('is linked from the homepage platform door and /developers', () => {
    /** A page nothing links to does not exist from where the reader
     *  stands, and a footer link is one an evaluator reaches after they
     *  have already decided. */
    const home = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'page.tsx'), 'utf8');
    const devs = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'developers', 'page.tsx'), 'utf8');
    expect(home.slice(0, home.indexOf('<footer'))).toContain('href="/try"');
    expect(devs).toContain('href="/try"');
  });

  it('reuses ApiInquiryForm instead of forking its honesty logic', () => {
    /** The design asked for dark-styled fields. A second copy would
     *  fork the failure handling that already keeps the input and
     *  promises a conversation rather than a key (§14.3). */
    expect(CODE).toContain('ApiInquiryForm');
    expect(CODE).not.toContain('api-key-inquiries');
  });
});

/**
 * TRY-FIX — Act 3, after a live walkthrough found the page showing a
 * refusal that had not happened.
 *
 * Draft B was the sample repeated verbatim. WeasyPrint renders identical
 * HTML to identical bytes, so draft B hashed exactly as draft A did,
 * `DRAFT_MISMATCH` could not fire, and the approval SUCCEEDED — while
 * this panel displayed a typed `409` and the words "Refused — see
 * below". Every pin here closes one step of that.
 */
describe('TRY — the tamper act reports what came back', () => {
  it('asks for a second draft that actually differs', () => {
    expect(CODE).toContain("callTry(null, 'second_draft')");
  });

  it('reads the status code and displays no typed one', () => {
    /** The two shapes the defect took: a status as a JSX text node, and
     *  a status inside the act rail's string. `CODE` is comment-
     *  stripped, so this bans the literal outright rather than guessing
     *  at its surroundings. */
    expect(CODE).toContain('r.status');
    expect(CODE.match(/\{tamper\.status\}/g)?.length).toBeGreaterThanOrEqual(2);
    expect(CODE).not.toContain('409 —');
    expect(CODE).not.toContain('>409<');
  });

  it('recognises the refusal by its CODE, not by its status alone', () => {
    /** `NOT_PENDING` is also a 409. Matching the status alone reads the
     *  shape of the answer instead of the answer — and what the tester
     *  saw was a 409 with `DRAFT_MISMATCH` nowhere on the page. */
    expect(CODE).toContain(
      "tamper?.status === 409 && tamper.error?.code === 'DRAFT_MISMATCH'");
  });

  it('does not dress a guard that did not fire as a refusal', () => {
    /** Grey, and it says the demonstration failed. The red panel is how
     *  the page came to announce a refusal it never received. */
    expect(SPOKEN).toContain('The guard did not fire. This demonstration failed.');
    const fail = CODE.slice(
      CODE.lastIndexOf('border-gray-300 bg-gray-50',
        CODE.indexOf('The guard did not fire.')),
      CODE.indexOf('The guard did not fire.'));
    expect(fail).not.toContain('red');
  });

  it('the act rail reports the state of the work, not of the accordion', () => {
    /** Act 02 read "Ready" before any draft existed — the act was
     *  unlocked, nothing had been sent. */
    expect(CODE).toContain("'Unlocked — no draft sent yet'");
    expect(CODE).not.toContain("act2Open ? 'Ready'");
  });
});

/**
 * TRY-FIX — the poll, after a walkthrough asked whether the demo was
 * being throttled in a background tab.
 *
 * It almost certainly was: the HTML spec clamps `setInterval` in a
 * hidden document to at least 1s, and Chrome drops to roughly once a
 * minute after five minutes hidden. It could not be MEASURED here —
 * Playwright keeps every page's renderer visible and neither
 * `Emulation.setPageVisibilityOverride` nor `Page.setWebLifecycleState`
 * was available, so `document.hidden` never became true. A first probe
 * that "found no throttling" had in fact timed two foreground tabs.
 */
describe('TRY — the poll claims only what it controls', () => {
  it('does not assert an interval the browser can override', () => {
    /** "every 3s" was false exactly when the prospect had switched away
     *  to use their phone — the moment Act 2 asks them to. */
    expect(SPOKEN).not.toContain('every 3s');
    expect(SPOKEN).toContain('Browsers slow this down in a background tab');
  });

  it('still says a poll is a poll', () => {
    /** The honesty this replaces, not removes: there are no webhooks and
     *  the page has always said so. */
    expect(SPOKEN).toContain('this is a poll, not a push');
    expect(CODE).not.toContain('webhook_url');
  });

  it('asks once on the way back rather than polling harder', () => {
    /** Polling faster cannot beat the throttle — it IS the throttle.
     *  One immediate request when the tab becomes visible matches what
     *  the visitor actually did. */
    expect(CODE).toContain("document.addEventListener('visibilitychange', onVisible)");
    expect(CODE).toContain("document.visibilityState === 'visible'");
    expect(CODE).toContain('POLL_MS');
  });

  it('removes the listener with the interval', () => {
    /** The effect re-runs on `phone`, so a listener left behind would
     *  accumulate one per state change and keep polling a draft that is
     *  no longer pending. */
    const cleanup = CODE.slice(CODE.indexOf('const onVisible'));
    expect(cleanup.slice(0, 900)).toContain(
      "document.removeEventListener('visibilitychange', onVisible)");
    expect(cleanup.slice(0, 900)).toContain('clearInterval(id)');
  });
});
