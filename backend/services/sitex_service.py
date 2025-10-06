"""
SiteX Pro (ICE) REST API Service for property search and deed image retrieval
Replaces legacy TitlePoint SOAP integration
"""
import os
import time
import base64
import httpx
from typing import Dict, List, Optional
from urllib.parse import urlencode
from fastapi import HTTPException


class SiteXService:
    """
    Service for interacting with SiteX Pro REST API
    
    Key features:
    - OAuth2 token management (10-min TTL)
    - Address search with multi-match support
    - FIPS/APN follow-up queries
    - Deed image retrieval (PDF format)
    - Residential property filtering
    """
    
    def __init__(self):
        """Initialize SiteX service with credentials from environment"""
        self.base_url = os.getenv("SITEX_BASE_URL", "https://api.bkiconnect.com").rstrip('/')
        self.client_id = os.getenv("SITEX_CLIENT_ID")
        self.client_secret = os.getenv("SITEX_CLIENT_SECRET")
        self.feed_id = os.getenv("SITEX_FEED_ID")
        
        # Token management
        self._token = None
        self._token_expiry = 0
        
        # Timeouts
        self.token_timeout = 20.0
        self.search_timeout = 30.0
        
        # Strict residential search options (per SiteX proposal)
        self.default_options = "search_exclude_nonres=Y|search_strict=Y"
    
    async def _get_token(self) -> str:
        """
        Get or refresh OAuth2 access token (10-minute TTL)
        Uses Basic auth with client_id:client_secret
        """
        # Return cached token if still valid (with 30s buffer)
        if self._token and time.time() < self._token_expiry - 30:
            return self._token
        
        # Check credentials
        if not self.client_id or not self.client_secret:
            raise HTTPException(
                status_code=500,
                detail="SiteX credentials not configured (SITEX_CLIENT_ID, SITEX_CLIENT_SECRET)"
            )
        
        try:
            # Encode credentials for Basic auth
            credentials = f"{self.client_id}:{self.client_secret}"
            basic_auth = base64.b64encode(credentials.encode()).decode()
            
            url = f"{self.base_url}/ls/apigwy/oauth2/v1/token"
            
            async with httpx.AsyncClient(timeout=self.token_timeout) as client:
                response = await client.post(
                    url,
                    headers={
                        "Authorization": f"Basic {basic_auth}",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    data={"grant_type": "client_credentials"},
                )
                response.raise_for_status()
                
                data = response.json()
                self._token = data["access_token"]
                expires_in = data.get("expires_in", 600)  # Default 10 minutes
                self._token_expiry = time.time() + expires_in
                
                return self._token
                
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"SiteX token request failed: {e.response.text}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"SiteX authentication error: {str(e)}"
            )
    
    async def _get(self, path: str, params: Dict) -> Dict:
        """Make authenticated GET request to SiteX API"""
        token = await self._get_token()
        url = f"{self.base_url}{path}?{urlencode(params)}"
        
        try:
            async with httpx.AsyncClient(timeout=self.search_timeout) as client:
                response = await client.get(
                    url,
                    headers={"Authorization": f"Bearer {token}"}
                )
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"SiteX API error: {e.response.text}"
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=504,
                detail="SiteX API timeout - please try again"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"SiteX request error: {str(e)}"
            )
    
    async def search_address(
        self, 
        street: str, 
        last_line: str, 
        client_ref: str,
        options: Optional[str] = None
    ) -> Dict:
        """
        Search for property by address
        
        Args:
            street: Street address (e.g., "123 Main St")
            last_line: City, State ZIP (e.g., "Los Angeles, CA 90001")
            client_ref: Client reference for logging (e.g., "user:123")
            options: Search options (default: residential + strict)
        
        Returns:
            SiteX response with either:
            - Single match: Full property feed
            - Multi-match: List of Locations[] for disambiguation
        """
        if not self.feed_id:
            raise HTTPException(
                status_code=500,
                detail="SiteX feed ID not configured (SITEX_FEED_ID)"
            )
        
        params = {
            "addr": street,
            "lastLine": last_line,
            "clientReference": client_ref,
            "feedId": self.feed_id,
            "options": options or self.default_options,
        }
        
        return await self._get("/realestatedata/search", params)
    
    async def search_fips_apn(
        self,
        fips: str,
        apn: str,
        client_ref: str,
        options: Optional[str] = None
    ) -> Dict:
        """
        Search for property by FIPS + APN (follow-up after multi-match)
        
        Args:
            fips: FIPS code (from multi-match result)
            apn: Assessor's Parcel Number (from multi-match result)
            client_ref: Client reference for logging
            options: Search options (default: residential + strict)
        
        Returns:
            SiteX response with full property feed
        """
        if not self.feed_id:
            raise HTTPException(
                status_code=500,
                detail="SiteX feed ID not configured (SITEX_FEED_ID)"
            )
        
        params = {
            "fips": fips,
            "apn": apn,
            "clientReference": client_ref,
            "feedId": self.feed_id,
            "options": options or self.default_options,
        }
        
        return await self._get("/realestatedata/search", params)
    
    async def fetch_deed_image(
        self,
        fips: str,
        rec_date: str,
        doc_num: Optional[str] = None,
        book: Optional[str] = None,
        page: Optional[str] = None,
        format: str = "PDF",
        provider_cascade: bool = True
    ) -> Dict:
        """
        Fetch deed image (optional feature for attaching prior deeds)
        
        Args:
            fips: FIPS code
            rec_date: Recording date (yyyyMMdd format)
            doc_num: Document number (optional)
            book: Book number (optional)
            page: Page number (optional)
            format: Image format ("PDF" or "TIF")
            provider_cascade: Enable third-party provider fallback
        
        Returns:
            SiteX response with deed image data
        """
        if not self.feed_id:
            raise HTTPException(
                status_code=500,
                detail="SiteX feed ID not configured (SITEX_FEED_ID)"
            )
        
        params = {
            "fips": fips,
            "recDate": rec_date,
            "format": format,
            "feedId": self.feed_id,
        }
        
        # Add optional parameters
        if doc_num:
            params["docNum"] = doc_num
        if book:
            params["book"] = book
        if page:
            params["page"] = page
        
        # Enable provider cascade for better coverage
        if provider_cascade:
            params["options"] = "document_provider=cascade"
        
        return await self._get("/realestatedata/search/doc", params)
    
    def is_configured(self) -> bool:
        """Check if SiteX credentials are properly configured"""
        return bool(self.client_id and self.client_secret and self.feed_id)