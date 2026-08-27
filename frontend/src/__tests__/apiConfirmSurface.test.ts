/**
 * API-CONFIRM — the confirmation page is chrome around the document.
 *
 * It must not grow a second field list (address, APN, parties). Those
 * facts live on the rendered deed. Adding them here would be a second
 * copy of a judgment the allowlist already refused.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const PAGE = codeOnly(fs.readFileSync(
  path.join(__dirname, '..', 'app', 'confirm', '[token]', 'page.tsx'),
  'utf8'
));

describe('API-CONFIRM confirmation surface', () => {
  it('loads the package and the preview, and has no field editor', () => {
    expect(PAGE).toContain('/confirm/${token}');
    expect(PAGE).toContain('/approve');
    expect(PAGE).toContain('/reject');
    expect(PAGE).not.toContain('input type="text"');
    expect(PAGE).not.toContain('contenteditable');
  });

  it('does not reprint APN, address, or parties as chrome', () => {
    expect(PAGE).not.toMatch(/APN:/);
    expect(PAGE).not.toMatch(/property_address/);
    expect(PAGE).not.toMatch(/grantor/);
    expect(PAGE).not.toMatch(/grantee/);
  });

  it('uses the server catalog for reject reasons', () => {
    expect(PAGE).toContain('reject_reasons');
    expect(PAGE).not.toContain('COMMON_ISSUES');
  });
});
