"""
DeedPro Public API v1 Router
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Request, Response
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
import json
import io
import os
import time

from database import get_db_connection
from schemas.api_v1.deeds import (
    CreateDeedRequest, DeedResponse, DeedDataResponse, DeedUrlsModel,
    DeedPropertyResponse, DeedPartiesResponse, DeedTransferTaxResponse,
    DeedListResponse, DeedListItem, PaginationModel,
    TransferTaxCalculateRequest, TransferTaxCalculateResponse,
    VerificationResponse, VerificationDocumentModel, VerificationPropertyModel, VerificationPartiesModel,
    APIErrorResponse, ErrorResponse
)
from services.api_catalog import chassis_type
from services.dtt_rates import compute_dtt
from utils.api_keys import extract_key_prefix, validate_api_key, generate_deed_id, generate_document_id
from utils.short_code import generate_content_hash
from pdf_engine import render_pdf_async
from services.deed_pdf import render_deed_html


def build_render_row(deed_request) -> dict:
    """Map a partner-API CreateDeedRequest onto the row shape the shared
    deed chassis renders (services/deed_pdf.build_context_from_row). The
    API's underscore deed types normalize to the template map's keys."""
    tt = deed_request.transfer_tax
    dtt = {
        "calculated_amount": tt.computed_amount or "",
        "basis": tt.basis.value if tt.basis else "full_value",
        "area_type": "city" if tt.city_tax else "unincorporated",
        "city_name": tt.city_name or "",
        "is_exempt": bool(tt.exempt),
        "exemption_reason": tt.exempt_code or "",
    }
    ret = deed_request.recording.return_to
    # A2: entity recitals ride in metadata.affidavit, the same slot the
    # wizard's entity deeds read (templates bind `aff = affidavit`).
    entity = getattr(deed_request.grantor, "entity", None)
    affidavit = None
    if entity is not None:
        facts = {k: v for k, v in {
            "entity_state": entity.entity_state,
            "partnership_type": entity.partnership_type,
        }.items() if v}
        affidavit = facts or None
    return {
        "deed_type": chassis_type(deed_request.deed_type.value),
        "grantor_name": deed_request.grantor.name,
        "grantee_name": deed_request.grantee.name,
        "legal_description": deed_request.property.legal_description,
        "county": deed_request.property.county,
        "apn": deed_request.property.apn,
        "vesting": deed_request.grantee.vesting,
        "requested_by": deed_request.recording.requested_by,
        "metadata": {
            "affidavit": affidavit,
            "title_order_no": deed_request.recording.title_order_no,
            "escrow_no": deed_request.recording.escrow_no,
            "return_to": {
                "name": ret.name,
                "company": ret.company,
                "address1": ret.address,
                "city": ret.city,
                "state": ret.state,
                "zip": ret.zip,
            },
            "dtt": dtt,
        },
    }

router = APIRouter(prefix="/api/v1", tags=["Public API v1"])

# ============================================================================
# AUTH DEPENDENCY
# ============================================================================

async def get_api_key(
    authorization: str = Header(..., description="Bearer token with API key"),
    request: Request = None
) -> dict:
    """
    Validate API key from Authorization header.
    Returns the api_key record if valid.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHORIZED", "message": "Invalid authorization header format"}
        )
    
    full_key = authorization[7:]  # Remove "Bearer "
    key_prefix = extract_key_prefix(full_key)
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(
            status_code=500,
            detail={"code": "INTERNAL_ERROR", "message": "Database connection failed"}
        )
    
    try:
        cursor = conn.cursor()

        # Look up key by prefix. A1 fix: database.get_db_connection hands
        # out RealDictCursor connections — rows are DICTS. The original
        # code tuple-unpacked them, so key_hash became the literal string
        # 'key_hash' and every valid key 401'd. This path had never run.
        cursor.execute("""
            SELECT id, key_hash, name, organization_id, scopes,
                   rate_limit_hour, rate_limit_day, is_active, is_test
            FROM api_keys
            WHERE key_prefix = %s
        """, (key_prefix,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=401,
                detail={"code": "UNAUTHORIZED", "message": "Invalid API key"}
            )

        api_key_id = str(row['id'])  # UUID → string for JSON serialization
        key_hash = row['key_hash']
        name = row['name']
        org_id = row['organization_id']
        scopes = row['scopes']
        rate_hour = row['rate_limit_hour'] or 100
        rate_day = row['rate_limit_day'] or 1000
        is_active = row['is_active']
        is_test = row['is_test']

        # Validate hash
        if not validate_api_key(full_key, key_hash):
            raise HTTPException(
                status_code=401,
                detail={"code": "UNAUTHORIZED", "message": "Invalid API key"}
            )

        if not is_active:
            raise HTTPException(
                status_code=403,
                detail={"code": "FORBIDDEN", "message": "API key is deactivated"}
            )

        # Check rate limits
        now = datetime.utcnow()
        hour_key = now.strftime('%Y%m%d%H')
        day_key = now.strftime('%Y%m%d')

        # Get current counts (dict rows here too — the original indexed
        # positionally and crashed)
        cursor.execute("""
            SELECT window_type, request_count
            FROM api_rate_limits
            WHERE api_key_id = %s AND (
                (window_type = 'hour' AND window_key = %s) OR
                (window_type = 'day' AND window_key = %s)
            )
        """, (api_key_id, hour_key, day_key))

        limits = {r['window_type']: r['request_count'] for r in cursor.fetchall()}
        hour_count = limits.get('hour', 0)
        day_count = limits.get('day', 0)
        
        if hour_count >= rate_hour:
            raise HTTPException(
                status_code=429,
                detail={"code": "RATE_LIMITED", "message": "Hourly rate limit exceeded"},
                headers={
                    "X-RateLimit-Limit": str(rate_hour),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int((now.replace(minute=0, second=0, microsecond=0).timestamp()) + 3600))
                }
            )
        
        if day_count >= rate_day:
            raise HTTPException(
                status_code=429,
                detail={"code": "RATE_LIMITED", "message": "Daily rate limit exceeded"}
            )
        
        # Increment rate limit counters
        cursor.execute("""
            INSERT INTO api_rate_limits (api_key_id, window_type, window_key, request_count)
            VALUES (%s, 'hour', %s, 1)
            ON CONFLICT (api_key_id, window_type, window_key) 
            DO UPDATE SET request_count = api_rate_limits.request_count + 1
        """, (api_key_id, hour_key))
        
        cursor.execute("""
            INSERT INTO api_rate_limits (api_key_id, window_type, window_key, request_count)
            VALUES (%s, 'day', %s, 1)
            ON CONFLICT (api_key_id, window_type, window_key) 
            DO UPDATE SET request_count = api_rate_limits.request_count + 1
        """, (api_key_id, day_key))
        
        # Update last_used_at
        cursor.execute("UPDATE api_keys SET last_used_at = NOW() WHERE id = %s", (api_key_id,))
        
        conn.commit()
        
        return {
            "id": api_key_id,
            "name": name,
            "organization_id": org_id,
            "scopes": scopes or [],
            "is_test": is_test,
            "rate_limit_hour": rate_hour,
            "rate_limit_remaining": rate_hour - hour_count - 1
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"API key validation error: {e}")
        raise HTTPException(
            status_code=500,
            detail={"code": "INTERNAL_ERROR", "message": "Authentication failed"}
        )
    finally:
        cursor.close()
        conn.close()


