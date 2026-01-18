/**
 * Supporting classes for Enhanced Batch Processor
 * 
 * These classes provide the infrastructure for advanced batch processing
 * capabilities including rate limiting, resource monitoring, and predictive analytics.
 */

import { ProcessingQueueItem, RateLimitConfig } from './BatchProcessor';

/**
 * Rate limiter for API providers
 * Implements Requirement 7.2 - respecting API rate limits
 */
export class RateLimiter {
  private requests: number[] = [];
  private lastRequestTime = 0;
  
  constructor(private config: RateLimitConfig) {}
  
  async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Clean old requests (older than 1 minute)
    this.requests = this.requests.filter(time => now - time < 60000);
    
    // Check requests per minute limit
    if (this.requests.length >= this.config.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest);
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
    }
    
    // Check requests per second limit
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.config.requestsPerSecond;
    
    if (timeSinceLastRequest < minInterval) {
      await this.sleep(minInterval - timeSinceLastRequest);
    }
    
    // Record this request
    this.requests.push(Date.now());
    this.lastRequestTime = Date.now();
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  getCurrentUsage(): {
    requestsInLastMinute: number;
    requestsInLastSecond: number;
    utilizationPercent: number;
  } {
    const now = Date.now();
    const requestsInLastMinute = this.requests.filter(time => now - time < 60000).length;
    const requestsInLastSecond = this.requests.filter(time => now - time < 1000).length;
    
    return {
      requestsInLastMinute,
      requestsInLastSecond,
      utilizationPercent: (requestsInLastMinute / this.config.requestsPerMinute) * 100
    };
  }
}

/**
 * Resource monitor for system performance tracking
 * Implements resource constraint monitoring (Requirement 7.2)
 */
export class ResourceMonitor {
  private startTime = 0;
  private memoryBaseline = 0;
  private cpuSamples: number[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  
  startMonitoring(): void {
    this.startTime = Date.now();
    this.memoryBaseline = this.getMemoryUsage();
    this.isMonitoring = true;
    
    // Sample CPU usage every second
    this.monitoringInterval = setInterval(() => {
      this.cpuSamples.push(this.getCpuUsage());
      // Keep only last 60 samples (1 minute)
      if (this.cpuSamples.length > 60) {
        this.cpuSamples.shift();
      }
    }, 1000);
  }
  
  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
  
  getCurrentMetrics(): {
    memoryMB: number;
    cpuPercent: number;
    activeConnections: number;
  } {
    return {
      memoryMB: this.getMemoryUsage(),
      cpuPercent: this.getAverageCpuUsage(),
      activeConnections: this.getActiveConnections()
    };
  }
  
  private getMemoryUsage(): number {
    // In a real implementation, this would use process.memoryUsage()
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    return Math.random() * 100; // Mock value for browser environment
  }
  
  private getCpuUsage(): number {
    // In a real implementation, this would use process.cpuUsage()
    return Math.random() * 100; // Mock value
  }
  
  private getAverageCpuUsage(): number {
    if (this.cpuSamples.length === 0) return 0;
    return this.cpuSamples.reduce((sum, sample) => sum + sample, 0) / this.cpuSamples.length;
  }
  
  private getActiveConnections(): number {
    // Mock implementation - in real scenario would track actual connections
    return Math.floor(Math.random() * 10);
  }
  
  isResourceConstrained(thresholds: {
    memoryThreshold: number;
    cpuThreshold: number;
    connectionThreshold: number;
  }): boolean {
    const metrics = this.getCurrentMetrics();
    
    return (
      metrics.memoryMB > thresholds.memoryThreshold ||
      metrics.cpuPercent > thresholds.cpuThreshold ||
      metrics.activeConnections > thresholds.connectionThreshold
    );
  }
}

/**
 * Performance metrics collector and analyzer
 */
export class PerformanceMetrics {
  private metrics: {
    timestamp: number;
    throughput: number;
    errorRate: number;
    averageResponseTime: number;
    resourceUsage: any;
  }[] = [];
  
  recordMetric(
    throughput: number,
    errorRate: number,
    averageResponseTime: number,
    resourceUsage: any
  ): void {
    this.metrics.push({
      timestamp: Date.now(),
      throughput,
      errorRate,
      averageResponseTime,
      resourceUsage
    });
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
  }
  
  getRecentTrends(timeWindowMs: number = 300000): {
    throughputTrend: 'increasing' | 'decreasing' | 'stable';
    errorRateTrend: 'increasing' | 'decreasing' | 'stable';
    performanceTrend: 'improving' | 'degrading' | 'stable';
  } {
    const cutoff = Date.now() - timeWindowMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    if (recentMetrics.length < 2) {
      return {
        throughputTrend: 'stable',
        errorRateTrend: 'stable',
        performanceTrend: 'stable'
      };
    }
    
    const firstHalf = recentMetrics.slice(0, Math.floor(recentMetrics.length / 2));
    const secondHalf = recentMetrics.slice(Math.floor(recentMetrics.length / 2));
    
    const avgThroughputFirst = firstHalf.reduce((sum, m) => sum + m.throughput, 0) / firstHalf.length;
    const avgThroughputSecond = secondHalf.reduce((sum, m) => sum + m.throughput, 0) / secondHalf.length;
    
    const avgErrorRateFirst = firstHalf.reduce((sum, m) => sum + m.errorRate, 0) / firstHalf.length;
    const avgErrorRateSecond = secondHalf.reduce((sum, m) => sum + m.errorRate, 0) / secondHalf.length;
    
    const avgResponseTimeFirst = firstHalf.reduce((sum, m) => sum + m.averageResponseTime, 0) / firstHalf.length;
    const avgResponseTimeSecond = secondHalf.reduce((sum, m) => sum + m.averageResponseTime, 0) / secondHalf.length;
    
    return {
      throughputTrend: this.getTrend(avgThroughputFirst, avgThroughputSecond),
      errorRateTrend: this.getTrend(avgErrorRateFirst, avgErrorRateSecond),
      performanceTrend: this.getTrend(avgResponseTimeSecond, avgResponseTimeFirst) // Inverted for performance
    };
  }
  
