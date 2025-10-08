import { NextResponse } from "next/server";

/**
 * Phase 5-Prequal B: Pixel-Perfect PDF Generation Proxy
 * Forwards requests to the new pixel-perfect backend endpoint
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Fail loud in production if BACKEND_BASE_URL missing
    const base = process.env.BACKEND_BASE_URL || "http://localhost:8000";
    if (process.env.VERCEL && !process.env.BACKEND_BASE_URL) {
      return new NextResponse("BACKEND_BASE_URL not set", { status: 500 });
    }

    // Phase 5-Prequal B: New pixel-perfect endpoint
    const url = `${base}/api/generate/grant-deed-ca-pixel`;
    
    // Get query params (e.g., ?engine=weasyprint)
    const searchParams = new URL(req.url).searchParams;
    const engine = searchParams.get('engine') || 'weasyprint';
    const urlWithParams = `${url}?engine=${engine}`;

    console.log(`[Phase 5-Prequal B] Proxying to: ${urlWithParams}`);

    const upstream = await fetch(urlWithParams, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error(`[Phase 5-Prequal B] Upstream error: ${upstream.status} - ${text}`);
      return new NextResponse(`Upstream ${upstream.status}: ${text}`, { status: upstream.status });
    }

    const buf = await upstream.arrayBuffer();
    
    // Extract performance headers from backend
    const genTime = upstream.headers.get('X-Generation-Time');
    const requestId = upstream.headers.get('X-Request-ID');
    const pdfEngine = upstream.headers.get('X-PDF-Engine');
    
    console.log(`[Phase 5-Prequal B] PDF generated successfully - Time: ${genTime}, Engine: ${pdfEngine}, Request: ${requestId}`);

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Grant_Deed_CA_Pixel.pdf"',
        "X-Generation-Time": genTime || "",
        "X-Request-ID": requestId || "",
        "X-PDF-Engine": pdfEngine || "",
        "X-Phase": "5-Prequal-B"
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Phase 5-Prequal B] Proxy error: ${message}`);
    return new NextResponse(`Proxy error: ${message}`, { status: 500 });
  }
}

