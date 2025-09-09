import { PropertyData, AISuggestion } from './wizardState';
import { DocumentSuggestion } from '../services/aiService';

// Performance optimization and caching system
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hits: number;
}

export interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  totalRequests: number;
  errorRate: number;
  lastUpdated: Date;
}

export class PerformanceOptimizer {
  private cache = new Map<string, CacheEntry<any>>();
  private metrics: PerformanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    totalRequests: 0,
    errorRate: 0,
    lastUpdated: new Date()
  };
  private responseTimes: number[] = [];
  private maxCacheSize = 1000;
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  // Cache management
  private generateCacheKey(prefix: string, params: any): string {
    return `${prefix}:${JSON.stringify(params)}`;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictExpiredEntries(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }

  private evictLRU(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    // Find least recently used entry (lowest hits)
    let lruKey = '';
    let minHits = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  // Cached property search
  async cachedPropertySearch(
    searchFn: (address: string) => Promise<PropertyData | null>,
    address: string
  ): Promise<PropertyData | null> {
    const cacheKey = this.generateCacheKey('property_search', { address });
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && !this.isExpired(cached)) {
        cached.hits++;
        this.metrics.cacheHits++;
        this.recordResponseTime(Date.now() - startTime);
        return cached.data;
      }

      // Cache miss - fetch data
      this.metrics.cacheMisses++;
      const result = await searchFn(address);
      
      // Cache the result
      if (result) {
        this.evictExpiredEntries();
        this.evictLRU();
        
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          ttl: this.defaultTTL,
          hits: 1
        });
      }
      
      this.recordResponseTime(Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordError();
      throw error;
    }
  }

  // Cached document suggestions
  async cachedDocumentSuggestion(
    suggestionFn: (propertyData: PropertyData) => Promise<DocumentSuggestion>,
    propertyData: PropertyData
  ): Promise<DocumentSuggestion> {
    const cacheKey = this.generateCacheKey('document_suggestion', {
      address: propertyData.address,
      owners: propertyData.currentOwners.map(o => o.name),
      liens: propertyData.titlePointData?.liens?.length || 0
    });
    
    const startTime = Date.now();
    
    try {
      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && !this.isExpired(cached)) {
        cached.hits++;
        this.metrics.cacheHits++;
        this.recordResponseTime(Date.now() - startTime);
        return cached.data;
      }

      // Cache miss
      this.metrics.cacheMisses++;
      const result = await suggestionFn(propertyData);
      
      // Cache with shorter TTL for AI suggestions (they may change)
      this.evictExpiredEntries();
      this.evictLRU();
      
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl: 2 * 60 * 1000, // 2 minutes for AI suggestions
        hits: 1
      });
      
      this.recordResponseTime(Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordError();
      throw error;
    }
  }

  // Cached field suggestions
  async cachedFieldSuggestions(
    suggestionFn: (documentType: string, stepId: string, context: any) => Promise<any[]>,
    documentType: string,
    stepId: string,
    context: any
  ): Promise<any[]> {
    const cacheKey = this.generateCacheKey('field_suggestions', {
      documentType,
      stepId,
      propertyAddress: context.propertyData?.address,
      currentData: context.currentStepData
    });
    
    const startTime = Date.now();
    
    try {
      const cached = this.cache.get(cacheKey);
      if (cached && !this.isExpired(cached)) {
        cached.hits++;
        this.metrics.cacheHits++;
        this.recordResponseTime(Date.now() - startTime);
        return cached.data;
      }

      this.metrics.cacheMisses++;
      const result = await suggestionFn(documentType, stepId, context);
      
      this.evictExpiredEntries();
      this.evictLRU();
      
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl: 1 * 60 * 1000, // 1 minute for field suggestions
        hits: 1
      });
      
      this.recordResponseTime(Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordError();
      throw error;
    }
  }

  // Request debouncing for user input
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  
  debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number = 300
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise((resolve, reject) => {
        // Clear existing timer
        const existingTimer = this.debounceTimers.get(key);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // Set new timer
        const timer = setTimeout(async () => {
          try {
            const result = await fn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            this.debounceTimers.delete(key);
          }
        }, delay);

        this.debounceTimers.set(key, timer);
      });
    };
  }

  // Request batching for multiple similar requests
  private batchQueues = new Map<string, {
    requests: Array<{ args: any[]; resolve: Function; reject: Function }>;
    timer: NodeJS.Timeout;
  }>();

  batchRequests<T extends (...args: any[]) => Promise<any>>(
    key: string,
    fn: T,
    batchSize: number = 5,
    maxWaitTime: number = 100
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise((resolve, reject) => {
        let batch = this.batchQueues.get(key);
        
        if (!batch) {
          batch = {
            requests: [],
            timer: setTimeout(() => this.processBatch(key, fn), maxWaitTime)
          };
          this.batchQueues.set(key, batch);
        }

        batch.requests.push({ args, resolve, reject });

        // Process batch if it's full
        if (batch.requests.length >= batchSize) {
          clearTimeout(batch.timer);
          this.processBatch(key, fn);
        }
      });
    };
  }

  private async processBatch<T extends (...args: any[]) => Promise<any>>(
    key: string,
    fn: T
  ): Promise<void> {
    const batch = this.batchQueues.get(key);
    if (!batch) return;

    this.batchQueues.delete(key);
    
    // Process all requests in parallel
    const promises = batch.requests.map(async ({ args, resolve, reject }) => {
      try {
        const result = await fn(...args);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    await Promise.allSettled(promises);
  }

  // Preload common data
  async preloadCommonData(): Promise<void> {
    const commonAddresses = [
      '123 Main St, Los Angeles, CA',
      '456 Oak Ave, Orange, CA',
      '789 Pine St, San Diego, CA'
    ];

    // Preload property data for common test addresses
    const preloadPromises = commonAddresses.map(async (address) => {
      try {
        // This would normally call the actual property search
        // For now, we'll just cache some mock data
        const mockData: PropertyData = {
          address,
          apn: '123-456-789',
          county: address.includes('Los Angeles') ? 'Los Angeles' : 
                 address.includes('Orange') ? 'Orange' : 'San Diego',
          legalDescription: 'Mock legal description',
          currentOwners: [{ name: 'Mock Owner' }]
        };

        const cacheKey = this.generateCacheKey('property_search', { address });
        this.cache.set(cacheKey, {
          data: mockData,
          timestamp: Date.now(),
          ttl: this.defaultTTL,
          hits: 0
        });
      } catch (error) {
        console.warn(`Failed to preload data for ${address}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  // Performance monitoring
  private recordResponseTime(duration: number): void {
    this.responseTimes.push(duration);
    this.metrics.totalRequests++;
    
    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
    
    // Update average
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    
    this.metrics.lastUpdated = new Date();
  }

  private recordError(): void {
    this.metrics.totalRequests++;
    const errorCount = this.metrics.errorRate * (this.metrics.totalRequests - 1) + 1;
    this.metrics.errorRate = errorCount / this.metrics.totalRequests;
    this.metrics.lastUpdated = new Date();
  }

  // Get performance metrics
  getMetrics(): PerformanceMetrics & {
    cacheSize: number;
    cacheHitRate: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  } {
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0 ? 
      (this.metrics.cacheHits / totalCacheRequests) * 100 : 0;

    // Calculate percentiles
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      cacheHitRate,
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0
    };
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    this.metrics.cacheHits = 0;
    this.metrics.cacheMisses = 0;
  }

  // Optimize cache settings based on usage patterns
  optimizeCache(): void {
    const metrics = this.getMetrics();
    
    // Adjust cache size based on hit rate
    if (metrics.cacheHitRate > 80) {
      this.maxCacheSize = Math.min(this.maxCacheSize * 1.2, 2000);
    } else if (metrics.cacheHitRate < 50) {
      this.maxCacheSize = Math.max(this.maxCacheSize * 0.8, 500);
    }

    // Adjust TTL based on error rate
    if (metrics.errorRate > 0.1) {
      this.defaultTTL = Math.max(this.defaultTTL * 0.8, 60000); // Minimum 1 minute
    } else if (metrics.errorRate < 0.05) {
      this.defaultTTL = Math.min(this.defaultTTL * 1.2, 600000); // Maximum 10 minutes
    }
  }

  // Generate performance report
  generatePerformanceReport(): string {
    const metrics = this.getMetrics();
    
    return `
# 📈 Performance Optimization Report

## 🎯 Key Metrics
- **Cache Hit Rate**: ${metrics.cacheHitRate.toFixed(1)}%
- **Average Response Time**: ${metrics.averageResponseTime.toFixed(0)}ms
- **95th Percentile**: ${metrics.p95ResponseTime.toFixed(0)}ms
- **99th Percentile**: ${metrics.p99ResponseTime.toFixed(0)}ms
- **Error Rate**: ${(metrics.errorRate * 100).toFixed(2)}%

## 💾 Cache Statistics
- **Cache Size**: ${metrics.cacheSize} / ${this.maxCacheSize}
- **Cache Hits**: ${metrics.cacheHits}
- **Cache Misses**: ${metrics.cacheMisses}
- **Total Requests**: ${metrics.totalRequests}

## 🚀 Performance Status
${this.getPerformanceStatus(metrics)}

## 💡 Recommendations
${this.getPerformanceRecommendations(metrics).map(r => `- ${r}`).join('\n')}
`;
  }

  private getPerformanceStatus(metrics: ReturnType<typeof this.getMetrics>): string {
    if (metrics.averageResponseTime < 500 && metrics.cacheHitRate > 70 && metrics.errorRate < 0.05) {
      return '🟢 **Excellent** - System is performing optimally';
    } else if (metrics.averageResponseTime < 1000 && metrics.cacheHitRate > 50 && metrics.errorRate < 0.1) {
      return '🟡 **Good** - System is performing well with room for improvement';
    } else {
      return '🔴 **Needs Attention** - Performance optimization required';
    }
  }

  private getPerformanceRecommendations(metrics: ReturnType<typeof this.getMetrics>): string[] {
    const recommendations: string[] = [];

    if (metrics.cacheHitRate < 50) {
      recommendations.push('Low cache hit rate - consider increasing cache size or TTL');
    }

    if (metrics.averageResponseTime > 1000) {
      recommendations.push('High average response time - implement request batching or preloading');
    }

    if (metrics.p95ResponseTime > 2000) {
      recommendations.push('High 95th percentile response time - optimize slow requests');
    }

    if (metrics.errorRate > 0.1) {
      recommendations.push('High error rate - improve error handling and retry logic');
    }

    if (metrics.cacheSize > this.maxCacheSize * 0.9) {
      recommendations.push('Cache is nearly full - consider increasing max cache size');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal - continue monitoring');
    }

    return recommendations;
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();


