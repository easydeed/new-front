// API proxy for fetching a single deed by ID
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const authHeader = req.headers.get('authorization');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const backend = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
    
    const resp = await fetch(`${backend}/deeds/${id}`, {
      method: 'GET',
      headers,
    });
    
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: 'Deed not found' }));
      return NextResponse.json(err, { status: resp.status });
    }
    
    const json = await resp.json();
    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { detail: e?.message || 'Internal error' },
      { status: 500 }
    );
  }
}

