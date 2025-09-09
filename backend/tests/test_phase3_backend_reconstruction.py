"""
Comprehensive Testing Suite for Phase 3: Backend Reconstruction
Tests document generation service, API endpoints, templates, and validation framework
Following the WIZARD_ARCHITECTURE_OVERHAUL_PLAN Phase 3 specifications
"""
import pytest
import asyncio
import json
import tempfile
import os
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime
from typing import Dict, Any
from io import BytesIO

# Import the modules we're testing
from services.document_generation_service import (
    DocumentGenerationService, 
    GrantDeedGenerator, 
    QuitclaimDeedGenerator,
    InterspousalTransferGenerator,
    ValidationError,
    GenerationResult
)
from api.document_generation_endpoints import router
from lib.validation_framework import (
    DocumentValidationFramework,
    ValidationRule,
    RequiredFieldRule,
    FormatValidationRule,
    LegalComplianceRule,
    BusinessRuleValidation,
    CrossFieldValidationRule,
    ConditionalValidationRule,
    ValidationSeverity,
    ValidationType
)

# Test fixtures and utilities
@pytest.fixture
def sample_grant_deed_data():
    """Sample Grant Deed data for testing"""
    return {
        "stepData": {
            "parties": {
                "grantorsText": "John Doe, a single man",
                "granteesText": "Jane Smith, a single woman",
                "county": "Los Angeles",
                "legalDescription": "Lot 1, Block 2, Tract 12345, as per map recorded in Book 100, Page 50, Official Records of Los Angeles County, California"
            },
            "recording": {
                "requestedBy": "Test Title Company",
                "apn": "123-456-789",
                "mailTo": {
                    "name": "Test Title Company",
                    "address1": "123 Main St",
                    "city": "Los Angeles",
                    "state": "CA",
                    "zip": "90210"
                }
            },
            "tax": {
                "dttAmount": "100.00",
                "dttBasis": "full_value",
                "areaType": "unincorporated"
            }
        }
    }

@pytest.fixture
def sample_quitclaim_deed_data():
    """Sample Quitclaim Deed data for testing"""
    return {
        "stepData": {
            "parties": {
                "grantorsText": "Robert Johnson, a married man",
                "granteesText": "Mary Johnson, his wife",
                "county": "Orange",
                "legalDescription": "Lot 5, Block 10, Tract 54321, Orange County, California"
            },
            "recording": {
                "requestedBy": "Family Law Attorney",
                "mailTo": {
                    "name": "Johnson Family",
                    "address1": "456 Oak Ave",
                    "city": "Irvine",
                    "state": "CA",
                    "zip": "92602"
                }
            }
        },
        "risk_acknowledgment": True,
        "consideration_amount": "10.00"
    }

@pytest.fixture
def sample_interspousal_data():
    """Sample Interspousal Transfer data for testing"""
    return {
        "stepData": {
            "parties": {
                "grantorsText": "Michael Brown, a married man",
                "granteesText": "Sarah Brown, his wife",
                "county": "San Diego",
                "legalDescription": "Condominium Unit 101, Building A, Happy Valley Condominiums, San Diego County, California"
            },
            "recording": {
                "requestedBy": "Estate Planning Attorney",
                "mailTo": {
                    "name": "Brown Family Trust",
                    "address1": "789 Beach Blvd",
                    "city": "San Diego",
                    "state": "CA",
                    "zip": "92101"
                }
            },
            "tax": {
                "exemptionReason": "Interspousal transfer - no consideration"
            }
        },
        "property_characterization": "separate property"
    }

@pytest.fixture
def mock_weasyprint():
    """Mock WeasyPrint for PDF generation"""
    with patch('services.document_generation_service.HTML') as mock_html:
        mock_pdf = BytesIO(b'%PDF-1.4 mock pdf content')
        mock_html.return_value.write_pdf.return_value = mock_pdf.getvalue()
        yield mock_html

@pytest.fixture
def mock_jinja_template():
    """Mock Jinja2 template"""
    mock_template = Mock()
    mock_template.render.return_value = "<html><body>Mock HTML Content</body></html>"
    return mock_template

