// frontend/src/app/api/notifications/unread-count/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const backend = process.env.NEXT_PUBLIC_API_URL || '';
  const auth = req.headers.get('authorization') || '';
  const res = await fetch(`${backend}/notifications/unread-count`, { headers: { authorization: auth }, cache: 'no-store' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
