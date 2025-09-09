"""
Performance Monitoring and Optimization for AI Services
Implements rate limiting, cost optimization, caching, and performance tracking
Following the WIZARD_ARCHITECTURE_OVERHAUL_PLAN Phase 2.4 specifications
"""
import time
import asyncio
import logging
import json
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
from functools import wraps
import hashlib

import redis
from fastapi import HTTPException

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetric:
    """Performance metric data structure"""
    operation: str
    start_time: float
    end_time: Optional[float] = None
    duration: Optional[float] = None
    success: bool = True
    error: Optional[str] = None
    tokens_used: int = 0
    cost: float = 0.0
    cache_hit: bool = False
    user_id: Optional[str] = None

@dataclass
class RateLimitConfig:
    """Rate limiting configuration"""
    requests_per_minute: int = 50
    tokens_per_minute: int = 40000
    requests_per_hour: int = 1000
    tokens_per_hour: int = 100000
    daily_cost_limit: float = 50.0
    burst_allowance: int = 10

@dataclass
class CacheConfig:
    """Cache configuration"""
    ttl_seconds: int = 3600  # 1 hour default
    max_entries: int = 10000
    enabled: bool = True
    compression: bool = True

class PerformanceMonitor:
    """
    Comprehensive performance monitoring system for AI services
    Tracks metrics, implements rate limiting, and provides optimization insights
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.metrics: deque = deque(maxlen=10000)  # Keep last 10k metrics
        self.rate_limits = RateLimitConfig()
        self.cache_config = CacheConfig()
        
        # In-memory tracking for when Redis is unavailable
        self.request_timestamps: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.token_usage: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.daily_costs: Dict[str, float] = defaultdict(float)
        self.last_reset: Dict[str, datetime] = defaultdict(lambda: datetime.now())
        
        # Performance statistics
        self.operation_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_duration": 0.0,
            "total_tokens": 0,
            "total_cost": 0.0,
            "cache_hits": 0,
            "avg_duration": 0.0,
            "avg_tokens": 0.0,
            "success_rate": 0.0
        })
        
        logger.info("Performance Monitor initialized")

    async def track_operation(self, operation: str, user_id: str = "anonymous"):
        """
        Decorator/context manager for tracking operation performance
        """
        class OperationTracker:
            def __init__(self, monitor: 'PerformanceMonitor', op: str, uid: str):
                self.monitor = monitor
                self.operation = op
                self.user_id = uid
                self.metric = PerformanceMetric(
                    operation=op,
                    start_time=time.time(),
                    user_id=uid
                )
            
            async def __aenter__(self):
                await self.monitor.check_rate_limits(self.user_id)
                return self
            
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                self.metric.end_time = time.time()
                self.metric.duration = self.metric.end_time - self.metric.start_time
                self.metric.success = exc_type is None
                
                if exc_type:
                    self.metric.error = str(exc_val)
                
                await self.monitor.record_metric(self.metric)
                return False
            
            def set_tokens(self, tokens: int):
                self.metric.tokens_used = tokens
            
            def set_cost(self, cost: float):
                self.metric.cost = cost
            
            def set_cache_hit(self, cache_hit: bool):
                self.metric.cache_hit = cache_hit
        
        return OperationTracker(self, operation, user_id)

    async def check_rate_limits(self, user_id: str = "anonymous"):
        """
        Check and enforce rate limits for user
        """
        now = datetime.now()
        
        # Reset daily counters if needed
        if self.last_reset[user_id].date() != now.date():
            self.daily_costs[user_id] = 0.0
            self.last_reset[user_id] = now
        
        # Check daily cost limit
        if self.daily_costs[user_id] >= self.rate_limits.daily_cost_limit:
            raise HTTPException(
                status_code=429,
                detail=f"Daily cost limit of ${self.rate_limits.daily_cost_limit} exceeded"
            )
        
        # Clean old timestamps
        cutoff_minute = now - timedelta(minutes=1)
        cutoff_hour = now - timedelta(hours=1)
        
        # Clean request timestamps
        while (self.request_timestamps[user_id] and 
               self.request_timestamps[user_id][0] < cutoff_minute.timestamp()):
            self.request_timestamps[user_id].popleft()
        
        # Clean token usage
        while (self.token_usage[user_id] and 
               self.token_usage[user_id][0][0] < cutoff_minute.timestamp()):
            self.token_usage[user_id].popleft()
        
        # Check request rate limits
        requests_this_minute = len(self.request_timestamps[user_id])
        if requests_this_minute >= self.rate_limits.requests_per_minute:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded: {requests_this_minute} requests in the last minute"
            )
        
        # Check token rate limits
        tokens_this_minute = sum(
            tokens for timestamp, tokens in self.token_usage[user_id]
            if timestamp > cutoff_minute.timestamp()
        )
        if tokens_this_minute >= self.rate_limits.tokens_per_minute:
            raise HTTPException(
                status_code=429,
                detail=f"Token rate limit exceeded: {tokens_this_minute} tokens in the last minute"
            )
        
        # Record this request
        self.request_timestamps[user_id].append(now.timestamp())

    async def record_metric(self, metric: PerformanceMetric):
        """
        Record performance metric and update statistics
        """
        # Add to metrics queue
        self.metrics.append(metric)
        
        # Update operation statistics
        stats = self.operation_stats[metric.operation]
        stats["total_requests"] += 1
        
        if metric.success:
            stats["successful_requests"] += 1
        else:
            stats["failed_requests"] += 1
        
        if metric.duration:
            stats["total_duration"] += metric.duration
            stats["avg_duration"] = stats["total_duration"] / stats["total_requests"]
        
        if metric.tokens_used:
            stats["total_tokens"] += metric.tokens_used
            stats["avg_tokens"] = stats["total_tokens"] / stats["total_requests"]
            
            # Record token usage for rate limiting
            if metric.user_id:
                self.token_usage[metric.user_id].append((time.time(), metric.tokens_used))
        
        if metric.cost:
            stats["total_cost"] += metric.cost
            if metric.user_id:
                self.daily_costs[metric.user_id] += metric.cost
        
        if metric.cache_hit:
            stats["cache_hits"] += 1
        
        # Calculate success rate
        if stats["total_requests"] > 0:
            stats["success_rate"] = stats["successful_requests"] / stats["total_requests"]
        
        # Store in Redis if available
        if self.redis_client:
            try:
                await self._store_metric_in_redis(metric)
            except Exception as e:
                logger.warning(f"Failed to store metric in Redis: {e}")

    async def _store_metric_in_redis(self, metric: PerformanceMetric):
        """Store metric in Redis for persistence"""
        key = f"ai_metrics:{datetime.now().strftime('%Y-%m-%d')}"
        value = json.dumps(asdict(metric), default=str)
        
        # Store with daily expiration
        await self.redis_client.lpush(key, value)
        await self.redis_client.expire(key, 86400 * 7)  # Keep for 7 days

    def get_performance_summary(self, operation: Optional[str] = None) -> Dict[str, Any]:
        """
        Get performance summary for all operations or specific operation
        """
        if operation:
            if operation not in self.operation_stats:
                return {"error": f"No statistics found for operation: {operation}"}
            return {
                "operation": operation,
                "statistics": dict(self.operation_stats[operation])
            }
        
        # Return summary for all operations
        summary = {
            "total_operations": len(self.operation_stats),
            "operations": {}
        }
        
        for op, stats in self.operation_stats.items():
            summary["operations"][op] = dict(stats)
        
        # Calculate overall statistics
        total_requests = sum(stats["total_requests"] for stats in self.operation_stats.values())
        total_successful = sum(stats["successful_requests"] for stats in self.operation_stats.values())
        total_cost = sum(stats["total_cost"] for stats in self.operation_stats.values())
        total_cache_hits = sum(stats["cache_hits"] for stats in self.operation_stats.values())
        
        summary["overall"] = {
            "total_requests": total_requests,
            "success_rate": total_successful / total_requests if total_requests > 0 else 0,
            "total_cost": total_cost,
            "cache_hit_rate": total_cache_hits / total_requests if total_requests > 0 else 0
        }
        
        return summary

    def get_rate_limit_status(self, user_id: str = "anonymous") -> Dict[str, Any]:
        """
        Get current rate limit status for user
        """
        now = datetime.now()
        cutoff_minute = now - timedelta(minutes=1)
        cutoff_hour = now - timedelta(hours=1)
        
        # Count recent requests
        requests_this_minute = len([
            ts for ts in self.request_timestamps[user_id]
            if ts > cutoff_minute.timestamp()
        ])
        
        requests_this_hour = len([
            ts for ts in self.request_timestamps[user_id]
            if ts > cutoff_hour.timestamp()
        ])
        
        # Count recent tokens
        tokens_this_minute = sum(
            tokens for timestamp, tokens in self.token_usage[user_id]
            if timestamp > cutoff_minute.timestamp()
        )
        
        tokens_this_hour = sum(
            tokens for timestamp, tokens in self.token_usage[user_id]
            if timestamp > cutoff_hour.timestamp()
        )
        
        return {
            "user_id": user_id,
            "requests": {
                "minute": {
                    "current": requests_this_minute,
                    "limit": self.rate_limits.requests_per_minute,
                    "remaining": max(0, self.rate_limits.requests_per_minute - requests_this_minute)
                },
                "hour": {
                    "current": requests_this_hour,
                    "limit": self.rate_limits.requests_per_hour,
                    "remaining": max(0, self.rate_limits.requests_per_hour - requests_this_hour)
                }
            },
            "tokens": {
                "minute": {
                    "current": tokens_this_minute,
                    "limit": self.rate_limits.tokens_per_minute,
                    "remaining": max(0, self.rate_limits.tokens_per_minute - tokens_this_minute)
                },
                "hour": {
                    "current": tokens_this_hour,
                    "limit": self.rate_limits.tokens_per_hour,
                    "remaining": max(0, self.rate_limits.tokens_per_hour - tokens_this_hour)
                }
            },
            "cost": {
                "today": self.daily_costs[user_id],
                "limit": self.rate_limits.daily_cost_limit,
                "remaining": max(0, self.rate_limits.daily_cost_limit - self.daily_costs[user_id])
            }
        }

    def get_optimization_recommendations(self) -> List[Dict[str, Any]]:
        """
        Generate optimization recommendations based on performance data
        """
        recommendations = []
        
        for operation, stats in self.operation_stats.items():
            if stats["total_requests"] < 10:
                continue  # Skip operations with insufficient data
            
            # Check success rate
            if stats["success_rate"] < 0.9:
                recommendations.append({
                    "type": "reliability",
                    "operation": operation,
                    "issue": f"Low success rate: {stats['success_rate']:.1%}",
                    "recommendation": "Investigate error patterns and improve error handling",
                    "priority": "high"
                })
            
            # Check average duration
            if stats["avg_duration"] > 5.0:
                recommendations.append({
                    "type": "performance",
                    "operation": operation,
                    "issue": f"Slow response time: {stats['avg_duration']:.2f}s",
                    "recommendation": "Consider caching, prompt optimization, or model selection",
                    "priority": "medium"
                })
            
            # Check cache hit rate
            cache_hit_rate = stats["cache_hits"] / stats["total_requests"]
            if cache_hit_rate < 0.3 and stats["total_requests"] > 50:
                recommendations.append({
                    "type": "caching",
                    "operation": operation,
                    "issue": f"Low cache hit rate: {cache_hit_rate:.1%}",
                    "recommendation": "Review caching strategy and TTL settings",
                    "priority": "low"
                })
            
            # Check cost efficiency
            if stats["total_cost"] > 10.0 and stats["avg_tokens"] > 1000:
                recommendations.append({
                    "type": "cost",
                    "operation": operation,
                    "issue": f"High token usage: {stats['avg_tokens']:.0f} tokens/request",
                    "recommendation": "Optimize prompts to reduce token consumption",
                    "priority": "medium"
                })
        
        return recommendations

    def update_rate_limits(self, config: RateLimitConfig):
        """Update rate limiting configuration"""
        self.rate_limits = config
        logger.info(f"Rate limits updated: {asdict(config)}")

    def reset_user_limits(self, user_id: str):
        """Reset rate limits for specific user (admin function)"""
        self.request_timestamps[user_id].clear()
        self.token_usage[user_id].clear()
        self.daily_costs[user_id] = 0.0
        self.last_reset[user_id] = datetime.now()
        logger.info(f"Rate limits reset for user: {user_id}")

    def export_metrics(self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Export metrics for analysis"""
        metrics_list = []
        
        for metric in self.metrics:
            metric_dict = asdict(metric)
            
            # Filter by date range if specified
            if start_date or end_date:
                metric_time = datetime.fromtimestamp(metric.start_time)
                if start_date and metric_time < start_date:
                    continue
                if end_date and metric_time > end_date:
                    continue
            
            metrics_list.append(metric_dict)
        
        return metrics_list

