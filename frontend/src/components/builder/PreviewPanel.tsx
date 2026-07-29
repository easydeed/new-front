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

interface PreviewPanelProps {
  state: DeedBuilderState;
  activeSection: string;
}

const DEED_TITLES: Record<string, string> = {
  'grant-deed': 'GRANT DEED',
  'quitclaim-deed': 'QUITCLAIM DEED',
  'interspousal-transfer': 'INTERSPOUSAL TRANSFER DEED',
  'warranty-deed': 'WARRANTY DEED',
  'tax-deed': 'TAX DEED',
};

function Checkline({ marked }: { marked: boolean }) {
  return (
    <span className="inline-block w-7 border-b border-black text-center font-bold mr-1">
      {marked ? 'X' : ' '}
    </span>
  );
}

export function PreviewPanel({ state, activeSection }: PreviewPanelProps) {
  const preview = useMemo(() => ({
    requestedBy: state.requestedBy || '[Recording Requested By]',
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

  const deedTitle = DEED_TITLES[state.deedType] || 'DEED';
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
                  <span className={`text-[10px] ${placeholder(preview.requestedBy)} ${dataHighlight(preview.requestedBy)}`}>{preview.requestedBy}</span>
                </div>

                <div className="text-[9px] font-bold uppercase tracking-wide">
                  Mail Tax Statements and<br />When Recorded Mail To:
                </div>
                <div className="min-h-[0.3in] mb-2">
                  <span className={`text-[10px] ${placeholder(preview.returnTo)} ${dataHighlight(preview.returnTo)}`}>{preview.returnTo}</span>
                  {preview.returnToLines.map((line) => (
                    <span key={line} className={`block text-[10px] ${dataHighlight(line)}`}>{line}</span>
                  ))}
                </div>

                <div className="text-[10px]">
                  Order No.: {preview.titleOrderNo
                    ? <span className={dataHighlight(preview.titleOrderNo)}>{preview.titleOrderNo}</span>
                    : '____________'}
                </div>
                <div className="text-[10px]">
                  Escrow No.: {preview.escrowNo
                    ? <span className={dataHighlight(preview.escrowNo)}>{preview.escrowNo}</span>
                    : '____________'}
                </div>
              </div>

              {/* Recorder's space: deliberately empty — stamps land here */}
              <div className="flex-grow" aria-label="Space reserved for the county recorder" />
            </div>

            {/* Boundary row: APN left, recorder caption right, rule under */}
            <div className="flex justify-between items-baseline border-b border-black pb-0.5 mb-3">
              <span className={`text-[10px] ${highlight('property')}`}>
                APN: <span className={`font-mono tracking-wide ${dataHighlight(preview.apn)}`}>{preview.apn || '____________'}</span>
              </span>
              <span className="text-[7.5px] font-bold uppercase">{RECORDER_CAPTION}</span>
            </div>

            {/* Title */}
            <h1 className="text-[14pt] font-bold text-center mb-3 tracking-[2px] uppercase">
              {deedTitle}
            </h1>

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
                    <span className={`inline-block min-w-[1.2in] border-b border-black text-center ${dataHighlight(dttAmount)}`}>
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
                  <span className={`inline-block min-w-[1.2in] border-b border-black text-center ${dataHighlight(dtt?.areaType === 'city' ? dtt.cityName : '')}`}>
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
              <span className={`font-bold uppercase text-[11pt] ${placeholder(preview.grantor)} ${dataHighlight(preview.grantor)}`}>{preview.grantor}</span>
            </div>

            <p className="mb-2 text-[11pt]">{operative}</p>

            <div className={`mb-2 ${highlight('grantee')}`}>
              <span className={`font-bold uppercase text-[11pt] ${placeholder(preview.grantee)} ${dataHighlight(preview.grantee)}`}>{preview.grantee}</span>
              {preview.vesting && (
                <span className={`text-[11pt] ${highlight('vesting')} ${dataHighlight(preview.vesting)}`}>, {preview.vesting}</span>
              )}
            </div>

            <p className="mb-2 text-[11pt]">
              the real property situated in the County of{' '}
              <span className={`font-bold ${placeholder(preview.county)} ${dataHighlight(preview.county)}`}>{preview.county}</span>,
              State of California, more particularly described as follows:
            </p>

            {/* Legal description — plain text, no box; D1: bolded like the
                parties, mirroring the chassis .legal-content weight. */}
            <div className={`mb-3 ${highlight('property')}`}>
              <span className={`font-bold text-[10.5pt] whitespace-pre-wrap ${placeholder(preview.legalDescription)} ${dataHighlight(preview.legalDescription)}`}>
                {preview.legalDescription}
              </span>
            </div>

            {preview.apn && (
              <div className={`mb-4 text-[10.5pt] ${highlight('property')}`}>
                Assessor&rsquo;s Parcel Number: <span className={`font-mono tracking-wider ${dataHighlight(preview.apn)}`}>{preview.apn}</span>
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

          </div>
        </div>
        <p className="text-center text-sm text-gray-400 mt-4">Preview updates as you type</p>
      </div>
    </div>
  );
}
