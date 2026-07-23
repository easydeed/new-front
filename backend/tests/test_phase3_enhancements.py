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
# T4: the api.ai_assist orchestration handlers these tests covered were
# removed with the TitlePoint-coupled AI routes; their tests went with them.
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


class TestErrorHandlingAndResilience:
    """Test suite for error handling and system resilience"""
    
    @pytest.mark.asyncio
    async def test_template_rendering_error_handling(self):
        """Test error handling in template rendering"""
        ctx = GrantDeedRenderContext(
            grantors_text="Test Grantor",
            grantees_text="Test Grantee",
            legal_description="Test Description",
            county="Test County",
            apn="123-456-789"  # strict validation requires APN before render
        )
        
        mock_user_id = "test_user"
        
        # Mock template loading to fail
        with patch('routers.deeds.env.get_template') as mock_get_template:
            mock_get_template.side_effect = Exception("Template not found")
            
            with pytest.raises(HTTPException) as exc_info:
                await generate_grant_deed_ca(ctx, mock_user_id)
            
            assert exc_info.value.status_code == 500
            assert "generation failed" in str(exc_info.value.detail)


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])
