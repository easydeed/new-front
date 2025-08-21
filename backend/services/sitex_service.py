"""
SiteX Data API Service for property validation and APN/FIPS lookup
"""
import os
import httpx
import xmltodict
from typing import Dict, List, Optional
from fastapi import HTTPException


class SiteXService:
    """Service for interacting with SiteX Data API"""
    
    def __init__(self):
        self.api_key = os.getenv("SITEX_API_KEY")  # Optional - check SiteX docs
        self.base_url = "https://api.sitexdata.com/sitexapi/sitexapi.asmx"
        self.timeout = 30.0
    
    async def search_addresses(self, address: str, locale: str) -> List[Dict]:
        """
        Step 1: Search for addresses and return multiple matches (like multipleResults() in JS)
        
        Args:
            address: Street address
            locale: City, State format (e.g., "Los Angeles, CA")
            
        Returns:
            List of matching properties with APN, address, city, FIPS
        """
        try:
            params = {
                'Address': address,
                'LastLine': locale,
                'ClientReference': '<CustCompFilter><CompNum>8</CompNum><MonthsBack>12</MonthsBack></CustCompFilter>',
                'OwnerName': ''
            }
            
            # Add API key if available
            if self.api_key:
                params['Key'] = self.api_key
            
            # Add reportType=187 as per working JavaScript code
            params['reportType'] = '187'
            
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(
                    f"{self.base_url}/AddressSearch",
                    params=params
                )
                response.raise_for_status()
                
                # Parse XML response
                data = xmltodict.parse(response.text)
                
                # Debug: Log the raw response for troubleshooting
                print(f"SiteX Raw Response: {response.text}")
                print(f"SiteX Parsed Data: {data}")
                
                # Check for API errors first
                status = data.get('SitexApiResult', {}).get('Status')
                status_code = data.get('SitexApiResult', {}).get('StatusCode')
                
                if status_code and status_code != 'OK':
                    raise HTTPException(
                        status_code=400,
                        detail=f"SiteX API error: {status} (Code: {status_code})"
                    )
                
                # Extract locations from response
                sitex_result = data.get('SitexApiResult', {})
                locations_data = sitex_result.get('Locations', {})
                locations = locations_data.get('Location', [])
                
                if not locations:
                    raise HTTPException(
                        status_code=404,
                        detail=f"No property found in SiteX database. Status: {status}, Code: {status_code}"
                    )
                
                # Handle single location vs multiple locations
                if isinstance(locations, dict):
                    locations = [locations]
                
                # Return all matches (like multipleResults() in working JS)
                matches = []
                for location in locations:
                    match = {
                        'apn': location.get('APN', ''),
                        'address': location.get('Address', ''),
                        'city': location.get('City', ''),
                        'fips': location.get('FIPS', ''),
                        'state': location.get('State', ''),
                        'zip': location.get('Zip', '')
                    }
                    matches.append(match)
                
                return matches
                
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=504,
                detail="SiteX API timeout - please try again"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"SiteX validation error: {str(e)}"
            )
    
    async def apn_search(self, apn: str, fips: str) -> Dict:
        """
        Step 2: Get detailed property data using APN (like apnData() and parse187() in JS)
        
        Args:
            apn: Assessor's Parcel Number
            fips: FIPS code from AddressSearch
            
        Returns:
            Dictionary containing detailed property data (owner, legal description, etc.)
        """
        try:
            params = {
                'apn': apn,
                'FIPS': fips,
                'ClientReference': '<CustCompFilter><SQFT>0.20</SQFT><Radius>0.75</Radius></CustCompFilter>',
            }
            
            # Add API key if available
            if self.api_key:
                params['Key'] = self.api_key
            
            # Add reportType=187 as per working JavaScript code
            params['reportType'] = '187'
            
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(
                    f"{self.base_url}/ApnSearch",
                    params=params
                )
                response.raise_for_status()
                
                # Parse XML response
                data = xmltodict.parse(response.text)
                
                # Debug: Log the raw response for troubleshooting
                print(f"SiteX ApnSearch Raw Response: {response.text}")
                print(f"SiteX ApnSearch Parsed Data: {data}")
                
                # Check for API errors first
                status = data.get('SitexApiResult', {}).get('Status')
                status_code = data.get('SitexApiResult', {}).get('StatusCode')
                
                if status_code and status_code != 'OK':
                    raise HTTPException(
                        status_code=400,
                        detail=f"SiteX ApnSearch error: {status} (Code: {status_code})"
                    )
                
                # Extract property details (like parse187() in working JS)
                return self._parse_property_details(data)
                
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=504,
                detail="SiteX ApnSearch timeout - please try again"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"SiteX ApnSearch error: {str(e)}"
            )
    
    def _parse_property_details(self, data: Dict) -> Dict:
        """
        Parse detailed property data from ApnSearch response (like parse187() in working JS)
        """
        try:
            # Navigate to PropertyProfile like in working JS
            sitex_result = data.get('SitexApiResult', {})
            
            # Check if we have a ReportURL (indicates we need to fetch the actual report)
            report_url = sitex_result.get('ReportURL')
            if report_url:
                # This means we need to make another call to get the actual XML data
                # For now, return what we have and note that we need the report URL
                return {
                    'report_url': report_url,
                    'status': 'report_url_provided',
                    'message': 'Need to fetch report from URL'
                }
            
            # If we have direct XML data, parse it like parse187()
            # This structure will be determined by actual API response
            property_profile = sitex_result.get('PropertyProfile', {})
            subject_value_info = sitex_result.get('SubjectValueInfo', {})
            
            # Extract data exactly like parse187() function
            owner_name_primary = property_profile.get('PrimaryOwnerName', '')
            owner_name_secondary = property_profile.get('SecondaryOwnerName', '')
            
            # Handle owner name parsing like in working JS
            if ';' in owner_name_primary:
                parts = owner_name_primary.split(';')
                owner_name_primary = parts[0].strip()
                if len(parts) > 1:
                    owner_name_secondary = parts[1].strip()
            
            # Build full address like in working JS
            full_address_parts = []
            if property_profile.get('SiteUnit'):
                full_address_parts.append(property_profile.get('SiteUnit'))
            if property_profile.get('SiteAddress'):
                full_address_parts.append(property_profile.get('SiteAddress'))
            if property_profile.get('SiteCity'):
                full_address_parts.append(property_profile.get('SiteCity'))
            if property_profile.get('SiteState'):
                full_address_parts.append(property_profile.get('SiteState'))
            if property_profile.get('SiteZip'):
                full_address_parts.append(property_profile.get('SiteZip'))
            
            return {
                'owner_name_primary': self._to_title_case(owner_name_primary.replace(',', '').strip()),
                'owner_name_secondary': self._to_title_case(owner_name_secondary.replace(',', '').strip()),
                'full_address': ', '.join(full_address_parts),
                'apn': property_profile.get('APN', ''),
                'county': subject_value_info.get('CountyName', ''),
                'legal_description': property_profile.get('LegalBriefDescription', '').replace('  ', ' ').strip(),
                'site_unit': property_profile.get('SiteUnit', ''),
                'site_address': property_profile.get('SiteAddress', ''),
                'site_city': property_profile.get('SiteCity', ''),
                'site_state': property_profile.get('SiteState', ''),
                'site_zip': property_profile.get('SiteZip', '')
            }
            
        except Exception as e:
            print(f"Error parsing property details: {e}")
            return {
                'error': f"Failed to parse property details: {str(e)}",
                'raw_data': data
            }
    
    def _to_title_case(self, text: str) -> str:
        """Convert text to title case like toTitleCase() in working JS"""
        if not text:
            return ''
        return ' '.join(word.capitalize() for word in text.split())
    
    def _parse_sitex_result(self, location_data: Dict, original_address: str, original_locale: str) -> Dict:
        """Parse SiteX API response into standardized format"""
        
        return {
            # Core property identifiers
            'apn': location_data.get('APN', ''),
            'fips': location_data.get('FIPS', ''),
            'sitex_id': location_data.get('ID', ''),
            
            # Validated address components
            'validated_address': location_data.get('Address', original_address),
            'validated_city': location_data.get('City', ''),
            'validated_state': location_data.get('State', ''),
            'validated_zip': location_data.get('Zip', ''),
            'county': location_data.get('County', ''),
            
            # Property details
            'property_type': location_data.get('PropertyType', ''),
            'use_code': location_data.get('UseCode', ''),
            'land_use': location_data.get('LandUse', ''),
            
            # Geographic data
            'latitude': self._safe_float(location_data.get('Latitude')),
            'longitude': self._safe_float(location_data.get('Longitude')),
            'census_tract': location_data.get('CensusTract', ''),
            
            # Ownership information (if available)
            'owner_name': location_data.get('OwnerName', ''),
            'mailing_address': location_data.get('MailingAddress', ''),
            
            # Property characteristics
            'year_built': self._safe_int(location_data.get('YearBuilt')),
            'bedrooms': self._safe_int(location_data.get('Bedrooms')),
            'bathrooms': self._safe_float(location_data.get('Bathrooms')),
            'square_feet': self._safe_int(location_data.get('SquareFeet')),
            'lot_size': self._safe_float(location_data.get('LotSize')),
            
            # Valuation data
            'assessed_value': self._safe_float(location_data.get('AssessedValue')),
            'market_value': self._safe_float(location_data.get('MarketValue')),
            'tax_amount': self._safe_float(location_data.get('TaxAmount')),
            
            # Original search parameters
            'original_address': original_address,
            'original_locale': original_locale,
            
            # Validation status
            'sitex_validated': True,
            'validation_confidence': self._calculate_confidence(location_data, original_address)
        }
    
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
            return int(float(value))  # Handle "123.0" strings
        except (ValueError, TypeError):
            return None
    
    def _calculate_confidence(self, location_data: Dict, original_address: str) -> float:
        """Calculate confidence score for the match"""
        confidence = 0.0
        
        # Base confidence for having APN
        if location_data.get('APN'):
            confidence += 0.4
        
        # Confidence for address match
        validated_address = location_data.get('Address', '').lower()
        original_lower = original_address.lower()
        
        if validated_address and original_lower:
            # Simple similarity check
            common_words = set(validated_address.split()) & set(original_lower.split())
            if len(original_lower.split()) > 0:
                word_similarity = len(common_words) / len(original_lower.split())
                confidence += word_similarity * 0.4
        
        # Confidence for having detailed property data
        if location_data.get('County'):
            confidence += 0.1
        if location_data.get('OwnerName'):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    async def get_property_details(self, apn: str, county: str = '', state: str = 'CA') -> Dict:
        """
        Get detailed property information by APN
        
        Args:
            apn: Assessor's Parcel Number
            county: County name (optional)
            state: State abbreviation (default: CA)
            
        Returns:
            Detailed property information
        """
        try:
            params = {
                'APN': apn,
                'County': county,
                'State': state
            }
            
            if self.api_key:
                params['ApiKey'] = self.api_key
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/PropertyDetails",
                    params=params
                )
                response.raise_for_status()
                
                data = xmltodict.parse(response.text)
                property_data = data.get('Property', {})
                
                if not property_data:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Property not found for APN: {apn}"
                    )
                
                return self._parse_property_details(property_data)
                
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"SiteX property details error: {str(e)}"
            )
    
    def _parse_property_details(self, property_data: Dict) -> Dict:
        """Parse detailed property information"""
        return {
            'apn': property_data.get('APN', ''),
            'property_address': property_data.get('PropertyAddress', ''),
            'legal_description': property_data.get('LegalDescription', ''),
            'owner_name': property_data.get('OwnerName', ''),
            'deed_type': property_data.get('DeedType', ''),
            'deed_date': property_data.get('DeedDate', ''),
            'sale_price': self._safe_float(property_data.get('SalePrice')),
            'sale_date': property_data.get('SaleDate', ''),
            'prior_sale_price': self._safe_float(property_data.get('PriorSalePrice')),
            'prior_sale_date': property_data.get('PriorSaleDate', ''),
            'property_type': property_data.get('PropertyType', ''),
            'zoning': property_data.get('Zoning', ''),
            'school_district': property_data.get('SchoolDistrict', ''),
        }
