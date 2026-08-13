// frontend/src/app/api/deeds/draft/route.ts
// Proxy for the builder's U1 autosave (DeedBuilder.persistDraft).
// The builder sends the SAME payload shape as generate (one serializer,
// lib/deedPayload.ts); the backend POST /deeds/draft expects the DraftSave
// shape (grantor_name/grantee_name/deed_type), so map identically to the
// generate proxy before forwarding — a draft must never persist a poorer
// payload than generate does.
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const draftSave = {
      // Present after the first save — updates that row instead of
      // inserting a new one.
      ...(payload.deed_id ? { deed_id: payload.deed_id } : {}),
      deed_type: payload.doc_type,
      property_address: payload.property_address || null,
      property_city: payload.property_city || null,
      property_state: payload.property_state || null,
      property_zip: payload.property_zip || null,
      current_owner: payload.current_owner || null,
      apn: payload.apn || null,
      county: payload.county || null,
      legal_description: payload.legal_description || null,
      grantor_name: payload.grantors_text || null,
      grantee_name: payload.grantees_text || null,
      vesting: payload.vesting || null,
      requested_by: payload.requested_by || null,
      requested_by_address: payload.requested_by_address || null,
      source: 'deed-builder',
      dtt: payload.dtt || null,
      title_order_no: payload.title_order_no || null,
      escrow_no: payload.escrow_no || null,
      return_to: payload.return_to || null,
      provenance: payload.provenance || null,
      affidavit: payload.affidavit || null,
      // FOUND BY AUDIT, and the file's own docstring already forbade it:
      // "a draft must never persist a poorer payload than generate does."
      // `parties` carries the single named party of every declaration-family
      // instrument — the homestead's declarant, the trust certification's
      // trustee, the POA's principal, the TOD revocation's grantor. The
      // create proxy forwards the payload wholesale so generate kept it;
      // this map listed twenty-two fields and not this one, so every
      // single-party draft autosaved without the only party it has, and
      // resumed with that field blank.
      parties: payload.parties || null,
      // §13.3 — see deedPayload.ts. Dropping it here would persist a
      // document that cannot say who chose its parcel.
      parcel: payload.parcel || null,
    };

    const authHeader = req.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-proxy': 'frontend-next',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const resp = await fetch(`${BACKEND_BASE_URL}/deeds/draft`, {
      method: 'POST',
      headers,
      body: JSON.stringify(draftSave),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: 'Upstream error' }));
      return NextResponse.json(err, { status: resp.status });
    }

    const json = await resp.json();
    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    console.error('[proxy:/api/deeds/draft] error:', e);
    return NextResponse.json(
      { detail: 'Proxy error', error: String(e) },
      { status: 500 }
    );
  }
}
