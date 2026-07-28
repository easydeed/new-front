/**
 * Statutory/chassis furniture strings shared by the builder's live preview
 * and the drift-pinning test (Ticket PV).
 *
 * One source of truth: PreviewPanel renders these constants, and
 * previewChassisConformance.test.ts asserts both that the panel uses them
 * AND that the same wording appears in the backend Jinja chassis templates
 * (templates/<type>/index.jinja2). A future wording change therefore breaks
 * the test until preview and template move together — they cannot drift
 * apart silently.
 */

/** R&T §11932–11933 declaration lead-in. */
export const DTT_LEAD = 'THE UNDERSIGNED GRANTOR(S) DECLARE(S):';

export const DTT_AMOUNT_LABEL = 'DOCUMENTARY TRANSFER TAX IS';

export const DTT_BASIS_FULL = 'Computed on full value of property conveyed, or';

export const DTT_BASIS_LESS_LIENS =
  'Computed on full value less liens and encumbrances remaining at time of sale.';

export const DTT_AREA_UNINCORPORATED = 'Unincorporated area';

/** Gov. Code §27361.6 recorder's-space caption at the boundary rule. */
export const RECORDER_CAPTION = 'Space Above This Line Is For Recorder’s Use';

/** Statutory closing directive (pairs with the combined mail-to block). */
export const MAIL_TAX_DIRECTIVE = 'Mail Tax Statements As Directed Above';

/** Per-type operative granting verbs, as rendered by the chassis templates. */
export const OPERATIVE_WORDS: Record<string, string> = {
  'grant-deed': 'hereby GRANT(S) to',
  'quitclaim-deed': 'hereby REMISE(S), RELEASE(S) AND QUITCLAIM(S) to',
  'interspousal-transfer': 'hereby GRANTS AND TRANSFERS to',
  'warranty-deed': 'hereby GRANTS, BARGAINS, SELLS AND CONVEYS to',
  'tax-deed': 'does hereby grant, bargain, sell and convey to',
};

/** Categorical exemption recitals (instrument-defining form furniture —
 * see docs/DOCTRINE_CONFORMANCE.md §7.3). */
export const EXEMPTION_RECITALS: Record<string, string> = {
  'interspousal-transfer':
    'This transfer is exempt from Documentary Transfer Tax pursuant to California Revenue and Taxation Code Section 11927 (transfer between spouses).',
  'tax-deed':
    'This deed is exempt from Documentary Transfer Tax pursuant to California Revenue and Taxation Code Section 11922 (conveyance by operation of law).',
};
