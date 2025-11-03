'use client';
import React from 'react';
import { CheckCircle } from 'lucide-react';

export default function MicroSummary({ data }:{ data: { deedType?:string; property?:string; apn?:string; grantor?:string; grantee?:string; county?:string } }){
  const bits = [
    data.property,
    data.deedType,
    data.grantor && data.grantee ? `${data.grantor} → ${data.grantee}` : null,
    data.county,
    data.apn && `APN ${data.apn}`
  ].filter(Boolean);
  
  return (
    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-green-800 mb-1">So Far</p>
        <p className="text-sm text-green-700">
          {bits.join(' • ') || 'No information collected yet'}
        </p>
      </div>
    </div>
  );
}
