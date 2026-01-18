// services/PerformanceMonitoringService.ts
// 性能优化和监控服务

export interface PerformanceMetrics {
  characterLoadTime: number;
  characterRenderTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  concurrentRequests: number;
  averageResponseTime: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metrics: PerformanceMetrics = {
    characterLoadTime: 0,
    characterRenderTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    concurrentRequests: 0,
    averageResponseTime: 0
  };
  
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30分钟
  private readonly MAX_CACHE_SIZE = 100;
  private readonly MAX_CONCURRENT_REQUESTS = 5;
  
  private requestQueue: Array<() => Promise<any>> = [];
  private activeRequests = 0;
  private responseTimeHistory: number[] = [];
  private cacheStats = { hits: 0, misses: 0 };

  private constructor() {
    this.startPerformanceMonitoring();
    this.startCacheCleanup();
  }

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * 异步加载角色数据
   */
  async loadCharactersAsync(loadFunction: () => Promise<any[]>): Promise<any[]> {
    const startTime = performance.now();
    
    try {
      // 检查缓存
      const cacheKey = 'characters_all';
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.cacheStats.hits++;
        this.metrics.characterLoadTime = performance.now() - startTime;
        return cached;
      }
      
      this.cacheStats.misses++;
      
      // 使用请求队列限制并发
      const characters = await this.queueRequest(loadFunction);
      
      // 缓存结果
      this.setCache(cacheKey, characters);
      
      this.metrics.characterLoadTime = performance.now() - startTime;
      return characters;
    } catch (error) {
      console.error('[PerformanceMonitoringService] Failed to load characters:', error);
      throw error;
    }
  }

  /**
   * 角色预览图片缓存
   */
  async cacheCharacterPreview(characterId: string, imageUrl: string): Promise<string> {
    const cacheKey = `preview_${characterId}`;
    
    // 检查缓存
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.cacheStats.hits++;
      return cached;
    }
    
    this.cacheStats.misses++;
    
    try {
      // 预加载图片
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const loadPromise = new Promise<string>((resolve, reject) => {
        img.onload = () => {
          try {
            // 创建canvas来缓存图片
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              resolve(imageUrl); // 如果无法创建canvas，返回原始URL
              return;
            }
            
            // 设置合适的尺寸（缩略图）
            const maxSize = 100;
            const ratio = Math.min(maxSize / img.width, maxSize / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            
            // 绘制图片
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // 转换为base64
            const cachedUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(cachedUrl);
          } catch (error) {
            console.warn('[PerformanceMonitoringService] Failed to cache image:', error);
            resolve(imageUrl); // 返回原始URL作为fallback
          }
        };
        
        img.onerror = () => {
          console.warn('[PerformanceMonitoringService] Failed to load image:', imageUrl);
          resolve(imageUrl); // 返回原始URL作为fallback
        };
      });
      
      img.src = imageUrl;
      const cachedUrl = await loadPromise;
      
      // 缓存结果
      this.setCache(cacheKey, cachedUrl);
      
      return cachedUrl;
    } catch (error) {
      console.error('[PerformanceMonitoringService] Error caching preview:', error);
      return imageUrl; // 返回原始URL作为fallback
    }
  }

  /**
   * 并发请求限制
   */
  private async queueRequest<T>(requestFunction: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const executeRequest = async () => {
        if (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
          // 添加到队列
          this.requestQueue.push(executeRequest);
          return;
        }
        
        this.activeRequests++;
        this.metrics.concurrentRequests = this.activeRequests;
        
        const startTime = performance.now();
        
        try {
          const result = await requestFunction();
          const responseTime = performance.now() - startTime;
          
          // 更新响应时间统计
          this.responseTimeHistory.push(responseTime);
          if (this.responseTimeHistory.length > 100) {
            this.responseTimeHistory.shift();
          }
          
          this.updateAverageResponseTime();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          this.metrics.concurrentRequests = this.activeRequests;
          
          // 处理队列中的下一个请求
          if (this.requestQueue.length > 0) {
            const nextRequest = this.requestQueue.shift();
            if (nextRequest) {
              setTimeout(nextRequest, 0);
            }
          }
        }
      };
      
      executeRequest();
    });
  }

  /**
   * 缓存操作
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    // 更新访问统计
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    return entry.data;
  }

  private setCache<T>(key: string, data: T): void {
    // 检查缓存大小限制
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now()
    });
  }

  /**
   * LRU缓存淘汰
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`[PerformanceMonitoringService] Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * 更新平均响应时间
   */
  private updateAverageResponseTime(): void {
    if (this.responseTimeHistory.length === 0) {
      this.metrics.averageResponseTime = 0;
      return;
    }
    
    const sum = this.responseTimeHistory.reduce((acc, time) => acc + time, 0);
    this.metrics.averageResponseTime = sum / this.responseTimeHistory.length;
  }

  /**
   * 更新缓存命中率
   */
  private updateCacheHitRate(): void {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.metrics.cacheHitRate = total > 0 ? (this.cacheStats.hits / total) * 100 : 0;
  }

  /**
   * 监控内存使用情况
   */
  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.metrics.memoryUsage = memInfo.usedJSHeapSize / (1024 * 1024); // MB
    } else {
      // 估算缓存占用的内存
      let estimatedSize = 0;
      for (const entry of this.cache.values()) {
        estimatedSize += JSON.stringify(entry.data).length * 2; // 粗略估算
      }
      this.metrics.memoryUsage = estimatedSize / (1024 * 1024); // MB
    }
  }

  /**
   * 开始性能监控
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updateCacheHitRate();
      this.updateMemoryUsage();
    }, 5000); // 每5秒更新一次
  }

  /**
   * 开始缓存清理
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; hitRate: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hitRate: this.metrics.cacheHitRate,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses
    };
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0 };
    console.log('[PerformanceMonitoringService] Cache cleared');
  }

  /**
   * 预热缓存
   */
  async warmupCache(characters: any[]): Promise<void> {
    console.log('[PerformanceMonitoringService] Warming up cache...');
    
    const promises = characters.slice(0, 20).map(async (character) => {
      if (character.profile_picture_url) {
        try {
          await this.cacheCharacterPreview(character.id, character.profile_picture_url);
        } catch (error) {
          console.warn(`[PerformanceMonitoringService] Failed to warmup cache for ${character.id}:`, error);
        }
      }
    });
    
    await Promise.allSettled(promises);
    console.log('[PerformanceMonitoringService] ✓ Cache warmup completed');
  }

  /**
   * 性能报告
   */
  generatePerformanceReport(): {
    metrics: PerformanceMetrics;
    cacheStats: ReturnType<typeof this.getCacheStats>;
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const cacheStats = this.getCacheStats();
    const recommendations: string[] = [];
    
    // 生成优化建议
    if (metrics.cacheHitRate < 70) {
      recommendations.push('缓存命中率较低，考虑增加缓存时间或预加载常用数据');
    }
    
    if (metrics.averageResponseTime > 1000) {
      recommendations.push('平均响应时间较长，考虑优化API调用或增加并发限制');
    }
    
    if (metrics.memoryUsage > 50) {
      recommendations.push('内存使用量较高，考虑减少缓存大小或清理无用数据');
    }
    
    if (metrics.concurrentRequests >= this.MAX_CONCURRENT_REQUESTS) {
      recommendations.push('并发请求达到上限，考虑增加请求队列处理能力');
    }
    
    return {
      metrics,
      cacheStats,
      recommendations
    };
  }
}

// 创建全局实例
export const performanceMonitoringService = PerformanceMonitoringService.getInstance();
export default PerformanceMonitoringService;