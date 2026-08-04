/**
 * codeOnly() — read source as CODE, without its prose. The TS half.
 *
 * ═══ WHY THIS EXISTS ═══
 *
 * A forbidden-pattern pin necessarily quotes what it forbids, and the
 * comment explaining a removal necessarily quotes the thing removed. So
 * every such pin has to read code with comments stripped, and this repo
 * grew SIXTEEN inline strippers across fourteen test files to do it.
 *
 * They did not agree, and two of the three variants were wrong:
 *
 *   /\/\/[^\n]*​/g          (6 files)
 *       Strips `//` ANYWHERE — including inside string literals. It turns
 *
 *           const url = "https://api.openai.com/v1/chat";
 *       into
 *           const url = "https:
 *
 *       It truncates the string, leaves an unterminated quote, and
 *       deletes the rest of the line. Several files using it test proxy
 *       and docs code whose whole content is URLs, so those pins have
 *       been asserting against mangled text.
 *
 *   /^\s*\/\/.*$​/gm        (6 files)
 *       `\s` matches newlines, so a blank line before a comment is eaten
 *       WITH the comment and every line number below shifts. Same bug
 *       found independently in the banned-claims checker (RED-H1.1).
 *
 *   /^[^\S\n]*\/\/.*$​/gm   (1 file)
 *       Correct, and the reason the other two are now gone.
 *
 * ═══ WHY A SCANNER AND NOT A BETTER REGEX ═══
 *
 * "Is this `//` a comment or part of a string?" is not a question a
 * regular expression can answer — it requires knowing what came before.
 * That is the same lesson this project keeps relearning under a
 * different name: match STATEMENTS, not strings. A tokenizer knows the
 * difference between a comment and text that looks like one; a pattern
 * only knows the spelling.
 *
 * ═══ WHAT IT DOES NOT DO ═══
 *
 * It does not strip string literals — a pin looking for a value that
 * legitimately lives in a string is asking a different question and
 * should say so at the call site.
 *
 * It does not fully parse regex literals. `/abc/.test(s)` is handled by
 * the division-vs-regex heuristic below; a regex literal containing an
 * unbalanced quote could still confuse it. That is stated rather than
 * hidden: if it ever matters, the fix is a real parser, not a patch.
 *
 * Line and column positions are PRESERVED — comments become spaces,
 * newlines stay newlines — so a failing assertion's line numbers still
 * point at the right place in the original file.
 */
import * as fs from 'fs';

/** Characters that can precede `/` when it starts a regex literal. */
const REGEX_ALLOWED_BEFORE = new Set([
  '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '\n', '+', '-', '*', '%', '<', '>', '~', '^',
]);

function lastSignificant(out: string[]): string {
  for (let i = out.length - 1; i >= 0; i--) {
    const c = out[i];
    if (c !== ' ' && c !== '\t' && c !== '\r') return c;
  }
  return '\n';
}

export function codeOnly(source: string): string {
  const out: string[] = [];
  let i = 0;
  const n = source.length;

  // Blank a span while keeping newlines, so positions never move.
  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k++) out.push(source[k] === '\n' ? '\n' : ' ');
  };

  while (i < n) {
    const c = source[i];
    const next = source[i + 1];

    // Line comment
    if (c === '/' && next === '/') {
      let j = i;
      while (j < n && source[j] !== '\n') j++;
      blank(i, j);
      i = j;
      continue;
    }

    // Block comment (this also covers JSX `{/* ... */}`)
    if (c === '/' && next === '*') {
      let j = i + 2;
      while (j < n && !(source[j] === '*' && source[j + 1] === '/')) j++;
      j = Math.min(j + 2, n);
      blank(i, j);
      i = j;
      continue;
    }

    // String literal — copied verbatim, so `https://` survives intact.
    if (c === '"' || c === "'") {
      out.push(c);
      i++;
      while (i < n) {
        if (source[i] === '\\') { out.push(source[i], source[i + 1] ?? ''); i += 2; continue; }
        out.push(source[i]);
        if (source[i] === c) { i++; break; }
        if (source[i] === '\n') { i++; break; } // unterminated — don't run away
        i++;
      }
      continue;
    }

    // Template literal, including nested ${ ... } which may itself hold
    // strings and comments.
    if (c === '`') {
      out.push(c);
      i++;
      let depth = 0;
      while (i < n) {
        if (source[i] === '\\') { out.push(source[i], source[i + 1] ?? ''); i += 2; continue; }
        if (source[i] === '$' && source[i + 1] === '{') { depth++; out.push('$', '{'); i += 2; continue; }
        if (source[i] === '}' && depth > 0) { depth--; out.push('}'); i++; continue; }
        if (source[i] === '`' && depth === 0) { out.push('`'); i++; break; }
        out.push(source[i]);
        i++;
      }
      continue;
    }

    // Regex literal, distinguished from division by what precedes it.
    if (c === '/' && REGEX_ALLOWED_BEFORE.has(lastSignificant(out))) {
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < n) {
        if (source[j] === '\\') { j += 2; continue; }
        if (source[j] === '[') inClass = true;
        else if (source[j] === ']') inClass = false;
        else if (source[j] === '/' && !inClass) { closed = true; j++; break; }
        else if (source[j] === '\n') break;
        j++;
      }
      if (closed) {
        for (let k = i; k < j; k++) out.push(source[k]);
        i = j;
        continue;
      }
    }

    out.push(c);
    i++;
  }

  return out.join('');
}

/** Read a file under `frontend/src` and return it as code only. */
export function readCode(...segments: string[]): string {
  const path = require('path');
  return codeOnly(fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8'));
}

/** Read a file relative to the repository root and return it as code only. */
export function readRepoCode(...segments: string[]): string {
  const path = require('path');
  return codeOnly(
    fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', ...segments), 'utf8')
  );
}
