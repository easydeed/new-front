"""
Phase 3 Backend Services & Routes Test Suite
Tests for grant deed generation, AI assist orchestration, and template rendering
"""
import pytest
import asyncio
import time
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import HTTPException

# Import the modules we're testing
from routers.deeds import (
    generate_grant_deed_ca, 
    validate_grant_deed_context, 
    sanitize_template_context,
    log_deed_generation
)
from api.ai_assist import (
    handle_prompt,
    handle_button_prompt,
    handle_custom_prompt,
    handle_multi_document_generation,
    analyze_custom_prompt
)
from models.grant_deed import GrantDeedRenderContext


class TestGrantDeedGeneration:
    """Test suite for grant deed generation enhancements"""
    
    def test_validate_grant_deed_context_valid(self):
        """Test validation with valid grant deed context"""
        ctx = GrantDeedRenderContext(
            grantors_text="John Doe, a single man",
            grantees_text="Jane Smith, a married woman",
            legal_description="Lot 1, Block 2, Subdivision ABC",
            county="Los Angeles",
            apn="1234-567-890",
            execution_date="2025-09-24"
        )
        
        errors = validate_grant_deed_context(ctx)
        assert len(errors) == 0, f"Expected no validation errors, got: {errors}"
    
    def test_validate_grant_deed_context_missing_required(self):
        """Test validation with missing required fields"""
        ctx = GrantDeedRenderContext(
            grantors_text="",  # Missing
            grantees_text="Jane Smith",
            legal_description="",  # Missing
            county="Los Angeles"
        )
        
        errors = validate_grant_deed_context(ctx)
        assert len(errors) >= 2, f"Expected validation errors for missing fields, got: {errors}"
        assert any("Grantor" in error for error in errors)
        assert any("Legal description" in error for error in errors)
    
    def test_validate_grant_deed_context_invalid_date(self):
        """Test validation with invalid execution date"""
        ctx = GrantDeedRenderContext(
            grantors_text="John Doe",
            grantees_text="Jane Smith",
            legal_description="Valid description",
            county="Los Angeles",
            execution_date="invalid-date"
        )
        
        errors = validate_grant_deed_context(ctx)
        assert any("date must be in YYYY-MM-DD format" in error for error in errors)
    
    def test_sanitize_template_context(self):
        """Test template context sanitization"""
        ctx = {
            "grantors_text": "John <script>alert('xss')</script> Doe",
            "nested": {
                "field": "Value with <tags>"
            },
            "number": 123,
            "boolean": True
        }
        
        sanitized = sanitize_template_context(ctx)
        
        assert "&lt;script&gt;" in sanitized["grantors_text"]
        assert "&lt;tags&gt;" in sanitized["nested"]["field"]
        assert sanitized["number"] == 123  # Numbers unchanged
        assert sanitized["boolean"] is True  # Booleans unchanged
    
    @pytest.mark.asyncio
    async def test_log_deed_generation(self):
        """Test deed generation logging"""
        with patch('routers.deeds.logger') as mock_logger:
            await log_deed_generation(
                user_id="test_user",
                deed_type="grant_deed_ca",
                context={"test": "data"},
                success=True,
                duration=1.5
            )
            
            mock_logger.info.assert_called_once()
            call_args = mock_logger.info.call_args[0][0]
            assert "test_user" in call_args
            assert "grant_deed_ca" in call_args
            assert "1.5" in call_args


