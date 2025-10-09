'use client';
import React from 'react';
export type DocType =
  | 'grant_deed_ca'
  | 'quitclaim_deed_ca'
  | 'interspousal_transfer_ca'
  | 'warranty_deed_ca'
  | 'tax_deed_ca';
const LABELS: Record<DocType,string> = {
  grant_deed_ca: 'GRANT DEED',
  quitclaim_deed_ca: 'QUITCLAIM DEED',
  interspousal_transfer_ca: 'INTERSPOUSAL TRANSFER DEED',
  warranty_deed_ca: 'WARRANTY DEED',
  tax_deed_ca: 'TAX DEED',
};
export default function PreviewTitle({ docType }: { docType: DocType }) {
  const title = LABELS[docType] || 'DEED';
  return (
    <h2 style={{ textAlign:'center', margin:'0 0 8px 0', fontSize:18, fontWeight:'bold' }}>
      {title} (Preview)
    </h2>
  );
}
