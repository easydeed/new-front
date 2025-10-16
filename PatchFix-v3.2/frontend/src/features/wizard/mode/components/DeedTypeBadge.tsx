
'use client';
import React from 'react';
import { slug } from '../../prompts/promptFlows';

const labels: Record<string,string> = {
  'grant-deed': 'Grant Deed',
  'quitclaim-deed': 'Quitclaim Deed',
  'interspousal-transfer': 'Interspousal Transfer',
  'warranty-deed': 'Warranty Deed',
  'tax-deed': 'Tax Deed'
};

export default function DeedTypeBadge({ docType }: { docType: string }) {
  const s = slug(docType);
  return <span className="wiz-badge">{labels[s] || s}</span>;
}
