/**
 * Admin Partners API Proxy - GET /api/admin/partners
 * List all partners across all organizations (admin only)
 * Patch 5: Full Partners Infrastructure
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') || 'false';
    
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
    const res = await fetch(`${backendUrl}/admin/partners?active_only=${activeOnly}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[API Proxy GET /api/admin/partners] Backend error:', res.status, errorText);
      return NextResponse.json(
        { error: errorText || `Backend returned ${res.status}` },
        { status: res.status }
      );
    }
    
    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('[API Proxy GET /api/admin/partners] Exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

