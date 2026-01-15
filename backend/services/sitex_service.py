"""
SiteX Pro (ICE) REST API Service for property search and enrichment
Production-grade integration with multi-path field extraction and caching.

Phase 1.2 of DeedPro Enhancement Project - Complete Rewrite
"""

import os
import time
import base64
import hashlib
import asyncio
import httpx
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from urllib.parse import urlencode
from fastapi import HTTPException

from models.property_data import (
    PropertyData, PropertyOwner, PropertyMatch, PropertySearchResult
)

logger = logging.getLogger(__name__)


class SiteXConfig:
    """Centralized SiteX configuration"""
    
    def __init__(self):
        self.base_url = os.getenv("SITEX_BASE_URL", "https://api.bkiconnect.com").rstrip('/')
        self.client_id = os.getenv("SITEX_CLIENT_ID")
        self.client_secret = os.getenv("SITEX_CLIENT_SECRET")
        self.feed_id = os.getenv("SITEX_FEED_ID")
        
    @property
    def token_url(self) -> str:
        return f"{self.base_url}/ls/apigwy/oauth2/v1/token"
    
    @property
    def search_url(self) -> str:
        return f"{self.base_url}/realestatedata/search"
    
    def is_configured(self) -> bool:
        return all([self.client_id, self.client_secret, self.feed_id])


class SiteXTokenManager:
    """Thread-safe OAuth token management with proactive refresh"""
    
    def __init__(self, config: SiteXConfig):
        self.config = config
        self._token: Optional[str] = None
        self._expiry: datetime = datetime.min
        self._lock = asyncio.Lock()
        self._refresh_buffer = timedelta(seconds=60)  # Refresh 60s before expiry
    
    async def get_token(self) -> str:
        """Get valid token, refreshing if needed"""
        async with self._lock:
            if self._is_token_valid():
                return self._token
            return await self._refresh_token()
    
    def _is_token_valid(self) -> bool:
        return (
            self._token is not None 
            and datetime.utcnow() < (self._expiry - self._refresh_buffer)
        )
    
    async def _refresh_token(self) -> str:
        """Request new OAuth token from SiteX"""
        if not self.config.client_id or not self.config.client_secret:
            raise HTTPException(
                status_code=500,
                detail="SiteX credentials not configured"
            )
        
        credentials = f"{self.config.client_id}:{self.config.client_secret}"
        basic_auth = base64.b64encode(credentials.encode()).decode()
        
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    self.config.token_url,
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
                self._expiry = datetime.utcnow() + timedelta(seconds=expires_in)
                
                logger.info(f"SiteX token refreshed, expires in {expires_in}s")
                return self._token
                
        except httpx.HTTPStatusError as e:
            logger.error(f"SiteX token request failed: {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"SiteX authentication failed: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"SiteX token error: {e}")
            raise HTTPException(status_code=500, detail=f"SiteX auth error: {e}")


class SiteXMultiMatchError(Exception):
    """Raised when address matches multiple properties"""
    
    def __init__(self, message: str, matches: List[PropertyMatch]):
        super().__init__(message)
        self.matches = matches


