"""
Comprehensive Testing Suite for Phase 2.4: Backend AI Integration
Tests OpenAI service, AI endpoints, legal knowledge base, and performance monitoring
Following the WIZARD_ARCHITECTURE_OVERHAUL_PLAN Phase 2.4 specifications
"""
import pytest
import asyncio
import json
import time
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
from typing import Dict, Any

# Import the modules we're testing
from services.openai_service import OpenAIService, PromptType, AIRequest, AIResponse
from api.ai_endpoints import router
from data.legal_knowledge import LegalKnowledgeBase, DocumentType, Severity
from lib.performance_monitor import PerformanceMonitor, AICache, RateLimitConfig, CacheConfig

# Test fixtures and utilities
@pytest.fixture
def mock_openai_response():
    """Mock OpenAI API response"""
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = json.dumps({
        "response": "This is a test AI response",
        "confidence": 0.85,
        "reasoning": "Based on the provided context and legal requirements",
        "suggestions": [
            {
                "field": "parties.grantorsText",
                "value": "John Doe, a single man",
                "confidence": 0.9
            }
        ],
        "actions": [
            {
                "type": "field_update",
                "target": "parties.grantorsText",
                "value": "John Doe, a single man"
            }
        ],
        "legal_implications": "Grantor names must match title records exactly",
        "follow_up_questions": ["Would you like me to verify the grantor information?"]
    })
    mock_response.usage = Mock()
    mock_response.usage.total_tokens = 150
    mock_response.usage.prompt_tokens = 100
    mock_response.usage.completion_tokens = 50
    return mock_response

@pytest.fixture
def sample_document_data():
    """Sample document data for testing"""
    return {
        "documentType": "grant_deed",
        "propertyData": {
            "address": "123 Main St, Los Angeles, CA 90210",
            "apn": "123-456-789",
            "county": "Los Angeles",
            "legalDescription": "Lot 1, Block 2, Tract 12345",
            "currentOwners": [{"name": "John Doe", "vestingType": "a single man"}]
        },
        "stepData": {
            "parties": {
                "grantorsText": "John Doe, a single man",
                "granteesText": "Jane Smith, a single woman",
                "county": "Los Angeles",
                "legalDescription": "Lot 1, Block 2, Tract 12345"
            },
            "recording": {
                "requestedBy": "Test Title Company",
                "apn": "123-456-789"
            }
        }
    }

@pytest.fixture
def sample_context():
    """Sample wizard context for testing"""
    return {
        "documentType": "grant_deed",
        "currentStep": 4,
        "propertyData": {
            "address": "123 Main St, Los Angeles, CA 90210",
            "apn": "123-456-789",
            "county": "Los Angeles"
        },
        "stepData": {
            "parties": {
                "grantorsText": "John Doe, a single man"
            }
        }
    }

