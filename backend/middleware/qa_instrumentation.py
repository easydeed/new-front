"""
QA Instrumentation Middleware
Phase 4: Quality Assurance & Hardening

Per Wizard Rebuild Plan:
- Deploy QA instrumentation (additional logging) for staging
- Monitor injected faults and system behavior
- Log aggregation for resilience testing
"""

import time
import uuid
import logging
from typing import Dict, Any, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import json
import os

# Configure QA-specific logging
qa_logger = logging.getLogger("qa_instrumentation")
qa_logger.setLevel(logging.INFO)

# Create QA log handler if in staging environment
if os.getenv("ENVIRONMENT") == "staging":
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '%(asctime)s - QA_INSTRUMENT - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    qa_logger.addHandler(handler)


class QAInstrumentationMiddleware(BaseHTTPMiddleware):
    """
    QA Instrumentation for staging environment monitoring
    
    Features:
    - Request/response logging with timing
    - Fault injection detection
    - Performance metrics collection
    - Error pattern analysis
    - User journey tracking
    """
    
    def __init__(self, app, enable_detailed_logging: bool = True):
        super().__init__(app)
        self.enable_detailed_logging = enable_detailed_logging
        self.fault_injection_patterns = [
            "timeout", "500", "503", "network_error", 
            "titlepoint_down", "google_places_down"
        ]
    
    async def dispatch(self, request: Request, call_next):
        # Generate request ID for tracing
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()
        
        # Extract request metadata
        request_data = await self._extract_request_data(request, request_id)
        
        # Log request start
        if self.enable_detailed_logging:
            qa_logger.info(f"[{request_id}] REQUEST_START: {json.dumps(request_data)}")
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate timing
            duration = time.time() - start_time
            
            # Extract response metadata
            response_data = self._extract_response_data(response, duration, request_id)
            
            # Log response
            if self.enable_detailed_logging:
                qa_logger.info(f"[{request_id}] REQUEST_END: {json.dumps(response_data)}")
            
            # Check for performance issues
            await self._check_performance_thresholds(request_data, response_data, request_id)
            
            # Detect fault injection scenarios
            await self._detect_fault_injection(request_data, response_data, request_id)
            
            # Add QA headers to response
            response.headers["X-QA-Request-ID"] = request_id
            response.headers["X-QA-Duration"] = f"{duration:.3f}s"
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            
            # Log error
            error_data = {
                "request_id": request_id,
                "error": str(e),
                "error_type": type(e).__name__,
                "duration": duration,
                "path": str(request.url.path)
            }
            
            qa_logger.error(f"[{request_id}] REQUEST_ERROR: {json.dumps(error_data)}")
            
            # Re-raise the exception
            raise
    
    async def _extract_request_data(self, request: Request, request_id: str) -> Dict[str, Any]:
        """Extract relevant request data for logging"""
        return {
            "request_id": request_id,
            "method": request.method,
            "path": str(request.url.path),
            "query_params": dict(request.query_params),
            "headers": {
                "user-agent": request.headers.get("user-agent", ""),
                "content-type": request.headers.get("content-type", ""),
                "authorization": "***" if request.headers.get("authorization") else None
            },
            "client_ip": request.client.host if request.client else None,
            "timestamp": time.time()
        }
    
    def _extract_response_data(self, response: Response, duration: float, request_id: str) -> Dict[str, Any]:
        """Extract relevant response data for logging"""
        return {
            "request_id": request_id,
            "status_code": response.status_code,
            "duration": duration,
            "headers": {
                "content-type": response.headers.get("content-type", ""),
                "content-length": response.headers.get("content-length", ""),
                "x-generation-time": response.headers.get("x-generation-time", ""),
                "x-request-id": response.headers.get("x-request-id", "")
            },
            "timestamp": time.time()
        }
    
    async def _check_performance_thresholds(self, request_data: Dict, response_data: Dict, request_id: str):
        """Check for performance threshold violations"""
        duration = response_data["duration"]
        path = request_data["path"]
        
        # Define performance thresholds by endpoint
        thresholds = {
            "/api/property/search": 5.0,  # TitlePoint calls
            "/api/generate/grant-deed-ca": 30.0,  # PDF generation
            "/api/ai/assist": 15.0,  # AI assist calls
            "default": 10.0
        }
        
        threshold = thresholds.get(path, thresholds["default"])
        
        if duration > threshold:
            qa_logger.warning(f"[{request_id}] PERFORMANCE_THRESHOLD_EXCEEDED: "
                            f"path={path}, duration={duration:.3f}s, threshold={threshold}s")
    
    async def _detect_fault_injection(self, request_data: Dict, response_data: Dict, request_id: str):
        """Detect fault injection scenarios for resilience testing"""
        status_code = response_data["status_code"]
        duration = response_data["duration"]
        path = request_data["path"]
        
        # Detect various fault scenarios
        fault_detected = None
        
        if status_code >= 500:
            fault_detected = f"server_error_{status_code}"
        elif status_code == 408 or duration > 30:
            fault_detected = "timeout"
        elif status_code == 429:
            fault_detected = "rate_limit"
        elif status_code == 503:
            fault_detected = "service_unavailable"
        
        if fault_detected:
            qa_logger.info(f"[{request_id}] FAULT_INJECTION_DETECTED: "
                         f"type={fault_detected}, path={path}, status={status_code}, duration={duration:.3f}s")
            
            # Log additional context for fault analysis
            await self._log_fault_context(request_data, response_data, fault_detected, request_id)
    
    async def _log_fault_context(self, request_data: Dict, response_data: Dict, fault_type: str, request_id: str):
        """Log additional context for fault injection analysis"""
        context = {
            "request_id": request_id,
            "fault_type": fault_type,
            "endpoint": request_data["path"],
            "method": request_data["method"],
            "status_code": response_data["status_code"],
            "duration": response_data["duration"],
            "user_agent": request_data["headers"]["user-agent"],
            "timestamp": time.time()
        }
        
        qa_logger.info(f"[{request_id}] FAULT_CONTEXT: {json.dumps(context)}")


