
'use client';
import React from 'react';

export default function DeedTypeBadge({ docType }: { docType: string }) {
  const label = (docType || '').replace('-', ' ').replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className="dp-deed-badge" aria-label={`Document type: ${label}`}>
      {label}
    </span>
  );
}
