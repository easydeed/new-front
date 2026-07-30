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
} from '@/lib/deedFurniture';
// FORMS registry: document titles + family come from the one source of
// type facts.
import { formConfig, formFamily } from '@/lib/formRegistry';

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
  const aff = state.affidavit;
  const factOrBlank = (v: string | undefined) => v?.trim() || '________________';
  const operative = OPERATIVE_WORDS[state.deedType] || OPERATIVE_WORDS['grant-deed'];
  const exemptionRecital = EXEMPTION_RECITALS[state.deedType];

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

            {/* Boundary row: APN left, recorder caption right, rule under */}
            <div className="flex justify-between items-baseline border-b border-black pb-0.5 mb-3">
              <span className={`text-[10px] font-bold ${highlight('property')}`}>
                APN: <span onClick={go('property')} className={`font-mono tracking-wide ${CLICKABLE} ${dataHighlight(preview.apn)}`}>{preview.apn || '____________'}</span>
              </span>
              <span className="text-[7.5px] font-bold uppercase">{RECORDER_CAPTION}</span>
            </div>

            {/* Title */}
            <h1 className="text-[14pt] font-bold text-center mb-3 tracking-[2px] uppercase">
              {deedTitle}
            </h1>

            {isAffidavit ? (
              <>
                {/* Sworn-statement recital — form furniture; the FACTS are
                    officer-typed and highlighted/clickable like deed data. */}
                <div className={`text-[11pt] leading-relaxed mb-3 ${highlight('affidavit')}`}>
                  <p className="mb-2">
                    <span onClick={go('affidavit', 'affidavit-affiantName')} className={`font-bold uppercase ${CLICKABLE} ${dataHighlight(aff?.affiantName)}`}>{factOrBlank(aff?.affiantName)}</span>,
                    {' '}of legal age, being first duly sworn, deposes and says:
                  </p>
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
                </div>

                <div className={`mb-3 ${highlight('property')}`}>
                  <span onClick={go('property')} className={`font-bold text-[10.5pt] whitespace-pre-wrap ${CLICKABLE} ${placeholder(preview.legalDescription)} ${dataHighlight(preview.legalDescription)}`}>
                    {preview.legalDescription}
                  </span>
                </div>

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
              {preview.vesting && (
                <span onClick={go('vesting')} className={`text-[11pt] ${CLICKABLE} ${highlight('vesting')} ${dataHighlight(preview.vesting)}`}>, {preview.vesting}</span>
              )}
            </div>

            <p className="mb-2 text-[11pt]">
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
