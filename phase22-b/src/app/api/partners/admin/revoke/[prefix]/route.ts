import { NextResponse } from 'next/server';
import { callExternalAdmin } from '@/lib/externalAdmin';

interface Params { params: { prefix: string } }

export async function DELETE(_: Request, { params }: Params) {
  const res = await callExternalAdmin(`/admin/api-keys/${params.prefix}`, { method: 'DELETE' });
  const data = await res.json();
  return NextResponse.json(data);
}
