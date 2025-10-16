/**
 * Phase 15 v5: Partners SelectList API Proxy
 * Proxies requests to backend /api/partners/selectlist
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backend = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token');

    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token.value}`;
    }

    const response = await fetch(`${backend}/api/partners/selectlist`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Proxy] /api/partners/selectlist error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}