def add_rate_limit_headers(response: Response, api_key: dict):
    """Add rate limit headers to response."""
    response.headers["X-RateLimit-Limit"] = str(api_key.get("rate_limit_hour", 100))
    response.headers["X-RateLimit-Remaining"] = str(api_key.get("rate_limit_remaining", 0))


def _api_base_url() -> str:
    return os.getenv("API_BASE_URL", "https://deedpro-main-api.onrender.com")


def _verification_base_url() -> str:
    return os.getenv("FRONTEND_URL", "https://deedpro-frontend-new.vercel.app")


def _client_ip(request: Optional[Request]) -> Optional[str]:
    """ip_address is INET — a non-address value (TestClient sends the
    literal 'testclient') raises, and a raise inside the transaction
    aborts it. Validate here; unparseable hosts meter as NULL."""
    import ipaddress
    host = request.client.host if request and request.client else None
    if not host:
        return None
    try:
        ipaddress.ip_address(host)
        return host
    except ValueError:
        return None


def _log_usage(cursor, api_key_id: str, endpoint: str, method: str,
               status_code: int, started_at: float, request: Optional[Request]):
    """Metering (Flag-3 ruling: free manual keys, but metering from day
    one — pricing later prices from data, not guesses).

    SAVEPOINT is load-bearing, not decoration. A bare try/except around a
    failing INSERT leaves the transaction ABORTED in Postgres: the
    subsequent commit() then discards everything silently — the deed row,
    the authenticity record, all of it — while the caller still gets a
    200 with a deed_id that does not exist. (Caught by the A1 harness;
    same class as the poisoned-connection outage.) The savepoint confines
    a metering failure to itself: the deed always survives its meter.
    """
    try:
        cursor.execute("SAVEPOINT usage_log")
        response_time_ms = int((time.time() - started_at) * 1000)
        user_agent = (request.headers.get("user-agent", "") or "")[:500] if request else None
        cursor.execute("""
            INSERT INTO api_usage_log (api_key_id, endpoint, method, status_code, response_time_ms, ip_address, user_agent)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (api_key_id, endpoint, method, status_code, response_time_ms,
              _client_ip(request), user_agent))
        cursor.execute("RELEASE SAVEPOINT usage_log")
    except Exception as log_err:
        try:
            cursor.execute("ROLLBACK TO SAVEPOINT usage_log")
        except Exception:
            pass
        print(f"[api-v1] usage log failed (non-blocking): {log_err}")


def _deed_response_payload(deed_id: str, document_id: str, deed_type: str,
                           status: str, created_at, property_address: str,
                           apn: Optional[str], county: Optional[str],
                           grantor_name: Optional[str], grantee_name: Optional[str],
                           transfer_tax_amount, transfer_tax_exempt) -> DeedResponse:
    """One response shape for fresh creates and idempotent replays."""
    return DeedResponse(
        success=True,
        data=DeedDataResponse(
            deed_id=deed_id,
            document_id=document_id,
            deed_type=deed_type,
            status=status,
            created_at=created_at,
            urls=DeedUrlsModel(
                pdf=f"{_api_base_url()}/api/v1/deeds/{deed_id}/pdf",
                verification=f"{_verification_base_url()}/verify/{document_id}"
            ),
            property=DeedPropertyResponse(
                address=property_address,
                apn=apn,
                county=county
            ),
            parties=DeedPartiesResponse(
                grantor=grantor_name.split(',')[0].strip() if grantor_name else None,
                grantee=grantee_name.split(',')[0].strip() if grantee_name else None
            ),
            transfer_tax=DeedTransferTaxResponse(
                amount=f"${transfer_tax_amount:.2f}" if transfer_tax_amount else None,
                exempt=bool(transfer_tax_exempt)
            )
        )
    )


# ============================================================================
# DEED ENDPOINTS
# ============================================================================

@router.post("/deeds", response_model=DeedResponse)
async def create_deed(
    request: Request,
    deed_request: CreateDeedRequest,
    api_key: dict = Depends(get_api_key),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key",
                                            description="Optional client-chosen key; retries with the same key return the original deed instead of generating a duplicate")
):
    """
    Generate a new deed document.

    Returns the deed metadata including PDF download URL and verification URL.
    """
    start_time = time.time()

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail={"code": "INTERNAL_ERROR", "message": "Database unavailable"})

    try:
        cursor = conn.cursor()

        # A1: idempotent replay — platforms retry, and a retried create
        # must not mint a second instrument. Same (key, Idempotency-Key)
        # → the original deed's response, byte-for-byte shape.
        if idempotency_key:
            cursor.execute("""
                SELECT deed_id, document_id, deed_type, status, created_at,
                       property_address, property_apn, property_county,
                       grantor_name, grantee_name,
                       transfer_tax_amount, transfer_tax_exempt
                FROM api_deeds
                WHERE api_key_id = %s AND idempotency_key = %s
            """, (api_key["id"], idempotency_key))
            existing = cursor.fetchone()
            if existing:
                _log_usage(cursor, api_key["id"], "/api/v1/deeds", "POST", 200, start_time, request)
                conn.commit()
                return _deed_response_payload(
                    existing['deed_id'], existing['document_id'], existing['deed_type'],
                    existing['status'], existing['created_at'], existing['property_address'],
                    existing['property_apn'], existing['property_county'],
                    existing['grantor_name'], existing['grantee_name'],
                    existing['transfer_tax_amount'], existing['transfer_tax_exempt'])

        # Generate unique IDs
        deed_id = generate_deed_id()
        document_id = generate_document_id()

        # A1 fix: full_address was referenced three times below but never
        # assigned — POST /api/v1/deeds NameError'd on every call, ever.
        p = deed_request.property
        full_address = f"{p.address}, {p.city}, {p.state} {p.zip}"
        
        # Build deed data for template
        deed_data = {
            "deed_type": deed_request.deed_type.value,
            "property_address": deed_request.property.address,
            "property_city": deed_request.property.city,
            "property_state": deed_request.property.state,
            "property_zip": deed_request.property.zip,
            "property_county": deed_request.property.county,
            "property_apn": deed_request.property.apn,
            "legal_description": deed_request.property.legal_description,
            "grantor_name": deed_request.grantor.name,
            "grantee_name": deed_request.grantee.name,
            "grantee_vesting": deed_request.grantee.vesting,
            "transfer_tax_exempt": deed_request.transfer_tax.exempt,
            "transfer_tax_exempt_code": deed_request.transfer_tax.exempt_code,
            "transfer_tax_value": deed_request.transfer_tax.value,
            "transfer_tax_amount": deed_request.transfer_tax.computed_amount,
            "recording_requested_by": deed_request.recording.requested_by,
            "recording_return_to_name": deed_request.recording.return_to.name,
            "recording_return_to_company": deed_request.recording.return_to.company,
            "recording_return_to_address": deed_request.recording.return_to.address,
            "recording_return_to_city": deed_request.recording.return_to.city,
            "recording_return_to_state": deed_request.recording.return_to.state,
            "recording_return_to_zip": deed_request.recording.return_to.zip,
            "title_order_no": deed_request.recording.title_order_no,
            "escrow_no": deed_request.recording.escrow_no,
            "document_id": document_id,
            "include_qr_code": deed_request.options.include_qr_code if deed_request.options else True,
        }
        
        # Doctrine sweep: render through the shared recorder-compliant
        # chassis (services/deed_pdf), not the old inline HTML — that
        # ad-hoc template had no recorder's space, no DTT declaration, no
        # acknowledgment, and printed the Document ID / verify URL on the
        # instrument itself (chrome on a recorded page). Verification data
        # stays in the response URLs and the authenticity record.
        html_content = render_deed_html(build_render_row(deed_request))

        # Generate PDF
        try:
            pdf_bytes = await render_pdf_async(html_content)
        except Exception as pdf_error:
            print(f"PDF generation error: {pdf_error}")
            raise HTTPException(
                status_code=500,
                detail={"code": "INTERNAL_ERROR", "message": "PDF generation failed"}
            )
        
        # Create document authenticity record (for QR verification)
        content_hash = generate_content_hash(json.dumps(deed_request.dict(), default=str))
        
        cursor.execute("""
            INSERT INTO document_authenticity (
                short_code, document_type, property_address, property_apn, county,
                grantor_display, grantee_display, content_hash, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'active')
            RETURNING id
        """, (
            document_id,
            deed_request.deed_type.value,
            full_address,
            deed_request.property.apn,
            deed_request.property.county,
            deed_request.grantor.name[:50],  # Abbreviated
            deed_request.grantee.name[:50],
            content_hash
        ))
        authenticity_id = cursor.fetchone()['id']
        
        # Store API deed record
        transfer_tax_amount = None
        if deed_request.transfer_tax.computed_amount:
            try:
                transfer_tax_amount = float(deed_request.transfer_tax.computed_amount.replace('$', '').replace(',', ''))
            except:
                pass
        
        created_at = datetime.utcnow()
        cursor.execute("""
            INSERT INTO api_deeds (
                deed_id, document_id, api_key_id, deed_type, status,
                property_address, property_city, property_county, property_apn,
                grantor_name, grantee_name,
                transfer_tax_amount, transfer_tax_exempt,
                pdf_data, request_data, authenticity_id, idempotency_key
            ) VALUES (%s, %s, %s, %s, 'completed', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            deed_id,
            document_id,
            api_key["id"],
            deed_request.deed_type.value,
            full_address,
            deed_request.property.city,
            deed_request.property.county,
            deed_request.property.apn,
            deed_request.grantor.name,
            deed_request.grantee.name,
            transfer_tax_amount,
            deed_request.transfer_tax.exempt,
            pdf_bytes,
            json.dumps(deed_request.dict(), default=str),
            authenticity_id,
            idempotency_key
        ))

        _log_usage(cursor, api_key["id"], "/api/v1/deeds", "POST", 200, start_time, request)

        conn.commit()

        return _deed_response_payload(
            deed_id, document_id, deed_request.deed_type.value, "completed",
            created_at, full_address, deed_request.property.apn,
            deed_request.property.county, deed_request.grantor.name,
            deed_request.grantee.name, transfer_tax_amount,
            deed_request.transfer_tax.exempt)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create deed error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={"code": "INTERNAL_ERROR", "message": str(e)}
        )
    finally:
        cursor.close()
        conn.close()