class TestOpenAIService:
    """Test suite for OpenAI Service"""
    
    @pytest.fixture
    def openai_service(self):
        """Create OpenAI service instance for testing"""
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            service = OpenAIService()
            return service
    
    @pytest.mark.asyncio
    async def test_service_initialization(self, openai_service):
        """Test OpenAI service initialization"""
        assert openai_service.api_key == 'test-key'
        assert openai_service.default_model == 'gpt-4'
        assert openai_service.legal_knowledge is not None
        assert openai_service.prompt_templates is not None
    
    @pytest.mark.asyncio
    async def test_natural_language_processing(self, openai_service, mock_openai_response, sample_context):
        """Test natural language prompt processing"""
        with patch.object(openai_service, '_make_openai_request', return_value=mock_openai_response):
            response = await openai_service.process_natural_language_prompt(
                user_input="Fill in the grantor names",
                context=sample_context,
                document_type="grant_deed"
            )
            
            assert isinstance(response, AIResponse)
            assert response.content == "This is a test AI response"
            assert response.confidence == 0.85
            assert len(response.suggestions) == 1
            assert len(response.actions) == 1
            assert response.tokens_used == 150
    
    @pytest.mark.asyncio
    async def test_document_analysis(self, openai_service, mock_openai_response, sample_document_data):
        """Test document intelligence analysis"""
        with patch.object(openai_service, '_make_openai_request', return_value=mock_openai_response):
            response = await openai_service.analyze_document_intelligence(
                document_data=sample_document_data,
                analysis_type="comprehensive"
            )
            
            assert isinstance(response, AIResponse)
            assert response.content is not None
            assert response.confidence > 0
    
    @pytest.mark.asyncio
    async def test_legal_validation(self, openai_service, mock_openai_response, sample_document_data):
        """Test legal compliance validation"""
        with patch.object(openai_service, '_make_openai_request', return_value=mock_openai_response):
            response = await openai_service.validate_legal_compliance(
                document_type="grant_deed",
                document_data=sample_document_data,
                jurisdiction="California"
            )
            
            assert isinstance(response, AIResponse)
            assert response.legal_implications is not None
    
    @pytest.mark.asyncio
    async def test_field_suggestions(self, openai_service, mock_openai_response, sample_context):
        """Test field value suggestions"""
        with patch.object(openai_service, '_make_openai_request', return_value=mock_openai_response):
            response = await openai_service.suggest_field_values(
                field_name="parties.grantorsText",
                context=sample_context,
                document_type="grant_deed"
            )
            
            assert isinstance(response, AIResponse)
            assert len(response.suggestions) > 0
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, openai_service):
        """Test rate limiting functionality"""
        # Simulate hitting rate limits
        openai_service.request_timestamps = [datetime.now()] * 51  # Exceed limit
        
        with pytest.raises(Exception):  # Should raise rate limit exception
            await openai_service._check_rate_limits()
    
    @pytest.mark.asyncio
    async def test_error_handling(self, openai_service):
        """Test error handling and fallback responses"""
        with patch.object(openai_service, '_make_openai_request', side_effect=Exception("API Error")):
            response = await openai_service.process_natural_language_prompt(
                user_input="Test prompt",
                context={},
                document_type="grant_deed"
            )
            
            assert isinstance(response, AIResponse)
            assert response.confidence == 0.0
            assert "temporarily unavailable" in response.content.lower()
    
    @pytest.mark.asyncio
    async def test_prompt_building(self, openai_service):
        """Test prompt template building"""
        request = AIRequest(
            prompt_type=PromptType.NATURAL_LANGUAGE,
            user_input="Test input",
            context={"test": "context"},
            document_type="grant_deed"
        )
        
        system_prompt, user_prompt = openai_service._build_prompts(request)
        
        assert "California real estate attorney" in system_prompt
        assert "Test input" in user_prompt
        assert "grant_deed" in system_prompt
    
    @pytest.mark.asyncio
    async def test_health_check(self, openai_service):
        """Test service health check"""
        with patch.object(openai_service.client.chat.completions, 'create', return_value=mock_openai_response):
            health = await openai_service.health_check()
            
            assert health["status"] == "healthy"
            assert health["api_accessible"] is True

