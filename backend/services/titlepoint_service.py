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
        
        # Service configurations
        self.max_wait_seconds = 300  # 5 minutes max wait
        self.poll_interval = 10  # Poll every 10 seconds
    
    async def enrich_property(self, state: str, county: str, apn: str = None, address: str = None) -> Dict:
        """
        Enrich property data using TitlePoint services
        
        Args:
            state: State abbreviation (e.g., 'CA')
            county: County name
            apn: Assessor's Parcel Number (optional)
            address: Full property address (optional)
            
        Returns:
            Enriched property data including vesting, tax, and deed information
        """
        if not apn and not address:
            raise HTTPException(
                status_code=400,
                detail="Either APN or address must be provided"
            )
        
        try:
            # Determine service type and parameters
            if apn:
                service_type = "TitlePoint.Geo.Tax"
                parameters = f"Tax.APN={apn};General.AutoSearchTaxes=true"
            else:
                service_type = "TitlePoint.Geo.LegalVesting"
                parameters = f"LegalVesting.FullAddress={address}"
            
            # Create service request
            request_id = await self._create_service_request(
                state=state,
                county=county,
                service_type=service_type,
                parameters=parameters
            )
            
            # Wait for completion and get results
            result_data = await self._wait_for_completion(request_id)
            
            # Parse and return enriched data
            return self._parse_titlepoint_result(result_data, state, county, apn, address)
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"TitlePoint enrichment error: {str(e)}"
            )
    
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
            
            if response.ReturnStatus != 'Success':
                raise HTTPException(
                    status_code=400,
                    detail=f"TitlePoint service creation failed: {response.Message}"
                )
            
            return response.RequestID
            
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
            parameters=parameters,
            serviceType=service_type
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
            
            if response.ReturnStatus != 'Success':
                raise HTTPException(
                    status_code=400,
                    detail=f"TitlePoint result retrieval failed: {response.Message}"
                )
            
            return response.ResultData
            
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
            requestID=request_id
        )
    
    def _parse_titlepoint_result(self, result_xml: str, state: str, county: str, apn: str = None, address: str = None) -> Dict:
        """Parse TitlePoint XML result into standardized format"""
        try:
            # Parse XML to dictionary
            data = xmltodict.parse(result_xml)
            
            # Initialize result structure
            parsed_result = {
                'state': state,
                'county': county,
                'apn': apn,
                'address': address,
                'titlepoint_enriched': True,
                'raw_data': data  # Store raw data for debugging
            }
            
            # Extract property information
            self._extract_property_info(data, parsed_result)
            
            # Extract tax information
            self._extract_tax_info(data, parsed_result)
            
            # Extract vesting information
            self._extract_vesting_info(data, parsed_result)
            
            # Extract deed information
            self._extract_deed_info(data, parsed_result)
            
            return parsed_result
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to parse TitlePoint result: {str(e)}"
            )
    
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
