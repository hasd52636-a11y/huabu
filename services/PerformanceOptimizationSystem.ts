/**
 * Performance Optimization System
 * 
 * Provides virtualization, lazy loading, and resource cleanup mechanisms
 * for handling large canvases with 100+ modules efficiently.
 * 
 * Requirements: 8.1, 8.3, 8.6
 */

import { Block } from '../types';

export interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface VirtualizationConfig {
  bufferSize: number; // Extra blocks to render outside viewport
  minBlockSize: number; // Minimum block size for culling calculations
  maxVisibleBlocks: number; // Maximum blocks to render at once
  enableLazyLoading: boolean; // Enable lazy loading for block content
  enableResourceCleanup: boolean; // Enable automatic resource cleanup
}

export interface PerformanceMetrics {
  visibleBlocks: number;
  totalBlocks: number;
  renderTime: number;
  memoryUsage: number;
  frameRate: number;
  lastUpdate: number;
  cacheHitRate: number;
  networkRequests: number;
}

export interface ResourceCleanupConfig {
  maxIdleTime: number; // Time before cleanup (ms)
  memoryThreshold: number; // Memory usage threshold (MB)
  cleanupInterval: number; // Cleanup check interval (ms)
  maxCacheSize: number; // Maximum cache size (MB)
}

export interface PerformanceRecommendation {
  type: 'warning' | 'info' | 'critical';
  message: string;
  action?: string;
}

export class PerformanceOptimizationSystem {
  private config: VirtualizationConfig;
  private cleanupConfig: ResourceCleanupConfig;
  private metrics: PerformanceMetrics;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private frameRateTimer: NodeJS.Timeout | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private resourceCache = new Map<string, { data: any; timestamp: number; size: number }>();
  private performanceHistory: PerformanceMetrics[] = [];

  constructor(
    config: Partial<VirtualizationConfig> = {},
    cleanupConfig: Partial<ResourceCleanupConfig> = {}
  ) {
    this.config = {
      bufferSize: 200, // 200px buffer around viewport
      minBlockSize: 50, // Minimum 50px blocks
      maxVisibleBlocks: 100, // Max 100 visible blocks
      enableLazyLoading: true,
      enableResourceCleanup: true,
      ...config
    };

    this.cleanupConfig = {
      maxIdleTime: 300000, // 5 minutes
      memoryThreshold: 100, // 100MB
      cleanupInterval: 60000, // 1 minute
      maxCacheSize: 50, // 50MB
      ...cleanupConfig
    };

    this.metrics = {
      visibleBlocks: 0,
      totalBlocks: 0,
      renderTime: 0,
      memoryUsage: 0,
      frameRate: 0,
      lastUpdate: Date.now(),
      cacheHitRate: 0,
      networkRequests: 0
    };

    this.startPerformanceMonitoring();
    if (this.config.enableResourceCleanup) {
      this.startResourceCleanup();
    }
  }

  /**
   * Calculate viewport bounds based on canvas pan and zoom
   */
  calculateViewportBounds(
    containerWidth: number,
    containerHeight: number,
    pan: { x: number; y: number },
    zoom: number
  ): ViewportBounds {
    // Validate inputs
    if (!isFinite(containerWidth) || !isFinite(containerHeight) || 
        !isFinite(pan.x) || !isFinite(pan.y) || !isFinite(zoom) || zoom <= 0) {
      // Return default viewport for invalid inputs
      return { left: -1000, top: -1000, right: 1000, bottom: 1000 };
    }

    const buffer = this.config.bufferSize;
    
    // Convert screen coordinates to canvas coordinates
    const left = (-pan.x - buffer) / zoom;
    const top = (-pan.y - buffer) / zoom;
    const right = (containerWidth - pan.x + buffer) / zoom;
    const bottom = (containerHeight - pan.y + buffer) / zoom;

    return { left, top, right, bottom };
  }

