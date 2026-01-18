/**
 * 统一监控配置系统
 * 
 * 集中管理所有监控功能的开关、频率、数据收集范围等配置
 * 后台只需要调用数据获取接口，不需要管理具体的监控逻辑
 */

export interface MonitoringConfig {
  // 全局开关
  enabled: boolean;
  
  // 系统健康监控
  systemHealth: {
    enabled: boolean;
    interval: number; // ms，监控频率
    metrics: {
      cpu: boolean;
      memory: boolean;
      network: boolean;
      storage: boolean;
      services: boolean;
    };
    alertThresholds: {
      cpu: { warning: number; critical: number };
      memory: { warning: number; critical: number };
      latency: { warning: number; critical: number };
    };
  };
  
  // 用户行为分析
  userAnalytics: {
    enabled: boolean;
    trackPageViews: boolean;
    trackUserInteractions: boolean;
    trackFeatureUsage: boolean;
    trackErrors: boolean;
    anonymizeData: boolean;
  };
  
  // 性能监控
  performance: {
    enabled: boolean;
    trackFPS: boolean;
    trackRenderTime: boolean;
    trackMemoryUsage: boolean;
    trackCacheHitRate: boolean;
    benchmarkInterval: number; // ms
  };
  
  // 数据管理
  dataManagement: {
    maxHistorySize: number; // 最大保留记录数
    cleanupInterval: number; // ms，清理频率
    retentionPeriod: number; // ms，数据保留时间
    compressionEnabled: boolean;
  };
  
  // 后台集成
  backend: {
    enabled: boolean;
    autoUpload: boolean;
    uploadInterval: number; // ms
    endpoint: string;
    apiKey?: string;
    batchSize: number;
    retryAttempts: number;
    includePersonalData: boolean;
  };
  
  // 开发者选项
  developer: {
    debugMode: boolean;
    verboseLogging: boolean;
    exportEnabled: boolean;
    testDataGeneration: boolean;
  };
}

export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  
  systemHealth: {
    enabled: true,
    interval: 5000, // 5秒
    metrics: {
      cpu: true,
      memory: true,
      network: true,
      storage: false, // 默认关闭存储监控
      services: true
    },
    alertThresholds: {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 80, critical: 95 },
      latency: { warning: 1000, critical: 3000 }
    }
  },
  
  userAnalytics: {
    enabled: true,
    trackPageViews: true,
    trackUserInteractions: false, // 默认关闭用户交互跟踪
    trackFeatureUsage: true,
    trackErrors: true,
    anonymizeData: true // 默认匿名化数据
  },
  
  performance: {
    enabled: true,
    trackFPS: true,
    trackRenderTime: true,
    trackMemoryUsage: true,
    trackCacheHitRate: true,
    benchmarkInterval: 10000 // 10秒
  },
  
  dataManagement: {
    maxHistorySize: 1000,
    cleanupInterval: 300000, // 5分钟
    retentionPeriod: 86400000, // 24小时
    compressionEnabled: false
  },
  
  backend: {
    enabled: false, // 默认关闭后台上传
    autoUpload: false,
    uploadInterval: 300000, // 5分钟
    endpoint: '/api/monitoring/data',
    batchSize: 100,
    retryAttempts: 3,
    includePersonalData: false
  },
  
  developer: {
    debugMode: false,
    verboseLogging: false,
    exportEnabled: true,
    testDataGeneration: false
  }
};

