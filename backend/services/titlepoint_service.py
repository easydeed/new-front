"""
TitlePoint API Service for property enrichment with vesting, tax, and deed data
Following Pacific Coast Title's fail‑proof methodology using HTTP requests:

- CreateService3 (GET) with correct serviceType and parameters
- GetRequestSummaries (GET) with userID/password/requestId/maxWaitSeconds
- GetResultByID3 for Tax (method 3) and GetResultByID for LV (method 4)
"""
import os
import time
import asyncio
from typing import Dict, Optional
import httpx
import xml.etree.ElementTree as ET
from urllib.parse import urlencode
import xmltodict
from fastapi import HTTPException


class TitlePointService:
    """Service for interacting with TitlePoint API using Pacific Coast Title's proven HTTP method"""
    
    def __init__(self):
        self.user_id = os.getenv("TITLEPOINT_USER_ID", "PCTXML01")
        self.password = os.getenv("TITLEPOINT_PASSWORD", "AlphaOmega637#")

        # Endpoints (env override supported) per fail‑proof guide
        self.create_service_endpoint = os.getenv(
            "TP_CREATE_SERVICE_ENDPOINT",
            "https://www.titlepoint.com/TitlePointServices/TpsService.asmx/CreateService3",
        )
        self.tax_create_service_endpoint = os.getenv(
            "TP_TAX_INSTRUMENT_CREATE_SERVICE_ENDPOINT",
            self.create_service_endpoint,
        )
        self.request_summary_endpoint = os.getenv(
            "TP_REQUEST_SUMMARY_ENDPOINT",
            "https://www.titlepoint.com/TitlePointServices/TpsServiceWS.asmx/GetRequestSummaries?",
        )
        self.get_result_by_id = os.getenv(
            "TP_GET_RESULT_BY_ID",
            "https://www.titlepoint.com/TitlePointServices/TpsService.asmx/GetResultByID?",
        )
        self.get_result_by_id_3 = os.getenv(
            "TP_GET_RESULT_BY_ID_3",
            "https://www.titlepoint.com/TitlePointServices/TpsService.asmx/GetResultByID3?",
        )

        # Service configurations
        self.max_wait_seconds = 20
        self.poll_interval = 2

        # HTTP client configuration
        self.timeout = httpx.Timeout(30.0)
    
    async def enrich_property(self, data: Dict) -> Dict:
        """
        Enrich property data using TitlePoint services following Pacific Coast Title's proven HTTP methodology
        
        Uses Pacific Coast Title's proven parameter format:
        Address.FullAddress=<address>;General.AutoSearchTaxes=False;Tax.CurrentYearTaxesOnly=False;
        General.AutoSearchProperty=True;General.AutoSearchOwnerNames=False;General.AutoSearchStarters=False;
        Property.IntelligentPropertyGrouping=true;
        
        Args:
            data: Dictionary containing property information from Google Places
                - fullAddress: Complete address
                - street: Street address  
                - city: City name
                - state: State abbreviation (e.g., 'CA')
                - county: County name
                - zip: ZIP code
            
        Returns:
            Standardized property data for deed generation:
            {
                'success': True/False,
                'apn': 'Assessor Parcel Number',
                'brief_legal': 'Brief legal description',
                'current_owner_primary': 'Primary owner name',
                'current_owner_secondary': 'Secondary owner name' (optional),
                'fullAddress': 'Full formatted address',
                'county': 'County name',
                'city': 'City name',
                'state': 'State abbreviation',
                'zip': 'ZIP code',
                'message': 'Error message if failed'
            }
        """
        try:
            state = data.get('state', 'CA')
            county = (data.get('county') or '').strip()
            full_address = (data.get('fullAddress') or '').strip()
            city = (data.get('city') or '').strip()
            zip_code = (data.get('zip') or '').strip()
            apn = (data.get('apn') or '').strip()
            fips = (data.get('fips') or '').strip()
            
            if not county:
                return {
                    'success': False,
                    'message': 'County is required for TitlePoint lookup'
                }
            
            if not full_address:
                return {
                    'success': False,
                    'message': 'Full address is required for TitlePoint lookup'
                }
            
            print(f"🔍 Starting TitlePoint HTTP enrichment for: {full_address}")
            print(f"🗺️ County: {county}, State: {state}, APN: {apn}, FIPS: {fips}")
            
            # Initialize results
            combined_results = {
                'success': True,
                'fullAddress': full_address,
                'county': county,
                'city': data.get('city', ''),
                'state': state,
                'zip': data.get('zip', ''),
                'apn': '',
                'brief_legal': '',
                'current_owner_primary': '',
                'current_owner_secondary': '',
                'tax_year': '',
                'assessed_value': '',
                'property_type': ''
            }
            
            # Decide flow: Tax (APN) vs LV (Address/FIPS)
            if apn:
                # Tax flow (MethodId 3)
                service_type = os.getenv("TAX_SEARCH_SERVICE_TYPE", "TitlePoint.Geo.Tax")
                parameters = f"Tax.APN={apn};General.AutoSearchTaxes=true;General.AutoSearchProperty=false"
                print(f"🔧 TAX Parameters: {parameters}")
                request_id = await self._create_service_get(
                    endpoint=self.tax_create_service_endpoint,
                    query={
                        "userID": self.user_id,
                        "password": self.password,
                        "serviceType": service_type,
                        "parameters": parameters,
                        "state": state,
                        "county": county,
                    },
                )
                method = 3
            else:
                # Legal/Vesting flow (MethodId 4)
                service_type = os.getenv("SERVICE_TYPE", "TitlePoint.Geo.LegalVesting")
                parameters = (
                    f"Address1={full_address};City={city};"
                    f"Pin={apn};LvLookup=Address;LvLookupValue={full_address}, {city};"
                    f"LvReportFormat=LV;IncludeTaxAssessor=true"
                )
                print(f"🔧 LV Parameters: {parameters}")
                query = {
                    "userID": self.user_id,
                    "password": self.password,
                    "serviceType": service_type,
                    "parameters": parameters,
                    "state": state,
                    "county": county,
                }
                if fips:
                    query["fipsCode"] = fips
                request_id = await self._create_service_get(
                    endpoint=self.create_service_endpoint,
                    query=query,
                )
                method = 4
            print(f"📋 Request ID: {request_id}")
            
            # Wait for completion and get results
            summary_xml, result_id = await self._wait_for_http_completion(request_id)
            print(f"📄 Summary XML length: {len(summary_xml) if summary_xml else 0}, ResultID: {result_id}")
            result_xml = summary_xml
            
            # Fetch full result if ResultID available
            if result_id:
                fetch_url = self.get_result_by_id_3 if method == 3 else self.get_result_by_id
                result_xml = await self._fetch_result_by_id(fetch_url, result_id, method)
            
            # Parse results using Pacific Coast Title's XML parsing method
            parsed_data = await self._parse_pacific_coast_result(result_xml)
            
            if parsed_data.get('success'):
                combined_results.update(parsed_data.get('data', {}))
                print(f"✅ TitlePoint enrichment successful!")
                print(f"📊 Data: APN={combined_results.get('apn', 'N/A')}, Owner={combined_results.get('current_owner_primary', 'N/A')}")
                
                return {
                    'success': True,
                    **combined_results
                }
            else:
                print(f"❌ TitlePoint parsing failed: {parsed_data.get('message', 'Unknown error')}")
                return {
                    'success': False,
                    'message': f"TitlePoint lookup failed: {parsed_data.get('message', 'No data returned')}",
                    **combined_results
                }
            
        except Exception as e:
            # Return error response with more detailed debugging info
            error_message = f"TitlePoint enrichment error: {str(e)}"
            print(f"TitlePoint Error Details: {error_message}")  # For debugging
            
            return {
                'success': False,
                'message': error_message,
                'fullAddress': data.get('fullAddress', ''),
                'county': data.get('county', ''),
                'city': data.get('city', ''),
                'state': data.get('state', 'CA'),
                'zip': data.get('zip', ''),
                'debug_info': {
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            }
    
    async def _create_service_get(self, endpoint: str, query: Dict) -> str:
        """Create a TitlePoint service using GET and return RequestID"""
        try:
            import random
            q = {**query}
            q.setdefault("orderNo", str(random.randint(100000, 999999)))
            q.setdefault("customerRef", str(random.randint(100000, 999999)))
            q.setdefault("company", "DeedPro")
            q.setdefault("department", "")
            q.setdefault("titleOfficer", "")
            q.setdefault("orderComment", f"DeedPro Request {q['orderNo']}")
            q.setdefault("starterRemarks", "")

            url = f"{endpoint}?{urlencode(q)}"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers={"Accept": "text/xml, application/xml"})
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"CreateService failed: HTTP {response.status_code}")

            root = ET.fromstring(response.text)
            request_id: Optional[str] = None
            for elem in root.iter():
                tag = elem.tag.lower()
                if "requestid" in tag and elem.text and elem.text.strip():
                    request_id = elem.text.strip()
                    break
            if not request_id:
                raise HTTPException(status_code=500, detail="CreateService did not return a RequestID")
            return request_id
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"CreateService error: {str(e)}")
    
    async def _wait_for_http_completion(self, request_id: str) -> (str, Optional[str]):
        """Poll summaries until Complete. Return (summary_xml, result_id)"""
        start_time = time.time()
        
        print(f"⏳ Waiting for TitlePoint request {request_id} to complete...")
        
        while time.time() - start_time < self.max_wait_seconds:
            try:
                params = {
                    "userID": self.user_id,
                    "password": self.password,
                    "requestId": request_id,
                    "maxWaitSeconds": str(self.max_wait_seconds),
                }
                url = f"{self.request_summary_endpoint}{urlencode(params)}"
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(url, headers={"Accept": "text/xml, application/xml"})
                    
                    print(f"📡 Summary Response Status: {response.status_code}")
                    
                    if response.status_code == 200:
                        response_xml = response.text
                        print(f"📄 Summary XML: {response_xml[:300]}...")
                        
                        # Parse XML response using Pacific Coast Title's method
                        try:
                            # Use simplexml_load_string equivalent (xmltodict)
                            data = xmltodict.parse(response_xml)
                            
                            # Convert to JSON and back to handle Pacific Coast Title's format
                            import json
                            json_data = json.dumps(data)
                            result = json.loads(json_data)
                            
                            # Try to extract a ResultThumbNail/ID
                            result_id = None
                            try:
                                root = ET.fromstring(response_xml)
                                for elem in root.iter():
                                    # Heuristic: look for ID elements under thumbnails/services
                                    if elem.tag.lower().endswith("id") and elem.text and elem.text.strip():
                                        result_id = elem.text.strip()
                                        break
                            except Exception:
                                result_id = None
                            return response_xml, result_id
                            
                        except Exception as parse_error:
                            print(f"❌ XML parsing error: {parse_error}")
                            return response_xml  # Return raw XML anyway for debugging
                    
            except Exception as e:
                print(f"⚠️ Request summary failed: {e}")
            
            # Wait before next poll
            await asyncio.sleep(self.poll_interval)
        
        raise HTTPException(
            status_code=504,
            detail=f"TitlePoint service timeout for request {request_id} after {self.max_wait_seconds} seconds"
        )

    async def _fetch_result_by_id(self, endpoint: str, result_id: str, method: int) -> str:
        """Fetch full result payload by ID"""
        params = {
            "userID": self.user_id,
            "password": self.password,
            "resultID": result_id,
        }
        if method == 3:
            params["requestingTPXML"] = "true"
        url = f"{endpoint}{urlencode(params)}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, headers={"Accept": "text/xml, application/xml"})
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"GetResultByID failed: HTTP {resp.status_code}")
        return resp.text
    
    async def _parse_pacific_coast_result(self, result_xml: str) -> Dict:
        """Parse TitlePoint XML result using Pacific Coast Title's proven method"""
        try:
            if not result_xml or result_xml.strip() == '':
                return {'success': False, 'message': 'Empty XML response', 'data': {}}
            
            print(f"🔍 Parsing XML result (length: {len(result_xml)})")
            
            # Use Pacific Coast Title's parsing method: simplexml_load_string + json conversion
            try:
                # Convert XML to dictionary using xmltodict (equivalent to simplexml_load_string)
                xml_data = xmltodict.parse(result_xml)
                
                # Convert to JSON and back (Pacific Coast Title's approach)
                import json
                response = json.dumps(xml_data)
                result = json.loads(response)
                
                print(f"📊 Parsed structure keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
                
            except Exception as e:
                print(f"❌ XML parsing failed: {e}")
                return {'success': False, 'message': f'XML parsing failed: {str(e)}', 'data': {}}
            
            # Extract property data using Pacific Coast Title's field patterns
            extracted_data = {}
            
            # Pacific Coast Title extracts these fields from TitlePoint
            field_mappings = [
                # APN fields
                (['PropertyProfile', 'APN'], 'apn'),
                (['Property', 'APN'], 'apn'),
                (['TaxInfo', 'APN'], 'apn'),
                (['APN'], 'apn'),
                
                # Legal description fields
                (['PropertyProfile', 'LegalBriefDescription'], 'brief_legal'),
                (['Property', 'LegalDescription'], 'brief_legal'),
                (['LegalDescription'], 'brief_legal'),
                
                # Owner name fields
                (['PropertyProfile', 'OwnerName', 'Primary'], 'current_owner_primary'),
                (['Vesting', 'PrimaryOwner'], 'current_owner_primary'),
                (['OwnerName', 'Primary'], 'current_owner_primary'),
                (['PrimaryOwner'], 'current_owner_primary'),
                
                (['PropertyProfile', 'OwnerName', 'Secondary'], 'current_owner_secondary'),
                (['Vesting', 'SecondaryOwner'], 'current_owner_secondary'),
                (['OwnerName', 'Secondary'], 'current_owner_secondary'),
                (['SecondaryOwner'], 'current_owner_secondary'),
                
                # Tax information
                (['TaxInfo', 'TaxYear'], 'tax_year'),
                (['Tax', 'TaxYear'], 'tax_year'),
                (['TaxYear'], 'tax_year'),
                
                (['TaxInfo', 'AssessedValue'], 'assessed_value'),
                (['Tax', 'AssessedValue'], 'assessed_value'),
                (['AssessedValue'], 'assessed_value'),
                
                # Property type
                (['PropertyProfile', 'PropertyType'], 'property_type'),
                (['Property', 'PropertyType'], 'property_type'),
                (['PropertyType'], 'property_type'),
            ]
            
            for path, field_name in field_mappings:
                value = self._extract_nested_value(result, path)
                if value and field_name not in extracted_data:
                    extracted_data[field_name] = str(value).strip()
                    print(f"✅ Found {field_name}: {value}")
            
            if extracted_data:
                print(f"🎉 Successfully extracted data: {extracted_data}")
                return {
                    'success': True,
                    'message': 'Property data extracted successfully',
                    'data': extracted_data
                }
            else:
                print(f"⚠️ No property data found in XML structure")
                # Save raw result for debugging
                print(f"📄 Raw result sample: {json.dumps(result, indent=2)[:1000]}...")
                return {
                    'success': False,
                    'message': 'No property data found in TitlePoint response',
                    'data': {},
                    'debug_xml': result_xml[:1000] if len(result_xml) > 1000 else result_xml
            }
            
        except Exception as e:
            print(f"❌ Pacific Coast parsing error: {str(e)}")
            return {
                'success': False,
                'message': f'Result parsing failed: {str(e)}',
                'data': {}
            }
    
    def _extract_nested_value(self, data: dict, path: list) -> str:
        """Extract nested value from dictionary using path list (Pacific Coast Title method)"""
        try:
            current = data
            for key in path:
                if isinstance(current, dict) and key in current:
                    current = current[key]
                else:
                    return ''
            
            # Handle different text representations (Pacific Coast Title patterns)
            if isinstance(current, dict):
                if '#text' in current:
                    return str(current['#text']).strip()
                elif '@text' in current:
                    return str(current['@text']).strip()
                else:
                    # Look for any string value in the dict
                    for v in current.values():
                        if isinstance(v, str) and v.strip():
                            return v.strip()
                    return ''
            elif isinstance(current, str):
                return current.strip()
            else:
                return str(current).strip() if current else ''
                
        except Exception:
            return ''
    




    
    # Chain of title functionality can be added later if needed
    # For now, focus on the core property enrichment using Pacific Coast Title's proven method