@router.get("/deeds/{deed_id}")
async def get_deed(
    request: Request,
    deed_id: str,
    api_key: dict = Depends(get_api_key)
):
    """Get deed metadata by deed_id."""
    start_time = time.time()
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail={"code": "INTERNAL_ERROR", "message": "Database unavailable"})

    try:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT deed_id, document_id, deed_type, status, created_at,
                   property_address, property_apn, property_county,
                   grantor_name, grantee_name,
                   transfer_tax_amount, transfer_tax_exempt
            FROM api_deeds
            WHERE deed_id = %s AND api_key_id = %s
        """, (deed_id, api_key["id"]))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=404,
                detail={"code": "NOT_FOUND", "message": "Deed not found"}
            )

        _log_usage(cursor, api_key["id"], "/api/v1/deeds/{deed_id}", "GET", 200, start_time, request)
        conn.commit()

        return {
            "success": True,
            "data": {
                "deed_id": row['deed_id'],
                "document_id": row['document_id'],
                "deed_type": row['deed_type'],
                "status": row['status'],
                "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                "urls": {
                    "pdf": f"{_api_base_url()}/api/v1/deeds/{row['deed_id']}/pdf",
                    "verification": f"{_verification_base_url()}/verify/{row['document_id']}"
                },
                "property": {
                    "address": row['property_address'],
                    "apn": row['property_apn'],
                    "county": row['property_county']
                },
                "parties": {
                    "grantor": row['grantor_name'].split(',')[0].strip() if row['grantor_name'] else None,
                    "grantee": row['grantee_name'].split(',')[0].strip() if row['grantee_name'] else None
                }
            }
        }

    finally:
        cursor.close()
        conn.close()


@router.get("/deeds/{deed_id}/pdf")
async def download_deed_pdf(
    request: Request,
    deed_id: str,
    api_key: dict = Depends(get_api_key)
):
    """Download the generated PDF document."""
    start_time = time.time()
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail={"code": "INTERNAL_ERROR", "message": "Database unavailable"})

    try:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT pdf_data, document_id
            FROM api_deeds
            WHERE deed_id = %s AND api_key_id = %s
        """, (deed_id, api_key["id"]))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=404,
                detail={"code": "NOT_FOUND", "message": "Deed not found"}
            )

        pdf_data, document_id = row['pdf_data'], row['document_id']

        _log_usage(cursor, api_key["id"], "/api/v1/deeds/{deed_id}/pdf", "GET", 200, start_time, request)
        conn.commit()

        if not pdf_data:
            raise HTTPException(
                status_code=404,
                detail={"code": "NOT_FOUND", "message": "PDF not available"}
            )
        
        return StreamingResponse(
            io.BytesIO(bytes(pdf_data)),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{document_id}.pdf"'
            }
        )
        
    finally:
        cursor.close()
        conn.close()


