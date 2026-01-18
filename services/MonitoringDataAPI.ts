/**
 * 监控数据API接口
 * 
 * 为后台提供统一的数据获取接口，后台只需要调用这些方法
 * 就能获取到所有监控数据，无需关心具体的监控实现
 */

import SystemMonitoringService from './SystemMonitoringService';
import UnifiedMonitoringConfig from './UnifiedMonitoringConfig';

export interface MonitoringDataSnapshot {
  timestamp: number;
  sessionId: string;
  appVersion: string;
  userAgent: string;
  
  // 系统健康数据
  systemHealth: {
    current: any;
    history: any[];
    alerts: any[];
    status: any;
  };
  
  // 用户行为数据
  userBehavior: {
    analytics: any[];
    featureUsage: any[];
    sessionDuration: number;
    pageViews: number;
  };
  
  // 性能数据
  performance: {
    current: any;
    history: any[];
    benchmarks: any[];
    optimizations: any[];
  };
  
  // 配置信息
  configuration: {
    monitoring: any;
    features: string[];
    settings: any;
  };
  
  // 元数据
  metadata: {
    dataQuality: 'high' | 'medium' | 'low';
    completeness: number; // 0-1
    collectionErrors: string[];
  };
}

export interface DataExportOptions {
  format: 'json' | 'csv' | 'xml';
  timeRange?: {
    start: number;
    end: number;
  };
  includePersonalData: boolean;
  compress: boolean;
  categories: ('health' | 'behavior' | 'performance' | 'config')[];
}

export interface BackendSyncOptions {
  endpoint: string;
  apiKey?: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  retryAttempts: number;
  timeout: number;
}

export class MonitoringDataAPI {
  private static instance: MonitoringDataAPI;
  private systemMonitoring: SystemMonitoringService;
  private config: UnifiedMonitoringConfig;

  private constructor() {
    this.systemMonitoring = SystemMonitoringService.getInstance();
    this.config = UnifiedMonitoringConfig.getInstance();
  }

  public static getInstance(): MonitoringDataAPI {
    if (!MonitoringDataAPI.instance) {
      MonitoringDataAPI.instance = new MonitoringDataAPI();
    }
    return MonitoringDataAPI.instance;
  }

  /**
   * 获取完整的监控数据快照
   * 后台可以调用这个方法获取所有监控数据
   */
  public getDataSnapshot(): MonitoringDataSnapshot {
    const timestamp = Date.now();
    const monitoringConfig = this.config.getConfig();
    
    try {
      // 收集系统健康数据
      const systemHealth = this.collectSystemHealthData();
      
      // 收集用户行为数据
      const userBehavior = this.collectUserBehaviorData();
      
      // 收集性能数据
      const performance = this.collectPerformanceData();
      
      // 收集配置信息
      const configuration = this.collectConfigurationData();
      
      // 评估数据质量
      const metadata = this.assessDataQuality(systemHealth, userBehavior, performance);

      return {
        timestamp,
        sessionId: this.getSessionId(),
        appVersion: this.getAppVersion(),
        userAgent: navigator.userAgent,
        systemHealth,
        userBehavior,
        performance,
        configuration,
        metadata
      };
    } catch (error) {
      console.error('[MonitoringDataAPI] Error creating data snapshot:', error);
      throw new Error(`Failed to create monitoring data snapshot: ${error}`);
    }
  }

  /**
   * 获取实时系统状态
   * 后台可以用于健康检查和告警
   */
  public getRealtimeStatus(): {
    healthy: boolean;
    alerts: any[];
    performance: any;
    lastUpdate: number;
  } {
    const systemStatus = this.systemMonitoring.getSystemStatus();
    const activeAlerts = this.systemMonitoring.getSystemAlerts(false);

    return {
      healthy: systemStatus.overall === 'healthy',
      alerts: activeAlerts,
      performance: {
        responseTime: systemStatus.systemLoad,
        uptime: systemStatus.uptime
      },
      lastUpdate: Date.now()
    };
  }