  /**
   * Filter blocks that are visible in the viewport
   */
  getVisibleBlocks(blocks: Block[], viewport: ViewportBounds): Block[] {
    const startTime = performance.now();
    
    const visibleBlocks = blocks.filter(block => {
      // Check if block intersects with viewport
      const blockLeft = block.x - block.width / 2;
      const blockTop = block.y - block.height / 2;
      const blockRight = block.x + block.width / 2;
      const blockBottom = block.y + block.height / 2;

      const intersects = !(
        blockRight < viewport.left ||
        blockLeft > viewport.right ||
        blockBottom < viewport.top ||
        blockTop > viewport.bottom
      );

      return intersects;
    });

    // Limit to maximum visible blocks for performance
    const limitedBlocks = visibleBlocks.slice(0, this.config.maxVisibleBlocks);

    // Update metrics
    const renderTime = performance.now() - startTime;
    this.updateMetrics({
      visibleBlocks: limitedBlocks.length,
      totalBlocks: blocks.length,
      renderTime
    });

    return limitedBlocks;
  }

  /**
   * Optimize block rendering order for better performance
   */
  optimizeRenderOrder(blocks: Block[], selectedIds: string[] = []): Block[] {
    // Sort blocks by:
    // 1. Selected blocks first (higher priority)
    // 2. Blocks with content (avoid empty blocks)
    // 3. Distance from center (closer blocks first)
    return blocks.sort((a, b) => {
      // Selected blocks have higher priority
      const aSelected = selectedIds.includes(a.id) ? 1 : 0;
      const bSelected = selectedIds.includes(b.id) ? 1 : 0;
      if (aSelected !== bSelected) return bSelected - aSelected;

      // Blocks with content have higher priority
      const aHasContent = a.content ? 1 : 0;
      const bHasContent = b.content ? 1 : 0;
      if (aHasContent !== bHasContent) return bHasContent - aHasContent;

      // Sort by distance from center (0, 0)
      const aDistance = Math.sqrt(a.x * a.x + a.y * a.y);
      const bDistance = Math.sqrt(b.x * b.x + b.y * b.y);
      return aDistance - bDistance;
    });
  }

  /**
   * Implement lazy loading for block content with caching
   */
  shouldLoadBlockContent(block: Block, viewport: ViewportBounds, isSelected: boolean = false): boolean {
    if (!this.config.enableLazyLoading) return true;
    
    // Always load content for selected blocks
    if (isSelected) return true;

    // Check cache first
    const cacheKey = `block-${block.id}`;
    if (this.resourceCache.has(cacheKey)) {
      return true; // Content is cached
    }

    // Check if block is close to viewport center
    const centerX = (viewport.left + viewport.right) / 2;
    const centerY = (viewport.top + viewport.bottom) / 2;
    const distance = Math.sqrt(
      Math.pow(block.x - centerX, 2) + Math.pow(block.y - centerY, 2)
    );

    // Load content for blocks within reasonable distance
    const maxDistance = Math.max(
      viewport.right - viewport.left,
      viewport.bottom - viewport.top
    );

    return distance < maxDistance;
  }

  /**
   * Cache block content for performance
   */
  cacheBlockContent(blockId: string, content: any): void {
    const size = this.estimateContentSize(content);
    const cacheKey = `block-${blockId}`;
    
    this.resourceCache.set(cacheKey, {
      data: content,
      timestamp: Date.now(),
      size
    });

    // Cleanup cache if it exceeds size limit
    this.cleanupCache();
  }

  /**
   * Get cached block content
   */
  getCachedBlockContent(blockId: string): any | null {
    const cacheKey = `block-${blockId}`;
    const cached = this.resourceCache.get(cacheKey);
    
    if (cached) {
      // Update cache hit rate
      this.updateMetrics({ 
        cacheHitRate: this.calculateCacheHitRate() 
      });
      return cached.data;
    }
    
    return null;
  }

  /**
   * Estimate content size for cache management
   */
  private estimateContentSize(content: any): number {
    if (typeof content === 'string') {
      return content.length * 2; // Rough estimate for string size in bytes
    }
    
    try {
      return JSON.stringify(content).length * 2;
    } catch {
      return 1024; // Default 1KB estimate
    }
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    // This would be implemented with proper hit/miss tracking
    return this.resourceCache.size > 0 ? 0.8 : 0; // Placeholder
  }

