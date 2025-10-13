// frontend/src/app/api/notifications/mark-read/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const backend = process.env.NEXT_PUBLIC_API_URL || '';
  const auth = req.headers.get('authorization') || '';
  const body = await req.json();
  const res = await fetch(`${backend}/notifications/mark-read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: auth },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
