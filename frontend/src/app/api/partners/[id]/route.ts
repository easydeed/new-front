/**
 * Partners API Proxy - PUT/DELETE /api/partners/{id}
 * Update or delete a partner
 * Patch 5: Full Partners Infrastructure
 */

import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await request.json();
    const authHeader = request.headers.get('authorization');
    const { id } = params;
    
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
    const res = await fetch(`${backendUrl}/partners/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[API Proxy PUT /api/partners/{id}] Backend error:', res.status, errorText);
      return NextResponse.json(
        { error: errorText || `Backend returned ${res.status}` },
        { status: res.status }
      );
    }
    
    const data = await res.json();
    console.log('[API Proxy PUT /api/partners/{id}] Success:', data);
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('[API Proxy PUT /api/partners/{id}] Exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { id } = params;
    
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
    const res = await fetch(`${backendUrl}/partners/${id}`, {
      method: 'DELETE',
      headers: {
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[API Proxy DELETE /api/partners/{id}] Backend error:', res.status, errorText);
      return NextResponse.json(
        { error: errorText || `Backend returned ${res.status}` },
        { status: res.status }
      );
    }
    
    console.log('[API Proxy DELETE /api/partners/{id}] Success');
    return NextResponse.json({ success: true }, { status: 204 });
    
  } catch (error: any) {
    console.error('[API Proxy DELETE /api/partners/{id}] Exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