export class UnifiedMonitoringConfig {
  private static instance: UnifiedMonitoringConfig;
  private config: MonitoringConfig;
  private configChangeListeners: ((config: MonitoringConfig) => void)[] = [];

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): UnifiedMonitoringConfig {
    if (!UnifiedMonitoringConfig.instance) {
      UnifiedMonitoringConfig.instance = new UnifiedMonitoringConfig();
    }
    return UnifiedMonitoringConfig.instance;
  }

  private loadConfig(): MonitoringConfig {
    try {
      const saved = localStorage.getItem('monitoring_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_MONITORING_CONFIG, ...parsed };
      }
    } catch (error) {
      console.warn('[MonitoringConfig] Failed to load saved config:', error);
    }
    return { ...DEFAULT_MONITORING_CONFIG };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('monitoring_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('[MonitoringConfig] Failed to save config:', error);
    }
  }

  public getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    this.notifyConfigChange();
  }

  public updateSystemHealth(updates: Partial<MonitoringConfig['systemHealth']>): void {
    this.config.systemHealth = { ...this.config.systemHealth, ...updates };
    this.saveConfig();
    this.notifyConfigChange();
  }

  public updateUserAnalytics(updates: Partial<MonitoringConfig['userAnalytics']>): void {
    this.config.userAnalytics = { ...this.config.userAnalytics, ...updates };
    this.saveConfig();
    this.notifyConfigChange();
  }

  public updatePerformance(updates: Partial<MonitoringConfig['performance']>): void {
    this.config.performance = { ...this.config.performance, ...updates };
    this.saveConfig();
    this.notifyConfigChange();
  }

  public updateBackend(updates: Partial<MonitoringConfig['backend']>): void {
    this.config.backend = { ...this.config.backend, ...updates };
    this.saveConfig();
    this.notifyConfigChange();
  }

  public enableBackendIntegration(endpoint: string, apiKey?: string): void {
    this.updateBackend({
      enabled: true,
      autoUpload: true,
      endpoint,
      apiKey
    });
  }

  public disableBackendIntegration(): void {
    this.updateBackend({
      enabled: false,
      autoUpload: false
    });
  }

  // 预设配置模式
  public setPerformanceMode(): void {
    this.updateConfig({
      systemHealth: {
        ...this.config.systemHealth,
        enabled: true,
        interval: 10000, // 降低频率到10秒
        metrics: {
          cpu: true,
          memory: true,
          network: false,
          storage: false,
          services: false
        }
      },
      userAnalytics: {
        ...this.config.userAnalytics,
        enabled: false,
        trackUserInteractions: false
      },
      performance: {
        ...this.config.performance,
        enabled: true,
        benchmarkInterval: 30000 // 降低到30秒
      }
    });
  }

  public setFullMonitoringMode(): void {
    this.updateConfig({
      systemHealth: {
        ...this.config.systemHealth,
        enabled: true,
        interval: 3000, // 提高到3秒
        metrics: {
          cpu: true,
          memory: true,
          network: true,
          storage: true,
          services: true
        }
      },
      userAnalytics: {
        ...this.config.userAnalytics,
        enabled: true,
        trackPageViews: true,
        trackUserInteractions: true,
        trackFeatureUsage: true,
        trackErrors: true
      },
      performance: {
        ...this.config.performance,
        enabled: true,
        trackFPS: true,
        trackRenderTime: true,
        trackMemoryUsage: true,
        trackCacheHitRate: true,
        benchmarkInterval: 5000 // 提高到5秒
      }
    });
  }

  public setMinimalMode(): void {
    this.updateConfig({
      enabled: true,
      systemHealth: {
        ...this.config.systemHealth,
        enabled: true,
        interval: 30000, // 30秒
        metrics: {
          cpu: false,
          memory: true,
          network: false,
          storage: false,
          services: false
        }
      },
      userAnalytics: {
        ...this.config.userAnalytics,
        enabled: false
      },
      performance: {
        ...this.config.performance,
        enabled: false
      }
    });
  }

  public disableAllMonitoring(): void {
    this.updateConfig({
      enabled: false,
      systemHealth: { ...this.config.systemHealth, enabled: false },
      userAnalytics: { ...this.config.userAnalytics, enabled: false },
      performance: { ...this.config.performance, enabled: false },
      backend: { ...this.config.backend, enabled: false }
    });
  }

  // 配置变更监听
  public onConfigChange(listener: (config: MonitoringConfig) => void): void {
    this.configChangeListeners.push(listener);
  }

  public removeConfigChangeListener(listener: (config: MonitoringConfig) => void): void {
    const index = this.configChangeListeners.indexOf(listener);
    if (index > -1) {
      this.configChangeListeners.splice(index, 1);
    }
  }

  private notifyConfigChange(): void {
    this.configChangeListeners.forEach(listener => {
      try {
        listener(this.getConfig());
      } catch (error) {
        console.error('[MonitoringConfig] Error in config change listener:', error);
      }
    });
  }

  // 配置验证
  public validateConfig(config: Partial<MonitoringConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.systemHealth?.interval && config.systemHealth.interval < 1000) {
      errors.push('System health interval must be at least 1000ms');
    }

    if (config.performance?.benchmarkInterval && config.performance.benchmarkInterval < 5000) {
      errors.push('Performance benchmark interval must be at least 5000ms');
    }

    if (config.dataManagement?.maxHistorySize && config.dataManagement.maxHistorySize < 10) {
      errors.push('Max history size must be at least 10');
    }

    if (config.backend?.batchSize && config.backend.batchSize < 1) {
      errors.push('Backend batch size must be at least 1');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // 导出配置
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  // 导入配置
  public importConfig(configJson: string): { success: boolean; error?: string } {
    try {
      const imported = JSON.parse(configJson);
      const validation = this.validateConfig(imported);
      
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid configuration: ${validation.errors.join(', ')}`
        };
      }

      this.config = { ...DEFAULT_MONITORING_CONFIG, ...imported };
      this.saveConfig();
      this.notifyConfigChange();
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid JSON'
      };
    }
  }

  // 重置为默认配置
  public resetToDefault(): void {
    this.config = { ...DEFAULT_MONITORING_CONFIG };
    this.saveConfig();
    this.notifyConfigChange();
  }
}

export default UnifiedMonitoringConfig;