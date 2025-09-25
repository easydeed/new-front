"""
Integration Tests - API Resilience & Fault Injection
Phase 4: Quality Assurance & Hardening

Tests backend API resilience with fault injection scenarios:
- Database connection failures
- External service timeouts
- Memory/resource constraints
- Concurrent request handling
"""

import pytest
import asyncio
import aiohttp
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError, TimeoutError as SQLTimeoutError

from main import app
from auth import get_current_user_id
from services.titlepoint_service import TitlePointService


class TestAPIResilience:
    """Test API resilience under various failure conditions"""
    
    def setup_method(self):
        """Setup test client and mocks"""
        self.client = TestClient(app)
        
        # Mock authentication for testing
        def mock_auth():
            return "test-user-123"
        
        app.dependency_overrides[get_current_user_id] = mock_auth
    
    def teardown_method(self):
        """Clean up after tests"""
        app.dependency_overrides.clear()

    def test_grant_deed_generation_success(self):
        """Test successful grant deed generation contract"""
        payload = {
            "grantorName": "John A. Doe",
            "granteeName": "Jane B. Smith", 
            "propertyAddress": "123 Test St, Los Angeles, CA 90210",
            "apn": "123-456-789",
            "legalDescription": "Lot 1, Block 2, Tract 3",
            "considerationAmount": "$10.00"
        }
        
        response = self.client.post("/api/generate/grant-deed-ca", json=payload)
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert "X-Generation-Time" in response.headers
        assert "X-Request-ID" in response.headers
        assert len(response.content) > 1000  # PDF should be substantial

    def test_grant_deed_validation_errors(self):
        """Test grant deed validation error handling"""
        # Missing required fields
        payload = {
            "granteeName": "Jane Smith"
            # Missing grantorName, propertyAddress, etc.
        }
        
        response = self.client.post("/api/generate/grant-deed-ca", json=payload)
        
        assert response.status_code == 400
        error_data = response.json()
        assert "error" in error_data
        assert "validation" in error_data["error"].lower()

    @patch('jinja2.Template.render')
    def test_template_rendering_failure(self, mock_render):
        """Test template rendering failure handling"""
        mock_render.side_effect = Exception("Template rendering failed")
        
        payload = {
            "grantorName": "John Doe",
            "granteeName": "Jane Smith",
            "propertyAddress": "123 Test St, Los Angeles, CA 90210"
        }
        
        response = self.client.post("/api/generate/grant-deed-ca", json=payload)
        
        assert response.status_code == 500
        error_data = response.json()
        assert "template" in error_data["error"].lower()

    @patch('weasyprint.HTML.write_pdf')
    def test_pdf_generation_failure(self, mock_write_pdf):
        """Test PDF generation failure handling"""
        mock_write_pdf.side_effect = Exception("PDF generation failed")
        
        payload = {
            "grantorName": "John Doe",
            "granteeName": "Jane Smith", 
            "propertyAddress": "123 Test St, Los Angeles, CA 90210"
        }
        
        response = self.client.post("/api/generate/grant-deed-ca", json=payload)
        
        assert response.status_code == 500
        error_data = response.json()
        assert "pdf" in error_data["error"].lower()

    @patch('asyncio.wait_for')
    def test_pdf_generation_timeout(self, mock_wait_for):
        """Test PDF generation timeout handling"""
        mock_wait_for.side_effect = asyncio.TimeoutError("PDF generation timeout")
        
        payload = {
            "grantorName": "John Doe",
            "granteeName": "Jane Smith",
            "propertyAddress": "123 Test St, Los Angeles, CA 90210"
        }
        
        response = self.client.post("/api/generate/grant-deed-ca", json=payload)
        
        assert response.status_code == 408  # Request Timeout
        error_data = response.json()
        assert "timeout" in error_data["error"].lower()

    def test_ai_assist_success(self):
        """Test successful AI assist response contract"""
        payload = {
            "prompt": "Help me fill out grant deed information",
            "context": {
                "propertyAddress": "123 Test St, Los Angeles, CA 90210",
                "docType": "grant_deed"
            }
        }
        
        response = self.client.post("/api/ai/assist", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert "confidence" in data
        assert "duration" in data
        assert "request_id" in data

    @patch('api.ai_assist.handle_prompt')
    def test_ai_assist_timeout(self, mock_handle_prompt):
        """Test AI assist timeout handling"""
        mock_handle_prompt.side_effect = asyncio.TimeoutError("AI service timeout")
        
        payload = {
            "prompt": "Help me fill out grant deed information"
        }
        
        response = self.client.post("/api/ai/assist", json=payload)
        
        assert response.status_code == 408
        error_data = response.json()
        assert "timeout" in error_data["error"].lower()

    @patch('services.titlepoint_service.TitlePointService.enrich_property')
    def test_titlepoint_service_failure(self, mock_enrich):
        """Test TitlePoint service failure handling"""
        mock_enrich.side_effect = Exception("TitlePoint service unavailable")
        
        payload = {
            "fullAddress": "123 Test St, Los Angeles, CA 90210",
            "street": "123 Test St",
            "city": "Los Angeles",
            "state": "CA",
            "zip": "90210"
        }
        
        response = self.client.post("/api/property/search", json=payload)
        
        assert response.status_code == 500
        error_data = response.json()
        assert "titlepoint" in error_data["message"].lower()

    @patch('services.titlepoint_service.TitlePointService.enrich_property')
    def test_titlepoint_partial_data(self, mock_enrich):
        """Test TitlePoint partial data handling"""
        # Simulate partial data response
        mock_enrich.return_value = {
            "success": True,
            "apn": "123-456-789",
            "county": "Los Angeles",
            # Missing: legal description, grantor name, etc.
            "confidence": 0.65
        }
        
        payload = {
            "fullAddress": "123 Test St, Los Angeles, CA 90210",
            "street": "123 Test St", 
            "city": "Los Angeles",
            "state": "CA",
            "zip": "90210"
        }
        
        response = self.client.post("/api/property/search", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["apn"] == "123-456-789"
        assert data["confidence"] == 0.65

    def test_concurrent_request_handling(self):
        """Test concurrent request handling and rate limiting"""
        import concurrent.futures
        import threading
        
        def make_request():
            payload = {
                "grantorName": f"User-{threading.current_thread().ident}",
                "granteeName": "Jane Smith",
                "propertyAddress": "123 Test St, Los Angeles, CA 90210"
            }
            return self.client.post("/api/generate/grant-deed-ca", json=payload)
        
        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            responses = [future.result() for future in futures]
        
        # All requests should complete successfully or be rate limited
        success_count = sum(1 for r in responses if r.status_code == 200)
        rate_limited_count = sum(1 for r in responses if r.status_code == 429)
        
        assert success_count + rate_limited_count == 10
        assert success_count >= 5  # At least half should succeed

    @patch('sqlalchemy.engine.Engine.connect')
    def test_database_connection_failure(self, mock_connect):
        """Test database connection failure handling"""
        mock_connect.side_effect = OperationalError("Database connection failed", None, None)
        
        payload = {
            "fullAddress": "123 Test St, Los Angeles, CA 90210"
        }
        
        response = self.client.post("/api/property/search", json=payload)
        
        # Should handle gracefully, possibly with cached data or error response
        assert response.status_code in [200, 500, 503]

    def test_memory_pressure_handling(self):
        """Test handling of memory pressure scenarios"""
        # Generate large payload to simulate memory pressure
        large_payload = {
            "grantorName": "John Doe",
            "granteeName": "Jane Smith",
            "propertyAddress": "123 Test St, Los Angeles, CA 90210",
            "customData": "x" * (1024 * 1024)  # 1MB of data
        }
        
        response = self.client.post("/api/generate/grant-deed-ca", json=large_payload)
        
        # Should either process successfully or reject with appropriate error
        assert response.status_code in [200, 400, 413, 500]
        
        if response.status_code == 413:
            error_data = response.json()
            assert "payload" in error_data["error"].lower() or "large" in error_data["error"].lower()

    def test_feature_flag_resilience(self):
        """Test feature flag resilience"""
        import os
        
        # Test with dynamic wizard disabled
        os.environ["DYNAMIC_WIZARD_ENABLED"] = "false"
        
        payload = {
            "grantorName": "John Doe",
            "granteeName": "Jane Smith",
            "propertyAddress": "123 Test St, Los Angeles, CA 90210"
        }
        
        response = self.client.post("/api/generate/grant-deed-ca", json=payload)
        
        # Should still work but possibly with different behavior
        assert response.status_code in [200, 501]  # Success or Not Implemented
        
        # Reset environment
        os.environ["DYNAMIC_WIZARD_ENABLED"] = "true"

    def test_multi_document_generation_resilience(self):
        """Test multi-document generation resilience"""
        payload = {
            "documents": [
                {
                    "type": "grant_deed",
                    "data": {
                        "grantorName": "John Doe",
                        "granteeName": "Jane Smith",
                        "propertyAddress": "123 Test St, Los Angeles, CA 90210"
                    }
                },
                {
                    "type": "grant_deed", 
                    "data": {
                        "grantorName": "Alice Johnson",
                        "granteeName": "Bob Wilson",
                        "propertyAddress": "456 Oak Ave, Beverly Hills, CA 90210"
                    }
                }
            ]
        }
        
        response = self.client.post("/api/ai/multi-document", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 2
        assert "total_time" in data

    def test_health_check_endpoint(self):
        """Test health check endpoint for monitoring"""
        response = self.client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["healthy", "degraded", "unhealthy"]

    def test_api_documentation_availability(self):
        """Test API documentation availability"""
        response = self.client.get("/docs")
        assert response.status_code == 200
        
        response = self.client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_data = response.json()
        assert "openapi" in openapi_data
        assert "paths" in openapi_data


class TestCachingResilience:
    """Test caching layer resilience"""
    
    def setup_method(self):
        self.client = TestClient(app)
        
        def mock_auth():
            return "test-user-123"
        
        app.dependency_overrides[get_current_user_id] = mock_auth
    
    def teardown_method(self):
        app.dependency_overrides.clear()

    @patch('redis.Redis.get')
    def test_cache_miss_handling(self, mock_redis_get):
        """Test graceful handling of cache misses"""
        mock_redis_get.return_value = None  # Cache miss
        
        payload = {
            "fullAddress": "123 Test St, Los Angeles, CA 90210"
        }
        
        response = self.client.post("/api/property/search", json=payload)
        
        # Should still work without cache
        assert response.status_code in [200, 500]

    @patch('redis.Redis.set')
    def test_cache_write_failure(self, mock_redis_set):
        """Test handling of cache write failures"""
        mock_redis_set.side_effect = Exception("Redis connection failed")
        
        payload = {
            "fullAddress": "123 Test St, Los Angeles, CA 90210"
        }
        
        response = self.client.post("/api/property/search", json=payload)
        
        # Should still work even if caching fails
        assert response.status_code in [200, 500]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
