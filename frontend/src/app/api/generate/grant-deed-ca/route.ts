import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const payload = await req.json();
  const url = process.env.BACKEND_BASE_URL
    ? `${process.env.BACKEND_BASE_URL}/generate/grant-deed-ca`
    : "http://localhost:8000/generate/grant-deed-ca";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    return new NextResponse(text, { status: res.status });
  }
  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Grant_Deed_CA.pdf"'
    }
  });
}