  private getTrend(first: number, second: number): 'increasing' | 'decreasing' | 'stable' {
    const threshold = 0.1; // 10% change threshold
    const change = (second - first) / first;
    
    if (change > threshold) return 'increasing';
    if (change < -threshold) return 'decreasing';
    return 'stable';
  }
}

/**
 * Processing worker for parallel execution
 */
export class ProcessingWorker {
  private isActive = false;
  private currentItem?: ProcessingQueueItem;
  
  constructor(
    private workerId: number,
    private rateLimiters: Map<string, RateLimiter>,
    private resourceMonitor: ResourceMonitor
  ) {}
  
  async processItem(
    item: ProcessingQueueItem,
    processingFunction: (item: ProcessingQueueItem) => Promise<any>
  ): Promise<void> {
    this.isActive = true;
    this.currentItem = item;
    
    try {
      await processingFunction(item);
    } finally {
      this.isActive = false;
      this.currentItem = undefined;
    }
  }
  
  isWorkerActive(): boolean {
    return this.isActive;
  }
  
  getCurrentItem(): ProcessingQueueItem | undefined {
    return this.currentItem;
  }
  
  getWorkerId(): number {
    return this.workerId;
  }
}

/**
 * Completion time predictor using historical data and machine learning-like algorithms
 * Implements estimated completion times (Requirement 3.4)
 */
export class CompletionTimePredictor {
  private historicalData: {
    itemCount: number;
    processingTime: number;
    workerCount: number;
    complexity: string;
    timestamp: number;
  }[] = [];
  
  recordCompletion(
    itemCount: number,
    processingTime: number,
    workerCount: number,
    complexity: string
  ): void {
    this.historicalData.push({
      itemCount,
      processingTime,
      workerCount,
      complexity,
      timestamp: Date.now()
    });
    
    // Keep only last 100 records
    if (this.historicalData.length > 100) {
      this.historicalData.shift();
    }
  }
  
  predictCompletionTime(
    remainingItems: ProcessingQueueItem[],
    averageProcessingTime: number,
    currentThroughput: number,
    activeWorkers: number
  ): number {
    if (remainingItems.length === 0) return 0;
    
    // Use multiple prediction methods and average them
    const predictions = [
      this.predictByAverageTime(remainingItems, averageProcessingTime, activeWorkers),
      this.predictByThroughput(remainingItems, currentThroughput),
      this.predictByHistoricalData(remainingItems, activeWorkers),
      this.predictByComplexity(remainingItems, activeWorkers)
    ].filter(p => p > 0);
    
    if (predictions.length === 0) {
      // Fallback prediction
      return remainingItems.length * 30000; // 30 seconds per item
    }
    
    // Return weighted average with more weight on recent methods
    const weights = [0.3, 0.3, 0.2, 0.2];
    const weightedSum = predictions.reduce((sum, pred, index) => 
      sum + pred * (weights[index] || 0.25), 0
    );
    
    return Math.round(weightedSum / predictions.length);
  }
  
  private predictByAverageTime(
    items: ProcessingQueueItem[],
    averageTime: number,
    workers: number
  ): number {
    if (averageTime <= 0) return 0;
    
    const totalTime = items.reduce((sum, item) => 
      sum + (item.resourceRequirements?.expectedDuration || averageTime), 0
    );
    
    return Math.max(workers, 1) > 1 ? totalTime / workers : totalTime;
  }
  
  private predictByThroughput(items: ProcessingQueueItem[], throughput: number): number {
    if (throughput <= 0) return 0;
    
    // Throughput is items per minute, convert to milliseconds
    const itemsPerMs = throughput / 60000;
    return items.length / itemsPerMs;
  }
  
  private predictByHistoricalData(items: ProcessingQueueItem[], workers: number): number {
    if (this.historicalData.length < 3) return 0;
    
    // Find similar historical scenarios
    const similarScenarios = this.historicalData.filter(data => 
      Math.abs(data.itemCount - items.length) <= items.length * 0.3 &&
      Math.abs(data.workerCount - workers) <= 2
    );
    
    if (similarScenarios.length === 0) return 0;
    
    const avgTime = similarScenarios.reduce((sum, scenario) => 
      sum + scenario.processingTime, 0
    ) / similarScenarios.length;
    
    // Adjust for current item count
    const ratio = items.length / (similarScenarios[0]?.itemCount || 1);
    return avgTime * ratio;
  }
  
  private predictByComplexity(items: ProcessingQueueItem[], workers: number): number {
    const complexityWeights = {
      low: 1,
      medium: 2,
      high: 4
    };
    
    const totalComplexity = items.reduce((sum, item) => {
      const complexity = item.resourceRequirements?.processingComplexity || 'medium';
      return sum + complexityWeights[complexity];
    }, 0);
    
    // Base time per complexity unit (in milliseconds)
    const baseTimePerUnit = 15000; // 15 seconds
    
    const totalTime = totalComplexity * baseTimePerUnit;
    return Math.max(workers, 1) > 1 ? totalTime / workers : totalTime;
  }
}

/**
 * Processing history entry for analytics
 */
export interface ProcessingHistoryEntry {
  itemId: string;
  startTime: number;
  endTime: number;
  processingTime: number;
  success: boolean;
  errorMessage?: string;
  retryCount: number;
  resourceUsage: {
    memoryMB: number;
    cpuPercent: number;
  };
  metadata: Record<string, any>;
}