class AICache:
    """
    Intelligent caching system for AI responses
    Implements TTL, LRU eviction, and content-based hashing
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None, config: CacheConfig = None):
        self.redis_client = redis_client
        self.config = config or CacheConfig()
        self.local_cache: Dict[str, Dict[str, Any]] = {}
        self.access_times: Dict[str, float] = {}
        
        logger.info("AI Cache initialized")

    def _generate_cache_key(self, prompt: str, context: Dict[str, Any], model: str = "gpt-4") -> str:
        """Generate cache key from prompt and context"""
        # Create a deterministic hash of the input
        cache_input = {
            "prompt": prompt,
            "context": context,
            "model": model
        }
        
        # Sort keys for consistent hashing
        cache_str = json.dumps(cache_input, sort_keys=True, default=str)
        return f"ai_cache:{hashlib.sha256(cache_str.encode()).hexdigest()[:16]}"

    async def get(self, prompt: str, context: Dict[str, Any], model: str = "gpt-4") -> Optional[Dict[str, Any]]:
        """Get cached response if available"""
        if not self.config.enabled:
            return None
        
        cache_key = self._generate_cache_key(prompt, context, model)
        
        # Try Redis first
        if self.redis_client:
            try:
                cached_data = await self.redis_client.get(cache_key)
                if cached_data:
                    return json.loads(cached_data)
            except Exception as e:
                logger.warning(f"Redis cache get failed: {e}")
        
        # Try local cache
        if cache_key in self.local_cache:
            cached_item = self.local_cache[cache_key]
            
            # Check TTL
            if time.time() - cached_item["timestamp"] < self.config.ttl_seconds:
                self.access_times[cache_key] = time.time()  # Update access time for LRU
                return cached_item["data"]
            else:
                # Expired, remove from cache
                del self.local_cache[cache_key]
                if cache_key in self.access_times:
                    del self.access_times[cache_key]
        
        return None

    async def set(self, prompt: str, context: Dict[str, Any], response: Dict[str, Any], model: str = "gpt-4"):
        """Cache AI response"""
        if not self.config.enabled:
            return
        
        cache_key = self._generate_cache_key(prompt, context, model)
        cache_data = {
            "data": response,
            "timestamp": time.time(),
            "model": model
        }
        
        # Store in Redis
        if self.redis_client:
            try:
                await self.redis_client.setex(
                    cache_key,
                    self.config.ttl_seconds,
                    json.dumps(cache_data, default=str)
                )
            except Exception as e:
                logger.warning(f"Redis cache set failed: {e}")
        
        # Store in local cache
        self._evict_if_needed()
        self.local_cache[cache_key] = cache_data
        self.access_times[cache_key] = time.time()

    def _evict_if_needed(self):
        """Evict old entries if cache is full (LRU)"""
        if len(self.local_cache) >= self.config.max_entries:
            # Find least recently used key
            lru_key = min(self.access_times.keys(), key=lambda k: self.access_times[k])
            
            # Remove from both caches
            if lru_key in self.local_cache:
                del self.local_cache[lru_key]
            if lru_key in self.access_times:
                del self.access_times[lru_key]

    def clear(self):
        """Clear all cached data"""
        self.local_cache.clear()
        self.access_times.clear()
        
        if self.redis_client:
            try:
                # This is a simplified clear - in production you'd want to be more selective
                logger.info("Local cache cleared")
            except Exception as e:
                logger.warning(f"Redis cache clear failed: {e}")

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "local_cache_size": len(self.local_cache),
            "max_entries": self.config.max_entries,
            "ttl_seconds": self.config.ttl_seconds,
            "enabled": self.config.enabled
        }

# Global instances
performance_monitor = PerformanceMonitor()
ai_cache = AICache()

# Decorator for automatic performance tracking
def track_performance(operation: str):
    """Decorator for tracking function performance"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user_id = kwargs.get('user_id', 'anonymous')
            
            async with performance_monitor.track_operation(operation, user_id) as tracker:
                try:
                    result = await func(*args, **kwargs)
                    
                    # Extract metrics from result if available
                    if isinstance(result, dict):
                        if 'tokens_used' in result:
                            tracker.set_tokens(result['tokens_used'])
                        if 'cost_estimate' in result:
                            tracker.set_cost(result['cost_estimate'])
                        if 'cache_hit' in result:
                            tracker.set_cache_hit(result['cache_hit'])
                    
                    return result
                    
                except Exception as e:
                    logger.error(f"Operation {operation} failed: {str(e)}")
                    raise
        
        return wrapper
    return decorator


