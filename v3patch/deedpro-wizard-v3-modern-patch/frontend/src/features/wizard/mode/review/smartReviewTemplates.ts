
export type ReviewContext = { docType: string; state: any };

function slug(s: string) { return (s || '').replace('_','-'); }

export function buildReviewLines(ctx: ReviewContext): string[] {
  const lines: string[] = [];
  const s = ctx.state || {};
  lines.push(`Grantor: ${s.grantorName || '—'} → Grantee: ${s.granteeName || '—'}`);
  if (s.propertyAddress) lines.push(`Property: ${s.propertyAddress}${s.apn ? ' (APN ' + s.apn + ')' : ''}`);
  if (s.vesting) lines.push(`Vesting: ${s.vesting}`);
  if (s.requestedBy) lines.push(`Requested by: ${s.requestedBy}`);

  switch (slug(ctx.docType)) {
    case 'interspousal-transfer':
      if (s.dttExemptReason) lines.push(`Transfer tax exemption: ${s.dttExemptReason}.`);
      lines.push('This is an interspousal transfer; confirm marital property implications.');
      break;
    case 'quitclaim-deed':
      lines.push('This is a quitclaim conveyance — releasing interest without warranties.');
      break;
    case 'warranty-deed':
      if (s.covenants) lines.push('Warranty covenants: included.');
      break;
    case 'tax-deed':
      if (s.taxSaleRef) lines.push(`Conveys title per tax sale reference: ${s.taxSaleRef}.`);
      break;
  }
  return lines;
}
