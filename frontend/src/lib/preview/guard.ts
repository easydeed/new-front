
export function validateDeedCompleteness(deed:any): string[] {
  const errs:string[] = [];
  if (!deed?.grantor_name) errs.push('Grantor information is required');
  if (!deed?.grantee_name) errs.push('Grantee information is required');
  if (!deed?.legal_description) errs.push('Legal description is required');
  return errs;
}

export async function generateWithRetry(input:any, init?:RequestInit) {
  const MAX = 3;
  let attempt = 0;
  let last:any;
  while (attempt < MAX) {
    const res = await fetch(input, init);
    if (res.status >= 500 && res.status < 600) {
      await new Promise(r => setTimeout(r, [500,1500,3000][attempt] || 3000));
      attempt++;
      last = res;
      continue;
    }
    return res;
  }
  return last;
}
