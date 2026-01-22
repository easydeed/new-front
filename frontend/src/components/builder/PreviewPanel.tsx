'use client';

import { useMemo } from 'react';
import { DeedBuilderState } from '@/types/builder';

interface PreviewPanelProps {
  state: DeedBuilderState;
  activeSection: string;
}

export function PreviewPanel({ state, activeSection }: PreviewPanelProps) {
  const preview = useMemo(() => ({
    requestedBy: state.requestedBy || '[Recording Requested By]',
    returnTo: state.returnTo || state.requestedBy || '[Return To]',
    apn: state.property?.apn || '',
    titleOrderNo: state.titleOrderNo || '',
    escrowNo: state.escrowNo || '',
    dtt: state.dtt?.isExempt 
      ? `EXEMPT - ${state.dtt.exemptReason || '___'}`
      : state.dtt?.calculatedAmount 
        ? `$${state.dtt.calculatedAmount}`
        : '[$_____]',
    grantor: state.grantor || '[GRANTOR NAME]',
    grantee: state.grantee || '[GRANTEE NAME]',
    vesting: state.vesting || '',
    legalDescription: state.property?.legalDescription || '[Legal Description]',
    county: state.property?.county || '[County]',
  }), [state]);

  const deedTitle = {
    'grant-deed': 'GRANT DEED',
    'quitclaim-deed': 'QUITCLAIM DEED',
    'interspousal-transfer': 'INTERSPOUSAL TRANSFER DEED',
    'warranty-deed': 'WARRANTY DEED',
    'tax-deed': 'TAX DEED',
  }[state.deedType] || 'DEED';

  const highlight = (section: string) =>
    activeSection === section 
      ? 'bg-brand-50 ring-2 ring-brand-300 rounded -m-2 p-2' 
      : '';

  const placeholder = (value: string) => 
    value.startsWith('[') ? 'text-gray-400 bg-gray-100 px-1 rounded' : '';

  return (
    <div className="h-full bg-gray-200 p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-2xl" style={{ minHeight: '11in' }}>
          <div className="p-8 pt-6 font-serif text-[13px] leading-relaxed" style={{ paddingLeft: '1in', paddingRight: '0.5in' }}>
            
            {/* Header Section - Grid Layout */}
            <div className="grid grid-cols-[1fr_3.5in] gap-4 mb-4" style={{ minHeight: '2.5in' }}>
              {/* Left Column: Recording Info */}
              <div className={highlight('recording')}>
                <div className="mb-3">
                  <div className="text-[9px] font-bold uppercase tracking-wide mb-0.5">Recording Requested By:</div>
                  <div className="min-h-[0.5in]">
                    <span className={`text-[10px] ${placeholder(preview.requestedBy)}`}>{preview.requestedBy}</span>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-[9px] font-bold uppercase tracking-wide mb-0.5">When Recorded Mail To:</div>
                  <div className="min-h-[0.5in]">
                    <span className={`text-[10px] ${placeholder(preview.returnTo)}`}>{preview.returnTo}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wide mb-0.5">Mail Tax Statements To:</div>
                  <div className="text-[10px]">Same as above</div>
                </div>
              </div>
              
              {/* Right Column: Recorder Box + Reference Numbers */}
              <div className="flex flex-col items-end">
                {/* Recorder's Box */}
                <div className="w-[3.5in] h-[2.5in] border-2 border-black flex flex-col items-center justify-start pt-4">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-center">
                    Space Above This Line<br />For Recorder&apos;s Use Only
                  </span>
                </div>
                
                {/* Reference Numbers - Below recorder box, right aligned */}
                <div className={`mt-2 text-right text-[10px] ${highlight('recording')}`}>
                  {(preview.titleOrderNo || !state.titleOrderNo) && (
                    <div className="flex justify-end items-baseline gap-2 mb-1">
                      <span>Order No.:</span>
                      <span className="inline-block min-w-[1.5in] border-b border-black text-left pl-1">
                        {preview.titleOrderNo || ''}
                      </span>
                    </div>
                  )}
                  {(preview.escrowNo || !state.escrowNo) && (
                    <div className="flex justify-end items-baseline gap-2 mb-1">
                      <span>Escrow No.:</span>
                      <span className="inline-block min-w-[1.5in] border-b border-black text-left pl-1">
                        {preview.escrowNo || ''}
                      </span>
                    </div>
                  )}
                  <div className={`flex justify-end items-baseline gap-2 ${highlight('property')}`}>
                    <span>APN:</span>
                    <span className="inline-block min-w-[1.5in] border-b border-black text-left pl-1 font-mono tracking-wide">
                      {preview.apn || ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Separator Line */}
            <div className="border-b-2 border-black mb-4" />

            {/* Title */}
            <h1 className="text-[22pt] font-bold text-center mb-6 tracking-[4px] uppercase">
              {deedTitle}
            </h1>

            {/* Documentary Transfer Tax Section */}
            <div className={`border border-black p-3 mb-5 text-[10px] ${highlight('transferTax')}`}>
              <div className="font-bold uppercase mb-1">Documentary Transfer Tax</div>
              <div>
                <span className="font-bold">Computed on Full Value: </span>
                <span className={placeholder(preview.dtt)}>{preview.dtt}</span>
              </div>
            </div>

            {/* Body */}
            <p className="mb-4 text-[12pt]">
              FOR A VALUABLE CONSIDERATION, receipt of which is hereby acknowledged,
            </p>

            <div className={`mb-4 ${highlight('grantor')}`}>
              <span className={`font-bold uppercase text-[12pt] ${placeholder(preview.grantor)}`}>{preview.grantor}</span>
              <span className="text-[12pt]"> (&quot;Grantor&quot;)</span>
            </div>

            <p className="mb-4 text-[12pt]">
              hereby <span className="font-bold uppercase">GRANT(S)</span> to
            </p>

            <div className={`mb-4 ${highlight('grantee')}`}>
              <span className={`font-bold uppercase text-[12pt] ${placeholder(preview.grantee)}`}>{preview.grantee}</span>
              {preview.vesting && (
                <span className={`text-[12pt] ${highlight('vesting')}`}>, {preview.vesting}</span>
              )}
              <span className="text-[12pt]"> (&quot;Grantee&quot;)</span>
            </div>

            <p className="mb-4 text-[12pt]">
              the following described real property in the County of{' '}
              <span className={`font-bold uppercase ${placeholder(preview.county)}`}>{preview.county}</span>, State of California:
            </p>

            {/* Legal Description */}
            <div className={`border-l-2 border-gray-300 bg-gray-50 p-3 mb-6 ${highlight('property')}`}>
              <span className={`text-[11pt] ${placeholder(preview.legalDescription)}`}>
                {preview.legalDescription}
              </span>
            </div>

            {/* APN Line (in body) */}
            <div className={`mb-6 text-[11pt] ${highlight('property')}`}>
              <span className="font-bold">Assessor&apos;s Parcel Number: </span>
              <span className="font-mono tracking-wider">{preview.apn || '[APN]'}</span>
            </div>

            {/* Execution Section */}
            <div className="mt-12 space-y-8">
              <div>
                <span className="font-bold">Dated: </span>
                <span className="inline-block min-w-[2.5in] border-b border-black" />
              </div>
              <div className="mt-8">
                <div className="border-b border-black w-[3.5in] h-8" />
                <div className="text-[11pt] uppercase mt-1">{preview.grantor !== '[GRANTOR NAME]' ? preview.grantor : ''}</div>
              </div>
            </div>

          </div>
        </div>
        <p className="text-center text-sm text-gray-400 mt-4">Preview updates as you type</p>
      </div>
    </div>
  );
}