class TestLegalKnowledgeBase:
    """Test suite for Legal Knowledge Base"""
    
    @pytest.fixture
    def knowledge_base(self):
        """Create knowledge base instance for testing"""
        return LegalKnowledgeBase()
    
    def test_initialization(self, knowledge_base):
        """Test knowledge base initialization"""
        assert len(knowledge_base.california_codes) > 0
        assert len(knowledge_base.validation_rules) > 0
        assert len(knowledge_base.risk_factors) > 0
        assert len(knowledge_base.best_practices) > 0
    
    def test_get_applicable_codes(self, knowledge_base):
        """Test getting applicable legal codes"""
        codes = knowledge_base.get_applicable_codes("grant_deed")
        
        assert len(codes) > 0
        assert any(code.section == "Civil Code §1091" for code in codes)
        assert any(code.section == "Civil Code §1092" for code in codes)
    
    def test_get_validation_rules(self, knowledge_base):
        """Test getting validation rules"""
        rules = knowledge_base.get_validation_rules("grant_deed")
        
        assert len(rules) > 0
        
        # Test field-specific rules
        grantor_rules = knowledge_base.get_validation_rules("grant_deed", "parties.grantorsText")
        assert len(grantor_rules) > 0
    
    def test_get_risk_factors(self, knowledge_base):
        """Test getting risk factors"""
        all_factors = knowledge_base.get_risk_factors()
        assert len(all_factors) > 0
        
        # Test category filtering
        title_risks = knowledge_base.get_risk_factors(category="title_risk")
        assert len(title_risks) > 0
        
        # Test severity filtering
        high_risks = knowledge_base.get_risk_factors(severity=Severity.HIGH)
        assert len(high_risks) > 0
    
    def test_field_validation(self, knowledge_base):
        """Test field value validation"""
        # Test valid field
        violations = knowledge_base.validate_field_value(
            "grant_deed", 
            "parties.grantorsText", 
            "John Doe, a single man"
        )
        assert len(violations) == 0
        
        # Test invalid field (empty)
        violations = knowledge_base.validate_field_value(
            "grant_deed", 
            "parties.grantorsText", 
            ""
        )
        assert len(violations) > 0
    
    def test_document_requirements(self, knowledge_base):
        """Test document requirements retrieval"""
        requirements = knowledge_base.get_document_requirements("grant_deed")
        
        assert "required_fields" in requirements
        assert "legal_requirements" in requirements
        assert len(requirements["required_fields"]) > 0
    
    def test_county_rules(self, knowledge_base):
        """Test county-specific rules"""
        la_rules = knowledge_base.get_county_rules("Los Angeles")
        
        assert "transfer_tax_rate" in la_rules
        assert "recording_fees" in la_rules
    
    def test_knowledge_search(self, knowledge_base):
        """Test knowledge base search functionality"""
        results = knowledge_base.search_knowledge("grant deed requirements")
        
        assert len(results) > 0
        assert all("relevance" in result for result in results)
        assert results[0]["relevance"] > 0
    
    def test_export_functionality(self, knowledge_base):
        """Test knowledge base export"""
        exported = knowledge_base.export_knowledge_base()
        
        assert "california_codes" in exported
        assert "validation_rules" in exported
        assert "export_date" in exported
    
    def test_statistics(self, knowledge_base):
        """Test knowledge base statistics"""
        stats = knowledge_base.get_statistics()
        
        assert "total_codes" in stats
        assert "total_validation_rules" in stats
        assert stats["total_codes"] > 0

