/**
 * Every control this product ships has a name.
 *
 * ═══ THE DEFECT ═══
 *
 * Past Deeds put a purple Download and a red Delete beside each other on
 * a row of recorded legal documents. Both were icon-only. Both carried a
 * `title` and nothing else — and FLOW1 item 1 already ruled on that,
 * after a notary received a reviewer's email because two adjacent
 * slate-coloured icons were distinguished only by a tooltip:
 *
 *     "A tooltip is not a label. It is invisible until you already
 *      suspect you need it, and absent entirely on touch."
 *
 * Sixteen controls tree-wide had no accessible name at all. Seven were
 * dialog and panel closes — the single most common icon-only control
 * anywhere, and the one a screen-reader user meets constantly.
 *
 * ═══ WHY THIS IS PARSED AND NOT GREPPED ═══
 *
 * Three regex detectors were written before this one, and they gave three
 * different answers — 36, 47, 16 — each wrong for its own reason:
 *
 *   1. `<button[^>]*>` closed the opening tag on the `>` inside
 *      `onClick={() => …}`, so every handler's own source counted as the
 *      button's visible text. Past Deeds' two buttons — the ones the
 *      ticket was about — never appeared in the inventory at all.
 *   2. Stripping `{…}` wholesale to find text nodes erased every label
 *      that lives inside an expression, so buttons reading "Save
 *      Changes" were reported as icon-only.
 *   3. Counting string literals as rendered text made
 *      `className="w-4 h-4 animate-spin"` a label — a string full of
 *      letters that names nothing.
 *
 * All three made the same mistake, and it is this file's own subject
 * matter: **a control's name is not the same as the strings that happen
 * to be near it.** Attribute text is not content.
 *
 * The clinching argument for the compiler API is not that the regexes
 * were wrong — it is that they were wrong by 3× AND DISAGREED. Two
 * unreliable answers that disagree are at least honest about being
 * unreliable; the danger is the day they agree.
 *
 * So: `typescript` parses the TSX, and the question asked of the real
 * syntax tree is the one that matters — does this button carry
 * `aria-label`/`aria-labelledby`, or render something a person can read?
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const SRC = path.join(__dirname, '..');

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'node_modules') tsxFiles(full, out);
    } else if (entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Does this element render something a sighted user can read?
 *
 * Attributes are skipped deliberately — see the header. `className`,
 * `title` and `key` are full of letters and none of them is a name.
 */
function rendersText(node: ts.JsxElement): boolean {
  let found = false;
  const visit = (n: ts.Node): void => {
    if (found) return;
    if (ts.isJsxAttributes(n)) return;
    if (ts.isJsxText(n) && n.text.trim().length > 1) { found = true; return; }
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && /[A-Za-z]{2,}/.test(n.text)) {
      found = true;
      return;
    }
    // `{label}`, `{deed.title}`, `{t('save')}`, `{`Delete ${x}`}` — text
    // this parser cannot read but the user can.
    if (ts.isJsxExpression(n) && n.expression &&
        (ts.isIdentifier(n.expression) || ts.isPropertyAccessExpression(n.expression) ||
         ts.isElementAccessExpression(n.expression) || ts.isCallExpression(n.expression) ||
         ts.isTemplateExpression(n.expression))) {
      found = true;
      return;
    }
    ts.forEachChild(n, visit);
  };
  node.children.forEach(visit);
  return found;
}

function attributeNames(open: ts.JsxOpeningLikeElement): string[] {
  return open.attributes.properties.map((a) => (a.name && 'getText' in a.name ? a.name.getText() : ''));
}

interface Unnamed { file: string; line: number }

