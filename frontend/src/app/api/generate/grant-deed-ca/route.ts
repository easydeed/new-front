import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Fail loud in production if BACKEND_BASE_URL missing
    const base = process.env.BACKEND_BASE_URL || "http://localhost:8000";
    if (process.env.VERCEL && !process.env.BACKEND_BASE_URL) {
      return new NextResponse("BACKEND_BASE_URL not set", { status: 500 });
    }

    // CRITICAL FIX: Forward Authorization header from client to backend
    const authHeader = req.headers.get("authorization");
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const url = `${base}/api/generate/grant-deed-ca`;
    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return new NextResponse(`Upstream ${upstream.status}: ${text}`, { status: upstream.status });
    }

    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Grant_Deed_CA.pdf"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new NextResponse(`Proxy error: ${message}`, { status: 500 });
  }
}