class TestPerformanceMonitor:
    """Test suite for Performance Monitor"""
    
    @pytest.fixture
    def performance_monitor(self):
        """Create performance monitor instance for testing"""
        return PerformanceMonitor()
    
    @pytest.mark.asyncio
    async def test_operation_tracking(self, performance_monitor):
        """Test operation performance tracking"""
        async with performance_monitor.track_operation("test_operation", "test_user") as tracker:
            await asyncio.sleep(0.1)  # Simulate work
            tracker.set_tokens(100)
            tracker.set_cost(0.01)
        
        # Check that metric was recorded
        assert len(performance_monitor.metrics) > 0
        
        # Check operation statistics
        stats = performance_monitor.get_performance_summary("test_operation")
        assert stats["statistics"]["total_requests"] == 1
        assert stats["statistics"]["successful_requests"] == 1
        assert stats["statistics"]["total_tokens"] == 100
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, performance_monitor):
        """Test rate limiting functionality"""
        # Test normal operation
        await performance_monitor.check_rate_limits("test_user")
        
        # Test rate limit enforcement
        performance_monitor.rate_limits.requests_per_minute = 1
        performance_monitor.request_timestamps["test_user"].append(time.time())
        
        with pytest.raises(Exception):  # Should raise rate limit exception
            await performance_monitor.check_rate_limits("test_user")
    
    def test_performance_summary(self, performance_monitor):
        """Test performance summary generation"""
        # Add some mock statistics
        performance_monitor.operation_stats["test_op"] = {
            "total_requests": 10,
            "successful_requests": 9,
            "failed_requests": 1,
            "total_duration": 5.0,
            "total_tokens": 1000,
            "total_cost": 0.50,
            "cache_hits": 3,
            "avg_duration": 0.5,
            "avg_tokens": 100.0,
            "success_rate": 0.9
        }
        
        summary = performance_monitor.get_performance_summary()
        
        assert "overall" in summary
        assert summary["overall"]["total_requests"] == 10
        assert summary["overall"]["success_rate"] == 0.9
    
    def test_rate_limit_status(self, performance_monitor):
        """Test rate limit status reporting"""
        status = performance_monitor.get_rate_limit_status("test_user")
        
        assert "requests" in status
        assert "tokens" in status
        assert "cost" in status
        assert status["requests"]["minute"]["limit"] > 0
    
    def test_optimization_recommendations(self, performance_monitor):
        """Test optimization recommendations"""
        # Add mock data that should trigger recommendations
        performance_monitor.operation_stats["slow_op"] = {
            "total_requests": 20,
            "successful_requests": 15,
            "failed_requests": 5,
            "avg_duration": 6.0,  # Slow
            "cache_hits": 2,      # Low cache hit rate
            "success_rate": 0.75  # Low success rate
        }
        
        recommendations = performance_monitor.get_optimization_recommendations()
        
        assert len(recommendations) > 0
        assert any(rec["type"] == "reliability" for rec in recommendations)
        assert any(rec["type"] == "performance" for rec in recommendations)
    
    def test_metrics_export(self, performance_monitor):
        """Test metrics export functionality"""
        # Add a mock metric
        from lib.performance_monitor import PerformanceMetric
        
        metric = PerformanceMetric(
            operation="test_export",
            start_time=time.time(),
            end_time=time.time() + 1,
            duration=1.0,
            success=True,
            tokens_used=100,
            cost=0.01
        )
        
        performance_monitor.metrics.append(metric)
        
        exported = performance_monitor.export_metrics()
        assert len(exported) > 0
        assert exported[0]["operation"] == "test_export"

class TestAICache:
    """Test suite for AI Cache"""
    
    @pytest.fixture
    def ai_cache(self):
        """Create AI cache instance for testing"""
        config = CacheConfig(ttl_seconds=60, max_entries=100)
        return AICache(config=config)
    
    @pytest.mark.asyncio
    async def test_cache_operations(self, ai_cache):
        """Test basic cache operations"""
        prompt = "Test prompt"
        context = {"test": "context"}
        response = {"result": "Test response"}
        
        # Test cache miss
        cached = await ai_cache.get(prompt, context)
        assert cached is None
        
        # Test cache set
        await ai_cache.set(prompt, context, response)
        
        # Test cache hit
        cached = await ai_cache.get(prompt, context)
        assert cached is not None
        assert cached["result"] == "Test response"
    
    @pytest.mark.asyncio
    async def test_cache_expiration(self, ai_cache):
        """Test cache TTL expiration"""
        ai_cache.config.ttl_seconds = 0.1  # Very short TTL
        
        prompt = "Test prompt"
        context = {"test": "context"}
        response = {"result": "Test response"}
        
        await ai_cache.set(prompt, context, response)
        
        # Should be cached immediately
        cached = await ai_cache.get(prompt, context)
        assert cached is not None
        
        # Wait for expiration
        await asyncio.sleep(0.2)
        
        # Should be expired
        cached = await ai_cache.get(prompt, context)
        assert cached is None
    
    def test_cache_eviction(self, ai_cache):
        """Test LRU cache eviction"""
        ai_cache.config.max_entries = 2
        
        # Fill cache to capacity
        ai_cache.local_cache["key1"] = {"data": "value1", "timestamp": time.time()}
        ai_cache.access_times["key1"] = time.time() - 10  # Older access
        
        ai_cache.local_cache["key2"] = {"data": "value2", "timestamp": time.time()}
        ai_cache.access_times["key2"] = time.time() - 5   # Newer access
        
        # Add third item, should evict key1 (oldest)
        ai_cache._evict_if_needed()
        ai_cache.local_cache["key3"] = {"data": "value3", "timestamp": time.time()}
        ai_cache.access_times["key3"] = time.time()
        
        assert "key1" not in ai_cache.local_cache
        assert "key2" in ai_cache.local_cache
        assert "key3" in ai_cache.local_cache
    
    def test_cache_key_generation(self, ai_cache):
        """Test cache key generation consistency"""
        prompt = "Test prompt"
        context = {"key": "value", "number": 123}
        
        key1 = ai_cache._generate_cache_key(prompt, context)
        key2 = ai_cache._generate_cache_key(prompt, context)
        
        # Same input should generate same key
        assert key1 == key2
        
        # Different input should generate different key
        key3 = ai_cache._generate_cache_key("Different prompt", context)
        assert key1 != key3
    
    def test_cache_statistics(self, ai_cache):
        """Test cache statistics"""
        stats = ai_cache.get_stats()
        
        assert "local_cache_size" in stats
        assert "max_entries" in stats
        assert "ttl_seconds" in stats
        assert "enabled" in stats

