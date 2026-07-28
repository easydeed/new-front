/**
 * AI Chat API Route
 * 
 * Proxies AI chat requests to the backend AI assist endpoint.
 * Part 2.1 of DeedPro Wizard Integration
 */

import { NextRequest, NextResponse } from "next/server"

// Doctrine sweep: same resolver chain as every other proxy — the old
// NEXT_PUBLIC_BACKEND_URL || localhost:8000 chain pointed at localhost in
// any deployment where that var was unset (bug #12a's species), and the
// failure was invisible because the catch fabricated a success below.
const BACKEND_URL =
  process.env.BACKEND_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://deedpro-main-api.onrender.com"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Proxy to backend AI assist endpoint (auth required backend-side —
    // forward the caller's bearer token)
    const authHeader = request.headers.get("authorization")
    const response = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        system: body.system || "",
        message: body.message,
        max_tokens: body.max_tokens || 400,
      }),
    })

    if (!response.ok) {
      console.error("[AI Chat] Backend error:", response.status, await response.text())
      return NextResponse.json(
        {
          success: false,
          error: "AI service temporarily unavailable",
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[AI Chat] Error:", error)

    // Doctrine sweep: a failure is an error, not a fabricated AI reply —
    // the old catch returned success:true with canned text, so the UI
    // rendered outage copy as if the assistant had said it.
    return NextResponse.json(
      {
        success: false,
        error: "AI assistance is currently unavailable. Please try again shortly.",
      },
      { status: 502 }
    )
  }
}

