'use client';
import React from 'react';

export type DocType =
  | 'grant_deed'
  | 'quitclaim'
  | 'interspousal_transfer'
  | 'warranty_deed'
  | 'tax_deed';

const LABELS: Record<DocType, string> = {
  grant_deed: 'GRANT DEED',
  quitclaim: 'QUITCLAIM DEED',
  interspousal_transfer: 'INTERSPOUSAL TRANSFER DEED',
  warranty_deed: 'WARRANTY DEED',
  tax_deed: 'TAX DEED',
};

export default function PreviewTitle({ docType }: { docType: DocType }) {
  const title = LABELS[docType] || 'DEED';
  return (
    <h2 style={{ textAlign: 'center', margin: '0 0 8px 0', fontSize: 18, fontWeight: 'bold' }}>
      {title} (Preview)
    </h2>
  );
}

