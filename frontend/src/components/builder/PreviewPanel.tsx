'use client';

// Ticket PV: the live preview mirrors the G2/G3 chassis page one — open
// recorder space with the caption at the boundary, reference numbers
// top-left, statutory DTT declaration, standard granting wording, no
// chrome. The furniture strings come from lib/deedFurniture so the
// drift-pinning test holds preview and templates to the same wording.
// Interactivity (as-you-type updates, active-section highlighting) is
// unchanged from the original panel.
import { useMemo } from 'react';
import { DeedBuilderState } from '@/types/builder';
import {
  DTT_LEAD,
  DTT_AMOUNT_LABEL,
  DTT_BASIS_FULL,
  DTT_BASIS_LESS_LIENS,
  DTT_AREA_UNINCORPORATED,
  RECORDER_CAPTION,
  MAIL_TAX_DIRECTIVE,
  OPERATIVE_WORDS,
  EXEMPTION_RECITALS,
  FIXED_VESTING_PHRASES,
  TOD_DTT_EXEMPTION,
  TOD_PCOR_EXEMPTION,
  TOD_NOTICE_HEAD,
  TOD_NOTICE_BODY,
  TOD_REVOCATION_STATEMENT,
  TOD_WITNESS_INSTRUCTION,
} from '@/lib/deedFurniture';
// FORMS registry: document titles + family come from the one source of
// type facts.
import { formConfig, formFamily, hasPropertySection } from '@/lib/formRegistry';

interface PreviewPanelProps {
  state: DeedBuilderState;
  activeSection: string;
  /** D3 click-to-fix: clicking a data region opens its section (and
      focuses the matching input where one exists). Preview-only. */
  onRegionClick?: (section: string, field?: string) => void;
}

function Checkline({ marked }: { marked: boolean }) {
  return (
    <span className="inline-block w-7 border-b border-black text-center font-bold mr-1">
      {marked ? 'X' : ' '}
    </span>
  );
}

