/**
 * Wizard Performance Monitoring System
 * Tracks performance metrics, user interactions, and system health
 * Following the WIZARD_ARCHITECTURE_OVERHAUL_PLAN Phase 4.2 specifications
 */

export interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime: number | null;
  duration: number | null;
  success: boolean | null;
  error: string | null;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp: string;
}

export interface UserInteractionMetric {
  action: string;
  element: string;
  step: number;
  documentType: string;
  timestamp: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface SystemHealthMetric {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  timestamp: string;
  details?: Record<string, any>;
}

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  customDimensions?: Record<string, any>;
  timestamp: string;
}

export class WizardPerformanceMonitor {
  private static instance: WizardPerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private userInteractions: UserInteractionMetric[] = [];
  private systemHealth: Map<string, SystemHealthMetric> = new Map();
  private analyticsQueue: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId: string | null = null;
  private isEnabled: boolean = true;

  // Performance thresholds (in milliseconds)
  private readonly thresholds = {
    documentSelection: 100,
    stepTransition: 200,
    fieldUpdate: 50,
    validation: 300,
    aiResponse: 3000,
    documentGeneration: 5000,
    apiCall: 2000
  };

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializePerformanceObserver();
    this.startHealthMonitoring();
    
    // Send queued analytics periodically
    setInterval(() => this.flushAnalytics(), 30000); // Every 30 seconds
  }

  static getInstance(): WizardPerformanceMonitor {
    if (!this.instance) {
      this.instance = new WizardPerformanceMonitor();
    }
    return this.instance;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Start timing an operation
   */
  startTimer(operation: string, metadata?: Record<string, any>): string {
    if (!this.isEnabled) return '';

    const id = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.metrics.set(id, {
      operation,
      startTime: performance.now(),
      endTime: null,
      duration: null,
      success: null,
      error: null,
      metadata,
      userId: this.userId || undefined,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    });

    return id;
  }

  /**
   * End timing an operation
   */
  endTimer(id: string, success: boolean = true, error?: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled || !id) return;

    const metric = this.metrics.get(id);
    if (!metric) return;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;
    metric.error = error || null;
    
    if (metadata) {
      metric.metadata = { ...metric.metadata, ...metadata };
    }

    // Check performance thresholds
    this.checkPerformanceThreshold(metric);

    // Send to analytics
    this.sendPerformanceAnalytics(metric);

    // Log slow operations
    if (metric.duration > (this.thresholds[metric.operation as keyof typeof this.thresholds] || 1000)) {
      console.warn(`Slow operation detected: ${metric.operation} took ${metric.duration.toFixed(2)}ms`, {
        operation: metric.operation,
        duration: metric.duration,
        threshold: this.thresholds[metric.operation as keyof typeof this.thresholds],
        metadata: metric.metadata
      });
    }

    // Clean up old metrics (keep last 1000)
    if (this.metrics.size > 1000) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }
  }

  /**
   * Track user interactions
   */
  trackUserInteraction(
    action: string, 
    element: string, 
    step: number, 
    documentType: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const interaction: UserInteractionMetric = {
      action,
      element,
      step,
      documentType,
      timestamp: new Date().toISOString(),
      metadata
    };

    this.userInteractions.push(interaction);

    // Send to analytics
    this.queueAnalyticsEvent({
      category: 'user_interaction',
      action,
      label: `${documentType}_step_${step}_${element}`,
      customDimensions: {
        documentType,
        step,
        element,
        sessionId: this.sessionId,
        userId: this.userId,
        ...metadata
      },
      timestamp: interaction.timestamp
    });

    // Keep only last 500 interactions
    if (this.userInteractions.length > 500) {
      this.userInteractions = this.userInteractions.slice(-500);
    }
  }

  /**
   * Track system component health
   */
  trackSystemHealth(
    component: string, 
    status: 'healthy' | 'degraded' | 'unhealthy',
    responseTime: number,
    errorRate: number,
    details?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const healthMetric: SystemHealthMetric = {
      component,
      status,
      responseTime,
      errorRate,
      timestamp: new Date().toISOString(),
      details
    };

    this.systemHealth.set(component, healthMetric);

    // Send critical health issues to analytics immediately
    if (status === 'unhealthy') {
      this.queueAnalyticsEvent({
        category: 'system_health',
        action: 'component_unhealthy',
        label: component,
        value: responseTime,
        customDimensions: {
          component,
          errorRate,
          details,
          sessionId: this.sessionId
        },
        timestamp: healthMetric.timestamp
      });
    }
  }

  /**
   * Track wizard-specific metrics
   */
  trackWizardMetrics(metrics: {
    completionRate?: number;
    averageStepTime?: number;
    dropoffStep?: number;
    documentType?: string;
    totalTime?: number;
    errorCount?: number;
    aiInteractions?: number;
  }): void {
    if (!this.isEnabled) return;

    this.queueAnalyticsEvent({
      category: 'wizard_metrics',
      action: 'session_complete',
      label: metrics.documentType,
      value: metrics.totalTime,
      customDimensions: {
        ...metrics,
        sessionId: this.sessionId,
        userId: this.userId
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(operation?: string): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    slowOperations: number;
    recentMetrics: PerformanceMetric[];
  } {
    const allMetrics = Array.from(this.metrics.values());
    const filteredMetrics = operation 
      ? allMetrics.filter(m => m.operation === operation)
      : allMetrics;

    const completedMetrics = filteredMetrics.filter(m => m.duration !== null);
    const successfulMetrics = completedMetrics.filter(m => m.success === true);
    
    const totalDuration = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageDuration = completedMetrics.length > 0 ? totalDuration / completedMetrics.length : 0;
    
    const threshold = operation ? this.thresholds[operation as keyof typeof this.thresholds] || 1000 : 1000;
    const slowOperations = completedMetrics.filter(m => (m.duration || 0) > threshold).length;

    return {
      totalOperations: completedMetrics.length,
      averageDuration,
      successRate: completedMetrics.length > 0 ? successfulMetrics.length / completedMetrics.length : 0,
      slowOperations,
      recentMetrics: completedMetrics.slice(-10) // Last 10 metrics
    };
  }

  /**
   * Get user interaction patterns
   */
  getUserInteractionPatterns(): {
    mostUsedFeatures: Array<{ action: string; count: number }>;
    stepDropoffRates: Record<number, number>;
    averageTimePerStep: Record<number, number>;
    documentTypeUsage: Record<string, number>;
  } {
    const actionCounts = new Map<string, number>();
    const stepCounts = new Map<number, number>();
    const stepTimes = new Map<number, number[]>();
    const docTypeCounts = new Map<string, number>();

    this.userInteractions.forEach(interaction => {
      // Count actions
      const currentCount = actionCounts.get(interaction.action) || 0;
      actionCounts.set(interaction.action, currentCount + 1);

      // Count steps
      const stepCount = stepCounts.get(interaction.step) || 0;
      stepCounts.set(interaction.step, stepCount + 1);

      // Track step times
      if (interaction.duration) {
        const times = stepTimes.get(interaction.step) || [];
        times.push(interaction.duration);
        stepTimes.set(interaction.step, times);
      }

      // Count document types
      const docCount = docTypeCounts.get(interaction.documentType) || 0;
      docTypeCounts.set(interaction.documentType, docCount + 1);
    });

    // Calculate most used features
    const mostUsedFeatures = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate step dropoff rates (simplified)
    const stepDropoffRates: Record<number, number> = {};
    const totalSessions = new Set(this.userInteractions.map(i => i.timestamp.split('T')[0])).size;
    
    stepCounts.forEach((count, step) => {
      stepDropoffRates[step] = totalSessions > 0 ? (totalSessions - count) / totalSessions : 0;
    });

    // Calculate average time per step
    const averageTimePerStep: Record<number, number> = {};
    stepTimes.forEach((times, step) => {
      averageTimePerStep[step] = times.length > 0 
        ? times.reduce((sum, time) => sum + time, 0) / times.length 
        : 0;
    });

    return {
      mostUsedFeatures,
      stepDropoffRates,
      averageTimePerStep,
      documentTypeUsage: Object.fromEntries(docTypeCounts)
    };
  }

  /**
   * Get system health overview
   */
  getSystemHealthOverview(): {
    overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    components: SystemHealthMetric[];
    criticalIssues: string[];
    recommendations: string[];
  } {
    const components = Array.from(this.systemHealth.values());
    const unhealthyComponents = components.filter(c => c.status === 'unhealthy');
    const degradedComponents = components.filter(c => c.status === 'degraded');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyComponents.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedComponents.length > 0) {
      overallStatus = 'degraded';
    }

    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    unhealthyComponents.forEach(component => {
      criticalIssues.push(`${component.component} is unhealthy (${component.responseTime}ms response time)`);
      recommendations.push(`Investigate ${component.component} performance issues`);
    });

    degradedComponents.forEach(component => {
      if (component.responseTime > 1000) {
        recommendations.push(`Optimize ${component.component} response time (currently ${component.responseTime}ms)`);
      }
      if (component.errorRate > 0.05) {
        recommendations.push(`Reduce ${component.component} error rate (currently ${(component.errorRate * 100).toFixed(1)}%)`);
      }
    });

    return {
      overallStatus,
      components,
      criticalIssues,
      recommendations
    };
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): {
    metrics: PerformanceMetric[];
    interactions: UserInteractionMetric[];
    systemHealth: SystemHealthMetric[];
    sessionInfo: {
      sessionId: string;
      userId: string | null;
      startTime: string;
      duration: number;
    };
  } {
    return {
      metrics: Array.from(this.metrics.values()),
      interactions: [...this.userInteractions],
      systemHealth: Array.from(this.systemHealth.values()),
      sessionInfo: {
        sessionId: this.sessionId,
        userId: this.userId,
        startTime: new Date(Date.now() - performance.now()).toISOString(),
        duration: performance.now()
      }
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): {
    summary: {
      totalOperations: number;
      averageResponseTime: number;
      successRate: number;
      userSatisfactionScore: number;
    };
    topIssues: Array<{
      category: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      recommendation: string;
    }>;
    trends: {
      performanceTrend: 'improving' | 'stable' | 'degrading';
      errorTrend: 'improving' | 'stable' | 'degrading';
      usageTrend: 'increasing' | 'stable' | 'decreasing';
    };
  } {
    const stats = this.getPerformanceStats();
    const healthOverview = this.getSystemHealthOverview();
    const interactionPatterns = this.getUserInteractionPatterns();

    // Calculate user satisfaction score (simplified)
    const userSatisfactionScore = Math.max(0, Math.min(5, 
      5 * stats.successRate * (1 - Math.min(1, stats.averageDuration / 2000))
    ));

    // Identify top issues
    const topIssues: Array<{
      category: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      recommendation: string;
    }> = [];

    if (stats.successRate < 0.9) {
      topIssues.push({
        category: 'reliability',
        description: `Low success rate: ${(stats.successRate * 100).toFixed(1)}%`,
        impact: 'high',
        recommendation: 'Investigate and fix error sources'
      });
    }

    if (stats.averageDuration > 1000) {
      topIssues.push({
        category: 'performance',
        description: `Slow average response time: ${stats.averageDuration.toFixed(0)}ms`,
        impact: 'medium',
        recommendation: 'Optimize slow operations and implement caching'
      });
    }

    if (healthOverview.criticalIssues.length > 0) {
      topIssues.push({
        category: 'system_health',
        description: `${healthOverview.criticalIssues.length} critical system issues`,
        impact: 'high',
        recommendation: 'Address unhealthy system components immediately'
      });
    }

    // Determine trends (simplified - would need historical data in real implementation)
    const trends = {
      performanceTrend: stats.averageDuration < 500 ? 'improving' : 
                       stats.averageDuration < 1000 ? 'stable' : 'degrading' as const,
      errorTrend: stats.successRate > 0.95 ? 'improving' : 
                 stats.successRate > 0.9 ? 'stable' : 'degrading' as const,
      usageTrend: stats.totalOperations > 100 ? 'increasing' : 
                 stats.totalOperations > 50 ? 'stable' : 'decreasing' as const
    };

    return {
      summary: {
        totalOperations: stats.totalOperations,
        averageResponseTime: stats.averageDuration,
        successRate: stats.successRate,
        userSatisfactionScore
      },
      topIssues,
      trends
    };
  }

  // Private methods

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializePerformanceObserver(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      // Observe navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            this.trackSystemHealth(
              'page_load',
              entry.duration < 2000 ? 'healthy' : entry.duration < 5000 ? 'degraded' : 'unhealthy',
              entry.duration,
              0,
              { entryType: entry.entryType, name: entry.name }
            );
          }
        });
      });

      navigationObserver.observe({ entryTypes: ['navigation'] });

      // Observe resource timing for API calls
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name.includes('/api/')) {
            this.trackSystemHealth(
              'api_call',
              entry.duration < 1000 ? 'healthy' : entry.duration < 3000 ? 'degraded' : 'unhealthy',
              entry.duration,
              0,
              { url: entry.name, method: 'unknown' }
            );
          }
        });
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Performance Observer not supported or failed to initialize:', error);
    }
  }

  private startHealthMonitoring(): void {
    // Monitor system health every 30 seconds
    setInterval(() => {
      this.checkSystemHealth();
    }, 30000);
  }

  private checkSystemHealth(): void {
    // Check memory usage
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;
      
      this.trackSystemHealth(
        'memory',
        memoryUsage < 0.7 ? 'healthy' : memoryUsage < 0.9 ? 'degraded' : 'unhealthy',
        memoryUsage * 100,
        0,
        {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        }
      );
    }

    // Check connection quality
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType || 'unknown';
      
      this.trackSystemHealth(
        'network',
        effectiveType === '4g' ? 'healthy' : effectiveType === '3g' ? 'degraded' : 'unhealthy',
        connection?.rtt || 0,
        0,
        {
          effectiveType,
          downlink: connection?.downlink,
          rtt: connection?.rtt
        }
      );
    }
  }

  private checkPerformanceThreshold(metric: PerformanceMetric): void {
    const threshold = this.thresholds[metric.operation as keyof typeof this.thresholds];
    if (threshold && metric.duration && metric.duration > threshold) {
      this.queueAnalyticsEvent({
        category: 'performance_threshold',
        action: 'threshold_exceeded',
        label: metric.operation,
        value: metric.duration,
        customDimensions: {
          threshold,
          exceedBy: metric.duration - threshold,
          sessionId: this.sessionId,
          userId: this.userId,
          metadata: metric.metadata
        },
        timestamp: metric.timestamp
      });
    }
  }

  private sendPerformanceAnalytics(metric: PerformanceMetric): void {
    this.queueAnalyticsEvent({
      category: 'performance',
      action: metric.operation,
      label: metric.success ? 'success' : 'failure',
      value: metric.duration || undefined,
      customDimensions: {
        success: metric.success,
        error: metric.error,
        sessionId: this.sessionId,
        userId: this.userId,
        ...metric.metadata
      },
      timestamp: metric.timestamp
    });
  }

  private queueAnalyticsEvent(event: AnalyticsEvent): void {
    this.analyticsQueue.push(event);

    // Auto-flush if queue gets too large
    if (this.analyticsQueue.length > 100) {
      this.flushAnalytics();
    }
  }

  private flushAnalytics(): void {
    if (this.analyticsQueue.length === 0) return;

    const events = [...this.analyticsQueue];
    this.analyticsQueue = [];

    // Send to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      events.forEach(event => {
        (window as any).gtag('event', event.action, {
          event_category: event.category,
          event_label: event.label,
          value: event.value,
          custom_map: event.customDimensions
        });
      });
    }

    // Send to custom analytics endpoint
    if (typeof fetch !== 'undefined') {
      fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      }).catch(error => {
        console.warn('Failed to send analytics events:', error);
        // Re-queue events for retry
        this.analyticsQueue.unshift(...events);
      });
    }
  }
}