  /**
   * 导出监控数据
   * 支持多种格式，后台可以定期调用获取数据备份
   */
  public async exportData(options: DataExportOptions): Promise<string | Blob> {
    const snapshot = this.getDataSnapshot();
    
    // 过滤数据类别
    const filteredData = this.filterDataByCategories(snapshot, options.categories);
    
    // 时间范围过滤
    if (options.timeRange) {
      this.filterDataByTimeRange(filteredData, options.timeRange);
    }
    
    // 移除个人数据（如果需要）
    if (!options.includePersonalData) {
      this.sanitizePersonalData(filteredData);
    }

    // 根据格式导出
    switch (options.format) {
      case 'json':
        const jsonData = JSON.stringify(filteredData, null, 2);
        return options.compress ? this.compressData(jsonData) : jsonData;
        
      case 'csv':
        return this.convertToCSV(filteredData);
        
      case 'xml':
        return this.convertToXML(filteredData);
        
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * 同步数据到后台
   * 自动处理重试、错误处理等
   */
  public async syncToBackend(options: BackendSyncOptions): Promise<{
    success: boolean;
    error?: string;
    uploadedBytes: number;
    duration: number;
  }> {
    const startTime = Date.now();
    
    try {
      const snapshot = this.getDataSnapshot();
      const payload = JSON.stringify(snapshot);
      
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      
      if (options.apiKey) {
        headers['Authorization'] = `Bearer ${options.apiKey}`;
      }

      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt < options.retryAttempts; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), options.timeout);
          
          const response = await fetch(options.endpoint, {
            method: options.method,
            headers,
            body: payload,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          return {
            success: true,
            uploadedBytes: payload.length,
            duration: Date.now() - startTime
          };
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          
          if (attempt < options.retryAttempts - 1) {
            // 指数退避
            await new Promise(resolve => 
              setTimeout(resolve, Math.pow(2, attempt) * 1000)
            );
          }
        }
      }
      
      throw lastError;
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        uploadedBytes: 0,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 获取数据统计信息
   * 后台可以用于了解数据收集情况
   */
  public getDataStatistics(): {
    totalRecords: number;
    dataSize: number; // bytes
    oldestRecord: number;
    newestRecord: number;
    categories: {
      health: number;
      behavior: number;
      performance: number;
      alerts: number;
    };
  } {
    const healthMetrics = this.systemMonitoring.getHealthMetrics();
    const userAnalytics = this.systemMonitoring.getUserAnalytics();
    const alerts = this.systemMonitoring.getSystemAlerts();

    const allRecords = [
      ...healthMetrics,
      ...userAnalytics,
      ...alerts
    ];

    const timestamps = allRecords
      .map(record => record.timestamp)
      .filter(ts => typeof ts === 'number');

    return {
      totalRecords: allRecords.length,
      dataSize: JSON.stringify(allRecords).length,
      oldestRecord: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestRecord: timestamps.length > 0 ? Math.max(...timestamps) : 0,
      categories: {
        health: healthMetrics.length,
        behavior: userAnalytics.length,
        performance: 0, // 简化版本暂不包含性能历史
        alerts: alerts.length
      }
    };
  }

  // 私有辅助方法

  private collectSystemHealthData() {
    if (!this.config.getConfig().systemHealth.enabled) {
      return { current: null, history: [], alerts: [], status: null };
    }

    return {
      current: this.systemMonitoring.getHealthMetrics(1)[0] || null,
      history: this.systemMonitoring.getHealthMetrics(100),
      alerts: this.systemMonitoring.getSystemAlerts(),
      status: this.systemMonitoring.getSystemStatus()
    };
  }

  private collectUserBehaviorData() {
    if (!this.config.getConfig().userAnalytics.enabled) {
      return { analytics: [], featureUsage: [], sessionDuration: 0, pageViews: 0 };
    }

    const analytics = this.systemMonitoring.getUserAnalytics();
    const featureUsage = this.systemMonitoring.getFeatureUsageStats();
    
    return {
      analytics,
      featureUsage,
      sessionDuration: Date.now() - (analytics[0]?.timestamp || Date.now()),
      pageViews: analytics.filter(a => a.category === 'navigation').length
    };
  }

  private collectPerformanceData() {
    if (!this.config.getConfig().performance.enabled) {
      return { current: null, history: [], benchmarks: [], optimizations: [] };
    }

    return {
      current: { systemLoad: 0.5, responseTime: 100 }, // 简化的性能数据
      history: [],
      benchmarks: [],
      optimizations: []
    };
  }

  private collectConfigurationData() {
    return {
      monitoring: this.config.getConfig(),
      features: [], // TODO: 从FeatureAssemblySystem获取
      settings: {} // TODO: 从应用设置获取
    };
  }

  private assessDataQuality(systemHealth: any, userBehavior: any, performance: any) {
    const errors: string[] = [];
    let completeness = 1.0;

    // 检查数据完整性
    if (!systemHealth.current) {
      errors.push('Missing current system health data');
      completeness -= 0.3;
    }

    if (userBehavior.analytics.length === 0) {
      errors.push('No user analytics data');
      completeness -= 0.2;
    }

    if (!performance.current) {
      errors.push('Missing current performance data');
      completeness -= 0.3;
    }

    // 确定数据质量等级
    let dataQuality: 'high' | 'medium' | 'low';
    if (completeness >= 0.9 && errors.length === 0) {
      dataQuality = 'high';
    } else if (completeness >= 0.7) {
      dataQuality = 'medium';
    } else {
      dataQuality = 'low';
    }

    return {
      dataQuality,
      completeness: Math.max(0, completeness),
      collectionErrors: errors
    };
  }

  private filterDataByCategories(data: MonitoringDataSnapshot, categories: string[]) {
    const filtered = { ...data };
    
    if (!categories.includes('health')) {
      filtered.systemHealth = { current: null, history: [], alerts: [], status: null };
    }
    
    if (!categories.includes('behavior')) {
      filtered.userBehavior = { analytics: [], featureUsage: [], sessionDuration: 0, pageViews: 0 };
    }
    
    if (!categories.includes('performance')) {
      filtered.performance = { current: null, history: [], benchmarks: [], optimizations: [] };
    }
    
    if (!categories.includes('config')) {
      filtered.configuration = { monitoring: {}, features: [], settings: {} };
    }
    
    return filtered;
  }

  private filterDataByTimeRange(data: any, timeRange: { start: number; end: number }) {
    // TODO: 实现时间范围过滤
  }

  private sanitizePersonalData(data: any) {
    // TODO: 实现个人数据清理
  }

  private compressData(data: string): Blob {
    // TODO: 实现数据压缩
    return new Blob([data], { type: 'application/json' });
  }

  private convertToCSV(data: any): string {
    // TODO: 实现CSV转换
    return '';
  }

  private convertToXML(data: any): string {
    // TODO: 实现XML转换
    return '';
  }

  private getSessionId(): string {
    return this.systemMonitoring.exportAnalytics().systemStatus.toString();
  }

  private getAppVersion(): string {
    return process.env.REACT_APP_VERSION || '1.0.0';
  }
}

export default MonitoringDataAPI;