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
  'grant-deed-jt': 'hereby GRANT(S) to',
  'grant-deed-cp-ros': 'hereby GRANT(S) to',
  'grant-deed-corp': 'hereby GRANTS to',
  'grant-deed-partnership': 'hereby GRANTS to',
};

/** Entity-grantor recitals (wave 2 #6) — instrument-defining furniture:
 * choosing "Corporation Grant Deed" IS declaring the grantor's kind
 * (Flag-3). The blanks (state of organization; partnership type) are
 * typed officer facts. Drift-pinned in preview and templates. */
export const ENTITY_GRANTOR_RECITALS: Record<string, string> = {
  'grant-deed-corp': 'a corporation organized under the laws of the State of',
  'grant-deed-partnership': 'partnership organized under the laws of the State of',
};

/** Fixed-vesting phrases printed on the instrument's face (wave 1 #3/#4).
 * Instrument-defining furniture under the Flag-3 precedent: choosing the
 * form IS the officer's vesting decision, so the phrase lives here and in
 * the template — never as a stored vesting value. The clause reads
 * "<phrase> the real property situated in ..." per the PCT references. */
export const FIXED_VESTING_PHRASES: Record<string, string> = {
  'grant-deed-jt': 'as JOINT TENANTS',
  'grant-deed-cp-ros': 'as COMMUNITY PROPERTY WITH RIGHT OF SURVIVORSHIP',
};

/** TOD revocation (Prob C §§5600/5644) — statutory furniture shared by
 * preview and template (drift-pinned). The exemption recitals are
 * categorical (no decision gate); the notice is the statute's own. */
export const TOD_DTT_EXEMPTION =
  'This conveyance is exempt from Documentary Transfer Tax under Revenue and Taxation Code §11930.';
export const TOD_PCOR_EXEMPTION =
  'This conveyance is exempt from Preliminary Change of Ownership Report under Revenue and Taxation Code § 480.3.';
export const TOD_NOTICE_HEAD = 'IMPORTANT NOTICE: THIS FORM MUST BE RECORDED TO BE EFFECTIVE';
export const TOD_NOTICE_BODY =
  'This revocation form MUST be RECORDED on or before 60 days after the date it is notarized ' +
  'or it will not be effective. This revocation form only affects a transfer on death deed that YOU ' +
  'made. A transfer on death deed made by a co-owner of your property is not affected by this ' +
  'revocation form. A co-owner who wants to revoke a transfer on death deed that they made must ' +
  'complete and RECORD a SEPARATE revocation form.';
export const TOD_REVOCATION_STATEMENT =
  'I revoke any TOD deed to transfer the described property that I executed before executing this form.';
export const TOD_WITNESS_INSTRUCTION =
  'To be valid, this form must be signed by two persons, both present at the same time, who witness ' +
  'your signing of the deed or your acknowledgment that it is your deed. The signatures of the ' +
  'witnesses do not need to be acknowledged by a notary public.';

/** Categorical exemption recitals (instrument-defining form furniture —
 * see docs/DOCTRINE_CONFORMANCE.md §7.3). */
export const EXEMPTION_RECITALS: Record<string, string> = {
  'interspousal-transfer':
    'This transfer is exempt from Documentary Transfer Tax pursuant to California Revenue and Taxation Code Section 11927 (transfer between spouses).',
  'tax-deed':
    'This deed is exempt from Documentary Transfer Tax pursuant to California Revenue and Taxation Code Section 11922 (conveyance by operation of law).',
};
