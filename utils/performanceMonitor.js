class PerformanceMonitor {
  constructor() {
    this.metrics = {
      messageLatency: [],
      apiResponseTime: [],
      renderTime: [],
      cacheHits: 0,
      cacheMisses: 0,
    };
    this.maxMetrics = 100; // Keep last 100 measurements
  }

  // Track message send latency
  trackMessageLatency(startTime, endTime, success = true) {
    const latency = endTime - startTime;
    this.metrics.messageLatency.push({
      latency,
      timestamp: Date.now(),
      success
    });

    // Keep only recent measurements
    if (this.metrics.messageLatency.length > this.maxMetrics) {
      this.metrics.messageLatency.shift();
    }

    console.log(`Message latency: ${latency}ms (${success ? 'success' : 'failed'})`);
  }

  // Track API response time
  trackApiResponseTime(operation, startTime, endTime, success = true) {
    const responseTime = endTime - startTime;
    this.metrics.apiResponseTime.push({
      operation,
      responseTime,
      timestamp: Date.now(),
      success
    });

    if (this.metrics.apiResponseTime.length > this.maxMetrics) {
      this.metrics.apiResponseTime.shift();
    }

    console.log(`${operation} API response time: ${responseTime}ms`);
  }

  // Track render performance
  trackRenderTime(component, startTime, endTime) {
    const renderTime = endTime - startTime;
    this.metrics.renderTime.push({
      component,
      renderTime,
      timestamp: Date.now()
    });

    if (this.metrics.renderTime.length > this.maxMetrics) {
      this.metrics.renderTime.shift();
    }
  }

  // Track cache performance
  trackCacheHit() {
    this.metrics.cacheHits++;
  }

  trackCacheMiss() {
    this.metrics.cacheMisses++;
  }

  // Get performance statistics
  getStats() {
    const messageLatencies = this.metrics.messageLatency.map(m => m.latency);
    const apiResponseTimes = this.metrics.apiResponseTime.map(m => m.responseTime);
    const renderTimes = this.metrics.renderTime.map(m => m.renderTime);

    return {
      messageLatency: {
        average: this.calculateAverage(messageLatencies),
        min: Math.min(...messageLatencies),
        max: Math.max(...messageLatencies),
        count: messageLatencies.length
      },
      apiResponseTime: {
        average: this.calculateAverage(apiResponseTimes),
        min: Math.min(...apiResponseTimes),
        max: Math.max(...apiResponseTimes),
        count: apiResponseTimes.length
      },
      renderTime: {
        average: this.calculateAverage(renderTimes),
        min: Math.min(...renderTimes),
        max: Math.max(...renderTimes),
        count: renderTimes.length
      },
      cache: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100
      }
    };
  }

  // Calculate average
  calculateAverage(array) {
    if (array.length === 0) return 0;
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  }

  // Get recent performance trends
  getRecentTrends(minutes = 5) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    
    const recentMessageLatencies = this.metrics.messageLatency
      .filter(m => m.timestamp > cutoff)
      .map(m => m.latency);

    const recentApiResponseTimes = this.metrics.apiResponseTime
      .filter(m => m.timestamp > cutoff)
      .map(m => m.responseTime);

    return {
      recentMessageLatency: this.calculateAverage(recentMessageLatencies),
      recentApiResponseTime: this.calculateAverage(recentApiResponseTimes),
      recentCount: recentMessageLatencies.length
    };
  }

  // Check if performance is degrading
  isPerformanceDegrading() {
    const stats = this.getStats();
    const trends = this.getRecentTrends();

    // Alert if recent latency is significantly higher than average
    const latencyThreshold = stats.messageLatency.average * 1.5;
    const apiThreshold = stats.apiResponseTime.average * 1.5;

    return {
      messageLatencyDegrading: trends.recentMessageLatency > latencyThreshold,
      apiResponseTimeDegrading: trends.recentApiResponseTime > apiThreshold,
      cacheHitRateLow: stats.cache.hitRate < 50
    };
  }

  // Clear old metrics
  clearOldMetrics(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    
    this.metrics.messageLatency = this.metrics.messageLatency
      .filter(m => m.timestamp > cutoff);
    
    this.metrics.apiResponseTime = this.metrics.apiResponseTime
      .filter(m => m.timestamp > cutoff);
    
    this.metrics.renderTime = this.metrics.renderTime
      .filter(m => m.timestamp > cutoff);
  }

  // Reset all metrics
  reset() {
    this.metrics = {
      messageLatency: [],
      apiResponseTime: [],
      renderTime: [],
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  // Export metrics for debugging
  exportMetrics() {
    return {
      metrics: this.metrics,
      stats: this.getStats(),
      trends: this.getRecentTrends(),
      performanceIssues: this.isPerformanceDegrading()
    };
  }
}

// Create a singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor; 