function unnamedControls(): Unnamed[] {
  const found: Unnamed[] = [];
  for (const file of tsxFiles(SRC)) {
    const source = ts.createSourceFile(
      file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node): void => {
      const isPaired = ts.isJsxElement(node) && node.openingElement.tagName.getText() === 'button';
      const isSelfClosing = ts.isJsxSelfClosingElement(node) && node.tagName.getText() === 'button';
      if (isPaired || isSelfClosing) {
        const open = isPaired
          ? (node as ts.JsxElement).openingElement
          : (node as ts.JsxSelfClosingElement);
        const named = attributeNames(open).some((n) => n === 'aria-label' || n === 'aria-labelledby');
        const hasText = isPaired && rendersText(node as ts.JsxElement);
        if (!named && !hasText) {
          found.push({
            file: path.relative(SRC, file),
            line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
}

describe('no control ships without a name', () => {
  it('every button renders text or carries an aria-label', () => {
    const unnamed = unnamedControls();
    expect(
      unnamed.map((u) => `${u.file}:${u.line}`),
    ).toEqual([]);
  });

  it('is reading the whole tree, not an empty one', () => {
    /**
     * The failure mode of a source-scanning pin: it stops finding files,
     * or stops recognising buttons, and passes forever. Three detectors
     * into this problem, that is not a theoretical worry.
     */
    const files = tsxFiles(SRC);
    expect(files.length).toBeGreaterThan(50);

    let buttons = 0;
    for (const file of files) {
      const source = ts.createSourceFile(
        file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (node: ts.Node): void => {
        if ((ts.isJsxElement(node) && node.openingElement.tagName.getText() === 'button') ||
            (ts.isJsxSelfClosingElement(node) && node.tagName.getText() === 'button')) {
          buttons += 1;
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(buttons).toBeGreaterThan(100);
  });

  it('does not accept a tooltip as a name', () => {
    /**
     * FLOW1 item 1's ruling, made mechanical. `title` is invisible until
     * you already suspect you need it and absent entirely on touch, and
     * a screen reader's treatment of it is inconsistent across browsers.
     * A button carrying only `title` must still fail.
     */
    const snippet = '<button onClick={x} title="Delete deed"><Trash2 /></button>';
    const source = ts.createSourceFile('t.tsx', snippet, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let verdict: boolean | null = null;
    const visit = (node: ts.Node): void => {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText() === 'button') {
        const named = attributeNames(node.openingElement)
          .some((n) => n === 'aria-label' || n === 'aria-labelledby');
        verdict = named || rendersText(node);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    expect(verdict).toBe(false);
  });

  it('does not accept className as a name', () => {
    /**
     * Detector #3's bug, pinned so it cannot return. `w-4 h-4
     * animate-spin` is a string full of letters that names nothing, and
     * treating it as content is how a sweep reports zero problems on a
     * page full of them.
     */
    const snippet = '<button onClick={x}><Loader2 className="w-4 h-4 animate-spin" /></button>';
    const source = ts.createSourceFile('t.tsx', snippet, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let text: boolean | null = null;
    const visit = (node: ts.Node): void => {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText() === 'button') {
        text = rendersText(node);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    expect(text).toBe(false);
  });

  it('accepts a label that lives in an expression', () => {
    /** Detector #2's bug, from the other side: `{saving ? 'Saving…' :
     * 'Save'}` is a labelled button and must not be reported. */
    const snippet = "<button onClick={x}>{saving ? 'Saving…' : 'Save changes'}</button>";
    const source = ts.createSourceFile('t.tsx', snippet, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let text: boolean | null = null;
    const visit = (node: ts.Node): void => {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText() === 'button') {
        text = rendersText(node);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    expect(text).toBe(true);
  });
});

describe('the destructive action on Past Deeds', () => {
  const PAST_DEEDS = fs.readFileSync(path.join(SRC, 'app', 'past-deeds', 'page.tsx'), 'utf8');

  it('names the deed it is about to delete', () => {
    /**
     * "Are you sure you want to delete this deed?" is the same sentence
     * on every row of a table of near-identical rows. It confirms that
     * something is being deleted without ever confirming WHICH, which is
     * precisely the confirmation a misclick reads straight past.
     */
    expect(PAST_DEEDS).toContain('deleteConfirm.deed');
    expect(PAST_DEEDS).toContain('deleteConfirm.deed.property_address');
    expect(PAST_DEEDS).toContain('This cannot be undone.');
  });

  it('names the row in both actions, not just the action', () => {
    expect(PAST_DEEDS).toContain('`Delete deed for ${deed.property_address}`');
    expect(PAST_DEEDS).toContain('`Download deed PDF for ${deed.property_address}`');
  });

  it('separates delete from the safe action beside it', () => {
    /** Adjacency is what makes a misclick cheap to make and impossible
     * to undo: a red delete sat one hand-width from a purple download,
     * same size, in the same `gap-2` run. */
    const deleteAt = PAST_DEEDS.indexOf('Delete deed for');
    const dividerAt = PAST_DEEDS.lastIndexOf('h-6 w-px', deleteAt);
    expect(dividerAt).toBeGreaterThan(-1);
    expect(deleteAt - dividerAt).toBeLessThan(900);
  });
});
