export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

function h(value?: string | null) {
  return (value ?? '').trim();
}

export async function GET(req: Request) {
  try {
    const url = process.env.PARTNERS_URL;
    if (!url) {
      return NextResponse.json({ error: 'Missing PARTNERS_URL' }, { status: 500 });
    }

    const auth = h(req.headers.get('authorization')) || (process.env.PARTNERS_BEARER ? `Bearer ${process.env.PARTNERS_BEARER}` : '');
    const org  = h(req.headers.get('x-organization-id')) || (process.env.PARTNERS_ORG_ID ?? '');

    const headers: Record<string, string> = {};
    if (auth) headers['authorization'] = auth;
    if (org)  headers['x-organization-id'] = org;

    const upstream = await fetch(url, { headers, cache: 'no-store' });
    if (!upstream.ok) {
      // Graceful fallback: return empty list, do not crash Classic UI
      return NextResponse.json([], { status: 200 });
    }
    const data = await upstream.json();
    const arr = Array.isArray(data) ? data : [];
    const normalized = arr.map((x: any) => ({
      id: x?.id ?? x?.value ?? x?.company_id ?? '',
      label: x?.name ?? x?.company_name ?? x?.label ?? ''
    })).filter((x: any) => x.id && x.label);

    if (process.env.NEXT_PUBLIC_DIAG) {
      console.log('[PARTNERS DIAG] upstream size =', arr.length, ' normalized =', normalized.length);
    }
    return NextResponse.json(normalized);
  } catch (err) {
    if (process.env.NEXT_PUBLIC_DIAG) {
      console.warn('[PARTNERS DIAG] error:', err);
    }
    // Never throw—Classic should not crash if partners is down
    return NextResponse.json([], { status: 200 });
  }
}
