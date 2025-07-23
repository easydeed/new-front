from fastapi import FastAPI, HTTPException, Depends, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import os
import json
import base64
import httpx
import logging
from dotenv import load_dotenv

# For GraphQL client (Qualia)
try:
    from gql import gql, Client
    from gql.transport.requests import RequestsHTTPTransport
    GQL_AVAILABLE = True
except ImportError:
    GQL_AVAILABLE = False
    print("Warning: gql package not installed. Qualia GraphQL features will be disabled.")

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Separate FastAPI app for external integrations
external_app = FastAPI(
    title="DeedPro External Integrations API", 
    version="1.0.0",
    description="Enterprise API for SoftPro 360, Qualia, and other title production software integrations",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for external integrations
external_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify SoftPro/Qualia IPs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# ============================================================================
# AUTHENTICATION & SECURITY
# ============================================================================

# Mock database for API keys (in production, use your database)
API_KEYS_DB = {
    "softpro_api_key_123": {
        "user_id": "user_softpro_1",
        "company": "SoftPro Corporation",
        "platform": "softpro",
        "scopes": ["deed:create", "deed:read", "order:import"],
        "is_active": True,
        "created_at": "2024-01-01T00:00:00Z"
    },
    "qualia_api_key_456": {
        "user_id": "user_qualia_1", 
        "company": "Qualia",
        "platform": "qualia",
        "scopes": ["deed:create", "deed:read", "order:import", "document:upload"],
        "is_active": True,
        "created_at": "2024-01-01T00:00:00Z"
    }
}

def verify_api_key(x_api_key: str = Header(...)):
    """Verify API key for external partners with scope validation"""
    if not x_api_key or x_api_key not in API_KEYS_DB:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    
    key_info = API_KEYS_DB[x_api_key]
    if not key_info["is_active"]:
        raise HTTPException(status_code=403, detail="API key is disabled")
    
    logger.info(f"API access granted to {key_info['company']} ({key_info['platform']})")
    return key_info

def require_scope(required_scope: str):
    """Dependency to check if API key has required scope"""
    def scope_checker(key_info: dict = Depends(verify_api_key)):
        if required_scope not in key_info["scopes"]:
            raise HTTPException(
                status_code=403, 
                detail=f"API key lacks required scope: {required_scope}"
            )
        return key_info
    return scope_checker

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class SoftProOrderPayload(BaseModel):
    """SoftPro 360 order data structure"""
    order_id: str = Field(..., description="SoftPro order ID")
    property_address: str = Field(..., description="Property address")
    apn: Optional[str] = Field(None, description="Assessor's Parcel Number")
    county: Optional[str] = Field(None, description="County name")
    buyer_name: str = Field(..., description="Buyer full name")
    seller_name: str = Field(..., description="Seller full name")
    legal_description: Optional[str] = Field(None, description="Legal property description")
    sales_price: Optional[float] = Field(None, description="Sale price")
    deed_type: str = Field(default="Grant Deed", description="Type of deed to generate")
    escrow_number: Optional[str] = Field(None, description="Escrow file number")
    title_order_number: Optional[str] = Field(None, description="Title order number")
    closing_date: Optional[str] = Field(None, description="Expected closing date")
    
class QualiaOrderPayload(BaseModel):
    """Qualia order data structure"""
    order_id: str = Field(..., description="Qualia order ID")
    property_address: str = Field(..., description="Property address")
    buyer: Dict[str, Any] = Field(..., description="Buyer information")
    seller: Dict[str, Any] = Field(..., description="Seller information")
    transaction_details: Optional[Dict[str, Any]] = Field(None, description="Transaction metadata")

class DeedResponse(BaseModel):
    """Standard response for deed generation"""
    status: str = Field(..., description="Success or error status")
    deed_id: Optional[str] = Field(None, description="Generated deed ID")
    deed_pdf_url: Optional[str] = Field(None, description="URL to download deed PDF")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional deed metadata")
    message: Optional[str] = Field(None, description="Status message")

class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

async def generate_deed_pdf(order_data: Dict[str, Any], platform: str) -> str:
    """Generate deed PDF from order data - placeholder for your deed generation logic"""
    # This would integrate with your existing deed generation system
    deed_id = f"{platform}_{order_data.get('order_id', 'unknown')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Simulate deed generation
    logger.info(f"Generating deed for {platform} order: {order_data.get('order_id')}")
    
    # In production, this would:
    # 1. Call your existing deed generation logic
    # 2. Generate PDF using your HTML templates
    # 3. Upload to cloud storage (S3, etc.)
    # 4. Return actual URL
    
    mock_pdf_url = f"https://api.deedpro.io/generated-deeds/{deed_id}.pdf"
    return mock_pdf_url

async def save_deed_to_database(user_id: str, order_data: Dict[str, Any], pdf_url: str, platform: str):
    """Save deed to database - placeholder for your database integration"""
    # This would integrate with your existing database system
    deed_record = {
        "user_id": user_id,
        "platform_source": platform,
        "order_id": order_data.get("order_id"),
        "property_address": order_data.get("property_address"),
        "pdf_url": pdf_url,
        "created_at": datetime.now().isoformat(),
        "status": "completed"
    }
    
    logger.info(f"Saving deed to database: {deed_record}")
    # In production: save to your actual database
    return deed_record

# ============================================================================
# HEALTH & STATUS ENDPOINTS
# ============================================================================

@external_app.get("/health")
def external_health():
    return {
        "status": "ok", 
        "service": "DeedPro External Integrations API",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@external_app.get("/api/v1/status")
def api_status(key_info: dict = Depends(verify_api_key)):
    """Get API status for external partners"""
    return {
        "api_status": "operational",
        "partner": key_info["company"],
        "platform": key_info["platform"],
        "version": "1.0.0",
        "endpoints_available": True,
        "scopes": key_info["scopes"]
    }

# ============================================================================
# SOFTPRO 360 INTEGRATION ENDPOINTS
# ============================================================================

@external_app.post("/api/v1/softpro/webhook", response_model=DeedResponse)
async def softpro_webhook(
    payload: SoftProOrderPayload,
    background_tasks: BackgroundTasks,
    key_info: dict = Depends(require_scope("deed:create"))
):
    """
    SoftPro 360 webhook endpoint for automatic deed generation
    
    This endpoint receives order data from SoftPro's Process Automation
    and returns a generated deed PDF for attachment to the order file.
    """
    try:
        logger.info(f"Received SoftPro webhook for order: {payload.order_id}")
        
        # Generate deed PDF
        pdf_url = await generate_deed_pdf(payload.dict(), "softpro")
        
        # Save to database in background
        background_tasks.add_task(
            save_deed_to_database,
            key_info["user_id"],
            payload.dict(),
            pdf_url,
            "softpro"
        )
        
        # Return response for SoftPro to process
        response = DeedResponse(
            status="success",
            deed_id=f"sp_{payload.order_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            deed_pdf_url=pdf_url,
            metadata={
                "order_id": payload.order_id,
                "property_address": payload.property_address,
                "deed_type": payload.deed_type,
                "generated_at": datetime.now().isoformat()
            },
            message="Deed generated successfully"
        )
        
        logger.info(f"SoftPro deed generated successfully: {response.deed_id}")
        return response
        
    except Exception as e:
        logger.error(f"SoftPro webhook error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="deed_generation_failed",
                message=f"Failed to generate deed: {str(e)}",
                details={"order_id": payload.order_id}
            ).dict()
        )

@external_app.get("/api/v1/softpro/orders/{order_id}/deed")
async def get_softpro_deed(
    order_id: str,
    key_info: dict = Depends(require_scope("deed:read"))
):
    """Retrieve a specific deed by SoftPro order ID"""
    try:
        # In production, query your database for the deed
        logger.info(f"Retrieving deed for SoftPro order: {order_id}")
        
        # Mock response - replace with actual database query
        deed_data = {
            "deed_id": f"sp_{order_id}_mock",
            "order_id": order_id,
            "status": "completed",
            "pdf_url": f"https://api.deedpro.io/generated-deeds/sp_{order_id}_mock.pdf",
            "created_at": datetime.now().isoformat()
        }
        
        return deed_data
        
    except Exception as e:
        logger.error(f"Error retrieving SoftPro deed: {str(e)}")
        raise HTTPException(status_code=404, detail="Deed not found")

# ============================================================================
# QUALIA INTEGRATION ENDPOINTS
# ============================================================================

@external_app.post("/api/v1/qualia/import-order", response_model=DeedResponse)
async def import_qualia_order(
    payload: QualiaOrderPayload,
    background_tasks: BackgroundTasks,
    key_info: dict = Depends(require_scope("order:import"))
):
    """Import order data from Qualia and generate deed"""
    try:
        logger.info(f"Importing Qualia order: {payload.order_id}")
        
        # Transform Qualia data format to internal format
        internal_data = {
            "order_id": payload.order_id,
            "property_address": payload.property_address,
            "buyer_name": payload.buyer.get("name", ""),
            "seller_name": payload.seller.get("name", ""),
            "deed_type": "Grant Deed"  # Default or from payload
        }
        
        # Generate deed
        pdf_url = await generate_deed_pdf(internal_data, "qualia")
        
        # Save to database
        background_tasks.add_task(
            save_deed_to_database,
            key_info["user_id"],
            internal_data,
            pdf_url,
            "qualia"
        )
        
        return DeedResponse(
            status="success",
            deed_id=f"qa_{payload.order_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            deed_pdf_url=pdf_url,
            metadata={
                "order_id": payload.order_id,
                "property_address": payload.property_address,
                "imported_from": "qualia"
            },
            message="Order imported and deed generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Qualia import error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to import order: {str(e)}")

@external_app.post("/api/v1/qualia/export-deed")
async def export_deed_to_qualia(
    order_id: str,
    deed_pdf_url: str,
    key_info: dict = Depends(require_scope("document:upload"))
):
    """Export generated deed back to Qualia order"""
    try:
        logger.info(f"Exporting deed to Qualia order: {order_id}")
        
        # In production, this would use Qualia's GraphQL API
        if GQL_AVAILABLE:
            # Setup Qualia GraphQL client (placeholder credentials)
            qualia_username = os.getenv("QUALIA_USERNAME", "")
            qualia_password = os.getenv("QUALIA_PASSWORD", "")
            
            if qualia_username and qualia_password:
                auth_header = base64.b64encode(f"{qualia_username}:{qualia_password}".encode()).decode()
                transport = RequestsHTTPTransport(
                    url="https://api.qualia.com/graphql",  # Placeholder URL
                    headers={"Authorization": f"Basic {auth_header}"}
                )
                client = Client(transport=transport)
                
                # GraphQL mutation to upload document
                mutation = gql("""
                    mutation UploadDocument($orderId: ID!, $url: String!, $type: String!) {
                        uploadDocument(orderId: $orderId, url: $url, type: $type) {
                            success
                            message
                            documentId
                        }
                    }
                """)
                
                result = client.execute(mutation, variable_values={
                    "orderId": order_id,
                    "url": deed_pdf_url,
                    "type": "deed"
                })
                
                return {
                    "status": "success",
                    "message": "Deed exported to Qualia successfully",
                    "qualia_response": result
                }
        
        # Fallback response if GraphQL not available
        return {
            "status": "success",
            "message": "Deed export simulated (GraphQL client not configured)",
            "order_id": order_id,
            "deed_url": deed_pdf_url
        }
        
    except Exception as e:
        logger.error(f"Qualia export error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to export to Qualia: {str(e)}")

# ============================================================================
# GENERAL INTEGRATION ENDPOINTS
# ============================================================================

@external_app.get("/api/v1/deeds")
async def list_deeds(
    platform: Optional[str] = None,
    limit: int = 50,
    key_info: dict = Depends(require_scope("deed:read"))
):
    """List deeds for the authenticated partner"""
    try:
        # In production, query your database with filters
        logger.info(f"Listing deeds for {key_info['company']}")
        
        # Mock response
        deeds = [
            {
                "deed_id": "sp_12345_20240115",
                "platform": "softpro",
                "order_id": "SP12345",
                "property_address": "123 Main St, Los Angeles, CA",
                "status": "completed",
                "created_at": "2024-01-15T10:30:00Z"
            },
            {
                "deed_id": "qa_67890_20240114", 
                "platform": "qualia",
                "order_id": "QA67890",
                "property_address": "456 Oak Ave, San Francisco, CA",
                "status": "completed",
                "created_at": "2024-01-14T14:20:00Z"
            }
        ]
        
        if platform:
            deeds = [d for d in deeds if d["platform"] == platform]
        
        return {
            "deeds": deeds[:limit],
            "total": len(deeds),
            "platform_filter": platform,
            "partner": key_info["company"]
        }
        
    except Exception as e:
        logger.error(f"Error listing deeds: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve deeds")

@external_app.post("/api/v1/test-connection")
async def test_connection(key_info: dict = Depends(verify_api_key)):
    """Test endpoint for partners to verify their integration"""
    return {
        "status": "success",
        "message": "Connection test successful",
        "partner": key_info["company"],
        "platform": key_info["platform"],
        "timestamp": datetime.now().isoformat(),
        "available_scopes": key_info["scopes"]
    }

# ============================================================================
# API KEY MANAGEMENT ENDPOINTS
# ============================================================================

@external_app.get("/api/v1/keys/info")
async def get_api_key_info(key_info: dict = Depends(verify_api_key)):
    """Get information about the current API key"""
    return {
        "company": key_info["company"],
        "platform": key_info["platform"],
        "scopes": key_info["scopes"],
        "created_at": key_info["created_at"],
        "is_active": key_info["is_active"]
    }

if __name__ == "__main__":
    import uvicorn
    # Run on port 8001 to avoid conflict with main API (port 8000)
    print("Starting DeedPro External Integrations API on port 8001...")
    print("Documentation available at: http://localhost:8001/docs")
    uvicorn.run(external_app, host="0.0.0.0", port=8001, reload=True) 