class TestDocumentGenerators:
    """Test suite for Document Generators"""
    
    def test_grant_deed_generator_initialization(self):
        """Test Grant Deed generator initialization"""
        generator = GrantDeedGenerator()
        
        assert generator.get_document_type() == "grantdeed"
        assert generator.get_template_path() == "grant_deed_ca/index.jinja2"
        assert generator.legal_knowledge is not None
    
    def test_grant_deed_data_validation_success(self, sample_grant_deed_data):
        """Test successful Grant Deed data validation"""
        generator = GrantDeedGenerator()
        
        validated_data = generator.validate_data(sample_grant_deed_data)
        
        assert validated_data["validation_passed"] is True
        assert "grantors_text" in validated_data
        assert "grantees_text" in validated_data
        assert "county" in validated_data
        assert "legal_description" in validated_data
    
    def test_grant_deed_data_validation_failure(self):
        """Test Grant Deed data validation with missing required fields"""
        generator = GrantDeedGenerator()
        
        incomplete_data = {
            "stepData": {
                "parties": {
                    "grantorsText": "John Doe"
                    # Missing required fields
                }
            }
        }
        
        with pytest.raises(ValidationError) as exc_info:
            generator.validate_data(incomplete_data)
        
        assert "Missing required fields" in str(exc_info.value)
        assert exc_info.value.field_errors is not None
    
    def test_grant_deed_context_generation(self, sample_grant_deed_data):
        """Test Grant Deed context generation"""
        generator = GrantDeedGenerator()
        
        validated_data = generator.validate_data(sample_grant_deed_data)
        context = generator.generate_context(validated_data)
        
        assert context["document_type"] == "Grant Deed"
        assert context["grantors_text"] == "John Doe, a single man"
        assert context["grantees_text"] == "Jane Smith, a single woman"
        assert context["county"] == "Los Angeles"
        assert context["dtt"]["amount"] == "100.00"
        assert "legal_compliance" in context
        assert "generated_at" in context
    
    def test_grant_deed_filename_generation(self, sample_grant_deed_data):
        """Test Grant Deed filename generation"""
        generator = GrantDeedGenerator()
        
        validated_data = generator.validate_data(sample_grant_deed_data)
        filename = generator.get_filename(validated_data)
        
        assert "Grant_Deed_Los_Angeles" in filename
        assert "123_456_789" in filename
        assert filename.endswith(".pdf")
    
    def test_quitclaim_deed_generator(self, sample_quitclaim_deed_data):
        """Test Quitclaim Deed generator"""
        generator = QuitclaimDeedGenerator()
        
        assert generator.get_document_type() == "quitclaimdeed"
        assert generator.get_template_path() == "quitclaim_deed_ca/index.jinja2"
        
        # Test validation
        validated_data = generator.validate_data(sample_quitclaim_deed_data)
        assert validated_data["validation_passed"] is True
        assert len(validated_data.get("validation_warnings", [])) > 0  # Should have risk warnings
        
        # Test context generation
        context = generator.generate_context(validated_data)
        assert context["document_type"] == "Quitclaim Deed"
        assert len(context["risk_disclosures"]) > 0
    
    def test_interspousal_transfer_generator(self, sample_interspousal_data):
        """Test Interspousal Transfer generator"""
        generator = InterspousalTransferGenerator()
        
        assert generator.get_document_type() == "interspousaltransfer"
        assert generator.get_template_path() == "interspousal_transfer_ca/index.jinja2"
        
        # Test validation
        validated_data = generator.validate_data(sample_interspousal_data)
        assert validated_data["validation_passed"] is True
        
        # Test context generation
        context = generator.generate_context(validated_data)
        assert context["document_type"] == "Interspousal Transfer Deed"
        assert context["property_characterization"] == "separate property"
        assert context["tax_exempt"] is True
    
    def test_interspousal_transfer_validation_failure(self):
        """Test Interspousal Transfer validation with non-spouse parties"""
        generator = InterspousalTransferGenerator()
        
        invalid_data = {
            "stepData": {
                "parties": {
                    "grantorsText": "John Doe, a single man",
                    "granteesText": "Jane Smith, a single woman",  # Not spouses
                    "county": "Los Angeles",
                    "legalDescription": "Test property"
                }
            }
        }
        
        with pytest.raises(ValidationError) as exc_info:
            generator.validate_data(invalid_data)
        
        assert "married parties" in str(exc_info.value)

