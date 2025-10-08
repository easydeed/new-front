
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const auth = req.headers.get('authorization');
    const backend = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const res = await fetch(`${backend}/api/generate/tax-deed-ca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(auth?{Authorization:auth}:{}) },
      body: JSON.stringify(body)
    });
    if (!res.ok) { return NextResponse.json(await res.json(), { status: res.status }); }
    const pdf = await res.blob();
    return new NextResponse(pdf, { headers: { 'Content-Type':'application/pdf', 'Content-Disposition': res.headers.get('Content-Disposition') || 'attachment' } });
  } catch (e:any) {
    return NextResponse.json({ detail: e.message || 'Internal error' }, { status: 500 });
  }
}

