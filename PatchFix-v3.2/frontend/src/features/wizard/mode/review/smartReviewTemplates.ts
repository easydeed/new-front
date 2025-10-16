
export type ReviewContext = { docType: string; state: any; };

export function buildReviewLines(ctx: ReviewContext): string[] {
  const s = (ctx.docType || '').toLowerCase();
  const lines: string[] = [];
  const st = ctx.state || {};
  const addr = st?.propertyAddress || st?.property?.address;
  const apn = st?.apn;
  const grantor = st?.grantorName;
  const grantee = st?.granteeName;
  const vesting = st?.vesting;

  lines.push(`Property: ${addr || '—'}${apn ? ' • APN ' + apn : ''}`);
  lines.push(`Parties: Grantor: ${grantor || '—'} → Grantee: ${grantee || '—'}`);
  if (vesting) lines.push(`Vesting: ${vesting}`);

  if (s.includes('interspousal')) {
    if (st?.dttExemptReason) lines.push(`Transfer tax exemption: ${st.dttExemptReason}.`);
    lines.push('This is an interspousal transfer; confirm marital property implications.');
  } else if (s.includes('quitclaim')) {
    lines.push('Quitclaim conveyance — releasing interest without warranties.');
  } else if (s.includes('warranty')) {
    if (st?.covenants) lines.push(`Covenants noted: ${st.covenants}`);
    lines.push('Warranty deed — grantor conveys with warranties.');
  } else if (s.includes('tax')) {
    if (st?.taxSaleRef) lines.push(`Tax sale reference: ${st.taxSaleRef}`);
    lines.push('Deed conveys title per a tax sale; confirm statutory requirements.');
  }

  if (st?.requestedBy) lines.push(`Requested by: ${st.requestedBy}`);

  return lines;
}
