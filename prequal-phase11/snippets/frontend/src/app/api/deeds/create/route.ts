import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get('authorization');
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;
    const backend = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const resp = await fetch(`${backend}/deeds`, { method:'POST', headers, body: JSON.stringify(body) });
    if (!resp.ok) {
      const err = await resp.json().catch(()=>({ detail:'Upstream error' }));
      return NextResponse.json(err, { status: resp.status });
    }
    const json = await resp.json();
    return NextResponse.json(json, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ detail: e?.message || 'Internal error' }, { status: 500 });
  }
}
