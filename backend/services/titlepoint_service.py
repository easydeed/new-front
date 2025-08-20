"""
TitlePoint API Service for property enrichment with vesting, tax, and deed data
Following Pacific Coast Title's proven methodology using HTTP requests
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
        
        # HTTP endpoints (Pacific Coast Title method)
        self.request_summary_endpoint = "https://api.titlepoint.com/RequestSummary"
        self.create_service_endpoint = "https://www.titlepoint.com/TitlePointServices/TpsService.asmx/CreateService3"
        self.get_result_endpoint = "https://www.titlepoint.com/TitlePointServices/TpsService.asmx/GetResultByRequestID"
        
        # Service configurations (matching Pacific Coast Title)
        self.max_wait_seconds = 20  # 20 seconds max wait (matches working implementation)
        self.poll_interval = 2  # Poll every 2 seconds for faster response
        
        # HTTP client configuration
        self.timeout = httpx.Timeout(30.0)  # 30 second timeout for HTTP requests
    
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
            county = data.get('county', '')
            full_address = data.get('fullAddress', '')
            
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
            print(f"🗺️ County: {county}, State: {state}")
            
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
            
            # Use Pacific Coast Title's proven parameter format
            parameters = (
                f"Address.FullAddress={full_address};"
                f"General.AutoSearchTaxes=False;"
                f"Tax.CurrentYearTaxesOnly=False;"
                f"General.AutoSearchProperty=True;"
                f"General.AutoSearchOwnerNames=False;"
                f"General.AutoSearchStarters=False;"
                f"Property.IntelligentPropertyGrouping=true;"
            )
            
            print(f"🔧 Parameters: {parameters}")
            
            # Create HTTP service request using Pacific Coast Title's approach
            request_id = await self._create_http_service_request(state, county, parameters)
            print(f"📋 Request ID: {request_id}")
            
            # Wait for completion and get results
            result_xml = await self._wait_for_http_completion(request_id)
            print(f"📄 Result XML length: {len(result_xml) if result_xml else 0}")
            
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
    
    async def _create_http_service_request(self, state: str, county: str, parameters: str) -> str:
        """Create a TitlePoint service request using Pacific Coast Title's HTTP method"""
        try:
            # Prepare HTTP POST data following Pacific Coast Title's format
            post_data = {
                'userID': self.user_id,
                'password': self.password,
                'state': state,
                'county': county,
                'serviceType': 'TitlePoint.Geo.Property',  # Pacific Coast Title uses this for property searches
                'parameters': parameters
            }
            
            print(f"🌐 POST Data: {post_data}")
            
            # Make HTTP POST request to CreateService3 endpoint
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.create_service_endpoint,
                    data=post_data,
                    headers={
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'text/xml, application/xml'
                    }
                )
                
                print(f"📡 HTTP Status: {response.status_code}")
                print(f"📡 Response Length: {len(response.text)}")
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"TitlePoint service creation failed: HTTP {response.status_code}"
                    )
                
                # Parse XML response to get request ID
                response_xml = response.text
                print(f"📄 Raw Response: {response_xml[:500]}...")  # First 500 chars for debugging
                
                # Parse XML using Pacific Coast Title's method
                try:
                    import xml.etree.ElementTree as ET
                    root = ET.fromstring(response_xml)
                    
                    # Look for RequestID in the response
                    request_id = None
                    for elem in root.iter():
                        if 'RequestID' in elem.tag or 'requestId' in elem.tag:
                            request_id = elem.text
                            break
                        if elem.text and elem.text.isdigit():
                            request_id = elem.text
                            break
                    
                    if not request_id:
                        raise HTTPException(
                            status_code=500,
                            detail=f"TitlePoint service did not return a request ID. Response: {response_xml[:200]}"
                        )
                    
                    return str(request_id)
                    
                except ET.ParseError as e:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to parse TitlePoint response XML: {str(e)}"
                    )
            
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=500,
                detail=f"TitlePoint HTTP request failed: {str(e)}"
            )
    
    async def _wait_for_http_completion(self, request_id: str) -> str:
        """Wait for TitlePoint service to complete and return results using Pacific Coast Title's HTTP method"""
        start_time = time.time()
        
        print(f"⏳ Waiting for TitlePoint request {request_id} to complete...")
        
        while time.time() - start_time < self.max_wait_seconds:
            # Use Pacific Coast Title's RequestSummary endpoint
            try:
                request_params = {
                    'userID': self.user_id,
                    'password': self.password,
                    'company': '',
                    'department': '',
                    'titleOfficer': '',
                    'requestId': request_id,
                    'maxWaitSeconds': 20
                }
                
                # Build query string and make request to RequestSummary endpoint
                query_string = urlencode(request_params)
                request_url = f"{self.request_summary_endpoint}?{query_string}"
                
                print(f"📡 Request Summary URL: {request_url}")
                
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(request_url)
                    
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
                            
                            print(f"📊 Parsed Summary: {json.dumps(result, indent=2)[:500]}...")
                            
                            return response_xml  # Return the full XML for Pacific Coast Title parsing
                            
                        except Exception as parse_error:
                            print(f"❌ XML parsing error: {parse_error}")
                            return response_xml  # Return raw XML anyway for debugging
                    
            except Exception as e:
                print(f"⚠️ Request summary failed: {e}")
            
            # Wait before next poll (Pacific Coast Title uses faster polling)
            await asyncio.sleep(self.poll_interval)
        
        raise HTTPException(
            status_code=504,
            detail=f"TitlePoint service timeout for request {request_id} after {self.max_wait_seconds} seconds"
        )
    
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