class TestAIAssistOrchestration:
    """Test suite for AI assist orchestration enhancements"""
    
    @pytest.mark.asyncio
    async def test_handle_prompt_timeout_protection(self):
        """Test that AI assist requests respect timeout limits"""
        mock_request = Mock()
        mock_request.type = "vesting"
        mock_request.docType = "grant_deed"
        mock_request.timeout = 1  # 1 second timeout
        mock_request.verifiedData = {"address": "123 Main St"}
        mock_request.currentData = {}
        
        mock_user = {"id": "test_user"}
        
        # Mock a slow TitlePoint service
        with patch('api.ai_assist.handle_button_prompt') as mock_handler:
            async def slow_handler(*args):
                await asyncio.sleep(2)  # Longer than timeout
                return Mock(success=True, data={})
            
            mock_handler.side_effect = slow_handler
            
            # This should timeout
            result = await handle_prompt(mock_request, mock_user)
            
            assert result.success is False
            assert "timed out" in result.error.lower()
            assert result.duration is not None
            assert result.request_id is not None
    
    @pytest.mark.asyncio
    async def test_analyze_custom_prompt(self):
        """Test custom prompt analysis"""
        prompt = "Show me the vesting information and chain of title for this property"
        doc_type = "grant_deed"
        request_id = "test_123"
        
        result = await analyze_custom_prompt(prompt, doc_type, request_id)
        
        assert isinstance(result, dict)
        assert "actions" in result
        assert "confidence" in result
        assert "interpretation" in result
        
        # Should detect vesting and chain_of_title actions
        actions = result["actions"]
        assert "vesting" in actions
        assert "chain_of_title" in actions
    
    @pytest.mark.asyncio
    async def test_multi_document_generation(self):
        """Test multi-document generation orchestration"""
        mock_request = Mock()
        mock_request.documents = [
            {
                "doc_type": "grant_deed",
                "prompt_type": "vesting",
                "data": {"address": "123 Main St"}
            },
            {
                "doc_type": "quit_claim",
                "prompt_type": "all",
                "data": {"address": "456 Oak Ave"}
            }
        ]
        mock_request.shared_data = {"county": "Los Angeles"}
        mock_request.user_preferences = {}
        
        mock_user = {"id": "test_user"}
        
        # Mock the individual prompt handlers
        with patch('api.ai_assist.handle_button_prompt') as mock_handler:
            mock_handler.return_value = Mock(
                success=True,
                data={"test": "data"},
                error=None
            )
            
            result = await handle_multi_document_generation(mock_request, mock_user)
            
            assert result.success is True
            assert len(result.results) == 2
            assert result.total_duration is not None
            assert len(result.errors) == 0
            
            # Verify both documents were processed
            assert result.results[0]["document_type"] == "grant_deed"
            assert result.results[1]["document_type"] == "quit_claim"


class TestPerformanceAndMonitoring:
    """Test suite for performance monitoring and metrics"""
    
    @pytest.mark.asyncio
    async def test_request_id_generation(self):
        """Test that request IDs are properly generated and tracked"""
        mock_request = Mock()
        mock_request.type = "vesting"
        mock_request.docType = "grant_deed"
        mock_request.timeout = None
        mock_request.verifiedData = {}
        mock_request.currentData = {}
        
        mock_user = {"id": "test_user_123"}
        
        with patch('api.ai_assist.handle_button_prompt') as mock_handler:
            mock_handler.return_value = Mock(success=True, data={}, error=None)
            
            result = await handle_prompt(mock_request, mock_user)
            
            assert result.request_id is not None
            assert "ai_assist_test_user_123" in result.request_id
            assert result.duration is not None
            assert result.duration >= 0
    
    def test_environment_configuration(self):
        """Test that environment variables are properly loaded"""
        import os
        from api.ai_assist import AI_ASSIST_TIMEOUT, TITLEPOINT_TIMEOUT, MAX_CONCURRENT_REQUESTS
        
        # These should have default values even if env vars aren't set
        assert isinstance(AI_ASSIST_TIMEOUT, int)
        assert isinstance(TITLEPOINT_TIMEOUT, int)
        assert isinstance(MAX_CONCURRENT_REQUESTS, int)
        
        assert AI_ASSIST_TIMEOUT > 0
        assert TITLEPOINT_TIMEOUT > 0
        assert MAX_CONCURRENT_REQUESTS > 0


class TestErrorHandlingAndResilience:
    """Test suite for error handling and system resilience"""
    
    @pytest.mark.asyncio
    async def test_titlepoint_service_failure_handling(self):
        """Test graceful handling of TitlePoint service failures"""
        mock_request = Mock()
        mock_request.type = "vesting"
        mock_request.docType = "grant_deed"
        mock_request.verifiedData = {"address": "123 Main St"}
        mock_request.currentData = {}
        
        mock_user = {"id": "test_user"}
        request_id = "test_123"
        
        # Mock TitlePoint service to raise an exception
        with patch('api.ai_assist.TitlePointService') as mock_service:
            mock_service.return_value.get_vesting_info.side_effect = Exception("TitlePoint unavailable")
            
            result = await handle_button_prompt(mock_request, mock_user, request_id)
            
            assert result.success is False
            assert "Failed to fetch vesting data" in result.error
    
    @pytest.mark.asyncio
    async def test_template_rendering_error_handling(self):
        """Test error handling in template rendering"""
        ctx = GrantDeedRenderContext(
            grantors_text="Test Grantor",
            grantees_text="Test Grantee",
            legal_description="Test Description",
            county="Test County"
        )
        
        mock_user_id = "test_user"
        
        # Mock template loading to fail
        with patch('routers.deeds.env.get_template') as mock_get_template:
            mock_get_template.side_effect = Exception("Template not found")
            
            with pytest.raises(HTTPException) as exc_info:
                await generate_grant_deed_ca(ctx, mock_user_id)
            
            assert exc_info.value.status_code == 500
            assert "Template error" in str(exc_info.value.detail)


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])
