/**
 * Partners API Proxy - POST /api/partners
 * Creates a new industry partner
 * Patch 5: Full Partners Infrastructure
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const authHeader = request.headers.get('authorization');
    
    // Proxy to backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
    const res = await fetch(`${backendUrl}/partners`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[API Proxy /api/partners POST] Backend error:', res.status, errorText);
      return NextResponse.json(
        { error: errorText || `Backend returned ${res.status}` },
        { status: res.status }
      );
    }
    
    const data = await res.json();
    console.log('[API Proxy /api/partners POST] Success:', data);
    return NextResponse.json(data, { status: 201 });
    
  } catch (error: any) {
    console.error('[API Proxy /api/partners POST] Exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/partners - List user's partners
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') || 'true';
    
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
    const res = await fetch(`${backendUrl}/partners?active_only=${activeOnly}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[API Proxy /api/partners GET] Backend error:', res.status, errorText);
      return NextResponse.json(
        { error: errorText || `Backend returned ${res.status}` },
        { status: res.status }
      );
    }
    
    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('[API Proxy /api/partners GET] Exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