class SiteXService:
    """
    Production-grade SiteX integration.
    
    Features:
    - Thread-safe token management
    - Multi-path field extraction with fallbacks
    - In-memory caching with TTL
    - Structured PropertyData output
    - Multi-match handling
    """
    
    def __init__(self):
        self.config = SiteXConfig()
        self.token_manager = SiteXTokenManager(self.config)
        self._cache: Dict[str, Tuple[PropertyData, datetime]] = {}
        self._cache_ttl = timedelta(hours=1)
        self._search_timeout = 30.0
        
        # Strict residential search options
        self.default_options = "search_exclude_nonres=Y|search_strict=Y"
    
    def is_configured(self) -> bool:
        """Check if SiteX credentials are properly configured"""
        return self.config.is_configured()
    
    async def search_property(
        self,
        address: str,
        city: Optional[str] = None,
        state: str = "CA",
        zip_code: Optional[str] = None,
        client_ref: str = "deed_wizard",
        use_cache: bool = True
    ) -> PropertySearchResult:
        """
        Search for property by address and return normalized data.
        
        Args:
            address: Street address (e.g., "123 Main St")
            city: City name (recommended for accuracy)
            state: State code (default: CA)
            zip_code: ZIP code (recommended for accuracy)
            client_ref: Client reference for logging
            use_cache: Whether to use cached results
            
        Returns:
            PropertySearchResult with status, data, or matches
        """
        # Build last_line from components
        last_line_parts = []
        if city:
            last_line_parts.append(city)
        if state:
            last_line_parts.append(state)
        if zip_code:
            last_line_parts.append(zip_code)
        last_line = ", ".join(last_line_parts) if last_line_parts else f"{state}"
        
        # Check cache
        cache_key = self._make_cache_key(address, city, state, zip_code)
        if use_cache and cache_key in self._cache:
            data, cached_at = self._cache[cache_key]
            if datetime.utcnow() - cached_at < self._cache_ttl:
                logger.info(f"SiteX cache hit for: {address}")
                return PropertySearchResult(
                    status="success",
                    data=data,
                    message="Property found (cached)",
                    match_count=1
                )
        
        # Make API request
        try:
            raw_response = await self._search_address(
                street=address,
                last_line=last_line,
                client_ref=client_ref
            )
            
            # Check for multi-match
            if self._is_multi_match(raw_response):
                matches = self._extract_matches(raw_response)
                logger.info(f"SiteX multi-match: {len(matches)} properties for '{address}'")
                return PropertySearchResult(
                    status="multi_match",
                    matches=matches,
                    message=f"Multiple properties found ({len(matches)}). Please select one.",
                    match_count=len(matches)
                )
            
            # Check for no match
            if self._is_no_match(raw_response):
                logger.info(f"SiteX no match for: {address}")
                return PropertySearchResult(
                    status="not_found",
                    message=f"No property found for address: {address}",
                    match_count=0
                )
            
            # Parse single match
            property_data = self._parse_response(raw_response, address)
            
            # Cache the result
            self._cache[cache_key] = (property_data, datetime.utcnow())
            
            logger.info(f"SiteX found property: {property_data.address}, APN: {property_data.apn}")
            
            return PropertySearchResult(
                status="success",
                data=property_data,
                message="Property found",
                match_count=1
            )
            
        except SiteXMultiMatchError as e:
            return PropertySearchResult(
                status="multi_match",
                matches=e.matches,
                message=str(e),
                match_count=len(e.matches)
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"SiteX search error: {e}")
            return PropertySearchResult(
                status="error",
                message=f"Property search failed: {str(e)}",
                match_count=0
            )
    
    async def search_by_fips_apn(
        self,
        fips: str,
        apn: str,
        client_ref: str = "deed_wizard"
    ) -> PropertySearchResult:
        """
        Search for property by FIPS + APN (for multi-match resolution)
        """
        try:
            raw_response = await self._search_fips_apn(fips, apn, client_ref)
            
            if self._is_no_match(raw_response):
                return PropertySearchResult(
                    status="not_found",
                    message=f"No property found for FIPS {fips}, APN {apn}",
                    match_count=0
                )
            
            property_data = self._parse_response(raw_response, "")
            
            return PropertySearchResult(
                status="success",
                data=property_data,
                message="Property found",
                match_count=1
            )
            
        except Exception as e:
            logger.error(f"SiteX FIPS/APN search error: {e}")
            return PropertySearchResult(
                status="error",
                message=f"Property search failed: {str(e)}",
                match_count=0
            )
    
    # === Internal API Methods ===
    
    async def _search_address(
        self, 
        street: str, 
        last_line: str, 
        client_ref: str
    ) -> Dict:
        """Make address search API call"""
        params = {
            "addr": street,
            "lastLine": last_line,
            "clientReference": client_ref,
            "feedId": self.config.feed_id,
            "options": self.default_options,
        }
        return await self._get("/realestatedata/search", params)
    
    async def _search_fips_apn(
        self,
        fips: str,
        apn: str,
        client_ref: str
    ) -> Dict:
        """Make FIPS/APN search API call"""
        params = {
            "fips": fips,
            "apn": apn,
            "clientReference": client_ref,
            "feedId": self.config.feed_id,
            "options": self.default_options,
        }
        return await self._get("/realestatedata/search", params)
    
    async def _get(self, path: str, params: Dict) -> Dict:
        """Make authenticated GET request to SiteX API"""
        token = await self.token_manager.get_token()
        url = f"{self.config.base_url}{path}?{urlencode(params)}"
        
        try:
            async with httpx.AsyncClient(timeout=self._search_timeout) as client:
                response = await client.get(
                    url,
                    headers={"Authorization": f"Bearer {token}"}
                )
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPStatusError as e:
            logger.error(f"SiteX API error: {e.response.status_code}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"SiteX API error: {e.response.text}"
            )
        except httpx.TimeoutException:
            logger.error("SiteX API timeout")
            raise HTTPException(status_code=504, detail="SiteX API timeout")
    
    # === Response Parsing ===
    
    def _make_cache_key(self, *args) -> str:
        """Generate cache key from search parameters"""
        key_string = "|".join(str(a).lower().strip() for a in args if a)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _is_multi_match(self, data: Dict) -> bool:
        """Check if response contains multiple matches"""
        # Check for Locations array (multi-match indicator)
        locations = data.get("Locations", [])
        if locations and len(locations) > 1:
            return True
        
        # Check MatchCode
        match_code = data.get("MatchCode", "")
        if match_code in ("M", "MULTI"):
            return True
        
        return False
    
    def _is_no_match(self, data: Dict) -> bool:
        """Check if response indicates no match found"""
        match_code = data.get("MatchCode", "")
        if match_code in ("N", "NOMATCH", "0"):
            return True
        
        # Empty feed data
        feed = data.get("Feed", {})
        if not feed and not data.get("Locations"):
            return True
        
        return False
    
    def _extract_matches(self, data: Dict) -> List[PropertyMatch]:
        """Extract match candidates from multi-match response"""
        locations = data.get("Locations", [])
        
        matches = []
        for loc in locations[:10]:  # Limit to 10 matches
            matches.append(PropertyMatch(
                address=self._get_nested(loc, ["SiteAddress", "Address", "addr"]) or "",
                city=self._get_nested(loc, ["SiteCity", "City", "city"]) or "",
                state=self._get_nested(loc, ["SiteState", "State"]) or "CA",
                zip_code=str(self._get_nested(loc, ["SiteZip", "Zip", "zipCode"]) or "")[:5],
                apn=self._get_nested(loc, ["APN", "apn", "ParcelNumber"]) or "",
                fips=self._get_nested(loc, ["FIPS", "fips", "FipsCode"]) or "",
                owner_name=self._get_nested(loc, ["OwnerName", "PrimaryOwnerName"]) or "",
                property_type=self._get_nested(loc, ["PropertyType", "UseCodeDescription"]),
            ))
        
        return matches
    
    def _parse_response(self, data: Dict, original_address: str) -> PropertyData:
        """
        Parse SiteX response into normalized PropertyData.
        Uses multi-path fallbacks for each field.
        """
        # Navigate to property profile
        feed = data.get("Feed", data)  # Sometimes data IS the feed
        profile = feed.get("PropertyProfile", feed)
        owner_info = profile.get("OwnerInformation", {}) or {}
        legal_info = profile.get("LegalDescriptionInfo", {}) or {}
        sale_info = profile.get("SaleInformation", {}) or {}
        
        return PropertyData(
            # Core identifiers
            apn=self._extract_apn(profile),
            apn_formatted=self._get_nested(profile, ["APNFormatted", "APN_Formatted"]) or "",
            fips=self._get_nested(profile, ["FIPS", "FipsCode"]) or "",
            
            # Location - CRITICAL: Use correct SiteX field paths
            address=self._extract_address(profile, original_address),
            street_number=self._get_nested(profile, ["SiteHouseNumber", "HouseNumber"]),
            street_name=self._get_nested(profile, ["SiteStreetName", "StreetName"]),
            city=self._extract_city(profile),
            state=self._get_nested(profile, ["SiteState", "State"]) or "CA",
            zip_code=self._extract_zip(profile),
            county=self._extract_county(profile),  # CRITICAL: CountyName, not County!
            
            # Legal - CRITICAL: LegalBriefDescription, not LegalDescription!
            legal_description=self._extract_legal_description(profile, legal_info),
            legal_description_full=legal_info.get("LegalDescription"),
            subdivision_name=legal_info.get("SubdivisionName"),
            tract_number=legal_info.get("TractNumber"),
            lot_number=legal_info.get("LotNumber"),
            block_number=legal_info.get("BlockNumber"),
            
            # Ownership
            primary_owner=self._extract_primary_owner(profile, owner_info),
            secondary_owner=self._extract_secondary_owner(profile, owner_info),
            ownership_type=owner_info.get("OwnershipType"),
            vesting_type=owner_info.get("VestingType"),
            
            # Property details
            property_type=self._extract_property_type(profile),
            use_code=profile.get("UseCode"),
            use_code_description=profile.get("UseCodeDescription"),
            bedrooms=self._safe_int(profile.get("Bedrooms")),
            bathrooms=self._safe_float(profile.get("Bathrooms")),
            square_feet=self._safe_int(self._get_nested(profile, ["LivingSquareFeet", "SquareFeet", "BuildingArea"])),
            lot_size_sqft=self._safe_int(self._get_nested(profile, ["LotSizeSquareFeet", "LotSquareFeet"])),
            lot_size_acres=self._safe_float(profile.get("LotSizeAcres")),
            year_built=self._safe_int(profile.get("YearBuilt")),
            stories=self._safe_int(profile.get("Stories")),
            
            # Valuation
            assessed_value=self._safe_int(profile.get("AssessedValue")),
            assessed_land_value=self._safe_int(profile.get("AssessedLandValue")),
            assessed_improvement_value=self._safe_int(profile.get("AssessedImprovementValue")),
            market_value=self._safe_int(profile.get("MarketValue")),
            tax_amount=self._safe_float(profile.get("TaxAmount")),
            
            # Sale history
            last_sale_price=self._safe_int(sale_info.get("SalePrice")),
            last_sale_date=sale_info.get("SaleDate"),
            last_sale_doc_number=sale_info.get("DocumentNumber"),
            
            # Metadata
            enrichment_source="sitex",
            enrichment_timestamp=datetime.utcnow(),
            confidence_score=1.0,
            raw_response=data if os.getenv("SITEX_DEBUG") else None,
        )
    
    # === Field Extraction Helpers with Fallbacks ===
    
    def _get_nested(self, obj: Dict, paths: List[str], default: Any = None) -> Any:
        """Try multiple field paths, return first found value"""
        for path in paths:
            value = obj.get(path)
            if value is not None and value != "":
                return value
        return default
    
    def _extract_apn(self, profile: Dict) -> str:
        """Extract APN with fallbacks"""
        return (
            self._get_nested(profile, ["APN", "ParcelNumber", "AssessorParcelNumber"]) 
            or ""
        )
    
    def _extract_address(self, profile: Dict, fallback: str) -> str:
        """Extract address with fallbacks"""
        return (
            self._get_nested(profile, ["SiteAddress", "PropertyAddress", "Address"])
            or fallback
        )
    
    def _extract_city(self, profile: Dict) -> str:
        """Extract city with fallbacks"""
        return (
            self._get_nested(profile, ["SiteCity", "City", "PropertyCity"])
            or ""
        )
    
    def _extract_zip(self, profile: Dict) -> str:
        """Extract ZIP with fallbacks, normalize to 5 digits"""
        raw_zip = self._get_nested(profile, ["SiteZip", "Zip", "ZipCode"]) or ""
        return str(raw_zip)[:5]  # Normalize to 5-digit
    
    def _extract_county(self, profile: Dict) -> str:
        """
        Extract county with fallbacks.
        CRITICAL: Use CountyName or SiteCountyName, NOT County!
        """
        return (
            self._get_nested(profile, ["CountyName", "SiteCountyName", "County"])
            or ""
        ).upper()  # Normalize to uppercase
    
    def _extract_legal_description(self, profile: Dict, legal_info: Dict) -> str:
        """
        Extract legal description with fallbacks.
        CRITICAL: Use LegalBriefDescription, NOT LegalDescription!
        """
        return (
            legal_info.get("LegalBriefDescription")
            or legal_info.get("LegalDescription")
            or profile.get("BriefLegal")
            or profile.get("LegalDescription")
            or ""
        )
    
    def _extract_primary_owner(self, profile: Dict, owner_info: Dict) -> PropertyOwner:
        """Extract primary owner information"""
        full_name = (
            self._get_nested(profile, ["PrimaryOwnerName", "OwnerName"])
            or self._get_nested(owner_info, ["OwnerFullName", "Owner1FullName", "OwnerName"])
            or ""
        )
        return PropertyOwner(
            full_name=full_name,
            first_name=owner_info.get("Owner1FirstName"),
            last_name=owner_info.get("Owner1LastName"),
            mailing_address=owner_info.get("MailingAddress"),
            mailing_city=owner_info.get("MailingCity"),
            mailing_state=owner_info.get("MailingState"),
            mailing_zip=owner_info.get("MailingZip"),
        )
    
    def _extract_secondary_owner(self, profile: Dict, owner_info: Dict) -> Optional[PropertyOwner]:
        """Extract secondary owner if present"""
        full_name = (
            self._get_nested(profile, ["SecondaryOwnerName"])
            or owner_info.get("Owner2FullName")
            or ""
        )
        if not full_name:
            return None
        return PropertyOwner(
            full_name=full_name,
            first_name=owner_info.get("Owner2FirstName"),
            last_name=owner_info.get("Owner2LastName"),
        )
    
    def _extract_property_type(self, profile: Dict) -> Optional[str]:
        """Extract property type with fallbacks"""
        return self._get_nested(profile, [
            "PropertyType", "UseCodeDescription", "PropertyUseType"
        ])
    
    # === Type Conversion Helpers ===
    
    @staticmethod
    def _safe_int(value: Any) -> Optional[int]:
        """Safely convert to int"""
        if value is None:
            return None
        try:
            return int(str(value).replace(",", "").replace("$", "").split(".")[0])
        except (ValueError, TypeError):
            return None
    
    @staticmethod
    def _safe_float(value: Any) -> Optional[float]:
        """Safely convert to float"""
        if value is None:
            return None
        try:
            return float(str(value).replace(",", "").replace("$", ""))
        except (ValueError, TypeError):
            return None


# Singleton instance
sitex_service = SiteXService()
