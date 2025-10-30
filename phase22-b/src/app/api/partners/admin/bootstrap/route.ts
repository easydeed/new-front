import { NextResponse } from 'next/server';
import { callExternalAdmin } from '@/lib/externalAdmin';

export async function POST(req: Request) {
  const body = await req.json();
  const res = await callExternalAdmin('/admin/api-keys/bootstrap', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data);
}