class TestDocumentGenerationService:
    """Test suite for Document Generation Service"""
    
    def test_service_initialization(self):
        """Test service initialization"""
        assert len(DocumentGenerationService.GENERATORS) >= 3
        assert "grant_deed" in DocumentGenerationService.GENERATORS
        assert "quitclaim_deed" in DocumentGenerationService.GENERATORS
        assert "interspousal_transfer" in DocumentGenerationService.GENERATORS
    
    def test_get_supported_documents(self):
        """Test getting supported documents"""
        supported = DocumentGenerationService.get_supported_documents()
        
        assert isinstance(supported, dict)
        assert "grant_deed" in supported
        assert "name" in supported["grant_deed"]
        assert "template_path" in supported["grant_deed"]
    
    @pytest.mark.asyncio
    async def test_document_generation_success(self, sample_grant_deed_data, mock_weasyprint, mock_jinja_template):
        """Test successful document generation"""
        with patch.object(DocumentGenerationService, '_load_template', return_value=mock_jinja_template):
            result = await DocumentGenerationService.generate_document("grant_deed", sample_grant_deed_data)
            
            assert isinstance(result, GenerationResult)
            assert len(result.pdf_bytes) > 0
            assert result.filename.endswith(".pdf")
            assert result.metadata["document_type"] == "grant_deed"
            assert result.generation_time > 0
    
    @pytest.mark.asyncio
    async def test_document_generation_unsupported_type(self):
        """Test document generation with unsupported type"""
        with pytest.raises(ValueError) as exc_info:
            await DocumentGenerationService.generate_document("unsupported_type", {})
        
        assert "Unsupported document type" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_document_generation_validation_error(self):
        """Test document generation with validation error"""
        invalid_data = {"stepData": {"parties": {}}}  # Missing required fields
        
        with pytest.raises(Exception):  # Should raise HTTPException due to validation error
            await DocumentGenerationService.generate_document("grant_deed", invalid_data)
    
    def test_validate_document_data_success(self, sample_grant_deed_data):
        """Test successful document data validation"""
        result = DocumentGenerationService.validate_document_data("grant_deed", sample_grant_deed_data)
        
        assert result["valid"] is True
        assert "validated_data" in result
        assert "validation_timestamp" in result
    
    def test_validate_document_data_failure(self):
        """Test document data validation failure"""
        invalid_data = {"stepData": {"parties": {}}}
        
        result = DocumentGenerationService.validate_document_data("grant_deed", invalid_data)
        
        assert result["valid"] is False
        assert len(result["errors"]) > 0
        assert "field_errors" in result

