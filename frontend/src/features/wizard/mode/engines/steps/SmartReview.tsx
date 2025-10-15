'use client';
import React, { useMemo } from 'react';
import { buildReviewLines } from '../../review/smartReviewTemplates';

export default function SmartReview({ data, issues, finalizing, onEdit, onConfirm }:{ data:any; issues?: string[]; finalizing?: boolean; onEdit:(section:string)=>void; onConfirm:()=>void; }){
  const lines = buildReviewLines(data);
  const score = useMemo(()=>{
    const required = ['grantor','grantee']; // extend per docType
    const have = required.filter(k => !!(data as any)[k]).length;
    return Math.round((have / required.length) * 100);
  }, [data]);

  return (
    <div className="space-y-3">
      <div className="bg-white border rounded p-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Smart Review</div>
          <div className="text-xs text-gray-600">Completeness: <strong>{score}%</strong></div>
        </div>
        <div className="space-y-2 mt-2">
          {lines.map((l,i)=>(
            <div key={i} className="flex items-start justify-between gap-2">
              <div>{l}</div>
              <button className="text-emerald-700 text-xs underline" onClick={()=>onEdit('auto')}>Edit</button>
            </div>
          ))}
          {issues && issues.length > 0 && (
            <div className="mt-2 text-xs text-red-600">
              {issues.map((x,i)=>(<div key={i}>⚠️ {x}</div>))}
            </div>
          )}
        </div>
      </div>
      <div className="bg-white border rounded p-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" id="confirmChk" /> I confirm the above is correct
        </label>
        <div className="mt-2">
          <button
            onClick={()=>{
              if (finalizing) return;
              const box = document.getElementById('confirmChk') as HTMLInputElement | null;
              if (!box?.checked) { alert('Please confirm.'); return; }
              // [v4.1] Robust finalize invocation
              Promise.resolve()
                .then(() => onConfirm())
                .catch((e) => {
                  console.error('[SmartReview] finalize failed:', e);
                  alert('Failed to create deed. Please try again.');
                });
            }}
            disabled={finalizing}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {finalizing ? 'Generating...' : 'Confirm & Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}