class TestAIEndpointsIntegration:
    """Integration tests for AI endpoints"""
    
    @pytest.mark.asyncio
    async def test_endpoint_authentication(self):
        """Test endpoint authentication requirements"""
        # This would test that endpoints require proper authentication
        # Implementation depends on your auth system
        pass
    
    @pytest.mark.asyncio
    async def test_endpoint_error_handling(self):
        """Test endpoint error handling"""
        # Test various error scenarios and ensure proper HTTP responses
        pass
    
    @pytest.mark.asyncio
    async def test_batch_processing(self):
        """Test batch document analysis"""
        # Test the batch analysis endpoint
        pass

class TestIntegrationScenarios:
    """End-to-end integration tests"""
    
    @pytest.mark.asyncio
    async def test_complete_document_workflow(self, sample_document_data):
        """Test complete document processing workflow"""
        # This would test the entire flow from document input to AI analysis
        pass
    
    @pytest.mark.asyncio
    async def test_performance_under_load(self):
        """Test system performance under load"""
        # Simulate multiple concurrent requests
        pass
    
    @pytest.mark.asyncio
    async def test_error_recovery(self):
        """Test error recovery and fallback mechanisms"""
        # Test system behavior when AI services fail
        pass

# Performance benchmarks
class TestPerformanceBenchmarks:
    """Performance benchmark tests"""
    
    @pytest.mark.asyncio
    async def test_response_time_benchmark(self):
        """Test AI response time benchmarks"""
        # Ensure responses are under target times
        pass
    
    @pytest.mark.asyncio
    async def test_throughput_benchmark(self):
        """Test system throughput"""
        # Test requests per second capacity
        pass
    
    @pytest.mark.asyncio
    async def test_cost_efficiency(self):
        """Test cost efficiency metrics"""
        # Ensure token usage is optimized
        pass

# Utility functions for testing
def create_mock_user(role: str = "user") -> Dict[str, Any]:
    """Create mock user for testing"""
    return {
        "id": "test_user_123",
        "role": role,
        "email": "test@example.com"
    }

def create_mock_request_context() -> Dict[str, Any]:
    """Create mock request context"""
    return {
        "user_id": "test_user_123",
        "timestamp": datetime.now().isoformat(),
        "request_id": "req_123"
    }

# Test configuration
pytest_plugins = ["pytest_asyncio"]

# Markers for different test categories
pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.ai_integration,
    pytest.mark.phase_2_4
]


