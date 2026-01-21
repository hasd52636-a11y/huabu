/**
 * Performance Optimizer
 * Provides debouncing, memory cleanup, and layout optimization for tag chip system
 */

export interface PerformanceConfig {
  debounceDelay: number;
  maxCacheSize: number;
  cleanupInterval: number;
  enableVirtualization: boolean;
  batchUpdateThreshold: number;
}

export interface PerformanceMetrics {
  renderTime: number;
  layoutCalculationTime: number;
  eventHandlingTime: number;
  memoryUsage: number;
  cacheHitRate: number;
}

export class PerformanceOptimizer {
  private config: PerformanceConfig;
  private debounceTimers = new Map<string, number>();
  private layoutCache = new Map<string, any>();
  private eventQueue: Array<{ type: string; data: any; timestamp: number }> = [];
  private batchUpdateTimer: number | null = null;
  private cleanupTimer: number | null = null;
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    layoutCalculationTime: 0,
    eventHandlingTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0
  };
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      debounceDelay: 16, // ~60fps
      maxCacheSize: 100,
      cleanupInterval: 30000, // 30 seconds
      enableVirtualization: false,
      batchUpdateThreshold: 10,
      ...config
    };

    this.startCleanupTimer();
  }

  /**
   * Debounce function calls to prevent excessive execution
   */
  public debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay?: number
  ): (...args: Parameters<T>) => void {
    const debounceDelay = delay || this.config.debounceDelay;

    return (...args: Parameters<T>) => {
      // Clear existing timer
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = window.setTimeout(() => {
        const startTime = performance.now();
        func(...args);
        const endTime = performance.now();
        
        // Update metrics
        this.updateEventHandlingTime(endTime - startTime);
        this.debounceTimers.delete(key);
      }, debounceDelay);

      this.debounceTimers.set(key, timer);
    };
  }

  /**
   * Throttle function calls to limit execution frequency
   */
  public throttle<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        const startTime = performance.now();
        func(...args);
        const endTime = performance.now();
        
        this.updateEventHandlingTime(endTime - startTime);
        inThrottle = true;
        
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  /**
   * Cache layout calculations to avoid recalculation
   */
  public cacheLayoutCalculation<T>(
    key: string,
    calculator: () => T,
    dependencies: any[] = []
  ): T {
    // Create cache key with dependencies
    const dependencyHash = this.hashDependencies(dependencies);
    const cacheKey = `${key}:${dependencyHash}`;

    // Check cache
    if (this.layoutCache.has(cacheKey)) {
      this.cacheHits++;
      return this.layoutCache.get(cacheKey);
    }

    // Calculate and cache
    const startTime = performance.now();
    const result = calculator();
    const endTime = performance.now();

    this.updateLayoutCalculationTime(endTime - startTime);
    this.cacheMisses++;

    // Manage cache size
    if (this.layoutCache.size >= this.config.maxCacheSize) {
      this.evictOldestCacheEntry();
    }

    this.layoutCache.set(cacheKey, {
      value: result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Batch DOM updates to minimize reflows
   */
  public batchDOMUpdates(updates: Array<() => void>): void {
    if (updates.length === 0) return;

    const startTime = performance.now();

    // Use requestAnimationFrame for optimal timing
    requestAnimationFrame(() => {
      // Batch all DOM reads first
      const measurements: any[] = [];
      updates.forEach((update, index) => {
        // If update function has a 'measure' property, call it first
        if ((update as any).measure) {
          measurements[index] = (update as any).measure();
        }
      });

      // Then batch all DOM writes
      updates.forEach((update, index) => {
        if ((update as any).apply) {
          (update as any).apply(measurements[index]);
        } else {
          update();
        }
      });

      const endTime = performance.now();
      this.updateRenderTime(endTime - startTime);
    });
  }

  /**
   * Queue events for batch processing
   */
  public queueEvent(type: string, data: any): void {
    this.eventQueue.push({
      type,
      data,
      timestamp: performance.now()
    });

    // Process queue if threshold reached
    if (this.eventQueue.length >= this.config.batchUpdateThreshold) {
      this.processBatchedEvents();
    } else if (!this.batchUpdateTimer) {
      // Set timer for batch processing
      this.batchUpdateTimer = window.setTimeout(() => {
        this.processBatchedEvents();
      }, this.config.debounceDelay);
    }
  }

  /**
   * Process batched events
   */
  private processBatchedEvents(): void {
    if (this.eventQueue.length === 0) return;

    const startTime = performance.now();
    
    // Group events by type
    const eventGroups = new Map<string, any[]>();
    this.eventQueue.forEach(event => {
      if (!eventGroups.has(event.type)) {
        eventGroups.set(event.type, []);
      }
      eventGroups.get(event.type)!.push(event.data);
    });

    // Process each group
    eventGroups.forEach((events, type) => {
      this.processEventGroup(type, events);
    });

    // Clear queue
    this.eventQueue = [];
    
    if (this.batchUpdateTimer) {
      clearTimeout(this.batchUpdateTimer);
      this.batchUpdateTimer = null;
    }

    const endTime = performance.now();
    this.updateEventHandlingTime(endTime - startTime);
  }

  /**
   * Process a group of similar events
   */
  private processEventGroup(type: string, events: any[]): void {
    switch (type) {
      case 'hover':
        // Only process the last hover event
        const lastHover = events[events.length - 1];
        this.dispatchEvent('batchedHover', lastHover);
        break;
        
      case 'resize':
        // Combine all resize events
        const finalSize = events.reduce((acc, event) => ({
          width: event.width || acc.width,
          height: event.height || acc.height
        }), { width: 0, height: 0 });
        this.dispatchEvent('batchedResize', finalSize);
        break;
        
      case 'layout':
        // Process layout changes in order but debounced
        this.dispatchEvent('batchedLayout', events);
        break;
        
      default:
        // Process all events for unknown types
        events.forEach(event => {
          this.dispatchEvent(type, event);
        });
    }
  }

  /**
   * Dispatch processed event
   */
  private dispatchEvent(type: string, data: any): void {
    const event = new CustomEvent(`optimized${type}`, {
      detail: data,
      bubbles: true
    });
    document.dispatchEvent(event);
  }

  /**
   * Optimize layout calculations for large content
   */
  public optimizeLayoutCalculation(
    elements: HTMLElement[],
    calculator: (element: HTMLElement) => any
  ): any[] {
    if (!this.config.enableVirtualization || elements.length < 50) {
      // Use normal calculation for small sets
      return elements.map(calculator);
    }

    // Use virtualization for large sets
    const results: any[] = [];
    const batchSize = 10;
    
    const processBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + batchSize, elements.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        results[i] = calculator(elements[i]);
      }
      
      if (endIndex < elements.length) {
        // Schedule next batch
        requestAnimationFrame(() => processBatch(endIndex));
      }
    };

    processBatch(0);
    return results;
  }

  /**
   * Memory cleanup for hover previews and cached data
   */
  public cleanupMemory(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    // Clean old cache entries
    for (const [key, entry] of this.layoutCache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.layoutCache.delete(key);
      }
    }

    // Clear old debounce timers
    this.debounceTimers.forEach((timer, key) => {
      clearTimeout(timer);
    });
    this.debounceTimers.clear();

    // Clear old events from queue
    this.eventQueue = this.eventQueue.filter(
      event => now - event.timestamp < 1000 // Keep events from last second
    );

    // Update memory usage metric
    this.updateMemoryUsage();
  }

  /**
   * Create hash from dependencies for cache key
   */
  private hashDependencies(dependencies: any[]): string {
    return dependencies
      .map(dep => {
        if (typeof dep === 'object' && dep !== null) {
          return JSON.stringify(dep);
        }
        return String(dep);
      })
      .join('|');
  }

  /**
   * Evict oldest cache entry
   */
  private evictOldestCacheEntry(): void {
    let oldestKey = '';
    let oldestTime = Infinity;

    for (const [key, entry] of this.layoutCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.layoutCache.delete(oldestKey);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = window.setInterval(() => {
      this.cleanupMemory();
    }, this.config.cleanupInterval);
  }

  /**
   * Update performance metrics
   */
  private updateRenderTime(time: number): void {
    this.metrics.renderTime = (this.metrics.renderTime + time) / 2; // Moving average
  }

  private updateLayoutCalculationTime(time: number): void {
    this.metrics.layoutCalculationTime = (this.metrics.layoutCalculationTime + time) / 2;
  }

  private updateEventHandlingTime(time: number): void {
    this.metrics.eventHandlingTime = (this.metrics.eventHandlingTime + time) / 2;
  }

  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    const totalCacheAccess = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = totalCacheAccess > 0 ? this.cacheHits / totalCacheAccess : 0;
    
    return { ...this.metrics };
  }

  /**
   * Reset performance metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      renderTime: 0,
      layoutCalculationTime: 0,
      eventHandlingTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0
    };
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  /**
   * Check if optimization is needed
   */
  public shouldOptimize(elementCount: number, complexity: number = 1): boolean {
    // Optimize if we have many elements or high complexity
    return elementCount > 20 || complexity > 0.5 || this.metrics.renderTime > 16;
  }

  /**
   * Create optimized event handler
   */
  public createOptimizedHandler<T extends (...args: any[]) => any>(
    key: string,
    handler: T,
    options: {
      debounce?: boolean;
      throttle?: boolean;
      delay?: number;
      batch?: boolean;
    } = {}
  ): (...args: Parameters<T>) => void {
    if (options.batch) {
      return (...args: Parameters<T>) => {
        this.queueEvent(key, args);
      };
    }

    if (options.throttle) {
      return this.throttle(key, handler, options.delay || 100);
    }

    if (options.debounce !== false) {
      return this.debounce(key, handler, options.delay);
    }

    return handler;
  }

  /**
   * Cleanup all resources
   */
  public destroy(): void {
    // Clear all timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    if (this.batchUpdateTimer) {
      clearTimeout(this.batchUpdateTimer);
      this.batchUpdateTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Clear caches
    this.layoutCache.clear();
    this.eventQueue = [];

    // Reset metrics
    this.resetMetrics();
  }
}