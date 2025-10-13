// frontend/src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const backend = process.env.NEXT_PUBLIC_API_URL || '';
  const auth = req.headers.get('authorization') || '';
  const res = await fetch(`${backend}/notifications/`, { headers: { authorization: auth } });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
