'use client';
import React from 'react';
import { buildReviewLines } from '../../review/smartReviewTemplates';
export default function SmartReview({ data, onEdit, onConfirm }:{ data:any; onEdit:(section:string)=>void; onConfirm:()=>void; }){
  const lines = buildReviewLines(data);
  return (<div className="space-y-3"><div className="bg-white border rounded p-3"><div className="font-semibold mb-1">Smart Review</div><div className="space-y-2">{lines.map((l,i)=>(<div key={i} className="flex items-start justify-between gap-2"><div>{l}</div><button className="text-emerald-700 text-xs underline" onClick={()=>onEdit('auto')}>Edit</button></div>))}{lines.length===0&&<div className="text-sm text-gray-500">No data yet.</div>}</div></div><div className="bg-white border rounded p-3"><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" id="confirmChk" /> I confirm the above is correct</label><div className="mt-2"><button onClick={()=>{const box=document.getElementById('confirmChk') as HTMLInputElement|null; if(!box?.checked){alert('Please confirm.');return;} onConfirm();}} className="px-3 py-1.5 bg-emerald-600 text-white rounded">Confirm & Generate</button></div></div></div>);
}
