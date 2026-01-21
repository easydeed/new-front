"""
DeedPro Public API v1 Router
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Request, Response
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
import json
import io
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
from utils.api_keys import extract_key_prefix, validate_api_key, generate_deed_id, generate_document_id
from utils.short_code import generate_content_hash
from pdf_engine import render_pdf_async

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
        
        # Look up key by prefix
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
        
        api_key_id, key_hash, name, org_id, scopes, rate_hour, rate_day, is_active, is_test = row
        
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
        
        # Get current counts
        cursor.execute("""
            SELECT window_type, request_count 
            FROM api_rate_limits 
            WHERE api_key_id = %s AND (
                (window_type = 'hour' AND window_key = %s) OR
                (window_type = 'day' AND window_key = %s)
            )
        """, (api_key_id, hour_key, day_key))
        
        limits = {row[0]: row[1] for row in cursor.fetchall()}
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


# ============================================================================
# DEED ENDPOINTS
# ============================================================================

@router.post("/deeds", response_model=DeedResponse)
async def create_deed(
    request: Request,
    deed_request: CreateDeedRequest,
    api_key: dict = Depends(get_api_key)
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
        
        # Generate unique IDs
        deed_id = generate_deed_id()
        document_id = generate_document_id()
        
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
        
        # Generate PDF using existing template system
        # For now, use a simple HTML template (integrate with existing Jinja templates later)
        full_address = f"{deed_request.property.address}, {deed_request.property.city}, {deed_request.property.state} {deed_request.property.zip}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Times New Roman', serif; padding: 1in; font-size: 12pt; }}
                .header {{ text-align: center; margin-bottom: 2em; }}
                .title {{ font-size: 18pt; font-weight: bold; text-decoration: underline; }}
                .section {{ margin: 1.5em 0; }}
                .label {{ font-weight: bold; }}
                .recording-box {{ border: 1px solid black; padding: 1em; margin-bottom: 2em; width: 3in; }}
            </style>
        </head>
        <body>
            <div class="recording-box">
                <div style="font-size: 10pt;">
                    RECORDING REQUESTED BY:<br/>
                    {deed_request.recording.requested_by}<br/><br/>
                    WHEN RECORDED MAIL TO:<br/>
                    {deed_request.recording.return_to.name}<br/>
                    {deed_request.recording.return_to.company or ''}<br/>
                    {deed_request.recording.return_to.address}<br/>
                    {deed_request.recording.return_to.city}, {deed_request.recording.return_to.state} {deed_request.recording.return_to.zip}
                </div>
            </div>
            
            <div class="header">
                <div class="title">{deed_request.deed_type.value.replace('_', ' ').upper()}</div>
            </div>
            
            <div class="section">
                <p>FOR VALUABLE CONSIDERATION, receipt of which is hereby acknowledged,</p>
                <p><span class="label">{deed_request.grantor.name}</span></p>
                <p>hereby GRANT(S) to</p>
                <p><span class="label">{deed_request.grantee.name}</span>, {deed_request.grantee.vesting}</p>
            </div>
            
            <div class="section">
                <p>the following described real property in the County of {deed_request.property.county}, State of California:</p>
                <p>{deed_request.property.legal_description}</p>
                <p><strong>APN:</strong> {deed_request.property.apn}</p>
            </div>
            
            <div class="section" style="margin-top: 2em;">
                <p>Document ID: {document_id}</p>
                <p style="font-size: 10pt; color: #666;">Verify at: https://deedpro.com/verify/{document_id}</p>
            </div>
        </body>
        </html>
        """
        
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
        authenticity_id = cursor.fetchone()[0]
        
        # Store API deed record
        transfer_tax_amount = None
        if deed_request.transfer_tax.computed_amount:
            try:
                transfer_tax_amount = float(deed_request.transfer_tax.computed_amount.replace('$', '').replace(',', ''))
            except:
                pass
        
        cursor.execute("""
            INSERT INTO api_deeds (
                deed_id, document_id, api_key_id, deed_type, status,
                property_address, property_city, property_county, property_apn,
                grantor_name, grantee_name,
                transfer_tax_amount, transfer_tax_exempt,
                pdf_data, request_data, authenticity_id
            ) VALUES (%s, %s, %s, %s, 'completed', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            authenticity_id
        ))
        
        # Log the request
        response_time_ms = int((time.time() - start_time) * 1000)
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")
        
        cursor.execute("""
            INSERT INTO api_usage_log (api_key_id, endpoint, method, status_code, response_time_ms, ip_address, user_agent)
            VALUES (%s, '/api/v1/deeds', 'POST', 200, %s, %s, %s)
        """, (api_key["id"], response_time_ms, client_ip, user_agent[:500] if user_agent else None))
        
        conn.commit()
        
        # Build response
        base_url = "https://deedpro-main-api.onrender.com"
        verification_base = "https://deedpro-frontend-new.vercel.app"
        
        return DeedResponse(
            success=True,
            data=DeedDataResponse(
                deed_id=deed_id,
                document_id=document_id,
                deed_type=deed_request.deed_type.value,
                status="completed",
                created_at=datetime.utcnow(),
                urls=DeedUrlsModel(
                    pdf=f"{base_url}/api/v1/deeds/{deed_id}/pdf",
                    verification=f"{verification_base}/verify/{document_id}"
                ),
                property=DeedPropertyResponse(
                    address=full_address,
                    apn=deed_request.property.apn,
                    county=deed_request.property.county
                ),
                parties=DeedPartiesResponse(
                    grantor=deed_request.grantor.name.split(',')[0].strip(),
                    grantee=deed_request.grantee.name.split(',')[0].strip()
                ),
                transfer_tax=DeedTransferTaxResponse(
                    amount=f"${transfer_tax_amount:.2f}" if transfer_tax_amount else None,
                    exempt=deed_request.transfer_tax.exempt
                )
            )
        )
        
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
    deed_id: str,
    api_key: dict = Depends(get_api_key)
):
    """Get deed metadata by deed_id."""
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
        
        (deed_id, document_id, deed_type, status, created_at,
         property_address, property_apn, property_county,
         grantor_name, grantee_name,
         transfer_tax_amount, transfer_tax_exempt) = row
        
        base_url = "https://deedpro-main-api.onrender.com"
        verification_base = "https://deedpro-frontend-new.vercel.app"
        
        return {
            "success": True,
            "data": {
                "deed_id": deed_id,
                "document_id": document_id,
                "deed_type": deed_type,
                "status": status,
                "created_at": created_at.isoformat() if created_at else None,
                "urls": {
                    "pdf": f"{base_url}/api/v1/deeds/{deed_id}/pdf",
                    "verification": f"{verification_base}/verify/{document_id}"
                },
                "property": {
                    "address": property_address,
                    "apn": property_apn,
                    "county": property_county
                },
                "parties": {
                    "grantor": grantor_name.split(',')[0].strip() if grantor_name else None,
                    "grantee": grantee_name.split(',')[0].strip() if grantee_name else None
                }
            }
        }
        
    finally:
        cursor.close()
        conn.close()


@router.get("/deeds/{deed_id}/pdf")
async def download_deed_pdf(
    deed_id: str,
    api_key: dict = Depends(get_api_key)
):
    """Download the generated PDF document."""
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
        
        pdf_data, document_id = row
        
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
    page: int = 1,
    limit: int = 20,
    deed_type: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    api_key: dict = Depends(get_api_key)
):
    """List all deeds created by your API key."""
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
        cursor.execute(f"SELECT COUNT(*) FROM api_deeds WHERE {where_sql}", params)
        total = cursor.fetchone()[0]
        
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
                "deed_id": row[0],
                "document_id": row[1],
                "deed_type": row[2],
                "status": row[3],
                "created_at": row[4].isoformat() if row[4] else None,
                "property_address": row[5]
            })
        
        total_pages = (total + limit - 1) // limit
        
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
    """Calculate documentary transfer tax for a given value and location."""
    
    # California county rate: $1.10 per $1,000
    taxable_value = request.value - request.less_liens
    county_rate = 1.10
    county_tax = (taxable_value / 1000) * county_rate
    
    # City tax varies - common ones
    city_rates = {
        "los angeles": 4.50,
        "oakland": 15.00,  # Measure W
        "san francisco": 3.75,  # Base rate
        "berkeley": 15.00,
        "culver city": 4.50,
        "santa monica": 3.00,
        "pasadena": 2.20,
        "pomona": 2.20,
        "riverside": 1.10,
    }
    
    city_tax = 0
    city_breakdown = None
    
    if request.city:
        city_lower = request.city.lower()
        if city_lower in city_rates:
            city_rate = city_rates[city_lower]
            city_tax = (taxable_value / 1000) * city_rate
            city_breakdown = {
                "name": request.city,
                "rate": f"${city_rate:.2f} per $1,000",
                "amount": round(city_tax, 2),
                "notes": "Additional city transfer tax applies" if city_rate > 2.20 else None
            }
    
    total_tax = county_tax + city_tax
    
    return {
        "success": True,
        "data": {
            "taxable_value": taxable_value,
            "county_tax": round(county_tax, 2),
            "city_tax": round(city_tax, 2),
            "total_tax": round(total_tax, 2),
            "breakdown": {
                "county": {
                    "name": f"{request.county} County",
                    "rate": "$1.10 per $1,000",
                    "amount": round(county_tax, 2)
                },
                "city": city_breakdown
            }
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
        if not row:
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
        
        (doc_id, deed_type, address, county, grantor, grantee, created_at, status) = row
        
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