export function PreviewPanel({ state, activeSection, onRegionClick }: PreviewPanelProps) {
  const preview = useMemo(() => ({
    requestedBy: state.requestedBy || '[Recording Requested By]',
    requestedByAddress: state.requestedByAddress || '',
    // Mirror the generate payload: 'grantee' resolves to the grantee name,
    // mailed at the property address (never render the literal 'grantee').
    returnTo: state.returnTo === 'grantee'
      ? state.grantee || '[GRANTEE NAME]'
      : state.returnTo || state.requestedBy || '[Return To]',
    // D1: the PDF stacks the mail-to block (name / street / city, ST zip) —
    // the preview shows the same lines, not a squashed comma-string.
    returnToLines: state.returnTo === 'grantee' && state.property
      ? [
          state.property.address,
          [
            state.property.city,
            [state.property.state, state.property.zip].filter(Boolean).join(' '),
          ].filter(Boolean).join(', '),
        ].filter(Boolean)
      : [],
    apn: state.property?.apn || '',
    titleOrderNo: state.titleOrderNo || '',
    escrowNo: state.escrowNo || '',
    grantor: state.grantor || '[GRANTOR NAME]',
    grantee: state.grantee || '[GRANTEE NAME]',
    vesting: state.vesting || '',
    legalDescription: state.property?.legalDescription || '[Legal Description]',
    county: state.property?.county || '[County]',
  }), [state]);

  const deedTitle = formConfig(state.deedType)?.title || 'DEED';
  // FORMS: affidavit instruments render a sworn-statement body —
  // no DTT declaration, no granting clause, jurat instead of an
  // acknowledgment. Family from the registry.
  const isAffidavit = formFamily(state.deedType) === 'affidavit';
  const isDeclaration = formFamily(state.deedType) === 'declaration';
  const aff = state.affidavit;
  const factOrBlank = (v: string | undefined) => v?.trim() || '________________';
  const operative = OPERATIVE_WORDS[state.deedType] || OPERATIVE_WORDS['grant-deed'];
  const exemptionRecital = EXEMPTION_RECITALS[state.deedType];
  const fixedVesting = FIXED_VESTING_PHRASES[state.deedType];

  // §1189 acknowledgment sketch shared by the one-page declaration
  // previews (homestead family) — all entries are the notary's; nothing
  // pre-fills but the venue county.
  const ackSketch = (
    <>
      <div className="mt-5 text-[9.5px] border border-black p-2 leading-snug">
        A notary public or other officer completing this certificate verifies only the
        identity of the individual who signed the document to which this certificate is
        attached, and not the truthfulness, accuracy, or validity of that document.
      </div>
      <div className="mt-3 text-[10px]">
        <div>STATE OF CALIFORNIA&nbsp;&nbsp;)</div>
        <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)&nbsp;&nbsp;SS.</div>
        <div>COUNTY OF <span className="inline-block min-w-[1.4in] border-b border-black">{(state.property?.county || '').trim()}</span>&nbsp;)</div>
        <p className="mt-2">
          On ____________ before me, ______________________________, Notary Public,
          personally appeared ______________________________, who proved to me on the
          basis of satisfactory evidence to be the person(s) whose name(s) is/are
          subscribed to the within instrument and acknowledged to me that he/she/they
          executed the same in his/her/their authorized capacity(ies)…
        </p>
        <div className="mt-4 flex justify-between items-end">
          <div>Signature <span className="inline-block min-w-[2in] border-b border-black" /></div>
          <div className="border border-black w-[1.6in] h-[1.1in] flex items-center justify-center text-center text-[8px] uppercase text-gray-500">(This area for notary stamp)</div>
        </div>
      </div>
    </>
  );

  // DTT honesty (G3's invariant, mock-up form): nothing is declared until
  // the officer's transfer-tax data exists — no pre-checked boxes, no $0.00.
  const dtt = state.dtt;
  const dttAmount = dtt
    ? dtt.isExempt
      ? '0.00'
      : dtt.calculatedAmount || ''
    : '';

  const signers = preview.grantor.includes(';')
    ? preview.grantor.split(';').map((s) => s.trim()).filter(Boolean)
    : [preview.grantor];

  const highlight = (section: string) =>
    activeSection === section
      ? 'bg-brand-50 ring-2 ring-brand-300 rounded -m-1 p-1'
      : '';

  const placeholder = (value: string) =>
    value.startsWith('[') ? 'text-gray-400 bg-gray-100 px-1 rounded' : '';

  // D1: PREVIEW-ONLY data highlighting — every span rendering inserted data
  // gets the same purple treatment so the officer can see at a glance which
  // parts of the page came from their inputs. Never applied to placeholders
  // (those keep the gray treatment) and never anywhere near the PDF
  // templates: recorded pages carry no chrome (Gov C §27361.7, G2/G3 pins).
  const dataHighlight = (value: string | undefined | null) =>
    value && !String(value).startsWith('[')
      ? 'bg-brand-50 text-brand-900 px-0.5 rounded'
      : '';

  // D3: click-to-fix. Every data region is clickable — real values jump
  // to their field ("fix"), placeholders jump to the empty field ("fill");
  // one gesture either way. Sections whose data lives in provenance cards
  // (grantor, APN, legal description) open at SECTION level: the card IS
  // the affordance there, and faking an input focus would mislead.
  const go = (section: string, field?: string) =>
    onRegionClick ? () => onRegionClick(section, field) : undefined;
  const CLICKABLE = onRegionClick ? 'cursor-pointer hover:ring-1 hover:ring-brand-300' : '';

  return (
    <div className="h-full bg-gray-200 p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-2xl" style={{ minHeight: '11in' }}>
          <div className="p-8 pt-6 font-serif text-[13px] leading-relaxed" style={{ paddingLeft: '0.6in', paddingRight: '0.5in' }}>

            {/* Page-one header: info column beside the OPEN recorder space */}
            <div className="flex" style={{ minHeight: '1.85in' }}>
              <div className={`w-[55%] border-r border-black pr-3 ${highlight('recording')}`}>
                <div className="text-[9px] font-bold uppercase tracking-wide">Recording Requested By:</div>
                <div className="min-h-[0.3in] mb-2">
                  <span onClick={go('recording', 'requested-by')} className={`text-[10px] ${CLICKABLE} ${placeholder(preview.requestedBy)} ${dataHighlight(preview.requestedBy)}`}>{preview.requestedBy}</span>
                  {/* D2: the requesting party's address prints under their
                      name — same treatment as the mail-to block. */}
                  {preview.requestedByAddress && (
                    <span onClick={go('recording', 'requested-by-address')} className={`block text-[10px] ${CLICKABLE} ${dataHighlight(preview.requestedByAddress)}`}>{preview.requestedByAddress}</span>
                  )}
                </div>

                <div className="text-[9px] font-bold uppercase tracking-wide">
                  Mail Tax Statements and<br />When Recorded Mail To:
                </div>
                <div className="min-h-[0.3in] mb-2">
                  <span onClick={go('recording')} className={`text-[10px] ${CLICKABLE} ${placeholder(preview.returnTo)} ${dataHighlight(preview.returnTo)}`}>{preview.returnTo}</span>
                  {preview.returnToLines.map((line) => (
                    <span key={line} onClick={go('recording')} className={`block text-[10px] ${CLICKABLE} ${dataHighlight(line)}`}>{line}</span>
                  ))}
                </div>

                <div className="text-[10px]">
                  Order No.: {preview.titleOrderNo
                    ? <span onClick={go('recording', 'title-order-no')} className={`${CLICKABLE} ${dataHighlight(preview.titleOrderNo)}`}>{preview.titleOrderNo}</span>
                    : '____________'}
                </div>
                <div className="text-[10px]">
                  Escrow No.: {preview.escrowNo
                    ? <span onClick={go('recording', 'escrow-no')} className={`${CLICKABLE} ${dataHighlight(preview.escrowNo)}`}>{preview.escrowNo}</span>
                    : '____________'}
                </div>
              </div>

              {/* Recorder's space: deliberately empty — stamps land here */}
              <div className="flex-grow" aria-label="Space reserved for the county recorder" />
            </div>

            {/* Boundary row: APN left (parcel-tied forms only), recorder
                caption right, rule under */}
            <div className="flex justify-between items-baseline border-b border-black pb-0.5 mb-3">
              {hasPropertySection(state.deedType) ? (
                <span className={`text-[10px] font-bold ${highlight('property')}`}>
                  APN: <span onClick={go('property')} className={`font-mono tracking-wide ${CLICKABLE} ${dataHighlight(preview.apn)}`}>{preview.apn || '____________'}</span>
                </span>
              ) : <span />}
              <span className="text-[7.5px] font-bold uppercase">{RECORDER_CAPTION}</span>
            </div>

            {/* Title */}
            <h1 className={`text-[14pt] font-bold text-center tracking-[2px] uppercase ${formConfig(state.deedType)?.subtitle ? 'mb-0.5' : 'mb-3'}`}>
              {deedTitle}
            </h1>
            {/* Reference-faithful qualifier lines under the title, when the
                blank form carries them (e.g. the CP w/ROS affidavit) */}
            {formConfig(state.deedType)?.subtitle && (
              <div className="text-center font-bold text-[11pt] mb-3">
                {formConfig(state.deedType)?.subtitle}
              </div>
            )}

            {isDeclaration && state.deedType === 'tod-revocation' ? (
              <>
                {/* Statutory revocation form (Prob C §§5600/5644) — the
                    exemption recitals and notice are the statute's own
                    furniture; the grantor is named only at signature
                    (execution act — nothing pre-prints). */}
                <div className={`text-[10px] mb-3 ${highlight('transferTax')}`}>
                  <div className="font-bold">THE UNDERSIGNED GRANTOR(s) DECLARE(s):</div>
                  <div>{TOD_DTT_EXEMPTION}</div>
                  <div>{TOD_PCOR_EXEMPTION}</div>
                </div>

                <div className="border border-black p-2 text-[10px] mb-3">
                  <div className="font-bold text-center mb-1">{TOD_NOTICE_HEAD}</div>
                  {TOD_NOTICE_BODY}
                </div>

                <div className="text-[11pt] font-bold uppercase mb-1">Property Assessor&rsquo;s Parcel Number</div>
                <div className={`mb-2 ${highlight('property')}`}>
                  <span onClick={go('property')} className={`font-mono tracking-wide ${CLICKABLE} ${dataHighlight(preview.apn)}`}>{preview.apn || '____________'}</span>
                </div>

                <div className="text-[11pt] font-bold uppercase mb-1">Property Description</div>
                <div className={`mb-3 ${highlight('property')}`}>
                  <span onClick={go('property')} className={`font-bold text-[10.5pt] whitespace-pre-wrap ${CLICKABLE} ${placeholder(preview.legalDescription)} ${dataHighlight(preview.legalDescription)}`}>
                    {preview.legalDescription}
                  </span>
                </div>

                <div className="text-[11pt] font-bold uppercase mb-1">Revocation</div>
                <p className="mb-3 text-[11pt]">{TOD_REVOCATION_STATEMENT}</p>

                <div className="text-[11pt] font-bold uppercase mb-1">Signature and Date</div>
                <p className={`mb-2 text-[10px] italic ${highlight('affidavit')}`}>
                  Signed and printed by{' '}
                  <span onClick={go('affidavit', 'affidavit-revokingGrantor')} className={`font-bold uppercase not-italic ${CLICKABLE} ${dataHighlight(aff?.revokingGrantor)}`}>{factOrBlank(aff?.revokingGrantor)}</span>
                  {' '}at notarization — the statutory form pre-prints no name.
                </p>
                <div className="mb-3">
                  <div className="border-b border-black h-6 w-[60%]" />
                  <div className="text-[9px]">(Sign Name) / (Print Name)</div>
                </div>

                <div className="text-[11pt] font-bold uppercase mb-1">Witnesses</div>
                <p className="mb-2 text-[10px]">{TOD_WITNESS_INSTRUCTION}</p>
                <div className="flex gap-6 mb-2">
                  <div className="flex-1">
                    <div className="text-[10px] font-bold">Witness #1</div>
                    <div className="border-b border-black h-6" />
                    <div className="text-[9px]">(Sign Name) / (Print Name)</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold">Witness #2</div>
                    <div className="border-b border-black h-6" />
                    <div className="text-[9px]">(Sign Name) / (Print Name)</div>
                  </div>
                </div>
              </>
            ) : isDeclaration && state.deedType === 'trust-certification' ? (
              <>
                {/* Certification of trust (PCT #72, Prob C §18100.5).
                    Owner ruling: initial lines and checkboxes are EXECUTION
                    acts — they render blank, always; typed transcriptions
                    fill the text blanks only. */}
                <div className={`text-[10.5pt] leading-relaxed mb-3 ${highlight('affidavit')}`}>
                  <p className="mb-2">
                    The undersigned declare(s) under penalty of perjury under the laws of the
                    State of California that the following is true and correct:
                  </p>
                  <p className="mb-1.5">
                    1. The Trust known as{' '}
                    <span onClick={go('affidavit', 'affidavit-trustName')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.trustName)}`}>{factOrBlank(aff?.trustName)}</span>,
                    {' '}executed on{' '}
                    <span onClick={go('affidavit', 'affidavit-trustDate')} className={`${CLICKABLE} ${dataHighlight(aff?.trustDate)}`}>{factOrBlank(aff?.trustDate)}</span>,
                    {' '}is a valid and existing trust.
                  </p>
                  <p className="mb-1.5">
                    2. The name(s) of the settlor(s) of the Trust is (are):{' '}
                    <span onClick={go('affidavit', 'affidavit-settlors')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.settlors)}`}>{factOrBlank(aff?.settlors)}</span>
                  </p>
                  <p className="mb-1.5">
                    3. The name(s) of the currently acting trustee(s) is (are):{' '}
                    <span onClick={go('affidavit', 'affidavit-trustees')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.trustees)}`}>{factOrBlank(aff?.trustees)}</span>
                  </p>
                  <div className="mb-1.5">
                    4. The trustee(s) of the Trust have the following powers (initial applicable line(s)):
                    <div className="ml-5">
                      <div><span className="inline-block w-10 border-b border-black mr-2" />Power to acquire additional property.</div>
                      <div><span className="inline-block w-10 border-b border-black mr-2" />Power to sell and execute deeds.</div>
                      <div><span className="inline-block w-10 border-b border-black mr-2" />Power to encumber, and execute deeds of trust.</div>
                      <div><span className="inline-block w-10 border-b border-black mr-2" />Other: <span className="inline-block min-w-[2.4in] border-b border-black" /></div>
                    </div>
                  </div>
                  <div className="mb-1.5">
                    5. The Trust is (check one): <span className="inline-block w-10 border-b border-black mx-1" />Revocable
                    <span className="inline-block w-10 border-b border-black mx-1" />Irrevocable
                    <div>
                      The name of the person who may revoke the Trust is:{' '}
                      <span onClick={go('affidavit', 'affidavit-revokerName')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.revokerName)}`}>{factOrBlank(aff?.revokerName)}</span>
                    </div>
                  </div>
                  <p className="mb-1.5">
                    6. The number of trustees who must sign documents in order to exercise the
                    powers of the Trust is (are):{' '}
                    <span onClick={go('affidavit', 'affidavit-signerCount')} className={`${CLICKABLE} ${dataHighlight(aff?.signerCount)}`}>{factOrBlank(aff?.signerCount)}</span>,
                    {' '}whose name(s) is (are):{' '}
                    <span onClick={go('affidavit', 'affidavit-signerNames')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.signerNames)}`}>{factOrBlank(aff?.signerNames)}</span>
                  </p>
                  <p className="mb-1.5">
                    7. Title to Trust assets is to be taken as follows:{' '}
                    <span onClick={go('affidavit', 'affidavit-titleVesting')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.titleVesting)}`}>{factOrBlank(aff?.titleVesting)}</span>
                  </p>
                  <p className="mb-1.5">
                    8. The Trust has not been revoked, modified or amended in any manner which
                    would cause the representations contained herein to be incorrect.
                  </p>
                  <p className="mb-1.5">9. I (we) am (are) all of the currently acting trustees.</p>
                  <p className="mb-1.5">
                    10. I (we) understand that I (we) may be required to provide copies of
                    excerpts from the original Trust documents which designate the trustees
                    and confer the power to act in the pending transaction.
                  </p>
                </div>

                <div className="mt-5 flex justify-between items-end gap-4">
                  <div className="text-[11pt]">Dated: <span className="inline-block min-w-[1.6in] border-b border-black" /></div>
                  <div className="w-[45%]">
                    <div className="border-b border-black h-7 mb-3" />
                    <div className="border-b border-black h-7" />
                  </div>
                </div>

                <div className="text-center text-[9px] font-bold mt-4">
                  (Acknowledgement must be attached)
                </div>
              </>
            ) : isDeclaration && state.deedType === 'homestead-declaration-spouses' ? (
              <>
                {/* PCT #34 — spouses variant: "We are husband and wife" is
                    Flag-3 furniture; both names are officer-typed facts. */}
                <div className={`text-[11pt] leading-relaxed mb-3 ${highlight('affidavit')}`}>
                  <p className="mb-2">
                    We, <span onClick={go('affidavit', 'affidavit-declarantName')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.declarantName)}`}>{factOrBlank(aff?.declarantName)}</span>
                    {' '}and <span onClick={go('affidavit', 'affidavit-declarant2Name')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.declarant2Name)}`}>{factOrBlank(aff?.declarant2Name)}</span>,
                    {' '}hereby certify and declare as follows:
                  </p>
                  <p className="mb-2">1. We are husband and wife.</p>
                  <p className="mb-2">2. We hereby claim as a declared homestead the premises described as follows:</p>
                </div>

                <div className={`mb-3 ${highlight('property')}`}>
                  <span onClick={go('property')} className={`font-bold text-[10.5pt] whitespace-pre-wrap ${CLICKABLE} ${placeholder(preview.legalDescription)} ${dataHighlight(preview.legalDescription)}`}>
                    {preview.legalDescription}
                  </span>
                </div>

                <div className={`text-[11pt] leading-relaxed mb-3 ${highlight('affidavit')}`}>
                  <p className="mb-2">3. We are the owners of the above described homestead.</p>
                  <p className="mb-2">4. The above described homestead is our principal dwelling and we currently reside thereon.</p>
                  <p className="mb-2">5. The facts stated in this declaration are known to be true as of our personal knowledge.</p>
                </div>

                <div className="mt-6 flex justify-between items-end gap-4">
                  <div className="text-[11pt]">Dated: <span className="inline-block min-w-[1.6in] border-b border-black" /></div>
                  <div className="w-[45%]">
                    <div className="border-b border-black h-7" />
                    <div className="text-[9px] uppercase mb-2">Print Name: <span className={`font-bold ${dataHighlight(aff?.declarantName)}`}>{aff?.declarantName || ''}</span></div>
                    <div className="border-b border-black h-7" />
                    <div className="text-[9px] uppercase">Print Name: <span className={`font-bold ${dataHighlight(aff?.declarant2Name)}`}>{aff?.declarant2Name || ''}</span></div>
                  </div>
                </div>
                {ackSketch}
              </>
            ) : isDeclaration && state.deedType === 'homestead-abandonment' ? (
              <>
                {/* PCT #32 — the operative abandonment recital is furniture
                    (TOD-revocation precedent); the prior declaration's
                    identifying facts are officer-typed. */}
                <div className={`text-[11pt] leading-relaxed mb-3 ${highlight('affidavit')}`}>
                  <p className="mb-2">
                    The undersigned declare(s) that he/she/they hereby abandon(s) the homestead
                    previously declared in the Homestead Declaration executed by{' '}
                    <span onClick={go('affidavit', 'affidavit-priorDeclarant')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.priorDeclarant)}`}>{factOrBlank(aff?.priorDeclarant)}</span>
                    {' '}on <span onClick={go('affidavit', 'affidavit-declarationDate')} className={`${CLICKABLE} ${dataHighlight(aff?.declarationDate)}`}>{factOrBlank(aff?.declarationDate)}</span>
                    {' '}and recorded on{' '}
                    <span onClick={go('affidavit', 'affidavit-recordingDate')} className={`${CLICKABLE} ${dataHighlight(aff?.recordingDate)}`}>{factOrBlank(aff?.recordingDate)}</span>, as Instrument No.{' '}
                    <span onClick={go('affidavit', 'affidavit-instrumentNo')} className={`${CLICKABLE} ${dataHighlight(aff?.instrumentNo)}`}>{factOrBlank(aff?.instrumentNo)}</span>
                    {' '}in the Official Records of the County Recorder of{' '}
                    <span onClick={go('property')} className={`font-bold ${CLICKABLE} ${placeholder(preview.county)} ${dataHighlight(preview.county)}`}>{preview.county}</span>,
                    {' '}County, State of California, pertaining to the following real property:
                  </p>
                </div>

                <div className={`mb-3 ${highlight('property')}`}>
                  <span onClick={go('property')} className={`font-bold text-[10.5pt] whitespace-pre-wrap ${CLICKABLE} ${placeholder(preview.legalDescription)} ${dataHighlight(preview.legalDescription)}`}>
                    {preview.legalDescription}
                  </span>
                </div>

                <p className={`mb-3 text-[11pt] ${highlight('property')}`}>
                  and commonly known as (Street address){' '}
                  <span onClick={go('property')} className={`font-bold ${CLICKABLE} ${dataHighlight(state.property?.address)}`}>{state.property?.address || '________________________'}</span>.
                </p>

                <div className="mt-6 flex justify-between items-end gap-4">
                  <div className="text-[11pt]">Dated: <span className="inline-block min-w-[1.6in] border-b border-black" /></div>
                  <div className="w-[45%]">
                    <div className="border-b border-black h-7 mb-3" />
                    <div className="border-b border-black h-7" />
                  </div>
                </div>
                {ackSketch}
              </>
            ) : isDeclaration ? (
              <>
                {/* Homestead declaration recital (PCT #33) — numbered
                    clauses 2–4 are instrument-defining furniture; the
                    declarant is the single typed fact. */}
                <div className={`text-[11pt] leading-relaxed mb-3 ${highlight('affidavit')}`}>
                  <p className="mb-2">
                    I, <span onClick={go('affidavit', 'affidavit-declarantName')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.declarantName)}`}>{factOrBlank(aff?.declarantName)}</span>,
                    {' '}hereby certify and declare as follows:
                  </p>
                  <p className="mb-2">
                    1. I hereby claim as a declared homestead the premises described as follows:
                  </p>
                </div>

                <div className={`mb-3 ${highlight('property')}`}>
                  <span onClick={go('property')} className={`font-bold text-[10.5pt] whitespace-pre-wrap ${CLICKABLE} ${placeholder(preview.legalDescription)} ${dataHighlight(preview.legalDescription)}`}>
                    {preview.legalDescription}
                  </span>
                </div>

                <div className={`text-[11pt] leading-relaxed mb-3 ${highlight('affidavit')}`}>
                  <p className="mb-2">2. I am the owner of the above described homestead.</p>
                  <p className="mb-2">
                    3. The above described homestead is my principal dwelling or the principal
                    dwelling of my spouse and I am, or my spouse is, currently residing thereon.
                  </p>
                  <p className="mb-2">
                    4. The facts stated in this declaration are known to be true as of my
                    personal knowledge.
                  </p>
                </div>

                <div className="mt-6 flex justify-between items-end gap-4">
                  <div className="text-[11pt]">Dated: <span className="inline-block min-w-[1.6in] border-b border-black" /></div>
                  <div className="w-[45%]">
                    <div className="border-b border-black h-7" />
                    <div className="text-[9px] uppercase">
                      Print Name: <span className={`font-bold ${dataHighlight(aff?.declarantName)}`}>{aff?.declarantName || ''}</span>
                    </div>
                  </div>
                </div>

                {/* CC §1189 sketch (CCP §704.930: ACKNOWLEDGED, not sworn) */}
                {ackSketch}
              </>
            ) : isAffidavit ? (
              <>
                {/* Sworn-statement recital — form furniture; the FACTS are
                    officer-typed and highlighted/clickable like deed data. */}
                <div className={`text-[11pt] leading-relaxed mb-3 ${highlight('affidavit')}`}>
                  <p className="mb-2">
                    <span onClick={go('affidavit', 'affidavit-affiantName')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.affiantName)}`}>{factOrBlank(aff?.affiantName)}</span>,
                    {' '}of legal age, being first duly sworn, deposes and says:
                  </p>
                  {['affidavit-death-cp-spouse', 'affidavit-death-cp-dp', 'affidavit-death-jt-dp'].includes(state.deedType) ? (
                    <>
                      {/* PCT #3/#2/#5 recitals — numbered clauses, reference-
                          faithful. Clause 2 (spouse or the Fam C §297
                          domestic-partner recital) is instrument-defining
                          furniture (Flag-3); clause 3 carries the CP phrase
                          or the JT grantees list per the reference. */}
                      <p className="mb-2">
                        1. <span onClick={go('affidavit', 'affidavit-decedentName')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.decedentName)}`}>{factOrBlank(aff?.decedentName)}</span>
                        {' '}is the decedent mentioned in the attached certified copy of Certificate of Death, who died on{' '}
                        <span onClick={go('affidavit', 'affidavit-deathDate')} className={`${CLICKABLE} ${dataHighlight(aff?.deathDate)}`}>{factOrBlank(aff?.deathDate)}</span>, at{' '}
                        <span onClick={go('affidavit', 'affidavit-deathPlace')} className={`${CLICKABLE} ${dataHighlight(aff?.deathPlace)}`}>{factOrBlank(aff?.deathPlace)}</span> (insert place of death).
                      </p>
                      {state.deedType === 'affidavit-death-cp-spouse' ? (
                        <p className="mb-2">
                          2. I am the surviving spouse of Decedent and was married to Decedent on the date of death.
                        </p>
                      ) : (
                        <p className="mb-2">
                          2. I am the surviving registered domestic partner of Decedent and on the date of
                          decedent&rsquo;s death, we were in a registered domestic partnership under California
                          Family Code Section 297.
                        </p>
                      )}
                      <p className="mb-2">
                        3. Decedent and I are the same persons who are named as grantees in that certain deed dated{' '}
                        <span onClick={go('affidavit', 'affidavit-deedDate')} className={`${CLICKABLE} ${dataHighlight(aff?.deedDate)}`}>{factOrBlank(aff?.deedDate)}</span>, executed by{' '}
                        <span onClick={go('affidavit', 'affidavit-deedGrantor')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.deedGrantor)}`}>{factOrBlank(aff?.deedGrantor)}</span>
                        {state.deedType === 'affidavit-death-jt-dp' ? (
                          <>
                            {' '}to{' '}
                            <span onClick={go('affidavit', 'affidavit-jtDeedGrantees')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.jtDeedGrantees)}`}>{factOrBlank(aff?.jtDeedGrantees)}</span>
                            {' '}as joint tenants, recorded on{' '}
                          </>
                        ) : (
                          <>{' '}in favor of the grantees as community property with right of survivorship, recorded on{' '}</>
                        )}
                        <span onClick={go('affidavit', 'affidavit-recordingDate')} className={`${CLICKABLE} ${dataHighlight(aff?.recordingDate)}`}>{factOrBlank(aff?.recordingDate)}</span>, as Instrument No.{' '}
                        <span onClick={go('affidavit', 'affidavit-instrumentNo')} className={`${CLICKABLE} ${dataHighlight(aff?.instrumentNo)}`}>{factOrBlank(aff?.instrumentNo)}</span>,
                        {' '}Official Records of{' '}
                        <span onClick={go('property')} className={`font-bold ${CLICKABLE} ${placeholder(preview.county)} ${dataHighlight(preview.county)}`}>{preview.county}</span>
                        {' '}County, California, describing the following real property:
                      </p>
                    </>
                  ) : state.deedType === 'affidavit-death-trustee' ? (
                    <>
                      {/* PCT #7 recital — clause 3 (successor-trustee assertion,
                          instrument-defining furniture) renders BELOW the legal
                          description, as the reference lays it out. */}
                      <p className="mb-2">
                        1. <span onClick={go('affidavit', 'affidavit-decedentName')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.decedentName)}`}>{factOrBlank(aff?.decedentName)}</span>
                        {' '}is the decedent mentioned in the attached certified copy of Certificate of Death, and is the same person named as Trustee in that certain Declaration of Trust dated{' '}
                        <span onClick={go('affidavit', 'affidavit-trustDate')} className={`${CLICKABLE} ${dataHighlight(aff?.trustDate)}`}>{factOrBlank(aff?.trustDate)}</span>, executed by{' '}
                        <span onClick={go('affidavit', 'affidavit-trustors')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.trustors)}`}>{factOrBlank(aff?.trustors)}</span> as trustor(s).
                      </p>
                      <p className="mb-2">
                        2. At the time of decedent&rsquo;s death, decedent was the owner, as Trustee, of certain real property acquired by a deed recorded on{' '}
                        <span onClick={go('affidavit', 'affidavit-recordingDate')} className={`${CLICKABLE} ${dataHighlight(aff?.recordingDate)}`}>{factOrBlank(aff?.recordingDate)}</span>, as Instrument No.{' '}
                        <span onClick={go('affidavit', 'affidavit-instrumentNo')} className={`${CLICKABLE} ${dataHighlight(aff?.instrumentNo)}`}>{factOrBlank(aff?.instrumentNo)}</span>, in Official Records of{' '}
                        <span onClick={go('property')} className={`font-bold ${CLICKABLE} ${placeholder(preview.county)} ${dataHighlight(preview.county)}`}>{preview.county}</span>
                        {' '}County, California, describing the following real property:
                      </p>
                    </>
                  ) : (
                  <p className="mb-2">
                    <span onClick={go('affidavit', 'affidavit-decedentName')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.decedentName)}`}>{factOrBlank(aff?.decedentName)}</span>
                    {' '}is the decedent mentioned in the attached certified copy of Certificate of Death,
                    and is the same person who is named as one of the parties in that certain deed dated{' '}
                    <span onClick={go('affidavit', 'affidavit-jtDeedDate')} className={`${CLICKABLE} ${dataHighlight(aff?.jtDeedDate)}`}>{factOrBlank(aff?.jtDeedDate)}</span>, executed by{' '}
                    <span onClick={go('affidavit', 'affidavit-jtDeedGrantor')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.jtDeedGrantor)}`}>{factOrBlank(aff?.jtDeedGrantor)}</span> to{' '}
                    <span onClick={go('affidavit', 'affidavit-jtDeedGrantees')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.jtDeedGrantees)}`}>{factOrBlank(aff?.jtDeedGrantees)}</span>
                    {' '}as joint tenants, recorded on{' '}
                    <span onClick={go('affidavit', 'affidavit-recordingDate')} className={`${CLICKABLE} ${dataHighlight(aff?.recordingDate)}`}>{factOrBlank(aff?.recordingDate)}</span>, as Instrument No.{' '}
                    <span onClick={go('affidavit', 'affidavit-instrumentNo')} className={`${CLICKABLE} ${dataHighlight(aff?.instrumentNo)}`}>{factOrBlank(aff?.instrumentNo)}</span>,
                    {' '}Official Records of{' '}
                    <span onClick={go('property')} className={`font-bold ${CLICKABLE} ${placeholder(preview.county)} ${dataHighlight(preview.county)}`}>{preview.county}</span>
                    {' '}County, California, describing the following real property:
                  </p>
                  )}
                </div>

                <div className={`mb-3 ${highlight('property')}`}>
                  <span onClick={go('property')} className={`font-bold text-[10.5pt] whitespace-pre-wrap ${CLICKABLE} ${placeholder(preview.legalDescription)} ${dataHighlight(preview.legalDescription)}`}>
                    {preview.legalDescription}
                  </span>
                </div>

                {state.deedType === 'affidavit-death-trustee' && (
                  <div className={`text-[11pt] leading-relaxed mb-3 ${highlight('affidavit')}`}>
                    <p>
                      3. I am the surviving or successor Trustee of the same trust under which said
                      decedent held title as trustee pursuant to the deed described above, and am
                      designated and empowered pursuant to the terms of said trust to serve as
                      Trustee thereof.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex justify-between items-end gap-4">
                  <div className="text-[11pt]">Dated: <span className="inline-block min-w-[1.6in] border-b border-black" /></div>
                  <div className="w-[45%]"><div className="border-b border-black h-7" /></div>
                </div>

                {/* Jurat sketch — Gov C §8202: sworn, not acknowledged. All
                    entries are the notary's; nothing pre-fills. */}
                <div className="mt-5 text-[9.5px] border border-black p-2 leading-snug">
                  A notary public or other officer completing this certificate verifies only the
                  identity of the individual who signed the document to which this certificate is
                  attached, and not the truthfulness, accuracy, or validity of that document.
                </div>
                <div className="mt-3 text-[10px]">
                  <div>STATE OF CALIFORNIA&nbsp;&nbsp;)</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)&nbsp;&nbsp;SS.</div>
                  <div>COUNTY OF <span className="inline-block min-w-[1.4in] border-b border-black">{preview.county.startsWith('[') ? '' : preview.county}</span>&nbsp;)</div>
                  <p className="mt-2">
                    Subscribed and sworn to (or affirmed) before me on this ____ day of
                    ____________, ______, by ______________________________, proved to me on the
                    basis of satisfactory evidence to be the person(s) who appeared before me.
                  </p>
                  <div className="mt-4 flex justify-between items-end">
                    <div>Signature <span className="inline-block min-w-[2in] border-b border-black" /></div>
                    <div className="border border-black w-[1.6in] h-[1.1in] flex items-center justify-center text-center text-[8px] uppercase text-gray-500">(This area for notary stamp)</div>
                  </div>
                </div>

                <div className="text-center text-[9px] font-bold uppercase mt-5">
                  Attach Certified Copy of Death Certificate
                </div>
              </>
            ) : (
              <>
            {/* DTT declaration or categorical exemption recital */}
            {exemptionRecital ? (
              <div className={`text-[10px] mb-4 ${highlight('transferTax')}`}>
                <span className="font-bold uppercase">Documentary Transfer Tax: Exempt. </span>
                {exemptionRecital}
              </div>
            ) : (
              <div className={`text-[10px] mb-4 leading-normal ${highlight('transferTax')}`}>
                <div className="flex justify-between gap-2">
                  <span>{DTT_LEAD}</span>
                  <span>
                    {DTT_AMOUNT_LABEL}{' '}
                    <span onClick={go('transferTax', 'dtt-value')} className={`inline-block min-w-[1.2in] border-b border-black text-center ${CLICKABLE} ${dataHighlight(dttAmount)}`}>
                      ${dttAmount}
                    </span>
                  </span>
                </div>
                <div className="ml-3">
                  <Checkline marked={!!dtt && !dtt.isExempt && dtt.basis === 'full_value'} />
                  {DTT_BASIS_FULL}
                </div>
                <div className="ml-3">
                  <Checkline marked={!!dtt && !dtt.isExempt && dtt.basis === 'less_liens'} />
                  {DTT_BASIS_LESS_LIENS}
                </div>
                <div className="ml-3">
                  <Checkline marked={!!dtt && dtt.areaType === 'unincorporated'} />
                  {DTT_AREA_UNINCORPORATED}{'   '}
                  <Checkline marked={!!dtt && dtt.areaType === 'city'} />
                  City of{' '}
                  <span onClick={go('transferTax', 'dtt-city')} className={`inline-block min-w-[1.2in] border-b border-black text-center ${CLICKABLE} ${dataHighlight(dtt?.areaType === 'city' ? dtt.cityName : '')}`}>
                    {dtt?.areaType === 'city' ? dtt.cityName || '' : ''}
                  </span>
                </div>
                {dtt?.isExempt && dtt.exemptReason && (
                  <div className="ml-3">Exempt from transfer tax: {dtt.exemptReason}</div>
                )}
              </div>
            )}

            {/* Granting clause — standard deed wording, no defined-term labels */}
            <p className="mb-2 text-[11pt]">
              For valuable consideration, receipt of which is hereby acknowledged,
            </p>

            <div className={`mb-2 ${highlight('grantor')}`}>
              <span onClick={go('grantor')} className={`font-bold uppercase text-[11pt] ${CLICKABLE} ${placeholder(preview.grantor)} ${dataHighlight(preview.grantor)}`}>{preview.grantor}</span>
            </div>

            <p className="mb-2 text-[11pt]">{operative}</p>

            <div className={`mb-2 ${highlight('grantee')}`}>
              <span onClick={go('grantee', 'grantee')} className={`font-bold uppercase text-[11pt] ${CLICKABLE} ${placeholder(preview.grantee)} ${dataHighlight(preview.grantee)}`}>{preview.grantee}</span>
              {!fixedVesting && preview.vesting && (
                <span onClick={go('vesting')} className={`text-[11pt] ${CLICKABLE} ${highlight('vesting')} ${dataHighlight(preview.vesting)}`}>, {preview.vesting}</span>
              )}
            </div>

            <p className="mb-2 text-[11pt]">
              {/* Fixed-vesting furniture — instrument-defining, not data:
                  no highlight, no click target, exactly as printed. */}
              {fixedVesting && `${fixedVesting} `}
              the real property situated in the County of{' '}
              <span onClick={go('property')} className={`font-bold ${CLICKABLE} ${placeholder(preview.county)} ${dataHighlight(preview.county)}`}>{preview.county}</span>,
              State of California, more particularly described as follows:
            </p>

            {/* Legal description — plain text, no box; D1: bolded like the
                parties, mirroring the chassis .legal-content weight. */}
            <div className={`mb-3 ${highlight('property')}`}>
              <span onClick={go('property')} className={`font-bold text-[10.5pt] whitespace-pre-wrap ${CLICKABLE} ${placeholder(preview.legalDescription)} ${dataHighlight(preview.legalDescription)}`}>
                {preview.legalDescription}
              </span>
            </div>

            {preview.apn && (
              <div className={`mb-4 text-[10.5pt] font-bold ${highlight('property')}`}>
                Assessor&rsquo;s Parcel Number: <span onClick={go('property')} className={`font-mono tracking-wider ${CLICKABLE} ${dataHighlight(preview.apn)}`}>{preview.apn}</span>
              </div>
            )}

            {/* Execution: date left, signatures right */}
            <div className="mt-8 flex justify-between items-start gap-4">
              <div className="pt-6 text-[11pt]">
                Dated: <span className="inline-block min-w-[1.6in] border-b border-black" />
              </div>
              <div className="w-[55%]">
                {signers.map((name) => (
                  <div key={name} className="mb-5">
                    <div className="border-b border-black h-7" />
                    <div className={`text-[10px] uppercase mt-0.5 ${placeholder(name)}`}>
                      {name.startsWith('[') ? '' : name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Statutory closing directive */}
            <div className="text-center text-[9px] font-bold uppercase mt-6">
              {MAIL_TAX_DIRECTIVE}
            </div>
              </>
            )}

          </div>
        </div>
        <p className="text-center text-sm text-gray-400 mt-4">Preview updates as you type</p>
      </div>
    </div>
  );
}
