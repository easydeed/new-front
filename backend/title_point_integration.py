"""
Enhanced TitlePoint API Integration Service
"""
import httpx
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class TitlePointService:
    """Enhanced TitlePoint integration for dynamic data pulling"""
    
    def __init__(self):
        self.api_key = os.getenv('TITLEPOINT_API_KEY')
        self.base_url = os.getenv('TITLEPOINT_BASE_URL', 'https://api.titlepoint.com/v1')
        self.timeout = 30.0
        
    async def search_property(self, address: str) -> Dict[str, Any]:
        """Search for property by address"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/property/search",
                    headers={
                        'Authorization': f'Bearer {self.api_key}',
                        'Content-Type': 'application/json'
                    },
                    json={'address': address}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        'success': True,
                        'data': {
                            'apn': data.get('apn'),
                            'county': data.get('county'),
                            'city': data.get('city'),
                            'state': data.get('state', 'CA'),
                            'zip_code': data.get('zip'),
                            'legal_description': data.get('legal_description'),
                            'current_owner': data.get('owner_name'),
                            'formatted_address': data.get('formatted_address', address),
                            'confidence': data.get('confidence', 0.8)
                        }
                    }
                else:
                    return {
                        'success': False,
                        'message': 'Property not found'
                    }
                    
        except Exception as e:
            logger.error(f"TitlePoint property search error: {str(e)}")
            return {
                'success': False,
                'message': 'Search service unavailable'
            }
    
    async def get_vesting_info(self, address: str = None, apn: str = None) -> Dict[str, Any]:
        """Get vesting information for a property"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                params = {}
                if apn:
                    params['apn'] = apn
                elif address:
                    params['address'] = address
                else:
                    return {}
                
                response = await client.get(
                    f"{self.base_url}/property/vesting",
                    headers={'Authorization': f'Bearer {self.api_key}'},
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        'vesting_description': data.get('vesting_type'),
                        'current_owner': data.get('primary_owner'),
                        'secondary_owner': data.get('secondary_owner'),
                        'ownership_type': data.get('ownership_classification'),
                        'acquisition_date': data.get('acquisition_date'),
                        'deed_type': data.get('last_deed_type')
                    }
                else:
                    return {}
                    
        except Exception as e:
            logger.error(f"TitlePoint vesting error: {str(e)}")
            return {}
    
    async def get_grant_history(self, address: str = None, apn: str = None) -> Dict[str, Any]:
        """Get grant deed history"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                params = {}
                if apn:
                    params['apn'] = apn
                elif address:
                    params['address'] = address
                else:
                    return {}
                
                response = await client.get(
                    f"{self.base_url}/property/grants",
                    headers={'Authorization': f'Bearer {self.api_key}'},
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    grants = data.get('grants', [])
                    
                    return {
                        'recent_grants': grants[:5],  # Last 5 grants
                        'last_sale_price': grants[0].get('consideration') if grants else '',
                        'last_sale_date': grants[0].get('recording_date') if grants else '',
                        'deed_chain': [g.get('deed_type') for g in grants]
                    }
                else:
                    return {}
                    
        except Exception as e:
            logger.error(f"TitlePoint grant history error: {str(e)}")
            return {}
    
    async def get_tax_info(self, address: str = None, apn: str = None) -> Dict[str, Any]:
        """Get tax roll information"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                params = {}
                if apn:
                    params['apn'] = apn
                elif address:
                    params['address'] = address
                else:
                    return {}
                
                response = await client.get(
                    f"{self.base_url}/property/tax",
                    headers={'Authorization': f'Bearer {self.api_key}'},
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        'assessed_value': data.get('assessed_value'),
                        'annual_tax': data.get('annual_tax_amount'),
                        'tax_year': data.get('tax_year'),
                        'exemptions': data.get('exemptions', []),
                        'tax_rate': data.get('tax_rate'),
                        'market_value': data.get('market_value')
                    }
                else:
                    return {}
                    
        except Exception as e:
            logger.error(f"TitlePoint tax info error: {str(e)}")
            return {}
    
    async def get_comprehensive_report(self, address: str = None, apn: str = None) -> Dict[str, Any]:
        """Get comprehensive property report - all data"""
        try:
            # Fetch all data types in parallel
            vesting_task = self.get_vesting_info(address, apn)
            grant_task = self.get_grant_history(address, apn)
            tax_task = self.get_tax_info(address, apn)
            lien_task = self.get_lien_info(address, apn)
            
            # Wait for all tasks
            vesting_data = await vesting_task
            grant_data = await grant_task
            tax_data = await tax_task
            lien_data = await lien_task
            
            # Merge all data
            comprehensive_data = {}
            comprehensive_data.update(vesting_data)
            comprehensive_data.update(grant_data)
            comprehensive_data.update(tax_data)
            comprehensive_data.update(lien_data)
            
            return comprehensive_data
            
        except Exception as e:
            logger.error(f"TitlePoint comprehensive report error: {str(e)}")
            return {}
    
    async def get_ownership_chain(self, address: str = None, apn: str = None) -> Dict[str, Any]:
        """Get ownership chain/title chain"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                params = {}
                if apn:
                    params['apn'] = apn
                elif address:
                    params['address'] = address
                else:
                    return {}
                
                response = await client.get(
                    f"{self.base_url}/property/chain",
                    headers={'Authorization': f'Bearer {self.api_key}'},
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        'ownership_chain': data.get('chain', []),
                        'title_issues': data.get('issues', []),
                        'clear_title': data.get('clear_title', True)
                    }
                else:
                    return {}
                    
        except Exception as e:
            logger.error(f"TitlePoint ownership chain error: {str(e)}")
            return {}
    
    async def get_lien_info(self, address: str = None, apn: str = None) -> Dict[str, Any]:
        """Get lien and encumbrance information"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                params = {}
                if apn:
                    params['apn'] = apn
                elif address:
                    params['address'] = address
                else:
                    return {}
                
                response = await client.get(
                    f"{self.base_url}/property/liens",
                    headers={'Authorization': f'Bearer {self.api_key}'},
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        'active_liens': data.get('liens', []),
                        'total_lien_amount': data.get('total_amount', 0),
                        'lien_count': len(data.get('liens', [])),
                        'encumbrances': data.get('encumbrances', [])
                    }
                else:
                    return {}
                    
        except Exception as e:
            logger.error(f"TitlePoint lien info error: {str(e)}")
            return {}
    
    async def get_address_suggestions(self, partial_address: str) -> List[Dict[str, Any]]:
        """Get address suggestions for autocomplete"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/property/suggest",
                    headers={'Authorization': f'Bearer {self.api_key}'},
                    params={'q': partial_address, 'limit': 10}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get('suggestions', [])
                else:
                    return []
                    
        except Exception as e:
            logger.error(f"TitlePoint address suggestions error: {str(e)}")
            return []
