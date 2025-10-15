export type DocTypeCanonical =
  | 'grant_deed'
  | 'quitclaim'
  | 'interspousal_transfer'
  | 'warranty_deed'
  | 'tax_deed';

const URL_TO_DOCTYPE: Record<string, DocTypeCanonical> = {
  'grant-deed': 'grant_deed',
  'quitclaim-deed': 'quitclaim',
  'quitclaim': 'quitclaim',
  'interspousal-transfer': 'interspousal_transfer',
  'warranty-deed': 'warranty_deed',
  'tax-deed': 'tax_deed',
};

export function canonicalFromUrlParam(param: string | undefined | null): DocTypeCanonical {
  const raw = (param || '').toLowerCase();
  return URL_TO_DOCTYPE[raw] || 'grant_deed';
}

export function toUrlSlug(docType: DocTypeCanonical): string {
  switch (docType) {
    case 'grant_deed': return 'grant-deed';
    case 'quitclaim': return 'quitclaim-deed';
    case 'interspousal_transfer': return 'interspousal-transfer';
    case 'warranty_deed': return 'warranty-deed';
    case 'tax_deed': return 'tax-deed';
    default: return 'grant-deed';
  }
}

export function toLabel(docType: string): string {
  const slug = (docType || '').toLowerCase().replace(/_/g, '-');
  const labels: Record<string,string> = {
    'grant-deed': 'Grant Deed',
    'quitclaim-deed': 'Quitclaim Deed',
    'interspousal-transfer': 'Interspousal Transfer',
    'warranty-deed': 'Warranty Deed',
    'tax-deed': 'Tax Deed',
  };
  return labels[slug] || docType;
}