  /**
   * Clean up cache when it exceeds size limits
   */
  private cleanupCache(): void {
    const maxSizeBytes = this.cleanupConfig.maxCacheSize * 1024 * 1024; // Convert MB to bytes
    let totalSize = 0;
    
    // Calculate total cache size
    for (const [, cached] of this.resourceCache) {
      totalSize += cached.size;
    }
    
    if (totalSize > maxSizeBytes) {
      // Remove oldest entries first
      const entries = Array.from(this.resourceCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      while (totalSize > maxSizeBytes && entries.length > 0) {
        const [key, cached] = entries.shift()!;
        this.resourceCache.delete(key);
        totalSize -= cached.size;
      }
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.frameRateTimer = setInterval(() => {
      const now = performance.now();
      const deltaTime = now - this.lastFrameTime;
      
      if (deltaTime > 0) {
        this.frameCount++;
        if (this.frameCount >= 60) { // Update every 60 frames
          const frameRate = 1000 / (deltaTime / this.frameCount);
          this.updateMetrics({ frameRate });
          this.frameCount = 0;
        }
      }
      
      this.lastFrameTime = now;
    }, 16); // ~60fps monitoring
  }

  /**
   * Start automatic resource cleanup
   */
  private startResourceCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performResourceCleanup();
    }, this.cleanupConfig.cleanupInterval);
  }

  /**
   * Perform resource cleanup
   */
  private performResourceCleanup(): void {
    const now = Date.now();
    const idleTime = now - this.metrics.lastUpdate;

    // Check if cleanup is needed
    if (idleTime > this.cleanupConfig.maxIdleTime || 
        this.metrics.memoryUsage > this.cleanupConfig.memoryThreshold) {
      
      // Clean up unused resources
      this.cleanupUnusedResources();
      
      // Force garbage collection if available
      if (typeof window !== 'undefined' && 'gc' in window) {
        (window as any).gc();
      }
    }
  }

  /**
   * Clean up unused resources
   */
  private cleanupUnusedResources(): void {
    // Clear any cached data that's no longer needed
    // This would be implemented based on specific caching mechanisms
    
    // Update memory usage estimate
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      this.updateMetrics({
        memoryUsage: memory.usedJSHeapSize / (1024 * 1024) // Convert to MB
      });
    }
  }

  /**
   * Update performance metrics with history tracking
   */
  private updateMetrics(updates: Partial<PerformanceMetrics>): void {
    this.metrics = {
      ...this.metrics,
      ...updates,
      lastUpdate: Date.now()
    };

    // Keep performance history (last 100 entries)
    this.performanceHistory.push({ ...this.metrics });
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Get current performance metrics with enhanced data
   */
  getMetrics(): PerformanceMetrics & { 
    detailedMemory?: ReturnType<PerformanceOptimizationSystem['getDetailedMemoryUsage']>;
    autoOptimizationSuggestions?: ReturnType<PerformanceOptimizationSystem['autoOptimize']>;
  } {
    const baseMetrics = { ...this.metrics };
    
    // Add detailed memory information
    const detailedMemory = this.getDetailedMemoryUsage();
    
    // Get auto-optimization suggestions
    const autoOptimizationSuggestions = this.autoOptimize();
    
    return {
      ...baseMetrics,
      detailedMemory,
      autoOptimizationSuggestions
    };
  }

  /**
   * Enhanced memory monitoring with detailed breakdown
   */
  getDetailedMemoryUsage(): {
    total: number;
    used: number;
    available: number;
    cacheSize: number;
    breakdown: {
      blocks: number;
      connections: number;
      cache: number;
      other: number;
    };
  } {
    let totalCacheSize = 0;
    for (const [, cached] of this.resourceCache) {
      totalCacheSize += cached.size;
    }

    // Estimate memory usage breakdown
    const cacheSize = totalCacheSize / (1024 * 1024); // Convert to MB
    
    let memoryInfo = {
      total: 0,
      used: 0,
      available: 0,
      cacheSize,
      breakdown: {
        blocks: this.metrics.totalBlocks * 0.1, // Rough estimate: 0.1MB per block
        connections: 0.05, // Small amount for connections
        cache: cacheSize,
        other: 0
      }
    };

    // Use browser memory API if available
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      memoryInfo.total = memory.totalJSHeapSize / (1024 * 1024);
      memoryInfo.used = memory.usedJSHeapSize / (1024 * 1024);
      memoryInfo.available = (memory.totalJSHeapSize - memory.usedJSHeapSize) / (1024 * 1024);
      memoryInfo.breakdown.other = memoryInfo.used - memoryInfo.breakdown.blocks - memoryInfo.breakdown.connections - memoryInfo.breakdown.cache;
    }

    return memoryInfo;
  }

  /**
   * Perform aggressive memory cleanup
   */
  performAggressiveCleanup(): void {
    // Clear all cached resources
    this.resourceCache.clear();
    
    // Clear performance history except recent entries
    if (this.performanceHistory.length > 10) {
      this.performanceHistory = this.performanceHistory.slice(-10);
    }
    
    // Force garbage collection if available
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch (e) {
        console.warn('Garbage collection not available');
      }
    }
    
    // Update metrics
    this.updateMetrics({
      memoryUsage: this.getDetailedMemoryUsage().used,
      lastUpdate: Date.now()
    });
  }

  /**
   * Auto-optimize performance based on current conditions
   */
  autoOptimize(): {
    actions: string[];
    improvements: string[];
  } {
    const actions: string[] = [];
    const improvements: string[] = [];
    const metrics = this.metrics;

    // Auto-enable virtualization for large canvases
    if (metrics.totalBlocks > 50 && !this.config.enableLazyLoading) {
      this.config.enableLazyLoading = true;
      actions.push('Enabled lazy loading');
      improvements.push('Reduced memory usage');
    }

    // Reduce buffer size if memory is high
    if (metrics.memoryUsage > 100 && this.config.bufferSize > 100) {
      this.config.bufferSize = Math.max(50, this.config.bufferSize * 0.7);
      actions.push('Reduced viewport buffer');
      improvements.push('Lower memory footprint');
    }

    // Enable aggressive cleanup if memory is critical
    if (metrics.memoryUsage > 150) {
      this.performAggressiveCleanup();
      actions.push('Performed memory cleanup');
      improvements.push('Freed unused resources');
    }

    // Reduce max visible blocks if performance is poor
    if (metrics.frameRate < 20 && this.config.maxVisibleBlocks > 50) {
      this.config.maxVisibleBlocks = Math.max(25, this.config.maxVisibleBlocks * 0.8);
      actions.push('Reduced visible block limit');
      improvements.push('Improved frame rate');
    }

    return { actions, improvements };
  }

  /**
   * Get performance recommendations with enhanced analysis
   */
  getOptimizationRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    const metrics = this.metrics;

    if (metrics.visibleBlocks > 50) {
      recommendations.push({
        type: 'warning',
        message: 'High number of visible blocks detected',
        action: 'Consider reducing zoom level or enabling virtualization'
      });
    }

    if (metrics.frameRate < 30) {
      recommendations.push({
        type: 'critical',
        message: 'Low frame rate detected',
        action: 'Enable performance mode or reduce visual effects'
      });
    }

    if (metrics.memoryUsage > 100) {
      recommendations.push({
        type: 'critical',
        message: 'High memory usage detected',
        action: 'Clear unused content or restart the application'
      });
    } else if (metrics.memoryUsage > 50) {
      recommendations.push({
        type: 'warning',
        message: 'Moderate memory usage',
        action: 'Consider enabling resource cleanup'
      });
    }

    if (metrics.renderTime > 16) {
      recommendations.push({
        type: 'warning',
        message: 'Slow rendering detected',
        action: 'Enable virtualization or reduce block complexity'
      });
    }

    if (metrics.cacheHitRate < 0.5 && this.resourceCache.size > 0) {
      recommendations.push({
        type: 'info',
        message: 'Low cache hit rate',
        action: 'Consider adjusting cache settings'
      });
    }

    if (metrics.totalBlocks > 100 && !this.config.enableLazyLoading) {
      recommendations.push({
        type: 'info',
        message: 'Large canvas detected',
        action: 'Enable lazy loading for better performance'
      });
    }

    return recommendations;
  }

  /**
   * Get performance history for trend analysis
   */
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<VirtualizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): VirtualizationConfig {
    return { ...this.config };
  }

  /**
   * Cleanup resources when component unmounts
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.frameRateTimer) {
      clearInterval(this.frameRateTimer);
      this.frameRateTimer = null;
    }

    // Clear all cached resources
    this.resourceCache.clear();
    this.performanceHistory.length = 0;
  }
}

// Export singleton instance
export const performanceOptimizationSystem = new PerformanceOptimizationSystem();