class QAMetricsCollector:
    """
    Collect QA metrics for staging environment analysis
    """
    
    def __init__(self):
        self.metrics = {
            "request_count": 0,
            "error_count": 0,
            "timeout_count": 0,
            "performance_violations": 0,
            "fault_injections": 0
        }
    
    def increment_metric(self, metric_name: str, value: int = 1):
        """Increment a metric counter"""
        if metric_name in self.metrics:
            self.metrics[metric_name] += value
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics snapshot"""
        return self.metrics.copy()
    
    def reset_metrics(self):
        """Reset all metrics to zero"""
        for key in self.metrics:
            self.metrics[key] = 0


# Global metrics collector instance
qa_metrics = QAMetricsCollector()


def get_qa_health_status() -> Dict[str, Any]:
    """
    Get QA health status for monitoring
    
    Returns health status including:
    - Current metrics
    - System performance indicators
    - Fault injection status
    """
    metrics = qa_metrics.get_metrics()
    
    # Calculate health indicators
    total_requests = metrics["request_count"]
    error_rate = (metrics["error_count"] / total_requests * 100) if total_requests > 0 else 0
    timeout_rate = (metrics["timeout_count"] / total_requests * 100) if total_requests > 0 else 0
    
    # Determine overall health status
    if error_rate > 10 or timeout_rate > 5:
        status = "unhealthy"
    elif error_rate > 5 or timeout_rate > 2:
        status = "degraded"
    else:
        status = "healthy"
    
    return {
        "status": status,
        "metrics": metrics,
        "rates": {
            "error_rate": round(error_rate, 2),
            "timeout_rate": round(timeout_rate, 2)
        },
        "environment": os.getenv("ENVIRONMENT", "unknown"),
        "qa_instrumentation_enabled": True,
        "timestamp": time.time()
    }