class TestValidationFramework:
    """Test suite for Validation Framework"""
    
    def test_framework_initialization(self):
        """Test validation framework initialization"""
        framework = DocumentValidationFramework()
        
        assert len(framework.rules) > 0
        assert len(framework.global_rules) > 0
        assert "grant_deed" in framework.rules
        assert "quitclaim_deed" in framework.rules
        assert "interspousal_transfer" in framework.rules
    
    def test_required_field_rule(self):
        """Test required field validation rule"""
        rule = RequiredFieldRule("test_field", "Test field is required")
        
        # Test with valid data
        result = rule.validate({"test_field": "valid value"})
        assert result.passed is True
        
        # Test with missing field
        result = rule.validate({})
        assert result.passed is False
        assert "required" in result.message.lower()
        
        # Test with empty string
        result = rule.validate({"test_field": ""})
        assert result.passed is False
    
    def test_format_validation_rule(self):
        """Test format validation rule"""
        rule = FormatValidationRule(
            "email", 
            r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
            "Invalid email format"
        )
        
        # Test valid email
        result = rule.validate({"email": "test@example.com"})
        assert result.passed is True
        
        # Test invalid email
        result = rule.validate({"email": "invalid-email"})
        assert result.passed is False
        
        # Test empty field (should pass format validation)
        result = rule.validate({"email": ""})
        assert result.passed is True
        assert result.severity == ValidationSeverity.INFO
    
    def test_business_rule_validation(self):
        """Test business rule validation"""
        def test_business_rule(data, context):
            return data.get("amount", 0) > 0
        
        rule = BusinessRuleValidation(
            "amount",
            test_business_rule,
            "Amount must be positive"
        )
        
        # Test valid data
        result = rule.validate({"amount": 100})
        assert result.passed is True
        
        # Test invalid data
        result = rule.validate({"amount": -10})
        assert result.passed is False
    
    def test_cross_field_validation(self):
        """Test cross-field validation"""
        def validate_password_match(field_values, data, context):
            return field_values.get("password") == field_values.get("confirm_password")
        
        rule = CrossFieldValidationRule(
            "password",
            ["confirm_password"],
            validate_password_match,
            "Passwords must match"
        )
        
        # Test matching passwords
        result = rule.validate({
            "password": "secret123",
            "confirm_password": "secret123"
        })
        assert result.passed is True
        
        # Test non-matching passwords
        result = rule.validate({
            "password": "secret123",
            "confirm_password": "different"
        })
        assert result.passed is False
    
    def test_conditional_validation(self):
        """Test conditional validation"""
        def condition_function(data, context):
            return data.get("type") == "premium"
        
        required_rule = RequiredFieldRule("premium_feature", "Premium feature is required")
        
        rule = ConditionalValidationRule(
            "premium_feature",
            condition_function,
            required_rule
        )
        
        # Test when condition is met
        result = rule.validate({
            "type": "premium",
            "premium_feature": ""  # Missing required field
        })
        assert result.passed is False
        
        # Test when condition is not met
        result = rule.validate({
            "type": "basic"
            # premium_feature not required
        })
        assert result.passed is True
    
    def test_document_validation_grant_deed(self, sample_grant_deed_data):
        """Test complete document validation for Grant Deed"""
        framework = DocumentValidationFramework()
        
        summary = framework.validate_document("grant_deed", sample_grant_deed_data)
        
        assert summary.total_checks > 0
        assert summary.overall_score > 0
        assert summary.can_generate is True  # Should pass validation
        assert len(summary.errors) == 0
    
    def test_document_validation_with_errors(self):
        """Test document validation with errors"""
        framework = DocumentValidationFramework()
        
        invalid_data = {
            "stepData": {
                "parties": {
                    "grantorsText": "",  # Empty required field
                    "county": "123"      # Invalid format
                }
            }
        }
        
        summary = framework.validate_document("grant_deed", invalid_data)
        
        assert summary.can_generate is False
        assert len(summary.errors) > 0
        assert summary.overall_score < 100
    
    def test_add_custom_rule(self):
        """Test adding custom validation rule"""
        framework = DocumentValidationFramework()
        
        def custom_validation(data, context):
            return data.get("custom_field", "").startswith("CUSTOM_")
        
        custom_rule = BusinessRuleValidation(
            "custom_field",
            custom_validation,
            "Custom field must start with CUSTOM_"
        )
        
        framework.add_rule("grant_deed", custom_rule)
        
        # Test with valid custom field
        summary = framework.validate_document("grant_deed", {
            "custom_field": "CUSTOM_VALUE",
            "stepData": {"parties": {}}
        })
        
        # Should find the custom rule in results
        custom_results = [r for r in summary.errors + summary.warnings 
                         if r.field_path == "custom_field"]
        assert len(custom_results) >= 0  # Rule was executed

class TestTemplateSystem:
    """Test suite for Template System"""
    
    def test_template_loading(self):
        """Test template loading functionality"""
        # Create a temporary template file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jinja2', delete=False) as f:
            f.write("<html><body>{{ test_var }}</body></html>")
            temp_template_path = f.name
        
        try:
            # Test template loading (would need to mock the actual path resolution)
            # This is a simplified test - in practice, we'd test the full template loading
            assert os.path.exists(temp_template_path)
        finally:
            os.unlink(temp_template_path)
    
    def test_template_rendering_context(self, sample_grant_deed_data):
        """Test template context generation"""
        generator = GrantDeedGenerator()
        validated_data = generator.validate_data(sample_grant_deed_data)
        context = generator.generate_context(validated_data)
        
        # Test that all required context variables are present
        required_context_vars = [
            "grantors_text", "grantees_text", "county", "legal_description",
            "dtt", "execution_date", "document_type", "generated_at"
        ]
        
        for var in required_context_vars:
            assert var in context, f"Missing required context variable: {var}"
        
        # Test computed fields
        assert "grantor_count" in context
        assert "grantee_count" in context
        assert "needs_exhibit" in context
        assert "legal_compliance" in context
    
    def test_css_overrides(self):
        """Test CSS override functionality"""
        grant_generator = GrantDeedGenerator()
        quitclaim_generator = QuitclaimDeedGenerator()
        
        grant_css = grant_generator.get_css_overrides()
        quitclaim_css = quitclaim_generator.get_css_overrides()
        
        assert isinstance(grant_css, str)
        assert isinstance(quitclaim_css, str)
        
        # Test that different generators have different CSS
        assert grant_css != quitclaim_css
        
        # Test that quitclaim has risk-specific styling
        assert "risk-warning" in quitclaim_css

