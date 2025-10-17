import React from 'react';

export default function DeedTypeBadge({ docType }: { docType: string }) {
  const label = (docType || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  return <span className="badge badge--doc">{label}</span>;
}
