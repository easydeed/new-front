/**
 * Phase 15 v5: Partners Create API Proxy
 * Proxies requests to backend /api/partners (POST)
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const backend = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token.value}`;
    }

    const body = await request.json();

    const response = await fetch(`${backend}/api/partners`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: text || `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Proxy] /api/partners POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create partner' },
      { status: 500 }
    );
  }
}