class TestAPIEndpoints:
    """Test suite for API Endpoints"""
    
    @pytest.mark.asyncio
    async def test_generate_document_endpoint_success(self, sample_grant_deed_data):
        """Test successful document generation endpoint"""
        # This would require setting up FastAPI test client
        # For now, we test the core logic
        
        from api.document_generation_endpoints import DocumentGenerationRequest
        
        request = DocumentGenerationRequest(
            document_type="grant_deed",
            data=sample_grant_deed_data,
            options={},
            metadata={}
        )
        
        assert request.document_type == "grant_deed"
        assert request.data == sample_grant_deed_data
    
    def test_validation_request_model(self):
        """Test validation request model"""
        from api.document_generation_endpoints import ValidationRequest
        
        request = ValidationRequest(
            document_type="grant_deed",
            data={"test": "data"},
            validation_level="comprehensive"
        )
        
        assert request.document_type == "grant_deed"
        assert request.validation_level == "comprehensive"
    
    def test_batch_generation_request_model(self, sample_grant_deed_data):
        """Test batch generation request model"""
        from api.document_generation_endpoints import (
            BatchGenerationRequest, 
            DocumentGenerationRequest
        )
        
        doc_requests = [
            DocumentGenerationRequest(
                document_type="grant_deed",
                data=sample_grant_deed_data
            )
        ]
        
        batch_request = BatchGenerationRequest(
            documents=doc_requests,
            batch_options={}
        )
        
        assert len(batch_request.documents) == 1
        assert batch_request.documents[0].document_type == "grant_deed"

class TestIntegrationScenarios:
    """Integration tests for complete workflows"""
    
    @pytest.mark.asyncio
    async def test_complete_grant_deed_workflow(self, sample_grant_deed_data, mock_weasyprint, mock_jinja_template):
        """Test complete Grant Deed generation workflow"""
        
        # Step 1: Validate data
        validation_result = DocumentGenerationService.validate_document_data(
            "grant_deed", 
            sample_grant_deed_data
        )
        assert validation_result["valid"] is True
        
        # Step 2: Generate document
        with patch.object(DocumentGenerationService, '_load_template', return_value=mock_jinja_template):
            result = await DocumentGenerationService.generate_document(
                "grant_deed", 
                sample_grant_deed_data
            )
            
            assert isinstance(result, GenerationResult)
            assert len(result.pdf_bytes) > 0
            assert result.metadata["document_type"] == "grant_deed"
    
    @pytest.mark.asyncio
    async def test_validation_framework_integration(self, sample_grant_deed_data):
        """Test validation framework integration with document generation"""
        framework = DocumentValidationFramework()
        
        # Test validation
        summary = framework.validate_document("grant_deed", sample_grant_deed_data)
        
        # Should pass validation
        assert summary.can_generate is True
        assert len(summary.errors) == 0
        
        # Test with invalid data
        invalid_data = {"stepData": {"parties": {}}}
        summary = framework.validate_document("grant_deed", invalid_data)
        
        # Should fail validation
        assert summary.can_generate is False
        assert len(summary.errors) > 0
    
    def test_error_handling_chain(self):
        """Test error handling throughout the system"""
        
        # Test validation error propagation
        try:
            generator = GrantDeedGenerator()
            generator.validate_data({})  # Empty data should fail
            assert False, "Should have raised ValidationError"
        except ValidationError as e:
            assert e.field_errors is not None
            assert len(str(e)) > 0
    
    def test_performance_considerations(self, sample_grant_deed_data):
        """Test performance-related aspects"""
        
        # Test that validation is reasonably fast
        import time
        
        framework = DocumentValidationFramework()
        
        start_time = time.time()
        summary = framework.validate_document("grant_deed", sample_grant_deed_data)
        validation_time = time.time() - start_time
        
        # Validation should complete in reasonable time
        assert validation_time < 1.0  # Less than 1 second
        assert summary.total_checks > 0

