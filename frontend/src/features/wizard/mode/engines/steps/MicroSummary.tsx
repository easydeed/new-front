'use client';
import React from 'react';
export default function MicroSummary({ data }:{ data: { deedType?:string; property?:string; apn?:string; grantor?:string; grantee?:string; county?:string } }){
  const bits = [
    data.property,
    data.deedType,
    data.grantor && data.grantee ? `${data.grantor} → ${data.grantee}` : null,
    data.county,
    data.apn && `APN ${data.apn}`
  ].filter(Boolean);
  return <div className="text-xs text-gray-600 border rounded px-2 py-1 bg-gray-50">So far: {bits.join(' • ') || '—'}</div>;
}
