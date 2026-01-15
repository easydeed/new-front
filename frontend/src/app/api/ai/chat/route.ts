/**
 * AI Chat API Route
 * 
 * Proxies AI chat requests to the backend AI assist endpoint.
 * Part 2.1 of DeedPro Wizard Integration
 */

import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Proxy to backend AI assist endpoint
    const response = await fetch(`${BACKEND_URL}/api/ai-assist/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
    
    // Return a helpful fallback response instead of an error
    return NextResponse.json({
      success: true,
      response: "AI assistance is currently unavailable. For questions about California deed types, vesting, or documentary transfer tax, please consult a licensed title professional or attorney.",
    })
  }
}

