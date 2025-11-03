"""
Unit Tests for SiteXService
Tests OAuth2 token management, address search, FIPS/APN search, and error handling
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
import httpx

# Import the service
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.sitex_service import SiteXService


class TestSiteXServiceConfiguration:
    """Test service configuration and initialization"""
    
    def test_service_configured_with_all_credentials(self):
        """Service should be configured when all credentials are present"""
        with patch.dict(os.environ, {
            'SITEX_BASE_URL': 'https://api.test.com',
            'SITEX_CLIENT_ID': 'test_client',
            'SITEX_CLIENT_SECRET': 'test_secret',
            'SITEX_USERNAME': 'test_user',
            'SITEX_PASSWORD': 'test_pass'
        }):
            service = SiteXService()
            assert service.is_configured() is True
    
    def test_service_not_configured_missing_credentials(self):
        """Service should not be configured when credentials are missing"""
        with patch.dict(os.environ, {}, clear=True):
            service = SiteXService()
            assert service.is_configured() is False
    
    def test_service_not_configured_partial_credentials(self):
        """Service should not be configured with partial credentials"""
        with patch.dict(os.environ, {
            'SITEX_BASE_URL': 'https://api.test.com',
            'SITEX_CLIENT_ID': 'test_client'
            # Missing other credentials
        }):
            service = SiteXService()
            assert service.is_configured() is False


class TestSiteXOAuth2TokenManagement:
    """Test OAuth2 token acquisition and caching"""
    
    @pytest.mark.asyncio
    async def test_get_token_success(self):
        """Should successfully acquire OAuth2 token"""
        with patch.dict(os.environ, {
            'SITEX_BASE_URL': 'https://api.test.com',
            'SITEX_CLIENT_ID': 'test_client',
            'SITEX_CLIENT_SECRET': 'test_secret',
            'SITEX_USERNAME': 'test_user',
            'SITEX_PASSWORD': 'test_pass'
        }):
            service = SiteXService()
            
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'access_token': 'test_token_12345',
                'expires_in': 600
            }
            
            with patch.object(httpx.AsyncClient, 'post', return_value=mock_response):
                token = await service._get_token()
                
                assert token == 'test_token_12345'
                assert service._token == 'test_token_12345'
                assert service._token_expires is not None
    
    @pytest.mark.asyncio
    async def test_token_caching(self):
        """Should cache token and reuse until expiration"""
        with patch.dict(os.environ, {
            'SITEX_BASE_URL': 'https://api.test.com',
            'SITEX_CLIENT_ID': 'test_client',
            'SITEX_CLIENT_SECRET': 'test_secret',
            'SITEX_USERNAME': 'test_user',
            'SITEX_PASSWORD': 'test_pass'
        }):
            service = SiteXService()
            
            # Set cached token
            service._token = 'cached_token'
            service._token_expires = datetime.utcnow() + timedelta(minutes=5)
            
            # Should return cached token without API call
            token = await service._get_token()
            assert token == 'cached_token'
    
    @pytest.mark.asyncio
    async def test_token_refresh_on_expiration(self):
        """Should refresh token when expired"""
        with patch.dict(os.environ, {
            'SITEX_BASE_URL': 'https://api.test.com',
            'SITEX_CLIENT_ID': 'test_client',
            'SITEX_CLIENT_SECRET': 'test_secret',
            'SITEX_USERNAME': 'test_user',
            'SITEX_PASSWORD': 'test_pass'
        }):
            service = SiteXService()
            
            # Set expired token
            service._token = 'expired_token'
            service._token_expires = datetime.utcnow() - timedelta(minutes=5)
            
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'access_token': 'new_token',
                'expires_in': 600
            }
            
            with patch.object(httpx.AsyncClient, 'post', return_value=mock_response):
                token = await service._get_token()
                
                assert token == 'new_token'
                assert service._token == 'new_token'
    
    @pytest.mark.asyncio
    async def test_token_acquisition_failure(self):
        """Should raise exception on token acquisition failure"""
        with patch.dict(os.environ, {
            'SITEX_BASE_URL': 'https://api.test.com',
            'SITEX_CLIENT_ID': 'test_client',
            'SITEX_CLIENT_SECRET': 'test_secret',
            'SITEX_USERNAME': 'test_user',
            'SITEX_PASSWORD': 'test_pass'
        }):
            service = SiteXService()
            
            mock_response = Mock()
            mock_response.status_code = 401
            mock_response.text = 'Unauthorized'
            
            with patch.object(httpx.AsyncClient, 'post', return_value=mock_response):
                with pytest.raises(Exception, match="SiteX OAuth2 failed"):
                    await service._get_token()


class TestSiteXAddressSearch:
    """Test address search functionality"""
    
    @pytest.mark.asyncio
    async def test_search_address_single_match(self):
        """Should return property feed for single match"""
        with patch.dict(os.environ, {
            'SITEX_BASE_URL': 'https://api.test.com',
            'SITEX_CLIENT_ID': 'test_client',
            'SITEX_CLIENT_SECRET': 'test_secret',
            'SITEX_USERNAME': 'test_user',
            'SITEX_PASSWORD': 'test_pass'
        }):
            service = SiteXService()
            service._token = 'test_token'
            service._token_expires = datetime.utcnow() + timedelta(minutes=5)
            
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'Feed': {
                    'PropertyProfile': {
                        'APN': '1234-567-890',
                        'PrimaryOwnerName': 'JOHN DOE',
                        'SiteCity': 'Los Angeles',
                        'SiteCountyName': 'LOS ANGELES',
                        'LegalDescription': 'LOT 1 BLK 2'
                    }
                }
            }
            
            with patch.object(httpx.AsyncClient, 'get', return_value=mock_response):
                result = await service.search_address(
                    street='123 Main St',
                    last_line='Los Angeles, CA 90001',
                    client_ref='user:123',
                    options='search_strict=Y'
                )
                
                assert result['Feed']['PropertyProfile']['APN'] == '1234-567-890'
                assert result['Feed']['PropertyProfile']['PrimaryOwnerName'] == 'JOHN DOE'
    
    @pytest.mark.asyncio
    async def test_search_address_multi_match(self):
        """Should return Locations array for multi-match"""
        with patch.dict(os.environ, {
            'SITEX_BASE_URL': 'https://api.test.com',
            'SITEX_CLIENT_ID': 'test_client',
            'SITEX_CLIENT_SECRET': 'test_secret',
            'SITEX_USERNAME': 'test_user',
            'SITEX_PASSWORD': 'test_pass'
        }):
            service = SiteXService()
            service._token = 'test_token'
            service._token_expires = datetime.utcnow() + timedelta(minutes=5)
            
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'Locations': [
                    {'FIPS': '06037', 'APN': '1234-001', 'Address': '123 Main St'},
                    {'FIPS': '06037', 'APN': '1234-002', 'Address': '123 Main St Unit A'}
                ]
            }
            
            with patch.object(httpx.AsyncClient, 'get', return_value=mock_response):
                result = await service.search_address(
                    street='123 Main St',
                    last_line='Los Angeles, CA 90001'
                )
                
                assert 'Locations' in result
                assert len(result['Locations']) == 2
    
    @pytest.mark.asyncio
    async def test_search_address_no_match(self):
        """Should return no match status"""
        with patch.dict(os.environ, {
            'SITEX_BASE_URL': 'https://api.test.com',
            'SITEX_CLIENT_ID': 'test_client',
            'SITEX_CLIENT_SECRET': 'test_secret',
            'SITEX_USERNAME': 'test_user',
            'SITEX_PASSWORD': 'test_pass'
        }):
            service = SiteXService()
            service._token = 'test_token'
            service._token_expires = datetime.utcnow() + timedelta(minutes=5)
            
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'Status': 'NO_MATCH',
                'StatusCode': 'NO_MATCH'
            }
            
            with patch.object(httpx.AsyncClient, 'get', return_value=mock_response):
                result = await service.search_address(
                    street='999 Nonexistent Rd',
                    last_line='Nowhere, CA 99999'
                )
                
                assert result['Status'] == 'NO_MATCH'


class TestSiteXFIPSAPNSearch:
    """Test FIPS/APN search functionality"""
    
    @pytest.mark.asyncio
    async def test_search_fips_apn_success(self):
        """Should return property feed for FIPS/APN search"""
        with patch.dict(os.environ, {
            'SITEX_BASE_URL': 'https://api.test.com',
            'SITEX_CLIENT_ID': 'test_client',
            'SITEX_CLIENT_SECRET': 'test_secret',
            'SITEX_USERNAME': 'test_user',
            'SITEX_PASSWORD': 'test_pass'
        }):
            service = SiteXService()
            service._token = 'test_token'
            service._token_expires = datetime.utcnow() + timedelta(minutes=5)
            
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'Feed': {
                    'PropertyProfile': {
                        'APN': '1234-567-890',
                        'FIPS': '06037',
                        'PrimaryOwnerName': 'JANE SMITH',
                        'LegalDescription': 'COMPLETE LEGAL DESCRIPTION'
                    }
                }
            }
            
            with patch.object(httpx.AsyncClient, 'get', return_value=mock_response):
                result = await service.search_fips_apn(
                    fips='06037',
                    apn='1234-567-890',
                    client_ref='user:123'
                )
                
                assert result['Feed']['PropertyProfile']['APN'] == '1234-567-890'
                assert result['Feed']['PropertyProfile']['FIPS'] == '06037'


class TestSiteXErrorHandling:
    """Test error handling and resilience"""
    
    @pytest.mark.asyncio
    async def test_http_timeout_handling(self):
        """Should handle HTTP timeouts gracefully"""
        with patch.dict(os.environ, {
            'SITEX_BASE_URL': 'https://api.test.com',
            'SITEX_CLIENT_ID': 'test_client',
            'SITEX_CLIENT_SECRET': 'test_secret',
            'SITEX_USERNAME': 'test_user',
            'SITEX_PASSWORD': 'test_pass'
        }):
            service = SiteXService()
            service._token = 'test_token'
            service._token_expires = datetime.utcnow() + timedelta(minutes=5)
            
            with patch.object(httpx.AsyncClient, 'get', side_effect=httpx.TimeoutException('Timeout')):
                with pytest.raises(Exception):
                    await service.search_address('123 Main St', 'LA, CA 90001')
    
    @pytest.mark.asyncio
    async def test_http_500_error_handling(self):
        """Should handle HTTP 500 errors"""
        with patch.dict(os.environ, {
            'SITEX_BASE_URL': 'https://api.test.com',
            'SITEX_CLIENT_ID': 'test_client',
            'SITEX_CLIENT_SECRET': 'test_secret',
            'SITEX_USERNAME': 'test_user',
            'SITEX_PASSWORD': 'test_pass'
        }):
            service = SiteXService()
            service._token = 'test_token'
            service._token_expires = datetime.utcnow() + timedelta(minutes=5)
            
            mock_response = Mock()
            mock_response.status_code = 500
            mock_response.text = 'Internal Server Error'
            
            with patch.object(httpx.AsyncClient, 'get', return_value=mock_response):
                with pytest.raises(Exception, match="SiteX API error"):
                    await service.search_address('123 Main St', 'LA, CA 90001')


class TestSiteXDeedImageRetrieval:
    """Test deed image retrieval functionality"""
    
    @pytest.mark.asyncio
    async def test_fetch_deed_image_success(self):
        """Should successfully fetch deed image"""
        with patch.dict(os.environ, {
            'SITEX_BASE_URL': 'https://api.test.com',
            'SITEX_CLIENT_ID': 'test_client',
            'SITEX_CLIENT_SECRET': 'test_secret',
            'SITEX_USERNAME': 'test_user',
            'SITEX_PASSWORD': 'test_pass'
        }):
            service = SiteXService()
            service._token = 'test_token'
            service._token_expires = datetime.utcnow() + timedelta(minutes=5)
            
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.content = b'%PDF-1.4 fake pdf content'
            
            with patch.object(httpx.AsyncClient, 'get', return_value=mock_response):
                result = await service.fetch_deed_image(
                    fips='06037',
                    apn='1234-567-890',
                    doc_number='2020-123456',
                    format='PDF'
                )
                
                assert result == b'%PDF-1.4 fake pdf content'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])






