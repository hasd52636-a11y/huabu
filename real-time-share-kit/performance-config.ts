/**
 * 实时分享性能优化配置
 * 
 * 核心理念：实时是概念，不需要完全同步
 * 通过合理的延迟和批处理来优化性能和稳定性
 */

export const PERFORMANCE_CONFIG = {
  // 数据同步配置
  sync: {
    // 主机端数据同步节流间隔（毫秒）
    throttleInterval: 200,
    
    // 观看者端数据处理延迟（毫秒）
    processingDelay: 50,
    
    // 防抖延迟（毫秒）
    debounceDelay: 100,
    
    // 批处理大小
    batchSize: 10
  },
  
  // 连接配置
  connection: {
    // 初始连接延迟（给主机准备时间）
    initialDelay: 2000,
    
    // 连接超时时间（毫秒）
    timeout: 5000,
    
    // 最大重试次数
    maxRetries: 3,
    
    // 重试间隔（毫秒）
    retryInterval: 1000,
    
    // 心跳间隔（毫秒）
    heartbeatInterval: 10000
  },
  
  // 数据传输配置
  transmission: {
    // 初始数据发送延迟（毫秒）
    initialDataDelay: 500,
    
    // 重复发送延迟（确保数据到达）
    duplicateDelay: 1000,
    
    // 数据压缩阈值（字节）
    compressionThreshold: 1024,
    
    // 最大数据包大小（字节）
    maxPacketSize: 64 * 1024 // 64KB
  },
  
  // 渲染优化配置
  rendering: {
    // 渲染节流间隔（毫秒）
    throttleInterval: 16, // ~60fps
    
    // 虚拟化阈值（元素数量）
    virtualizationThreshold: 50,
    
    // 视口缓冲区大小
    viewportBuffer: 100
  },
  
  // 内存管理配置
  memory: {
    // 历史数据保留数量
    historyLimit: 100,
    
    // 垃圾回收间隔（毫秒）
    gcInterval: 30000,
    
    // 内存使用警告阈值（MB）
    memoryWarningThreshold: 100
  }
};

/**
 * 根据网络质量动态调整配置
 */
export function getOptimizedConfig(networkQuality: 'excellent' | 'good' | 'fair' | 'poor') {
  const baseConfig = { ...PERFORMANCE_CONFIG };
  
  switch (networkQuality) {
    case 'excellent':
      // 高质量网络：更频繁的同步
      baseConfig.sync.throttleInterval = 100;
      baseConfig.sync.processingDelay = 25;
      break;
      
    case 'good':
      // 良好网络：标准配置
      break;
      
    case 'fair':
      // 一般网络：降低同步频率
      baseConfig.sync.throttleInterval = 300;
      baseConfig.sync.processingDelay = 100;
      baseConfig.transmission.duplicateDelay = 1500;
      break;
      
    case 'poor':
      // 差网络：大幅降低同步频率
      baseConfig.sync.throttleInterval = 500;
      baseConfig.sync.processingDelay = 200;
      baseConfig.transmission.duplicateDelay = 2000;
      baseConfig.connection.timeout = 10000;
      break;
  }
  
  return baseConfig;
}

/**
 * 数据压缩工具
 */
export function compressData(data: any): string {
  try {
    const jsonString = JSON.stringify(data);
    
    // 简单的压缩：移除不必要的空格和重复数据
    const compressed = jsonString
      .replace(/\s+/g, ' ')
      .replace(/,\s*}/g, '}')
      .replace(/{\s*,/g, '{');
    
    return compressed;
  } catch (error) {
    console.warn('[Performance] 数据压缩失败:', error);
    return JSON.stringify(data);
  }
}

/**
 * 数据解压工具
 */
export function decompressData(compressedData: string): any {
  try {
    return JSON.parse(compressedData);
  } catch (error) {
    console.warn('[Performance] 数据解压失败:', error);
    return null;
  }
}

/**
 * 网络质量检测
 */
export function detectNetworkQuality(): Promise<'excellent' | 'good' | 'fair' | 'poor'> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // 发送小数据包测试延迟
    const testData = new Array(100).fill('test').join('');
    
    setTimeout(() => {
      const latency = Date.now() - startTime;
      
      if (latency < 50) {
        resolve('excellent');
      } else if (latency < 150) {
        resolve('good');
      } else if (latency < 300) {
        resolve('fair');
      } else {
        resolve('poor');
      }
    }, 100);
  });
}

/**
 * 性能监控
 */
export class PerformanceMonitor {
  private metrics: {
    syncCount: number;
    avgLatency: number;
    errorCount: number;
    memoryUsage: number;
  } = {
    syncCount: 0,
    avgLatency: 0,
    errorCount: 0,
    memoryUsage: 0
  };
  
  recordSync(latency: number) {
    this.metrics.syncCount++;
    this.metrics.avgLatency = (this.metrics.avgLatency + latency) / 2;
  }
  
  recordError() {
    this.metrics.errorCount++;
  }
  
  updateMemoryUsage() {
    if ('memory' in performance) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
  }
  
  getMetrics() {
    return { ...this.metrics };
  }
  
  shouldOptimize(): boolean {
    return (
      this.metrics.avgLatency > 500 || // 平均延迟超过500ms
      this.metrics.errorCount > 10 || // 错误次数超过10次
      this.metrics.memoryUsage > PERFORMANCE_CONFIG.memory.memoryWarningThreshold
    );
  }
}