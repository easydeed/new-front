/**
 * Doctrine B — the client half of the boundary.
 *
 * RED-H1.3 moved the SYSTEM prompt to the server so a caller could no
 * longer define the assistant's role. It did not move the USER MESSAGE,
 * which is still composed in `services/aiAssistant.ts` — and a user
 * message that asks for a recommendation gets one, whatever the system
 * prompt says. Two instructions arguing is not enforcement.
 *
 * Two things are pinned here, and the second is the one that bites:
 *
 *   1. No prompt in this file asks which instrument to use.
 *   2. No display gate is keyed on recommendation language.
 *
 * (2) is the sharper defect. `suggestDeedType` used to end with
 *
 *     if (response.includes("recommend") || includes("suggest")
 *         || includes("consider")) { show it } else { return null }
 *
 * — the UI surfaced the answer ONLY when it contained recommendation
 * language and silently dropped every compliant explanation. Shipped
 * alongside a prompt rewrite that makes the model explain instead of
 * recommend, that filter would have discarded every answer and the
 * feature would have looked broken while behaving correctly.
 *
 * A display gate keyed on the forbidden word does not enforce the
 * boundary. It inverts it.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { codeOnly } from '../test-support/sourceText';

const FILE = path.join(__dirname, '..', 'services', 'aiAssistant.ts');
const RAW = fs.readFileSync(FILE, 'utf8');
const SRC = codeOnly(RAW);

/** Prompt template literals — what actually reaches the model as `message`. */
function promptBodies(): string[] {
  return [...SRC.matchAll(/const prompt = `([\s\S]*?)`/g)].map((m) => m[1]);
}

describe('no client prompt asks the model to choose an instrument', () => {
  it('finds the prompts at all (a pin that matched nothing would pass)', () => {
    expect(promptBodies().length).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['what would you recommend', /what would you recommend/i],
    ['the best choice', /\bthe best (?:choice|option|deed|one)\b/i],
    ['which should', /\bwhich (?:should|do you|would you)\b/i],
    ['what should I use', /\bwhat should (?:i|we) use\b/i],
  ])('no prompt solicits %s', (_label, pattern) => {
    for (const body of promptBodies()) {
      expect(body).not.toMatch(pattern);
    }
  });

  it('the deed-type prompt asks for the DIFFERENCE and disclaims the choice', () => {
    const body = promptBodies().find((p) => p.includes('deed types'));
    expect(body).toBeDefined();
    expect(body!).toMatch(/differs from|how .* differ/i);
    expect(body!).toMatch(/choice is theirs/i);
    expect(body!).toMatch(/do not tell the user which to use/i);
  });
});

describe('no display gate is keyed on recommendation language', () => {
  it('the recommend/suggest/consider filter is gone', () => {
    // The exact shape of the old gate: a response-content test on the
    // words the boundary forbids, deciding whether the officer sees
    // anything at all.
    expect(SRC).not.toMatch(/response[^\n]*\.includes\(\s*["']recommend["']/i);
    expect(SRC).not.toMatch(/response[^\n]*\.includes\(\s*["']suggest["']/i);
  });

  it('the explanation is returned unfiltered, not gated on its wording', () => {
    const fn = SRC.slice(SRC.indexOf('async explainDeedTypeOptions'));
    const body = fn.slice(0, fn.indexOf('\n  async ', 10));
    expect(body).toContain('PROMPT_KEYS.deedTypeAdvisor');
    // The only thing standing between the model's answer and the officer
    // is emptiness — not vocabulary.
    expect(body).toMatch(/if \(!response\.trim\(\)\) return null/);
    expect(body).not.toMatch(/\.includes\(/);
  });

  it('the method is not named for the thing it no longer does', () => {
    // §11 in a function name: a `suggestDeedType` that returns an
    // explanation is a taxonomy drawn by label rather than by content.
    expect(SRC).not.toMatch(/\bsuggestDeedType\b/);
    expect(SRC).toContain('explainDeedTypeOptions');
  });

  it('and it is not presented to the officer as a suggestion', () => {
    expect(SRC).not.toContain('Deed Type Suggestion');
  });
});

describe('the client still holds no system prompts (RED-H1.3, unbroken)', () => {
  it('sends keys, not prompt text', () => {
    expect(SRC).toContain('prompt_key');
    expect(SRC).not.toMatch(/\bsystem:\s/);
  });
});

describe('the boundary is stated where the prompts are written', () => {
  it('the file header cites the doctrine section', () => {
    // The comment is the point here, so this reads RAW rather than the
    // stripped source — the next person composing a prompt in this file
    // needs to meet the rule before they write it.
    expect(RAW).toMatch(/DOCTRINE B/);
    expect(RAW).toMatch(/§12|section 12/i);
    expect(RAW).toMatch(/explain yes, select no/i);
  });
});
