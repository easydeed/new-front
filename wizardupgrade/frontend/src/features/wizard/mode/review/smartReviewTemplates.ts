export type ReviewContext = {
  docType: string; grantor?: string; grantee?: string; property?: string; apn?: string; county?: string;
  vesting?: string; dttExemptReason?: string; covenants?: string; taxSaleRef?: string;
};
const slug=(t:string)=> (t||'').toLowerCase().replace(/_/g,'-');
export function buildReviewLines(ctx: ReviewContext): string[]{
  const s=slug(ctx.docType); const L:string[]=[];
  if (ctx.grantor && ctx.grantee) L.push(`Grantor ${ctx.grantor} will transfer title to ${ctx.grantee}.`);
  if (ctx.property) L.push(`Property: ${ctx.property}${ctx.apn?` (APN ${ctx.apn})`:''}.`);
  if (ctx.county) L.push(`County: ${ctx.county}.`);
  switch(s){
    case 'grant-deed': if(ctx.vesting) L.push(`Vesting: ${ctx.vesting}.`); break;
    case 'quitclaim-deed': if(ctx.vesting) L.push(`Receiving party vesting: ${ctx.vesting}.`); L.push(`This is a quitclaim conveyance — releasing interest without warranties.`); break;
    case 'interspousal-transfer': if(ctx.dttExemptReason) L.push(`Transfer tax exemption: ${ctx.dttExemptReason}.`); L.push(`This is an interspousal transfer; confirm marital property implications.`); break;
    case 'warranty-deed': if(ctx.covenants) L.push(`Covenants included: ${ctx.covenants}`); else L.push(`Warranty: Grantor conveys with warranties.`); break;
    case 'tax-deed': if(ctx.taxSaleRef) L.push(`Tax sale reference: ${ctx.taxSaleRef}.`); L.push(`This deed conveys title per a tax sale; confirm statutory requirements.`); break;
  } return L;
}
