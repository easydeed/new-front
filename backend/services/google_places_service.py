"""
Google Places API Service for property validation and geocoding
"""
import os
import httpx
from typing import Dict, Optional, List
from fastapi import HTTPException


class GooglePlacesService:
    """Service for interacting with Google Places API"""
    
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is required")
        
        self.base_url = "https://maps.googleapis.com/maps/api"
    
    async def validate_address(self, address_data: Dict) -> Dict:
        """
        Validate and enrich address data using Google Places API
        
        Args:
            address_data: Dictionary containing address components from frontend
            
        Returns:
            Validated and enriched address data
        """
        try:
            # If we have a place_id, get details
            if address_data.get('placeId'):
                return await self._get_place_details(address_data['placeId'])
            
            # Otherwise, geocode the address
            full_address = address_data.get('fullAddress', '')
            if not full_address:
                # Construct address from components
                street = address_data.get('street', '')
                city = address_data.get('city', '')
                state = address_data.get('state', '')
                zip_code = address_data.get('zip', '')
                full_address = f"{street}, {city}, {state} {zip_code}".strip(', ')
            
            return await self._geocode_address(full_address)
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Google Places validation failed: {str(e)}"
            )
    
    async def _get_place_details(self, place_id: str) -> Dict:
        """Get detailed information for a specific place ID"""
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/place/details/json"
            params = {
                'place_id': place_id,
                'fields': 'address_components,formatted_address,geometry,name,place_id',
                'key': self.api_key
            }
            
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('status') != 'OK':
                raise HTTPException(
                    status_code=400,
                    detail=f"Google Places API error: {data.get('error_message', 'Unknown error')}"
                )
            
            result = data.get('result', {})
            return self._parse_place_result(result)
    
    async def _geocode_address(self, address: str) -> Dict:
        """Geocode an address to get detailed information"""
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/geocode/json"
            params = {
                'address': address,
                'key': self.api_key
            }
            
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('status') != 'OK':
                raise HTTPException(
                    status_code=400,
                    detail=f"Google Geocoding API error: {data.get('error_message', 'Unknown error')}"
                )
            
            results = data.get('results', [])
            if not results:
                raise HTTPException(
                    status_code=404,
                    detail="Address not found"
                )
            
            # Use the first (most relevant) result
            return self._parse_place_result(results[0])
    
    def _parse_place_result(self, result: Dict) -> Dict:
        """Parse Google Places API result into standardized format"""
        components = result.get('address_components', [])
        
        # Extract address components
        parsed_data = {
            'google_place_id': result.get('place_id'),
            'formatted_address': result.get('formatted_address', ''),
            'street_number': self._get_component(components, 'street_number'),
            'route': self._get_component(components, 'route'),
            'neighborhood': self._get_component(components, 'neighborhood'),
            'city': self._get_component(components, 'locality'),
            'county': self._get_component(components, 'administrative_area_level_2'),
            'state': self._get_component(components, 'administrative_area_level_1', 'short_name'),
            'state_long': self._get_component(components, 'administrative_area_level_1'),
            'zip_code': self._get_component(components, 'postal_code'),
            'country': self._get_component(components, 'country', 'short_name'),
        }
        
        # Construct street address
        street_number = parsed_data.get('street_number', '')
        route = parsed_data.get('route', '')
        parsed_data['street_address'] = f"{street_number} {route}".strip()
        
        # Add geometry if available
        geometry = result.get('geometry', {})
        location = geometry.get('location', {})
        if location:
            parsed_data['latitude'] = location.get('lat')
            parsed_data['longitude'] = location.get('lng')
        
        return parsed_data
    
    def _get_component(self, components: List[Dict], component_type: str, name_type: str = 'long_name') -> Optional[str]:
        """Extract a specific component from address_components"""
        for component in components:
            if component_type in component.get('types', []):
                return component.get(name_type)
        return None
    
    async def search_places(self, query: str, location: Optional[str] = None) -> List[Dict]:
        """
        Search for places using text search
        
        Args:
            query: Search query
            location: Optional location bias (lat,lng format)
            
        Returns:
            List of place suggestions
        """
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/place/textsearch/json"
            params = {
                'query': query,
                'key': self.api_key,
                'type': 'premise'  # Focus on addresses
            }
            
            if location:
                params['location'] = location
                params['radius'] = 50000  # 50km radius
            
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('status') != 'OK':
                return []
            
            results = data.get('results', [])
            return [self._parse_place_result(result) for result in results]
