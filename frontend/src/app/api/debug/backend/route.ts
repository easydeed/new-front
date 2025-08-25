import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    vercel: !!process.env.VERCEL,
    backend_base_url: process.env.BACKEND_BASE_URL || null,
  });
}