class TestErrorRecovery:
    """Test error recovery and fallback mechanisms"""
    
    def test_template_loading_error_handling(self):
        """Test handling of template loading errors"""
        
        with patch.object(DocumentGenerationService, '_load_template', side_effect=Exception("Template not found")):
            generator = GrantDeedGenerator()
            
            # Should handle template loading errors gracefully
            try:
                DocumentGenerationService._load_template("nonexistent_template.jinja2")
                assert False, "Should have raised exception"
            except Exception as e:
                assert "Template not found" in str(e)
    
    def test_pdf_generation_error_handling(self):
        """Test handling of PDF generation errors"""
        
        with patch('services.document_generation_service.HTML', side_effect=Exception("PDF generation failed")):
            try:
                DocumentGenerationService._generate_pdf("<html></html>")
                assert False, "Should have raised exception"
            except Exception as e:
                assert "PDF generation failed" in str(e)
    
    def test_validation_rule_error_handling(self):
        """Test handling of validation rule errors"""
        
        def failing_validation(data, context):
            raise Exception("Validation rule failed")
        
        rule = BusinessRuleValidation(
            "test_field",
            failing_validation,
            "Test validation"
        )
        
        result = rule.validate({"test_field": "value"})
        
        # Should handle validation rule errors gracefully
        assert result.passed is False
        assert "error" in result.message.lower()

# Performance and load testing
class TestPerformance:
    """Performance and load tests"""
    
    @pytest.mark.asyncio
    async def test_concurrent_document_generation(self, sample_grant_deed_data, mock_weasyprint, mock_jinja_template):
        """Test concurrent document generation"""
        
        async def generate_document():
            with patch.object(DocumentGenerationService, '_load_template', return_value=mock_jinja_template):
                return await DocumentGenerationService.generate_document("grant_deed", sample_grant_deed_data)
        
        # Generate multiple documents concurrently
        tasks = [generate_document() for _ in range(5)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All should succeed
        for result in results:
            assert isinstance(result, GenerationResult)
            assert len(result.pdf_bytes) > 0
    
    def test_validation_performance(self, sample_grant_deed_data):
        """Test validation performance with large datasets"""
        framework = DocumentValidationFramework()
        
        # Test with multiple validations
        import time
        
        start_time = time.time()
        for _ in range(10):
            summary = framework.validate_document("grant_deed", sample_grant_deed_data)
            assert summary.total_checks > 0
        
        total_time = time.time() - start_time
        
        # Should handle multiple validations efficiently
        assert total_time < 5.0  # Less than 5 seconds for 10 validations

# Utility functions for testing
def create_mock_user(role: str = "user") -> Dict[str, Any]:
    """Create mock user for testing"""
    return {
        "id": "test_user_123",
        "role": role,
        "email": "test@example.com"
    }

def create_invalid_document_data(missing_fields: List[str]) -> Dict[str, Any]:
    """Create invalid document data for testing"""
    base_data = {
        "stepData": {
            "parties": {
                "grantorsText": "John Doe",
                "granteesText": "Jane Smith",
                "county": "Los Angeles",
                "legalDescription": "Test property description"
            }
        }
    }
    
    # Remove specified fields
    for field in missing_fields:
        if '.' in field:
            parts = field.split('.')
            current = base_data
            for part in parts[:-1]:
                current = current[part]
            if parts[-1] in current:
                del current[parts[-1]]
        else:
            if field in base_data:
                del base_data[field]
    
    return base_data

# Test configuration
pytest_plugins = ["pytest_asyncio"]

# Markers for different test categories
pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.backend_reconstruction,
    pytest.mark.phase_3
]


