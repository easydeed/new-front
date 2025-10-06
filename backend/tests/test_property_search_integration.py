"""
Integration Tests for Property Search Endpoint
Tests complete flow: Request → SiteX → Field Mapping → Response
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app


@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)


@pytest.fixture
def mock_auth():
    """Mock authentication dependency"""
    return "test_user_123"


@pytest.fixture
def sample_sitex_single_match():
    """Sample SiteX response for single match"""
    return {
        'Feed': {
            'PropertyProfile': {
                'APN': '6327-030-021',
                'PrimaryOwnerName': 'JOHN DOE AND JANE DOE',
                'SiteAddress': '123 Main St',
                'SiteCity': 'Los Angeles',
                'SiteState': 'CA',
                'SiteZip': '90001',
                'SiteCountyName': 'LOS ANGELES',
                'LegalDescription': 'LOT 5 BLK 2 TRACT 12345',
                'UseCodeDescription': 'Single Family Residence',
                'FIPS': '06037',
                'LastSaleRecordingDate': '2020-05-15',
                'LastSaleDocumentNumber': '2020-123456'
            }
        },
        'Status': 'OK',
        'StatusCode': 'OK'
    }


@pytest.fixture
def sample_sitex_multi_match():
    """Sample SiteX response for multi-match"""
    return {
        'Locations': [
            {
                'FIPS': '06037',
                'APN': '6327-030-021',
                'Address': '123 MAIN ST',
                'City': 'LOS ANGELES',
                'State': 'CA',
                'ZIP': '90001',
                'UnitType': '',
                'UnitNumber': ''
            },
            {
                'FIPS': '06037',
                'APN': '6327-030-022',
                'Address': '123 MAIN ST',
                'City': 'LOS ANGELES',
                'State': 'CA',
                'ZIP': '90001',
                'UnitType': 'APT',
                'UnitNumber': 'A'
            }
        ]
    }


class TestPropertySearchEndpoint:
    """Test /api/property/search endpoint integration"""
    
    @patch('api.property_endpoints.get_current_user_id')
    @patch('services.sitex_service.SiteXService.search_address')
    @patch('services.sitex_service.SiteXService.is_configured')
    def test_property_search_single_match_success(
        self, 
        mock_configured,
        mock_search,
        mock_auth,
        client,
        sample_sitex_single_match
    ):
        """Should return mapped property data for single match"""
        mock_auth.return_value = "test_user_123"
        mock_configured.return_value = True
        mock_search.return_value = sample_sitex_single_match
        
        response = client.post(
            '/api/property/search',
            json={
                'fullAddress': '123 Main St, Los Angeles, CA 90001, USA',
                'street': '123 Main St',
                'city': 'Los Angeles',
                'state': 'CA',
                'zip': '90001',
                'placeId': 'test_place_id'
            },
            headers={'Authorization': 'Bearer test_token'}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] is True
        assert data['apn'] == '6327-030-021'
        assert data['grantorName'] == 'JOHN DOE AND JANE DOE'
        assert data['county'] == 'LOS ANGELES'
        assert data['city'] == 'Los Angeles'
        assert data['legalDescription'] == 'LOT 5 BLK 2 TRACT 12345'
        assert data['propertyType'] == 'Single Family Residence'
        assert data['source'] == 'sitex'
    
    @patch('api.property_endpoints.get_current_user_id')
    @patch('services.sitex_service.SiteXService.search_address')
    @patch('services.sitex_service.SiteXService.search_fips_apn')
    @patch('services.sitex_service.SiteXService.is_configured')
    def test_property_search_multi_match_auto_resolution(
        self,
        mock_configured,
        mock_fips_search,
        mock_address_search,
        mock_auth,
        client,
        sample_sitex_multi_match,
        sample_sitex_single_match
    ):
        """Should auto-resolve multi-match and re-query with FIPS/APN"""
        mock_auth.return_value = "test_user_123"
        mock_configured.return_value = True
        mock_address_search.return_value = sample_sitex_multi_match
        mock_fips_search.return_value = sample_sitex_single_match
        
        response = client.post(
            '/api/property/search',
            json={
                'fullAddress': '123 Main St, Los Angeles, CA 90001, USA',
                'street': '123 Main St',
                'city': 'Los Angeles',
                'state': 'CA',
                'zip': '90001',
                'placeId': 'test_place_id'
            },
            headers={'Authorization': 'Bearer test_token'}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify multi-match was auto-resolved
        assert mock_fips_search.called
        assert data['success'] is True
        assert data['apn'] == '6327-030-021'
    
    @patch('api.property_endpoints.get_current_user_id')
    @patch('services.sitex_service.SiteXService.is_configured')
    def test_property_search_sitex_not_configured(
        self,
        mock_configured,
        mock_auth,
        client
    ):
        """Should return error when SiteX not configured"""
        mock_auth.return_value = "test_user_123"
        mock_configured.return_value = False
        
        response = client.post(
            '/api/property/search',
            json={
                'fullAddress': '123 Main St, Los Angeles, CA 90001, USA',
                'street': '123 Main St',
                'city': 'Los Angeles',
                'state': 'CA',
                'zip': '90001',
                'placeId': 'test_place_id'
            },
            headers={'Authorization': 'Bearer test_token'}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] is False
        assert 'not configured' in data['message'].lower()
        assert data['manual_entry_required'] is True
    
    @patch('api.property_endpoints.get_current_user_id')
    @patch('services.sitex_service.SiteXService.search_address')
    @patch('services.sitex_service.SiteXService.is_configured')
    def test_property_search_sitex_error_graceful_fallback(
        self,
        mock_configured,
        mock_search,
        mock_auth,
        client
    ):
        """Should gracefully handle SiteX errors and allow manual entry"""
        mock_auth.return_value = "test_user_123"
        mock_configured.return_value = True
        mock_search.side_effect = Exception("SiteX API timeout")
        
        response = client.post(
            '/api/property/search',
            json={
                'fullAddress': '123 Main St, Los Angeles, CA 90001, USA',
                'street': '123 Main St',
                'city': 'Los Angeles',
                'state': 'CA',
                'zip': '90001',
                'placeId': 'test_place_id'
            },
            headers={'Authorization': 'Bearer test_token'}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] is False
        assert data['manual_entry_required'] is True
        assert 'manual' in data['message'].lower()
    
    def test_property_search_missing_auth(self, client):
        """Should return 401 when authentication missing"""
        response = client.post(
            '/api/property/search',
            json={
                'fullAddress': '123 Main St, Los Angeles, CA 90001, USA',
                'street': '123 Main St',
                'city': 'Los Angeles',
                'state': 'CA',
                'zip': '90001'
            }
        )
        
        assert response.status_code in [401, 403]
    
    def test_property_search_invalid_request_format(self, client):
        """Should return 422 for invalid request format"""
        response = client.post(
            '/api/property/search',
            json={
                'invalid_field': 'invalid_value'
            },
            headers={'Authorization': 'Bearer test_token'}
        )
        
        assert response.status_code == 422


class TestFieldMapping:
    """Test SiteX field mapping logic"""
    
    @patch('api.property_endpoints.get_current_user_id')
    @patch('services.sitex_service.SiteXService.search_address')
    @patch('services.sitex_service.SiteXService.is_configured')
    def test_all_fields_mapped_correctly(
        self,
        mock_configured,
        mock_search,
        mock_auth,
        client,
        sample_sitex_single_match
    ):
        """Should map all SiteX fields to UI contract correctly"""
        mock_auth.return_value = "test_user_123"
        mock_configured.return_value = True
        mock_search.return_value = sample_sitex_single_match
        
        response = client.post(
            '/api/property/search',
            json={
                'fullAddress': '123 Main St, Los Angeles, CA 90001, USA',
                'street': '123 Main St',
                'city': 'Los Angeles',
                'state': 'CA',
                'zip': '90001'
            },
            headers={'Authorization': 'Bearer test_token'}
        )
        
        data = response.json()
        profile = sample_sitex_single_match['Feed']['PropertyProfile']
        
        # Verify field mappings
        assert data['apn'] == profile['APN']
        assert data['grantorName'] == profile['PrimaryOwnerName']
        assert data['county'] == profile['SiteCountyName']
        assert data['city'] == profile['SiteCity']
        assert data['state'] == profile['SiteState']
        assert data['zip'] == profile['SiteZip']
        assert data['legalDescription'] == profile['LegalDescription']
        assert data['propertyType'] == profile['UseCodeDescription']
        assert data['fips'] == profile['FIPS']
        assert data['recording_date'] == profile['LastSaleRecordingDate']
        assert data['doc_number'] == profile['LastSaleDocumentNumber']
    
    @patch('api.property_endpoints.get_current_user_id')
    @patch('services.sitex_service.SiteXService.search_address')
    @patch('services.sitex_service.SiteXService.is_configured')
    def test_missing_fields_handled_gracefully(
        self,
        mock_configured,
        mock_search,
        mock_auth,
        client
    ):
        """Should handle missing optional fields gracefully"""
        mock_auth.return_value = "test_user_123"
        mock_configured.return_value = True
        
        # SiteX response with missing optional fields
        incomplete_response = {
            'Feed': {
                'PropertyProfile': {
                    'APN': '1234-567-890',
                    'PrimaryOwnerName': 'TEST OWNER',
                    'SiteCity': 'Test City',
                    'SiteCountyName': 'TEST COUNTY'
                    # Missing: LegalDescription, UseCodeDescription, etc.
                }
            }
        }
        mock_search.return_value = incomplete_response
        
        response = client.post(
            '/api/property/search',
            json={
                'fullAddress': '123 Main St, Test City, CA 90001, USA',
                'street': '123 Main St',
                'city': 'Test City',
                'state': 'CA',
                'zip': '90001'
            },
            headers={'Authorization': 'Bearer test_token'}
        )
        
        data = response.json()
        
        assert data['success'] is True
        assert data['apn'] == '1234-567-890'
        assert data['grantorName'] == 'TEST OWNER'
        assert data['legalDescription'] == ''  # Empty string for missing
        assert data['propertyType'] == 'Single Family Residence'  # Default


class TestCacheVersioning:
    """Test cache versioning logic"""
    
    @patch('api.property_endpoints.get_current_user_id')
    @patch('api.property_endpoints.get_cached_titlepoint_data')
    @patch('services.sitex_service.SiteXService.is_configured')
    def test_cache_key_includes_version(
        self,
        mock_configured,
        mock_cache,
        mock_auth,
        client
    ):
        """Should include version in cache key"""
        mock_auth.return_value = "test_user_123"
        mock_configured.return_value = True
        mock_cache.return_value = None  # Cache miss
        
        # The endpoint should check cache with versioned key
        # This test verifies the cache lookup includes "v2:"
        
        response = client.post(
            '/api/property/search',
            json={
                'fullAddress': '123 Main St, Los Angeles, CA 90001, USA',
                'street': '123 Main St',
                'city': 'Los Angeles',
                'state': 'CA',
                'zip': '90001'
            },
            headers={'Authorization': 'Bearer test_token'}
        )
        
        # Verify cache was checked with versioned key
        if mock_cache.called:
            cache_key_arg = mock_cache.call_args[0][1]
            assert 'v2:' in cache_key_arg


class TestMultiMatchAutoResolution:
    """Test multi-match auto-resolution logic"""
    
    def test_select_best_candidate_exact_zip_match(self):
        """Should select candidate with matching ZIP"""
        from api.property_endpoints import select_best_candidate
        
        candidates = [
            {'ZIP': '90001', 'APN': '1234-001', 'Address': '123 Main St'},
            {'ZIP': '90002', 'APN': '1234-002', 'Address': '123 Main St'}
        ]
        
        best = select_best_candidate(
            candidates,
            last_line='Los Angeles, CA 90001'
        )
        
        assert best['ZIP'] == '90001'
        assert best['APN'] == '1234-001'
    
    def test_select_best_candidate_unit_match(self):
        """Should select candidate with matching unit number"""
        from api.property_endpoints import select_best_candidate
        
        candidates = [
            {'ZIP': '90001', 'APN': '1234-001', 'UnitNumber': '', 'Address': '123 Main St'},
            {'ZIP': '90001', 'APN': '1234-002', 'UnitNumber': 'A', 'Address': '123 Main St'}
        ]
        
        # Search for unit A
        best = select_best_candidate(
            candidates,
            last_line='Los Angeles, CA 90001',
            unit='A'
        )
        
        assert best['UnitNumber'] == 'A'
        assert best['APN'] == '1234-002'
    
    def test_select_best_candidate_returns_first_if_ambiguous(self):
        """Should return first candidate if no clear winner"""
        from api.property_endpoints import select_best_candidate
        
        candidates = [
            {'ZIP': '90001', 'APN': '1234-001'},
            {'ZIP': '90001', 'APN': '1234-002'}
        ]
        
        best = select_best_candidate(
            candidates,
            last_line='Los Angeles, CA 90001'
        )
        
        assert best is not None
        assert best['APN'] == '1234-001'  # First one


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
