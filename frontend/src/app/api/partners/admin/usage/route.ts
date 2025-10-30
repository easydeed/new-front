import { NextResponse } from 'next/server';
import { callExternalAdmin } from '@/lib/externalAdmin';

export async function GET() {
  const res = await callExternalAdmin('/admin/usage', { method: 'GET' });
  const data = await res.json();
  return NextResponse.json(data);
}
