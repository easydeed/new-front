'use client';
import React from 'react';
const LABELS: Record<string,string> = {
  'grant-deed':'Grant Deed','quitclaim-deed':'Quitclaim Deed','interspousal-transfer':'Interspousal Transfer','warranty-deed':'Warranty Deed','tax-deed':'Tax Deed',
};
export default function DeedTypeBadge({ docType }:{ docType:string }){
  const label = LABELS[(docType||'').toLowerCase().replace(/_/g,'-')] || docType;
  return (<span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs bg-white"><span style={{width:6,height:6,borderRadius:'9999px',background:'#10b981'}} aria-hidden /> {label}</span>);
}
