/**
 * The builder's address search can load Places from its own render path.
 *
 * ═══ THE REGRESSION ═══
 *
 * HOME2 (#223) removed the Google Maps `<Script>` from `layout.tsx`,
 * stating it was "REDUNDANT, not merely misplaced: `useGoogleMaps`
 * creates its own tag". True of the hook, false of the route —
 * **nothing called the hook.** It was defined and imported nowhere, and
 * the builder's only loader was the tag being deleted.
 *
 * Property autofill died in production. `window.google` never appeared,
 * `isGoogleLoaded` stayed false, the debounce effect returned at
 * `if (!isGoogleLoaded) return`, and the officer typed into a field that
 * ignored her. No error, because a bail is not a failure.
 *
 * ═══ WHY THIS PINS A RENDER AND NOT A FILE ═══
 *
 * The obvious pin — "layout.tsx contains a maps script tag" — would have
 * caught this exact deletion and nothing else. It asserts a TAG, and the
 * property is that THE SEARCH FIELD CAN LOAD ITS OWN DEPENDENCY. Moving
 * the loader into a provider, or onto the page, or into a different hook
 * should all pass; removing it from everywhere the section can reach
 * must fail (§14.1.1).
 *
 * So this mounts the component and watches the document. A loader
 * reachable from the section's render path appends a script; one that
 * is not, does not.
 */
import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';

import { codeOnly } from '../test-support/sourceText';
import { useGoogleMaps } from '../components/hooks/useGoogleMaps';

const SRC = join(__dirname, '..');
const SECTION = join(SRC, 'components', 'builder', 'sections', 'PropertySection.tsx');
const read = (p: string) => codeOnly(readFileSync(p, 'utf8'));

const MAPS = 'maps.googleapis.com/maps/api/js';
const scripts = () => Array.from(document.querySelectorAll('script'))
  .filter((s) => (s.src || '').includes(MAPS));

/** The hook is the unit under test here; mounting it is enough. */
function Harness({ onState }: { onState?: (s: ReturnType<typeof useGoogleMaps>) => void }) {
  const places = useGoogleMaps();
  onState?.(places);
  return <div data-testid="status">{places.status}{places.reason ? ` — ${places.reason}` : ''}</div>;
}

const KEPT = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

beforeEach(() => {
  document.head.innerHTML = '';
  delete (window as any).google;
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY = 'test-key';
});
afterEach(() => {
  document.head.innerHTML = '';
  delete (window as any).google;
  if (KEPT === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  else process.env.NEXT_PUBLIC_GOOGLE_API_KEY = KEPT;
  jest.clearAllMocks();
});

describe('the loader is reachable from the search field', () => {
  it('MOUNTING THE SECTION ITSELF loads a Places script', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR, and it mounts the real component
     * rather than the hook — mounting the hook would prove only that
     * the hook works, which was never in doubt. What failed in
     * production is that the SECTION did not call it.
     *
     * Nothing here says which file holds the loader. Move it to a
     * provider, a page, or a different hook and this still passes;
     * remove it from everywhere the section can reach and it fails,
     * which is the regression HOME2 shipped (§14.1.1).
     */
    expect(scripts()).toHaveLength(0);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PropertySection } = require('../components/builder/sections/PropertySection');
    render(<PropertySection value={null} onChange={() => {}} onComplete={() => {}} />);
    expect(scripts()).toHaveLength(1);
    expect(scripts()[0].src).toContain('libraries=places');
  });

  it('and the hook alone loads one too', () => {
    render(<Harness />);
    expect(scripts()).toHaveLength(1);
  });

  it('the section calls the loader rather than waiting for someone else to', () => {
    /**
     * The companion to the render check, and the one that names the
     * defect: this section used to POLL for a global that a file three
     * directories away was responsible for creating.
     */
    const src = read(SECTION);
    expect(src).toContain('useGoogleMaps');
    // And the poll is gone — a second check at a fixed delay is a race
    // the deleted tag happened to win.
    expect(src).not.toMatch(/setTimeout\(\s*checkGoogle/);
  });

  it('adopts a script already in the document instead of adding a second', () => {
    /** Two components may want Places on one page. A duplicate script
     *  for the same API is how you get a silent no-op. */
    const existing = document.createElement('script');
    existing.src = `https://${MAPS}?key=other&libraries=places`;
    document.head.appendChild(existing);
    render(<Harness />);
    expect(scripts()).toHaveLength(1);
  });
});

describe('resolving, not polling', () => {
  it('becomes ready when the script fires load', async () => {
    let seen: string[] = [];
    render(<Harness onState={(s) => { seen.push(s.status); }} />);
    expect(screen.getByTestId('status')).toHaveTextContent('loading');

    (window as any).google = {
      maps: { places: {
        AutocompleteService: function () {},
        PlacesService: function () {},
      } },
    };
    scripts()[0].dispatchEvent(new Event('load'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
  });

  it('a LATE script still resolves — the old check missed it forever', async () => {
    /**
     * `PropertySection` looked at mount and once at 1s. A script that
     * arrived at 1.2s was never seen, and the officer's field was dead
     * for the rest of the session. The load event has no deadline.
     */
    jest.useFakeTimers();
    try {
      render(<Harness />);
      jest.advanceTimersByTime(5000);
      (window as any).google = {
        maps: { places: {
          AutocompleteService: function () {},
          PlacesService: function () {},
        } },
      };
      scripts()[0].dispatchEvent(new Event('load'));
      jest.useRealTimers();
      await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('when it cannot load, it says so', () => {
  it('names the failure rather than leaving a dead field', async () => {
    render(<Harness />);
    scripts()[0].dispatchEvent(new Event('error'));
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent(/unavailable/);
      expect(screen.getByTestId('status')).toHaveTextContent(/manually/i);
    });
  });

  it('says something different when the deployment has no key', async () => {
    /** A missing key is a DEPLOY fact and the one failure the officer
     *  can do nothing about — which is a reason to name it, not to hide
     *  it. */
    delete process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent(/not configured/i));
    expect(scripts()).toHaveLength(0);
  });

  it('reports a script that loads without the library', async () => {
    /** A wrong `libraries=` or a key rejected after load. Left alone,
     *  this is a permanent "loading" — the silent state again. */
    render(<Harness />);
    scripts()[0].dispatchEvent(new Event('load'));   // no window.google
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent(/unavailable/));
  });
});

describe('the copy never promises what it cannot do', () => {
  it('the confident sentence is not the one shown when lookup is dead', () => {
    /**
     * THE §4 DEFECT, PINNED. The old fallback appeared ONLY when Places
     * had not loaded and read: "Start typing an address and we'll pull
     * the APN, owner, and legal description automatically." The most
     * confident sentence on the screen, shown exclusively in the state
     * where none of it was true.
     */
    const src = read(SECTION);
    const promise = /we'll pull the APN, owner, and legal description automatically/;
    const match = src.match(promise);
    if (match) {
      // If the sentence returns, it must not be the not-loaded branch.
      const window = src.slice(Math.max(0, (match.index ?? 0) - 400), match.index);
      expect(window).not.toMatch(/isGoogleLoaded\s*$/);
    }
    expect(src).toContain('places.status === "unavailable"');
  });
});