@router.get("/deeds")
async def list_deeds(
    request: Request,
    page: int = 1,
    limit: int = 20,
    deed_type: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    api_key: dict = Depends(get_api_key)
):
    """List all deeds created by your API key."""
    start_time = time.time()
    if limit > 100:
        limit = 100
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail={"code": "INTERNAL_ERROR", "message": "Database unavailable"})
    
    try:
        cursor = conn.cursor()
        
        # Build query
        where_clauses = ["api_key_id = %s"]
        params = [api_key["id"]]
        
        if deed_type:
            where_clauses.append("deed_type = %s")
            params.append(deed_type)
        
        if status:
            where_clauses.append("status = %s")
            params.append(status)
        
        if from_date:
            where_clauses.append("created_at >= %s")
            params.append(from_date)
        
        if to_date:
            where_clauses.append("created_at <= %s")
            params.append(to_date)
        
        where_sql = " AND ".join(where_clauses)

        # Get total count
        cursor.execute(f"SELECT COUNT(*) AS count FROM api_deeds WHERE {where_sql}", params)
        total = cursor.fetchone()['count']

        # Get paginated results
        offset = (page - 1) * limit
        cursor.execute(f"""
            SELECT deed_id, document_id, deed_type, status, created_at, property_address
            FROM api_deeds
            WHERE {where_sql}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])

        deeds = []
        for row in cursor.fetchall():
            deeds.append({
                "deed_id": row['deed_id'],
                "document_id": row['document_id'],
                "deed_type": row['deed_type'],
                "status": row['status'],
                "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                "property_address": row['property_address']
            })

        total_pages = (total + limit - 1) // limit

        _log_usage(cursor, api_key["id"], "/api/v1/deeds", "GET", 200, start_time, request)
        conn.commit()

        return {
            "success": True,
            "data": {
                "deeds": deeds,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "total_pages": total_pages
                }
            }
        }
        
    finally:
        cursor.close()
        conn.close()


# ============================================================================
# TRANSFER TAX CALCULATOR
# ============================================================================

@router.post("/transfer-tax/calculate")
async def calculate_transfer_tax(
    request: TransferTaxCalculateRequest,
    api_key: dict = Depends(get_api_key)
):
    """Calculate documentary transfer tax for a given value and location.

    A2: this endpoint used to carry its OWN city-rate table, and it
    disagreed with the officer-facing calculator (San Francisco $3.75 vs
    $7.50, Santa Monica and Berkeley priced here and not there). Whichever
    surface a caller happened to use decided what their deed declared.
    One source now: services/dtt_rates, mirrored to dttCalc.ts and pinned.
    """
    taxable_value = request.value - request.less_liens
    dtt = compute_dtt(taxable_value, request.city)
    city_rate = dtt["city_rate_per_1000"]

    city_breakdown = None
    if request.city:
        if city_rate is None and not dtt["city_rate_known"]:
            # T-2: the third state, which used to be silently folded into
            # "levies none". We do not hold this place, so we do not know.
            # Saying "levies none" here was an invented $0 — the same class
            # of error as the invented $7,500 substring matching produced
            # for South San Francisco, just costing the other party.
            city_breakdown = {
                "name": request.city,
                "rate": None,
                "amount": 0.0,
                "notes": (
                    "No verified transfer-tax rate on file for this city. "
                    "The county portion above is complete; confirm any city "
                    "portion against the city's current schedule."
                ),
            }
        elif city_rate is None:
            # Honest silence beats an invented number: this place is on
            # file and affirmatively levies no municipal transfer tax.
            city_breakdown = {
                "name": request.city,
                "rate": None,
                "amount": 0.0,
                "notes": "This city levies no documentary transfer tax of its own.",
            }
        else:
            city_breakdown = {
                "name": request.city,
                "rate": f"${city_rate:.2f} per $1,000",
                "amount": dtt["city_tax"],
                "notes": None,
            }

    return {
        "success": True,
        "data": {
            "taxable_value": taxable_value,
            "county_tax": dtt["county_tax"],
            "city_tax": dtt["city_tax"],
            "total_tax": dtt["total_tax"],
            "breakdown": {
                "county": {
                    "name": f"{request.county} County",
                    "rate": f"${dtt['county_rate_per_1000']:.2f} per $1,000",
                    "amount": dtt["county_tax"]
                },
                "city": city_breakdown
            },
            # Rate provenance travels with the number — these are
            # approximations of tiered municipal schedules, and a caller
            # declaring tax on a recorded instrument should know that.
            "disclaimer": "County rate per R&T §11911. City rates are approximations "
                          "of tiered municipal schedules; verify against the current "
                          "schedule for the recording jurisdiction."
        }
    }


# ============================================================================
# PUBLIC VERIFICATION (NO AUTH)
# ============================================================================

@router.get("/verify/{document_id}")
async def verify_document(document_id: str):
    """
    Public endpoint to verify document authenticity.
    No authentication required.
    """
    conn = get_db_connection()
    if not conn:
        return {"valid": False, "message": "Service temporarily unavailable"}
    
    try:
        cursor = conn.cursor()
        
        # Check document_authenticity table first
        cursor.execute("""
            SELECT short_code, document_type, property_address, county,
                   grantor_display, grantee_display, generated_at, status
            FROM document_authenticity
            WHERE short_code = %s
        """, (document_id,))
        
        row = cursor.fetchone()
        if row:
            (doc_id, deed_type, address, county, grantor, grantee, created_at, status) = (
                row['short_code'], row['document_type'], row['property_address'],
                row['county'], row['grantor_display'], row['grantee_display'],
                row['generated_at'], row['status'])
        else:
            # Also check api_deeds
            cursor.execute("""
                SELECT document_id, deed_type, property_address, property_county,
                       grantor_name, grantee_name, created_at, status
                FROM api_deeds
                WHERE document_id = %s
            """, (document_id,))
            row = cursor.fetchone()
            if not row:
                return {"valid": False, "message": "Document not found"}
            (doc_id, deed_type, address, county, grantor, grantee, created_at, status) = (
                row['document_id'], row['deed_type'], row['property_address'],
                row['property_county'], row['grantor_name'], row['grantee_name'],
                row['created_at'], row['status'])
        
        # Abbreviate names for privacy
        grantor_abbrev = grantor.split()[0] + " " + grantor.split()[-1][0] + "." if grantor and len(grantor.split()) > 1 else grantor
        grantee_abbrev = grantee.split()[0] + " " + grantee.split()[-1][0] + "." if grantee and len(grantee.split()) > 1 else grantee
        
        return {
            "valid": status == 'active' or status == 'completed',
            "document": {
                "document_id": doc_id,
                "deed_type": deed_type.replace('_', ' ').title(),
                "status": status,
                "created_at": created_at.isoformat() if created_at else None,
                "property": {
                    "address": address,
                    "county": county
                },
                "parties": {
                    "grantor": grantor_abbrev,
                    "grantee": grantee_abbrev
                }
            }
        }
        
    except Exception as e:
        print(f"Verification error: {e}")
        return {"valid": False, "message": "Verification failed"}
    finally:
        cursor.close()
        conn.close()


# ============================================================================
# OPENAPI DOCS
# ============================================================================

@router.get("/openapi.json", include_in_schema=False)
async def get_openapi():
    """Return OpenAPI specification."""
    from fastapi.openapi.utils import get_openapi
    return get_openapi(
        title="DeedPro Public API",
        version="1.0.0",
        description="API for generating California deed documents",
        routes=router.routes
    )
