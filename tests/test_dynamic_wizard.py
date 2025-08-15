"""
Test suite for dynamic wizard functionality
"""
import pytest
import asyncio
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from backend.main import app
from backend.api.ai_assist import handle_button_prompt, handle_custom_prompt
from backend.api.property_search import search_property
from backend.title_point_integration import TitlePointService

client = TestClient(app)

@pytest.fixture
def mock_user():
    return {"user_id": "test-user-123", "email": "test@example.com"}

@pytest.fixture
def sample_property_data():
    return {
        "address": "123 Main St, Los Angeles, CA",
        "apn": "1234-567-890",
        "county": "Los Angeles",
        "city": "Los Angeles",
        "state": "CA",
        "zip": "90210"
    }

@pytest.fixture
def sample_form_data():
    return {
        "deedType": "grant_deed",
        "propertySearch": "123 Main St, Los Angeles, CA",
        "grantorName": "John Doe",
        "granteeName": "Jane Smith",
        "consideration": "500000"
    }

class TestPropertySearch:
    """Test property search functionality"""
    
    @patch('backend.api.property_search.TitlePointService')
    def test_property_search_success(self, mock_title_service, mock_user, sample_property_data):
        # Mock TitlePoint response
        mock_service = Mock()
        mock_service.search_property.return_value = {
            "success": True,
            "data": sample_property_data
        }
        mock_title_service.return_value = mock_service
        
        response = client.post(
            "/api/property/search",
            json={"address": "123 Main St, Los Angeles, CA"},
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["apn"] == "1234-567-890"
        assert data["county"] == "Los Angeles"
    
    def test_property_search_missing_address(self, mock_user):
        response = client.post(
            "/api/property/search",
            json={"address": ""},
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert "Address is required" in data["error"]

class TestAIAssist:
    """Test AI assist prompt functionality"""
    
    @patch('backend.api.ai_assist.TitlePointService')
    def test_vesting_button_prompt(self, mock_title_service, mock_user, sample_property_data):
        # Mock TitlePoint vesting response
        mock_service = Mock()
        mock_service.get_vesting_info.return_value = {
            "vesting_description": "Joint Tenants",
            "current_owner": "John and Mary Doe",
            "ownership_type": "Joint Tenancy"
        }
        mock_title_service.return_value = mock_service
        
        response = client.post(
            "/api/ai/assist",
            json={
                "type": "vesting",
                "docType": "grant_deed",
                "verifiedData": sample_property_data,
                "currentData": {}
            },
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "vesting" in data["data"]
        assert "grantorName" in data["data"]
    
    @patch('backend.api.ai_assist.TitlePointService')
    def test_grant_deed_button_prompt(self, mock_title_service, mock_user, sample_property_data):
        # Mock TitlePoint grant history response
        mock_service = Mock()
        mock_service.get_grant_history.return_value = {
            "recent_grants": [
                {"consideration": "450000", "recording_date": "2023-01-15"}
            ],
            "last_sale_price": "450000",
            "last_sale_date": "2023-01-15"
        }
        mock_title_service.return_value = mock_service
        
        response = client.post(
            "/api/ai/assist",
            json={
                "type": "grant_deed",
                "docType": "grant_deed",
                "verifiedData": sample_property_data,
                "currentData": {}
            },
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "lastSalePrice" in data["data"]
        assert "grantHistory" in data["data"]
    
    @patch('backend.api.ai_assist.analyze_custom_prompt')
    @patch('backend.api.ai_assist.TitlePointService')
    def test_custom_prompt(self, mock_title_service, mock_analyze, mock_user, sample_property_data):
        # Mock prompt analysis
        mock_analyze.return_value = {
            "actions": ["vesting", "ownership"],
            "confidence": 0.9
        }
        
        # Mock TitlePoint responses
        mock_service = Mock()
        mock_service.get_vesting_info.return_value = {"vesting_description": "Joint Tenants"}
        mock_service.get_ownership_chain.return_value = {"ownership_chain": []}
        mock_title_service.return_value = mock_service
        
        response = client.post(
            "/api/ai/assist",
            json={
                "prompt": "get ownership and vesting info",
                "docType": "grant_deed",
                "verifiedData": sample_property_data,
                "currentData": {}
            },
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True

class TestDocumentGeneration:
    """Test document generation functionality"""
    
    @patch('backend.api.generate_deed.generate_pdf_document')
    @patch('backend.api.generate_deed.save_deed_to_database')
    def test_grant_deed_generation(self, mock_save, mock_pdf, mock_user, sample_form_data):
        # Mock PDF generation
        mock_pdf.return_value = "base64-encoded-pdf-content"
        mock_save.return_value = "deed-123"
        
        response = client.post(
            "/api/generate-deed",
            json=sample_form_data,
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["pdf_base64"] == "base64-encoded-pdf-content"
        assert data["deed_id"] == "deed-123"
    
    def test_missing_required_fields(self, mock_user):
        incomplete_data = {
            "deedType": "grant_deed",
            "propertySearch": "123 Main St",
            # Missing grantorName and granteeName
        }
        
        response = client.post(
            "/api/generate-deed",
            json=incomplete_data,
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert "Missing required fields" in data["error"]

class TestTitlePointIntegration:
    """Test TitlePoint service integration"""
    
    @patch('httpx.AsyncClient')
    async def test_successful_property_search(self, mock_client):
        # Mock successful HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "apn": "1234-567-890",
            "county": "Los Angeles",
            "owner_name": "John Doe"
        }
        
        mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
        
        service = TitlePointService()
        result = await service.search_property("123 Main St, Los Angeles, CA")
        
        assert result["success"] == True
        assert result["data"]["apn"] == "1234-567-890"
    
    @patch('httpx.AsyncClient')
    async def test_failed_property_search(self, mock_client):
        # Mock failed HTTP response
        mock_response = Mock()
        mock_response.status_code = 404
        
        mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
        
        service = TitlePointService()
        result = await service.search_property("Invalid Address")
        
        assert result["success"] == False
        assert "Property not found" in result["message"]

class TestDocumentTypes:
    """Test different document type configurations"""
    
    def test_quit_claim_configuration(self):
        from backend.api.ai_assist import check_fast_forward
        
        # Quitclaim only requires granteeName
        data = {"granteeName": "Jane Smith"}
        result = check_fast_forward("quit_claim", data)
        assert result == True
        
        # Missing required field
        data = {}
        result = check_fast_forward("quit_claim", data)
        assert result == False
    
    def test_interspousal_transfer_configuration(self):
        from backend.api.ai_assist import check_fast_forward
        
        # Interspousal requires spouse field
        data = {"spouse": "John Smith"}
        result = check_fast_forward("interspousal_transfer", data)
        assert result == True
    
    def test_property_profile_configuration(self):
        from backend.api.ai_assist import check_fast_forward
        
        # Property profile has no requirements
        data = {}
        result = check_fast_forward("property_profile", data)
        assert result == True

class TestErrorHandling:
    """Test error handling scenarios"""
    
    @patch('backend.api.ai_assist.TitlePointService')
    def test_titlepoint_service_failure(self, mock_title_service, mock_user, sample_property_data):
        # Mock service failure
        mock_service = Mock()
        mock_service.get_vesting_info.side_effect = Exception("Service unavailable")
        mock_title_service.return_value = mock_service
        
        response = client.post(
            "/api/ai/assist",
            json={
                "type": "vesting",
                "docType": "grant_deed",
                "verifiedData": sample_property_data,
                "currentData": {}
            },
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert "Failed to fetch vesting data" in data["error"]
    
    def test_invalid_document_type(self, mock_user):
        response = client.post(
            "/api/generate-deed",
            json={
                "deedType": "invalid_type",
                "propertySearch": "123 Main St"
            },
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert "Template not found" in data["error"]

# Integration tests
class TestEndToEndFlow:
    """Test complete wizard flow"""
    
    @patch('backend.api.property_search.TitlePointService')
    @patch('backend.api.ai_assist.TitlePointService')
    @patch('backend.api.generate_deed.generate_pdf_document')
    def test_complete_grant_deed_flow(self, mock_pdf, mock_ai_title, mock_search_title, mock_user):
        # Step 1: Property search
        mock_search_service = Mock()
        mock_search_service.search_property.return_value = {
            "success": True,
            "data": {
                "apn": "1234-567-890",
                "county": "Los Angeles",
                "current_owner": "John Doe"
            }
        }
        mock_search_title.return_value = mock_search_service
        
        property_response = client.post(
            "/api/property/search",
            json={"address": "123 Main St, Los Angeles, CA"},
            headers={"Authorization": "Bearer test-token"}
        )
        assert property_response.status_code == 200
        
        # Step 2: AI assist for vesting
        mock_ai_service = Mock()
        mock_ai_service.get_vesting_info.return_value = {
            "vesting_description": "Joint Tenants",
            "current_owner": "John Doe"
        }
        mock_ai_title.return_value = mock_ai_service
        
        ai_response = client.post(
            "/api/ai/assist",
            json={
                "type": "vesting",
                "docType": "grant_deed",
                "verifiedData": {"apn": "1234-567-890"},
                "currentData": {}
            },
            headers={"Authorization": "Bearer test-token"}
        )
        assert ai_response.status_code == 200
        
        # Step 3: Generate deed
        mock_pdf.return_value = "base64-pdf-content"
        
        generate_response = client.post(
            "/api/generate-deed",
            json={
                "deedType": "grant_deed",
                "propertySearch": "123 Main St, Los Angeles, CA",
                "grantorName": "John Doe",
                "granteeName": "Jane Smith",
                "consideration": "500000"
            },
            headers={"Authorization": "Bearer test-token"}
        )
        assert generate_response.status_code == 200
        data = generate_response.json()
        assert data["success"] == True
        assert data["pdf_base64"] == "base64-pdf-content"

if __name__ == "__main__":
    pytest.main([__file__])
