"""
TitlePoint API Service for property enrichment with vesting, tax, and deed data
"""
import os
import time
import asyncio
from typing import Dict, Optional
from zeep import Client
from zeep.exceptions import Fault
import xmltodict
from fastapi import HTTPException


class TitlePointService:
    """Service for interacting with TitlePoint API via SOAP"""
    
    def __init__(self):
        self.user_id = os.getenv("TITLEPOINT_USER_ID", "PCTXML01")
        self.password = os.getenv("TITLEPOINT_PASSWORD", "AlphaOmega637#")
        
        # SOAP endpoints
        self.wsdl_url = "https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL"
        self.wsdl_ws_url = "https://www.titlepoint.com/TitlePointServices/TpsServiceWS.asmx?WSDL"
        
        # Initialize SOAP clients
        try:
            self.client = Client(self.wsdl_url)
            self.client_ws = Client(self.wsdl_ws_url)
        except Exception as e:
            raise ValueError(f"Failed to initialize TitlePoint SOAP clients: {str(e)}")
        
        # Service configurations (matching Pacific Coast Title)
        self.max_wait_seconds = 20  # 20 seconds max wait (matches working implementation)
        self.poll_interval = 2  # Poll every 2 seconds for faster response
    
    async def enrich_property(self, data: Dict) -> Dict:
        """
        Enrich property data using TitlePoint services (multi-step workflow)
        
        This follows the proper TitlePoint workflow:
        1. TitlePoint.Geo.Property - for basic property information (APN, legal description)
        2. TitlePoint.Geo.Owner - for current ownership/vesting information
        3. TitlePoint.Geo.Tax - for tax information (optional)
        
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
            
            print(f"🔍 Starting TitlePoint multi-step enrichment for: {full_address}")
            
            # Initialize combined results
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
            
            # Step 1: Get legal/vesting information using TitlePoint.Geo.LegalVesting (Pacific Coast Title method)
            try:
                print("📜 Step 1: Getting legal vesting information...")
                vesting_data = await self._get_legal_vesting_info(state, county, full_address)
                if vesting_data.get('success'):
                    combined_results.update(vesting_data.get('data', {}))
                    print(f"✅ Legal vesting retrieved: Owner={combined_results.get('current_owner_primary', 'N/A')}")
                else:
                    print(f"⚠️ Legal vesting failed: {vesting_data.get('message', 'Unknown error')}")
            except Exception as e:
                print(f"❌ Legal vesting error: {str(e)}")
            
            # Check if we got meaningful data from either service
            has_property_data = bool(
                combined_results.get('apn') or 
                combined_results.get('brief_legal') or 
                combined_results.get('current_owner_primary')
            )
            
            if has_property_data:
                print(f"🎉 TitlePoint enrichment successful!")
                return {
                    'success': True,
                    **combined_results
                }
            else:
                print(f"❌ No meaningful property data retrieved from TitlePoint")
                return {
                    'success': False,
                    'message': 'No property data available from TitlePoint for this address',
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
    
    async def _get_legal_vesting_info(self, state: str, county: str, full_address: str) -> Dict:
        """Get legal vesting information using TitlePoint.Geo.LegalVesting (Pacific Coast Title method)"""
        try:
            service_type = "TitlePoint.Geo.LegalVesting"
            # Use Pacific Coast Title parameter format: LegalVesting.FullAddress=
            parameters = f"LegalVesting.FullAddress={full_address}"
            
            print(f"🔧 Service: {service_type}")
            print(f"🔧 Parameters: {parameters}")
            
            request_id = await self._create_service_request(state, county, service_type, parameters)
            result_xml = await self._wait_for_completion(request_id)
            
            return self._parse_legal_vesting_result(result_xml)
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Legal vesting lookup failed: {str(e)}',
                'data': {}
            }
    
    async def _create_service_request(self, state: str, county: str, service_type: str, parameters: str) -> str:
        """Create a TitlePoint service request"""
        try:
            # Run SOAP call in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                self._sync_create_service,
                state, county, service_type, parameters
            )
            
            # Debug: Print response attributes to understand structure
            print(f"TitlePoint Response Type: {type(response)}")
            print(f"TitlePoint Response Attributes: {dir(response)}")
            if hasattr(response, '__dict__'):
                print(f"TitlePoint Response Dict: {response.__dict__}")
            
            # Check response status - handle different attribute names
            status = getattr(response, 'ReturnStatus', getattr(response, 'Status', 'Unknown'))
            message = getattr(response, 'Message', getattr(response, 'ErrorMessage', 'No message'))
            
            if status != 'Success':
                raise HTTPException(
                    status_code=400,
                    detail=f"TitlePoint service creation failed: {message}"
                )
            
            # Get RequestID - handle different attribute names
            request_id = getattr(response, 'RequestID', getattr(response, 'Id', None))
            if not request_id:
                raise HTTPException(
                    status_code=500,
                    detail="TitlePoint service did not return a request ID"
                )
            
            return request_id
            
        except Fault as e:
            raise HTTPException(
                status_code=500,
                detail=f"TitlePoint SOAP fault: {str(e)}"
            )
    
    def _sync_create_service(self, state: str, county: str, service_type: str, parameters: str):
        """Synchronous SOAP call for service creation"""
        return self.client.service.CreateService3(
            userID=self.user_id,
            password=self.password,
            state=state,
            county=county,
            serviceType=service_type,
            parameters=parameters
        )
    
    async def _wait_for_completion(self, request_id: str) -> str:
        """Wait for TitlePoint service to complete and return results"""
        start_time = time.time()
        
        while time.time() - start_time < self.max_wait_seconds:
            # Check status
            status = await self._get_request_status(request_id)
            
            if status == 'Complete':
                # Get results
                return await self._get_request_result(request_id)
            elif status == 'Error':
                raise HTTPException(
                    status_code=500,
                    detail=f"TitlePoint service failed for request {request_id}"
                )
            
            # Wait before next poll
            await asyncio.sleep(self.poll_interval)
        
        raise HTTPException(
            status_code=504,
            detail=f"TitlePoint service timeout for request {request_id}"
        )
    
    async def _get_request_status(self, request_id: str) -> str:
        """Get the status of a TitlePoint request"""
        try:
            loop = asyncio.get_event_loop()
            summaries = await loop.run_in_executor(
                None,
                self._sync_get_status,
                request_id
            )
            
            if summaries and len(summaries) > 0:
                return summaries[0].Status
            else:
                return 'Pending'
                
        except Exception:
            return 'Pending'
    
    def _sync_get_status(self, request_id: str):
        """Synchronous SOAP call for status check"""
        return self.client_ws.service.GetRequestSummaries([request_id])
    
    async def _get_request_result(self, request_id: str) -> str:
        """Get the results of a completed TitlePoint request"""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                self._sync_get_result,
                request_id
            )
            
            # Check response status - handle different attribute names
            status = getattr(response, 'ReturnStatus', getattr(response, 'Status', 'Unknown'))
            message = getattr(response, 'Message', getattr(response, 'ErrorMessage', 'No message'))
            
            if status != 'Success':
                raise HTTPException(
                    status_code=400,
                    detail=f"TitlePoint result retrieval failed: {message}"
                )
            
            # Get result data - handle different attribute names
            result_data = getattr(response, 'ResultData', getattr(response, 'Data', ''))
            return result_data
            
        except Fault as e:
            raise HTTPException(
                status_code=500,
                detail=f"TitlePoint result SOAP fault: {str(e)}"
            )
    
    def _sync_get_result(self, request_id: str):
        """Synchronous SOAP call for result retrieval"""
        return self.client.service.GetResultByRequestID(
            userID=self.user_id,
            password=self.password,
            company="",
            department="",
            titleOfficer="",
            requestId=int(request_id),  # Note: requestId (not requestID) and must be int
            maxWaitSeconds=20  # Match Pacific Coast Title configuration
        )
    
    def _parse_property_result(self, result_xml: str) -> Dict:
        """Parse TitlePoint.Geo.Property service result"""
        try:
            if not result_xml or result_xml.strip() == '':
                return {'success': False, 'message': 'Empty XML response', 'data': {}}
            
            # Convert XML to dictionary
            result_dict = xmltodict.parse(result_xml)
            
            # Extract property information
            data = {}
            
            # Look for common property data structures
            if 'PropertyProfile' in str(result_dict):
                # Try to extract APN
                apn = self._extract_text_value(result_dict, ['PropertyProfile', 'APN'])
                if apn:
                    data['apn'] = apn
                
                # Try to extract legal description
                legal_desc = self._extract_text_value(result_dict, ['PropertyProfile', 'LegalBriefDescription'])
                if legal_desc:
                    data['brief_legal'] = legal_desc.replace('  ', ' ').strip()
                
                # Try to extract property type
                prop_type = self._extract_text_value(result_dict, ['PropertyProfile', 'PropertyType'])
                if prop_type:
                    data['property_type'] = prop_type
            
            return {
                'success': len(data) > 0,
                'message': 'Property data extracted' if data else 'No property data found',
                'data': data
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Property result parsing failed: {str(e)}',
                'data': {}
            }
    
    def _parse_legal_vesting_result(self, result_xml: str) -> Dict:
        """Parse TitlePoint.Geo.LegalVesting service result (Pacific Coast Title method)"""
        try:
            if not result_xml or result_xml.strip() == '':
                return {'success': False, 'message': 'Empty XML response', 'data': {}}
            
            # Convert XML to dictionary
            result_dict = xmltodict.parse(result_xml)
            
            print(f"🔍 Legal Vesting XML Keys: {list(result_dict.keys()) if isinstance(result_dict, dict) else 'Not a dict'}")
            
            # Extract legal vesting information
            data = {}
            
            # Look for common legal vesting data structures (from Pacific Coast Title)
            xml_str = str(result_dict)
            
            # Try multiple possible data locations
            possible_paths = [
                ['PropertyProfile', 'APN'],
                ['PropertyProfile', 'LegalBriefDescription'], 
                ['PropertyProfile', 'OwnerName', 'Primary'],
                ['PropertyProfile', 'OwnerName', 'Secondary'],
                ['LegalVesting', 'APN'],
                ['LegalVesting', 'LegalDescription'],
                ['LegalVesting', 'OwnerName'],
                ['VestingInformation'],
                ['APN'],
                ['LegalDescription'],
                ['OwnerName']
            ]
            
            for path in possible_paths:
                value = self._extract_text_value(result_dict, path)
                if value:
                    if 'APN' in path[-1]:
                        data['apn'] = value
                    elif 'Legal' in path[-1]:
                        data['brief_legal'] = value.replace('  ', ' ').strip()
                    elif 'Primary' in path[-1] or ('OwnerName' in path[-1] and 'Primary' not in data):
                        data['current_owner_primary'] = value
                    elif 'Secondary' in path[-1]:
                        data['current_owner_secondary'] = value
                    elif 'Vesting' in path[-1]:
                        data['vesting_info'] = value
            
            print(f"📊 Extracted data: {data}")
            
            return {
                'success': len(data) > 0,
                'message': 'Legal vesting data extracted' if data else 'No legal vesting data found',
                'data': data
            }
            
        except Exception as e:
            print(f"❌ Legal vesting parsing error: {str(e)}")
            return {
                'success': False,
                'message': f'Legal vesting result parsing failed: {str(e)}',
                'data': {}
            }

    def _parse_owner_result(self, result_xml: str) -> Dict:
        """Parse TitlePoint.Geo.Owner service result"""
        try:
            if not result_xml or result_xml.strip() == '':
                return {'success': False, 'message': 'Empty XML response', 'data': {}}
            
            # Convert XML to dictionary
            result_dict = xmltodict.parse(result_xml)
            
            # Extract ownership information
            data = {}
            
            # Look for common owner data structures
            if 'OwnerName' in str(result_dict):
                # Try to extract primary owner
                primary_owner = self._extract_text_value(result_dict, ['OwnerName', 'Primary'])
                if primary_owner:
                    data['current_owner_primary'] = primary_owner
                
                # Try to extract secondary owner
                secondary_owner = self._extract_text_value(result_dict, ['OwnerName', 'Secondary'])
                if secondary_owner:
                    data['current_owner_secondary'] = secondary_owner
            
            # Also check for vesting information
            if 'VestingInformation' in str(result_dict):
                vesting = self._extract_text_value(result_dict, ['VestingInformation'])
                if vesting:
                    data['vesting_info'] = vesting
            
            return {
                'success': len(data) > 0,
                'message': 'Owner data extracted' if data else 'No owner data found',
                'data': data
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Owner result parsing failed: {str(e)}',
                'data': {}
            }
    
    def _extract_text_value(self, data_dict: Dict, path: list) -> str:
        """Helper method to extract text values from nested dictionary"""
        try:
            current = data_dict
            for key in path:
                if isinstance(current, dict) and key in current:
                    current = current[key]
                else:
                    return ''
            
            # Handle different text representations
            if isinstance(current, dict) and '#text' in current:
                return str(current['#text']).strip()
            elif isinstance(current, str):
                return current.strip()
            else:
                return str(current).strip() if current else ''
                
        except Exception:
            return ''

    def _parse_titlepoint_result(self, result_xml: str, input_data: Dict) -> Dict:
        """Parse TitlePoint XML result into standardized format for frontend"""
        try:
            # Parse XML to dictionary
            data = xmltodict.parse(result_xml)
            
            # Extract key fields according to user requirements
            # Based on TitlePoint API research, look for these paths:
            apn = self._extract_field(data, [
                'PropertyProfile.APN',
                'Property.APN', 
                'TaxInfo.APN',
                'GeneralInfo.APN'
            ])
            
            brief_legal = self._extract_field(data, [
                'PropertyProfile.LegalBriefDescription',
                'Property.LegalDescription',
                'LegalDescription',
                'PropertyInfo.LegalDescription'
            ])
            
            # Extract current owners from vesting section
            primary_owner = self._extract_field(data, [
                'PropertyProfile.OwnerName.Primary',
                'Vesting.PrimaryOwner',
                'OwnerInfo.Primary',
                'Owner.Primary'
            ])
            
            secondary_owner = self._extract_field(data, [
                'PropertyProfile.OwnerName.Secondary', 
                'Vesting.SecondaryOwner',
                'OwnerInfo.Secondary',
                'Owner.Secondary'
            ])
            
            # Return standardized format
            return {
                'success': True,
                'apn': apn or '',
                'brief_legal': brief_legal or '',
                'current_owner_primary': primary_owner or '',
                'current_owner_secondary': secondary_owner or '',
                'fullAddress': input_data.get('fullAddress', ''),
                'county': input_data.get('county', ''),
                'city': input_data.get('city', ''),
                'state': input_data.get('state', 'CA'),
                'zip': input_data.get('zip', ''),
                'raw_data': data  # Store for debugging if needed
            }
            
        except Exception as e:
            # Return error response with fallback to input data
            return {
                'success': False,
                'message': f"Failed to parse TitlePoint result: {str(e)}",
                'apn': '',
                'brief_legal': '',
                'current_owner_primary': '',
                'current_owner_secondary': '',
                'fullAddress': input_data.get('fullAddress', ''),
                'county': input_data.get('county', ''),
                'city': input_data.get('city', ''),
                'state': input_data.get('state', 'CA'),
                'zip': input_data.get('zip', '')
            }
    
    def _extract_field(self, data: Dict, paths: list) -> Optional[str]:
        """Extract a field using multiple possible XML paths"""
        for path in paths:
            current = data
            for key in path.split('.'):
                if isinstance(current, dict) and key in current:
                    current = current[key]
                else:
                    current = None
                    break
            
            if current and isinstance(current, (str, int, float)):
                return str(current).strip()
        
        return None
    
    def _extract_property_info(self, data: Dict, result: Dict):
        """Extract general property information"""
        # Navigate through the XML structure to find property data
        # This will depend on the actual XML structure returned by TitlePoint
        
        # Common paths for property information
        property_paths = [
            'TitlePointResult.Property',
            'Property',
            'GeneralInfo.Property'
        ]
        
        property_data = self._find_data_by_paths(data, property_paths)
        
        if property_data:
            result.update({
                'property_address': property_data.get('Address', ''),
                'legal_description': property_data.get('LegalDescription', ''),
                'county_name': property_data.get('CountyName', ''),
                'property_type': property_data.get('PropertyType', ''),
                'zoning': property_data.get('Zoning', ''),
                'land_use': property_data.get('LandUse', ''),
                'lot_size': self._safe_float(property_data.get('LotSize')),
                'square_feet': self._safe_int(property_data.get('SquareFeet')),
                'year_built': self._safe_int(property_data.get('YearBuilt')),
                'bedrooms': self._safe_int(property_data.get('Bedrooms')),
                'bathrooms': self._safe_float(property_data.get('Bathrooms'))
            })
    
    def _extract_tax_info(self, data: Dict, result: Dict):
        """Extract tax information"""
        tax_paths = [
            'TitlePointResult.Tax',
            'Tax',
            'TaxInfo'
        ]
        
        tax_data = self._find_data_by_paths(data, tax_paths)
        
        if tax_data:
            result.update({
                'tax_year': tax_data.get('TaxYear', ''),
                'tax_first_installment': self._safe_float(tax_data.get('FirstInstallment')),
                'tax_second_installment': self._safe_float(tax_data.get('SecondInstallment')),
                'total_tax': self._safe_float(tax_data.get('TotalTax')),
                'assessed_value': self._safe_float(tax_data.get('AssessedValue')),
                'market_value': self._safe_float(tax_data.get('MarketValue')),
                'tax_status': tax_data.get('Status', ''),
                'exemptions': tax_data.get('Exemptions', [])
            })
    
    def _extract_vesting_info(self, data: Dict, result: Dict):
        """Extract vesting/ownership information"""
        vesting_paths = [
            'TitlePointResult.Vesting',
            'Vesting',
            'LegalVesting',
            'OwnershipInfo'
        ]
        
        vesting_data = self._find_data_by_paths(data, vesting_paths)
        
        if vesting_data:
            result.update({
                'primary_owner': vesting_data.get('PrimaryOwner', ''),
                'secondary_owner': vesting_data.get('SecondaryOwner', ''),
                'vesting_details': vesting_data.get('Details', ''),
                'vesting_type': vesting_data.get('VestingType', ''),
                'ownership_percentage': vesting_data.get('OwnershipPercentage', ''),
                'mailing_address': vesting_data.get('MailingAddress', ''),
                'acquired_date': vesting_data.get('AcquiredDate', ''),
                'deed_book': vesting_data.get('DeedBook', ''),
                'deed_page': vesting_data.get('DeedPage', '')
            })
    
    def _extract_deed_info(self, data: Dict, result: Dict):
        """Extract deed and transaction information"""
        deed_paths = [
            'TitlePointResult.Deed',
            'Deed',
            'DeedInfo',
            'TransactionInfo'
        ]
        
        deed_data = self._find_data_by_paths(data, deed_paths)
        
        if deed_data:
            result.update({
                'deed_type': deed_data.get('DeedType', ''),
                'deed_date': deed_data.get('DeedDate', ''),
                'recording_date': deed_data.get('RecordingDate', ''),
                'document_number': deed_data.get('DocumentNumber', ''),
                'grantor': deed_data.get('Grantor', ''),
                'grantee': deed_data.get('Grantee', ''),
                'sale_price': self._safe_float(deed_data.get('SalePrice')),
                'transfer_tax': self._safe_float(deed_data.get('TransferTax')),
                'consideration': deed_data.get('Consideration', ''),
                'financing': deed_data.get('Financing', '')
            })
    
    def _find_data_by_paths(self, data: Dict, paths: list) -> Optional[Dict]:
        """Find data using multiple possible paths"""
        for path in paths:
            current = data
            for key in path.split('.'):
                if isinstance(current, dict) and key in current:
                    current = current[key]
                else:
                    current = None
                    break
            
            if current:
                return current
        
        return None
    
    def _safe_float(self, value) -> Optional[float]:
        """Safely convert value to float"""
        if value is None or value == '':
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def _safe_int(self, value) -> Optional[int]:
        """Safely convert value to int"""
        if value is None or value == '':
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None
    
    async def get_chain_of_title(self, address: str, apn: str = None, state: str = "CA") -> Dict:
        """
        Get complete chain of title (ownership history) for a property
        
        Returns:
            {
                'success': True/False,
                'chain_of_title': [
                    {
                        'date': 'YYYY-MM-DD',
                        'grantor': 'Previous owner name',
                        'grantee': 'New owner name',
                        'deed_type': 'Grant Deed, Quitclaim, etc.',
                        'document_number': 'Recording document number',
                        'consideration': 'Sale price or consideration',
                        'legal_description': 'Property legal description'
                    },
                    ...
                ],
                'ownership_duration': [
                    {
                        'owner': 'Owner name',
                        'start_date': 'YYYY-MM-DD',
                        'end_date': 'YYYY-MM-DD',
                        'duration_years': 5.2
                    }
                ],
                'title_issues': [
                    'Any potential title issues found'
                ]
            }
        """
        try:
            if not address and not apn:
                return {
                    'success': False,
                    'message': 'Address or APN is required for chain of title lookup'
                }
            
            # Use TitlePoint.Geo.DeedHistory service for deed chain
            service_type = "TitlePoint.Geo.DeedHistory"
            parameters = f"DeedHistory.FullAddress={address}" if address else f"DeedHistory.APN={apn}"
            
            # Create service request
            request_id = await self._create_service_request(
                state=state,
                county="",  # TitlePoint will determine county from address
                service_type=service_type,
                parameters=parameters
            )
            
            # Wait for completion and get results
            result_xml = await self._wait_for_completion(request_id)
            
            # Parse chain of title from XML
            return self._parse_chain_of_title(result_xml)
            
        except Exception as e:
            return {
                'success': False,
                'message': f"Chain of title lookup failed: {str(e)}",
                'chain_of_title': [],
                'ownership_duration': [],
                'title_issues': []
            }
    
    def _parse_chain_of_title(self, result_xml: str) -> Dict:
        """Parse TitlePoint deed history XML into chain of title format"""
        try:
            data = xmltodict.parse(result_xml)
            
            # Extract deed transactions - paths vary by TitlePoint response format
            deed_transactions = self._extract_deed_transactions(data)
            
            # Sort by date (oldest first)
            deed_transactions.sort(key=lambda x: x.get('date', ''))
            
            # Calculate ownership durations
            ownership_duration = self._calculate_ownership_duration(deed_transactions)
            
            # Identify potential title issues
            title_issues = self._identify_title_issues(deed_transactions)
            
            return {
                'success': True,
                'chain_of_title': deed_transactions,
                'ownership_duration': ownership_duration,
                'title_issues': title_issues,
                'total_transfers': len(deed_transactions)
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f"Failed to parse chain of title: {str(e)}",
                'chain_of_title': [],
                'ownership_duration': [],
                'title_issues': []
            }
    
    def _extract_deed_transactions(self, data: Dict) -> list:
        """Extract deed transactions from TitlePoint XML"""
        transactions = []
        
        # Common paths for deed history in TitlePoint responses
        deed_paths = [
            'TitlePointResult.DeedHistory.Transaction',
            'DeedHistory.Transaction',
            'PropertyHistory.Deed',
            'TransactionHistory.Transaction'
        ]
        
        deed_data = self._find_data_by_paths(data, deed_paths)
        
        if deed_data:
            # Handle both single transaction and array of transactions
            if isinstance(deed_data, list):
                deed_list = deed_data
            else:
                deed_list = [deed_data]
            
            for deed in deed_list:
                transaction = {
                    'date': deed.get('Date', deed.get('RecordingDate', '')),
                    'grantor': deed.get('Grantor', deed.get('GrantorName', '')),
                    'grantee': deed.get('Grantee', deed.get('GranteeName', '')),
                    'deed_type': deed.get('DeedType', deed.get('InstrumentType', '')),
                    'document_number': deed.get('DocumentNumber', deed.get('RecordingNumber', '')),
                    'consideration': deed.get('Consideration', deed.get('SalePrice', '')),
                    'legal_description': deed.get('LegalDescription', ''),
                    'book': deed.get('Book', ''),
                    'page': deed.get('Page', ''),
                    'transfer_tax': deed.get('TransferTax', ''),
                    'recording_fee': deed.get('RecordingFee', '')
                }
                transactions.append(transaction)
        
        return transactions
    
    def _calculate_ownership_duration(self, transactions: list) -> list:
        """Calculate how long each owner held the property"""
        durations = []
        
        for i, transaction in enumerate(transactions):
            owner = transaction.get('grantee', '')
            start_date = transaction.get('date', '')
            
            # Find when this owner transferred the property
            end_date = None
            for j in range(i + 1, len(transactions)):
                if transactions[j].get('grantor', '') == owner:
                    end_date = transactions[j].get('date', '')
                    break
            
            # If no end date found, owner still owns property
            if not end_date:
                end_date = 'Current'
            
            # Calculate duration in years
            duration_years = None
            if start_date and end_date != 'Current':
                try:
                    from datetime import datetime
                    start = datetime.strptime(start_date, '%Y-%m-%d')
                    end = datetime.strptime(end_date, '%Y-%m-%d')
                    duration_days = (end - start).days
                    duration_years = round(duration_days / 365.25, 1)
                except:
                    duration_years = None
            
            durations.append({
                'owner': owner,
                'start_date': start_date,
                'end_date': end_date,
                'duration_years': duration_years
            })
        
        return durations
    
    def _identify_title_issues(self, transactions: list) -> list:
        """Identify potential title issues from transaction history"""
        issues = []
        
        # Check for gaps in ownership chain
        for i in range(len(transactions) - 1):
            current_grantee = transactions[i].get('grantee', '')
            next_grantor = transactions[i + 1].get('grantor', '')
            
            if current_grantee != next_grantor:
                issues.append(f"Ownership gap: {current_grantee} to {next_grantor}")
        
        # Check for quitclaim deeds (potential title concerns)
        quitclaim_deeds = [t for t in transactions if 'quitclaim' in t.get('deed_type', '').lower()]
        if quitclaim_deeds:
            issues.append(f"Found {len(quitclaim_deeds)} quitclaim deed(s) - verify clear title")
        
        # Check for short ownership periods (potential flipping)
        quick_sales = []
        for i in range(len(transactions) - 1):
            try:
                from datetime import datetime
                current_date = datetime.strptime(transactions[i].get('date', ''), '%Y-%m-%d')
                next_date = datetime.strptime(transactions[i + 1].get('date', ''), '%Y-%m-%d')
                days_owned = (next_date - current_date).days
                
                if days_owned < 30:  # Less than 30 days
                    quick_sales.append(f"{transactions[i].get('grantee', '')} owned for only {days_owned} days")
            except:
                continue
        
        if quick_sales:
            issues.extend(quick_sales)
        
        return issues