// React hook for performance monitoring
import { useCallback, useEffect, useRef } from 'react';

export function usePerformanceMonitoring() {
  const monitor = WizardPerformanceMonitor.getInstance();
  const activeTimers = useRef<Set<string>>(new Set());

  const trackOperation = useCallback(async <T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const timerId = monitor.startTimer(operation, metadata);
    activeTimers.current.add(timerId);

    try {
      const result = await fn();
      monitor.endTimer(timerId, true, undefined, { result: 'success' });
      return result;
    } catch (error) {
      monitor.endTimer(timerId, false, error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      activeTimers.current.delete(timerId);
    }
  }, [monitor]);

  const trackUserInteraction = useCallback((
    action: string,
    element: string,
    step: number,
    documentType: string,
    metadata?: Record<string, any>
  ) => {
    monitor.trackUserInteraction(action, element, step, documentType, metadata);
  }, [monitor]);

  const startTimer = useCallback((operation: string, metadata?: Record<string, any>) => {
    const timerId = monitor.startTimer(operation, metadata);
    activeTimers.current.add(timerId);
    return timerId;
  }, [monitor]);

  const endTimer = useCallback((timerId: string, success: boolean = true, error?: string) => {
    monitor.endTimer(timerId, success, error);
    activeTimers.current.delete(timerId);
  }, [monitor]);

  // Cleanup active timers on unmount
  useEffect(() => {
    return () => {
      activeTimers.current.forEach(timerId => {
        monitor.endTimer(timerId, false, 'Component unmounted');
      });
      activeTimers.current.clear();
    };
  }, [monitor]);

  return {
    trackOperation,
    trackUserInteraction,
    startTimer,
    endTimer,
    getStats: () => monitor.getPerformanceStats(),
    getReport: () => monitor.generatePerformanceReport()
  };
}

// Global performance monitor instance
export const performanceMonitor = WizardPerformanceMonitor.getInstance();

// Utility functions for common performance tracking
export const PerformanceUtils = {
  trackPageLoad: () => {
    const monitor = WizardPerformanceMonitor.getInstance();
    const timerId = monitor.startTimer('page_load');
    
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        monitor.endTimer(timerId, true);
      });
    }
    
    return timerId;
  },

  trackFormSubmission: (formName: string) => {
    const monitor = WizardPerformanceMonitor.getInstance();
    return monitor.startTimer('form_submission', { formName });
  },

  trackAPICall: (endpoint: string, method: string = 'GET') => {
    const monitor = WizardPerformanceMonitor.getInstance();
    return monitor.startTimer('api_call', { endpoint, method });
  },

  trackDocumentGeneration: (documentType: string) => {
    const monitor = WizardPerformanceMonitor.getInstance();
    return monitor.startTimer('document_generation', { documentType });
  }
};


