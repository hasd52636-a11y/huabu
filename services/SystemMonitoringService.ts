/**
 * System Monitoring and Analytics Service
 * 
 * Provides comprehensive system health monitoring, user analytics,
 * and automated alerting capabilities for the Canvas platform.
 * 
 * Requirements: 6.5, 8.6
 */

export interface SystemHealthMetrics {
  timestamp: number;
  cpu: {
    usage: number; // 0-100%
    temperature?: number; // Celsius
  };
  memory: {
    used: number; // bytes
    total: number; // bytes
    percentage: number; // 0-100%
  };
  network: {
    latency: number; // ms
    bandwidth: number; // bytes/sec
    errors: number;
  };
  storage: {
    used: number; // bytes
    available: number; // bytes
    percentage: number; // 0-100%
  };
  services: {
    aiAdapter: 'healthy' | 'degraded' | 'down';
    batchProcessor: 'healthy' | 'degraded' | 'down';
    exportService: 'healthy' | 'degraded' | 'down';
    canvas: 'healthy' | 'degraded' | 'down';
  };
}

export interface UserAnalytics {
  sessionId: string;
  userId?: string;
  timestamp: number;
  event: string;
  category: 'feature_usage' | 'performance' | 'error' | 'navigation' | 'content_creation' | 'api_usage' | 'model_usage' | 'token_usage';
  data: Record<string, any>;
  duration?: number; // ms
}

export interface SystemAlert {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'performance' | 'service' | 'security' | 'resource';
  title: string;
  message: string;
  source: string;
  resolved: boolean;
  resolvedAt?: number;
  metadata: Record<string, any>;
}

export interface FeatureUsageStats {
  featureId: string;
  featureName: string;
  usageCount: number;
  totalDuration: number; // ms
  averageDuration: number; // ms
  errorCount: number;
  successRate: number; // 0-1
  lastUsed: number;
  popularityScore: number; // 0-1
}

export interface APIUsageStats {
  endpoint: string;
  provider: string; // 'gemini', 'openai', 'shenma', etc.
  usageCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number; // estimated cost
  averageLatency: number; // ms
  errorCount: number;
  successRate: number;
  lastUsed: number;
  dailyUsage: { date: string; count: number; tokens: number }[];
}

export interface ModelUsageStats {
  modelId: string;
  modelName: string;
  provider: string;
  usageCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  averageLatency: number;
  errorCount: number;
  successRate: number;
  lastUsed: number;
  contentTypes: { type: string; count: number }[]; // 'text', 'image', 'video'
}

export interface SessionStats {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration: number; // ms
  activeTime: number; // actual active time (excluding idle)
  pageViews: number;
  featuresUsed: string[];
  apiCalls: number;
  tokensConsumed: number;
  userAgent: string;
  ipHash?: string; // hashed for privacy
}

export interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  uptime: number; // ms
  lastHealthCheck: number;
  activeAlerts: number;
  resolvedAlerts: number;
  systemLoad: number; // 0-1
}

export interface BackendConfig {
  enabled: boolean;
  endpoint: string;
  apiKey?: string;
  uploadInterval: number; // ms
  batchSize: number;
  retryAttempts: number;
  includePersonalData: boolean;
}

export interface DataRetentionPolicy {
  healthMetrics: number; // days
  userAnalytics: number; // days
  systemAlerts: number; // days
  featureUsage: number; // days
  apiUsage: number; // days
  modelUsage: number; // days
  sessionStats: number; // days
  maxRecordsPerCategory: number;
}

export interface AdminEndpointConfig {
  healthMetrics: string;
  userAnalytics: string;
  systemAlerts: string;
  featureUsage: string;
  apiUsage: string;
  modelUsage: string;
  sessionStats: string;
  systemStatus: string;
  exportData: string;
}

export interface ComprehensiveLogging {
  level: 'debug' | 'info' | 'warn' | 'error';
  categories: string[];
  includeStackTrace: boolean;
  maxLogSize: number; // bytes
  rotationInterval: number; // ms
}

export interface AnalyticsUploadPayload {
  sessionId: string;
  userId?: string;
  timestamp: number;
  appVersion?: string;
  userAgent: string;
  healthMetrics: SystemHealthMetrics[];
  userAnalytics: UserAnalytics[];
  systemAlerts: SystemAlert[];
  featureUsage: FeatureUsageStats[];
  systemStatus: SystemStatus;
  metadata: {
    uploadReason: 'scheduled' | 'manual' | 'alert' | 'session_end';
    dataRange: {
      startTime: number;
      endTime: number;
    };
  };
}

class SystemMonitoringService {
  private static instance: SystemMonitoringService;
  private healthMetrics: SystemHealthMetrics[] = [];
  private userAnalytics: UserAnalytics[] = [];
  private systemAlerts: SystemAlert[] = [];
  private featureUsage: Map<string, FeatureUsageStats> = new Map();
  private apiUsage: Map<string, APIUsageStats> = new Map();
  private modelUsage: Map<string, ModelUsageStats> = new Map();
  private sessionStats: Map<string, SessionStats> = new Map();
  private currentSession: SessionStats;
  private lastActivityTime: number = Date.now();
  private idleThreshold: number = 30000; // 30 seconds idle threshold
  private monitoringInterval: NodeJS.Timeout | null = null;
  private activityInterval: NodeJS.Timeout | null = null;
  private alertThresholds: Record<string, any> = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    latency: { warning: 1000, critical: 3000 },
    errorRate: { warning: 0.05, critical: 0.1 }
  };
  private sessionId: string;
  private startTime: number;
  private backendConfig: BackendConfig = {
    enabled: false,
    endpoint: '/api/analytics',
    uploadInterval: 300000, // 5 minutes
    batchSize: 100,
    retryAttempts: 3,
    includePersonalData: false
  };
  private dataRetentionPolicy: DataRetentionPolicy = {
    healthMetrics: 7, // 7 days
    userAnalytics: 30, // 30 days
    systemAlerts: 90, // 90 days
    featureUsage: 365, // 1 year
    apiUsage: 365, // 1 year
    modelUsage: 365, // 1 year
    sessionStats: 30, // 30 days
    maxRecordsPerCategory: 10000
  };
  private adminEndpoints: AdminEndpointConfig = {
    healthMetrics: '/api/admin/health-metrics',
    userAnalytics: '/api/admin/user-analytics',
    systemAlerts: '/api/admin/system-alerts',
    featureUsage: '/api/admin/feature-usage',
    apiUsage: '/api/admin/api-usage',
    modelUsage: '/api/admin/model-usage',
    sessionStats: '/api/admin/session-stats',
    systemStatus: '/api/admin/system-status',
    exportData: '/api/admin/export'
  };
  private loggingConfig: ComprehensiveLogging = {
    level: 'info',
    categories: ['system', 'user', 'api', 'performance', 'security'],
    includeStackTrace: true,
    maxLogSize: 10 * 1024 * 1024, // 10MB
    rotationInterval: 24 * 60 * 60 * 1000 // 24 hours
  };
  private adminLogs: Array<{
    timestamp: number;
    level: string;
    category: string;
    message: string;
    data?: any;
    stackTrace?: string;
  }> = [];
  private uploadQueue: AnalyticsUploadPayload[] = [];
  private lastUploadTime: number = 0;
  private uploadInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.initializeCurrentSession();
    this.initializeMonitoring();
    this.setupActivityTracking();
  }

  public static getInstance(): SystemMonitoringService {
    if (!SystemMonitoringService.instance) {
      SystemMonitoringService.instance = new SystemMonitoringService();
    }
    return SystemMonitoringService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private initializeCurrentSession(): void {
    this.currentSession = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      duration: 0,
      activeTime: 0,
      pageViews: 1,
      featuresUsed: [],
      apiCalls: 0,
      tokensConsumed: 0,
      userAgent: navigator.userAgent,
      ipHash: this.hashIP()
    };
    this.sessionStats.set(this.sessionId, this.currentSession);
  }

  private hashIP(): string {
    // Simple hash for privacy - in real implementation, use proper hashing
    return btoa(Date.now().toString()).substring(0, 8);
  }

  private setupActivityTracking(): void {
    // Track user activity to calculate active time
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const updateActivity = () => {
      this.lastActivityTime = Date.now();
    };

    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Update active time every second
    this.activityInterval = setInterval(() => {
      const now = Date.now();
      if (now - this.lastActivityTime < this.idleThreshold) {
        this.currentSession.activeTime += 1000;
      }
      this.currentSession.duration = now - this.currentSession.startTime;
    }, 1000);
  }

  private initializeMonitoring(): void {
    // Start periodic health checks
    this.monitoringInterval = setInterval(() => {
      this.collectHealthMetrics();
      this.checkAlertConditions();
      this.cleanupOldData();
    }, 5000); // Every 5 seconds

    // Initialize standardized data collection
    this.initializeStandardizedCollection();

    // Start periodic data upload if enabled
    if (this.backendConfig.enabled) {
      this.startDataUpload();
    }

    // Track initial system startup
    this.trackEvent('system_startup', 'performance', {
      timestamp: this.startTime,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });

    // Upload data when page is about to unload
    window.addEventListener('beforeunload', () => {
      this.uploadDataToBackend('session_end');
    });
  }

  private async collectHealthMetrics(): Promise<void> {
    try {
      const metrics: SystemHealthMetrics = {
        timestamp: Date.now(),
        cpu: await this.getCPUMetrics(),
        memory: this.getMemoryMetrics(),
        network: await this.getNetworkMetrics(),
        storage: this.getStorageMetrics(),
        services: await this.getServiceHealthStatus()
      };

      this.healthMetrics.push(metrics);
      
      // Keep only last 1000 entries (about 1.4 hours at 5s intervals)
      if (this.healthMetrics.length > 1000) {
        this.healthMetrics = this.healthMetrics.slice(-1000);
      }
    } catch (error) {
      console.error('Failed to collect health metrics:', error);
      this.logAdminAction('error', 'performance', 'Metrics Collection Failed', 
        { error: error.message }, error as Error);
    }
  }

  private async getCPUMetrics(): Promise<{ usage: number; temperature?: number }> {
    // Browser-based CPU estimation using performance timing
    const start = performance.now();
    
    // Perform a small computational task to estimate CPU load
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      sum += Math.random();
    }
    
    const duration = performance.now() - start;
    
    // Estimate CPU usage based on task completion time
    // This is a rough approximation - actual CPU monitoring requires native APIs
    const estimatedUsage = Math.min(100, Math.max(0, (duration - 1) * 10));
    
    return {
      usage: estimatedUsage
    };
  }

  private getMemoryMetrics(): { used: number; total: number; percentage: number } {
    // Use performance.memory if available (Chrome)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }
    
    // Fallback estimation
    return {
      used: 50 * 1024 * 1024, // 50MB estimate
      total: 100 * 1024 * 1024, // 100MB estimate
      percentage: 50
    };
  }

  private async getNetworkMetrics(): Promise<{ latency: number; bandwidth: number; errors: number }> {
    try {
      // Measure network latency with a small request
      const start = performance.now();
      await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' });
      const latency = performance.now() - start;
      
      // Get connection info if available
      const connection = (navigator as any).connection;
      const bandwidth = connection ? connection.downlink * 1024 * 1024 / 8 : 1024 * 1024; // Convert Mbps to bytes/sec
      
      return {
        latency,
        bandwidth,
        errors: 0 // Would need to track actual network errors
      };
    } catch (error) {
      return {
        latency: 9999,
        bandwidth: 0,
        errors: 1
      };
    }
  }

  private getStorageMetrics(): { used: number; available: number; percentage: number } {
    // Estimate storage usage (localStorage + sessionStorage)
    let used = 0;
    
    try {
      // Calculate localStorage usage
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length;
        }
      }
      
      // Calculate sessionStorage usage
      for (let key in sessionStorage) {
        if (sessionStorage.hasOwnProperty(key)) {
          used += sessionStorage[key].length;
        }
      }
    } catch (error) {
      // Storage access might be restricted
    }
    
    const estimated_total = 10 * 1024 * 1024; // 10MB estimate for browser storage
    
    return {
      used: used * 2, // Rough estimate including overhead
      available: estimated_total - used,
      percentage: (used / estimated_total) * 100
    };
  }

  private async getServiceHealthStatus(): Promise<SystemHealthMetrics['services']> {
    // Check service health by testing basic functionality
    let services: SystemHealthMetrics['services'] = {
      aiAdapter: 'healthy',
      batchProcessor: 'healthy',
      exportService: 'healthy',
      canvas: 'healthy'
    };

    try {
      // Test canvas rendering
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        services = { ...services, canvas: 'degraded' };
      }
    } catch (error) {
      services = { ...services, canvas: 'down' };
    }

    return services;
  }

  private checkAlertConditions(): void {
    const latestMetrics = this.healthMetrics[this.healthMetrics.length - 1];
    if (!latestMetrics) return;

    // Check CPU usage
    if (latestMetrics.cpu.usage > this.alertThresholds.cpu.critical) {
      this.createAlert('critical', 'performance', 'High CPU Usage', 
        `CPU usage is ${latestMetrics.cpu.usage.toFixed(1)}%`, 'SystemMonitoringService', 
        { cpuUsage: latestMetrics.cpu.usage });
    } else if (latestMetrics.cpu.usage > this.alertThresholds.cpu.warning) {
      this.createAlert('warning', 'performance', 'Elevated CPU Usage', 
        `CPU usage is ${latestMetrics.cpu.usage.toFixed(1)}%`, 'SystemMonitoringService', 
        { cpuUsage: latestMetrics.cpu.usage });
    }

    // Check memory usage
    if (latestMetrics.memory.percentage > this.alertThresholds.memory.critical) {
      this.createAlert('critical', 'resource', 'High Memory Usage', 
        `Memory usage is ${latestMetrics.memory.percentage.toFixed(1)}%`, 'SystemMonitoringService', 
        { memoryUsage: latestMetrics.memory.percentage });
    } else if (latestMetrics.memory.percentage > this.alertThresholds.memory.warning) {
      this.createAlert('warning', 'resource', 'Elevated Memory Usage', 
        `Memory usage is ${latestMetrics.memory.percentage.toFixed(1)}%`, 'SystemMonitoringService', 
        { memoryUsage: latestMetrics.memory.percentage });
    }

    // Check network latency
    if (latestMetrics.network.latency > this.alertThresholds.latency.critical) {
      this.createAlert('critical', 'performance', 'High Network Latency', 
        `Network latency is ${latestMetrics.network.latency.toFixed(0)}ms`, 'SystemMonitoringService', 
        { latency: latestMetrics.network.latency });
    } else if (latestMetrics.network.latency > this.alertThresholds.latency.warning) {
      this.createAlert('warning', 'performance', 'Elevated Network Latency', 
        `Network latency is ${latestMetrics.network.latency.toFixed(0)}ms`, 'SystemMonitoringService', 
        { latency: latestMetrics.network.latency });
    }

    // Check service health
    Object.entries(latestMetrics.services).forEach(([service, status]) => {
      if (status === 'down') {
        this.createAlert('critical', 'service', 'Service Down', 
          `${service} service is not responding`, 'SystemMonitoringService', 
          { service, status });
      } else if (status === 'degraded') {
        this.createAlert('warning', 'service', 'Service Degraded', 
          `${service} service is experiencing issues`, 'SystemMonitoringService', 
          { service, status });
      }
    });
  }

  private createAlert(severity: SystemAlert['severity'], category: SystemAlert['category'], 
                     title: string, message: string, source: string, metadata: Record<string, any>): void {
    // Check if similar alert already exists and is unresolved
    const existingAlert = this.systemAlerts.find(alert => 
      !alert.resolved && 
      alert.title === title && 
      alert.source === source &&
      Date.now() - alert.timestamp < 300000 // Within 5 minutes
    );

    if (existingAlert) {
      // Update existing alert metadata
      existingAlert.metadata = { ...existingAlert.metadata, ...metadata };
      return;
    }

    const alert: SystemAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      severity,
      category,
      title,
      message,
      source,
      resolved: false,
      metadata
    };

    this.systemAlerts.push(alert);
    
    // Auto-resolve info alerts after 1 minute
    if (severity === 'info') {
      setTimeout(() => {
        this.resolveAlert(alert.id);
      }, 60000);
    }

    // Emit alert event for UI notifications
    this.emitAlertEvent(alert);
  }

  private emitAlertEvent(alert: SystemAlert): void {
    // Dispatch custom event for UI components to listen to
    const event = new CustomEvent('systemAlert', { 
      detail: alert 
    });
    window.dispatchEvent(event);
  }

  private cleanupOldData(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up old analytics data
    this.userAnalytics = this.userAnalytics.filter(
      analytics => now - analytics.timestamp < maxAge
    );

    // Clean up resolved alerts older than 24 hours
    this.systemAlerts = this.systemAlerts.filter(
      alert => !alert.resolved || (now - (alert.resolvedAt || alert.timestamp) < maxAge)
    );
  }

  // Public API methods

  public trackEvent(event: string, category: UserAnalytics['category'], 
                   data: Record<string, any>, duration?: number): void {
    const analytics: UserAnalytics = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      event,
      category,
      data,
      duration
    };

    this.userAnalytics.push(analytics);

    // Log for admin analysis
    this.logAdminAction('debug', 'user', `Event tracked: ${event}`, {
      category,
      data,
      duration,
      sessionId: this.sessionId
    });

    // Update feature usage statistics
    if (category === 'feature_usage') {
      this.updateFeatureUsage(event, duration, data.success !== false);
      this.currentSession.featuresUsed.push(event);
    }
  }

  public trackAPIUsage(endpoint: string, provider: string, modelId: string, 
                      tokenUsage: { input: number; output: number; total: number },
                      latency: number, success: boolean, cost?: number): void {
    // Track API usage
    const apiKey = `${provider}:${endpoint}`;
    const existing = this.apiUsage.get(apiKey);
    
    if (existing) {
      existing.usageCount++;
      existing.totalTokens += tokenUsage.total;
      existing.inputTokens += tokenUsage.input;
      existing.outputTokens += tokenUsage.output;
      existing.totalCost += cost || 0;
      existing.averageLatency = (existing.averageLatency * (existing.usageCount - 1) + latency) / existing.usageCount;
      if (!success) existing.errorCount++;
      existing.successRate = (existing.usageCount - existing.errorCount) / existing.usageCount;
      existing.lastUsed = Date.now();
      
      // Update daily usage
      const today = new Date().toISOString().split('T')[0];
      const todayUsage = existing.dailyUsage.find(d => d.date === today);
      if (todayUsage) {
        todayUsage.count++;
        todayUsage.tokens += tokenUsage.total;
      } else {
        existing.dailyUsage.push({ date: today, count: 1, tokens: tokenUsage.total });
        // Keep only last 30 days
        if (existing.dailyUsage.length > 30) {
          existing.dailyUsage = existing.dailyUsage.slice(-30);
        }
      }
    } else {
      const today = new Date().toISOString().split('T')[0];
      this.apiUsage.set(apiKey, {
        endpoint,
        provider,
        usageCount: 1,
        totalTokens: tokenUsage.total,
        inputTokens: tokenUsage.input,
        outputTokens: tokenUsage.output,
        totalCost: cost || 0,
        averageLatency: latency,
        errorCount: success ? 0 : 1,
        successRate: success ? 1 : 0,
        lastUsed: Date.now(),
        dailyUsage: [{ date: today, count: 1, tokens: tokenUsage.total }]
      });
    }

    // Track model usage
    this.trackModelUsage(modelId, provider, tokenUsage, latency, success);
    
    // Update session stats
    this.currentSession.apiCalls++;
    this.currentSession.tokensConsumed += tokenUsage.total;

    // Track as analytics event
    this.trackEvent('api_call', 'api_usage', {
      endpoint,
      provider,
      modelId,
      tokens: tokenUsage.total,
      latency,
      success,
      cost: cost || 0
    }, latency);
  }

  public trackModelUsage(modelId: string, provider: string, 
                        tokenUsage: { input: number; output: number; total: number },
                        latency: number, success: boolean, contentType: string = 'text'): void {
    const existing = this.modelUsage.get(modelId);
    
    if (existing) {
      existing.usageCount++;
      existing.totalTokens += tokenUsage.total;
      existing.inputTokens += tokenUsage.input;
      existing.outputTokens += tokenUsage.output;
      existing.averageLatency = (existing.averageLatency * (existing.usageCount - 1) + latency) / existing.usageCount;
      if (!success) existing.errorCount++;
      existing.successRate = (existing.usageCount - existing.errorCount) / existing.usageCount;
      existing.lastUsed = Date.now();
      
      // Update content types
      const contentTypeEntry = existing.contentTypes.find(ct => ct.type === contentType);
      if (contentTypeEntry) {
        contentTypeEntry.count++;
      } else {
        existing.contentTypes.push({ type: contentType, count: 1 });
      }
    } else {
      this.modelUsage.set(modelId, {
        modelId,
        modelName: this.getModelDisplayName(modelId),
        provider,
        usageCount: 1,
        totalTokens: tokenUsage.total,
        inputTokens: tokenUsage.input,
        outputTokens: tokenUsage.output,
        averageLatency: latency,
        successRate: success ? 1 : 0,
        errorCount: success ? 0 : 1,
        lastUsed: Date.now(),
        contentTypes: [{ type: contentType, count: 1 }]
      });
    }

    // Track as analytics event
    this.trackEvent('model_usage', 'model_usage', {
      modelId,
      provider,
      tokens: tokenUsage.total,
      contentType,
      success
    });
  }

  public trackTokenUsage(operation: string, provider: string, modelId: string,
                        inputTokens: number, outputTokens: number, cost?: number): void {
    const totalTokens = inputTokens + outputTokens;
    
    this.trackEvent('token_usage', 'token_usage', {
      operation,
      provider,
      modelId,
      inputTokens,
      outputTokens,
      totalTokens,
      cost: cost || 0
    });
  }

  private getModelDisplayName(modelId: string): string {
    const modelNames: Record<string, string> = {
      'gpt-4': 'GPT-4',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'gemini-pro': 'Gemini Pro',
      'gemini-pro-vision': 'Gemini Pro Vision',
      'claude-3': 'Claude 3',
      'veo-3': 'Veo 3',
      'veo-3-fast': 'Veo 3 Fast',
      'veo-3-pro': 'Veo 3 Pro',
      'qwen-video': 'Qwen Video'
    };
    return modelNames[modelId] || modelId;
  }

  private updateFeatureUsage(featureId: string, duration: number = 0, success: boolean = true): void {
    const existing = this.featureUsage.get(featureId);
    
    if (existing) {
      existing.usageCount++;
      existing.totalDuration += duration;
      existing.averageDuration = existing.totalDuration / existing.usageCount;
      if (!success) existing.errorCount++;
      existing.successRate = (existing.usageCount - existing.errorCount) / existing.usageCount;
      existing.lastUsed = Date.now();
      existing.popularityScore = this.calculatePopularityScore(existing);
    } else {
      const stats: FeatureUsageStats = {
        featureId,
        featureName: featureId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        usageCount: 1,
        totalDuration: duration,
        averageDuration: duration,
        errorCount: success ? 0 : 1,
        successRate: success ? 1 : 0,
        lastUsed: Date.now(),
        popularityScore: 0.1 // Initial score
      };
      this.featureUsage.set(featureId, stats);
    }
  }

  private calculatePopularityScore(stats: FeatureUsageStats): number {
    const now = Date.now();
    const daysSinceLastUse = (now - stats.lastUsed) / (24 * 60 * 60 * 1000);
    const recencyScore = Math.max(0, 1 - daysSinceLastUse / 30); // Decay over 30 days
    const frequencyScore = Math.min(1, stats.usageCount / 100); // Max at 100 uses
    const reliabilityScore = stats.successRate;
    
    return (recencyScore * 0.4 + frequencyScore * 0.4 + reliabilityScore * 0.2);
  }

  public getSystemStatus(): SystemStatus {
    const now = Date.now();
    const activeAlerts = this.systemAlerts.filter(alert => !alert.resolved);
    const resolvedAlerts = this.systemAlerts.filter(alert => alert.resolved);
    
    // Determine overall system status
    let overall: SystemStatus['overall'] = 'healthy';
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
    const warningAlerts = activeAlerts.filter(alert => alert.severity === 'warning');
    
    if (criticalAlerts.length > 0) {
      overall = 'critical';
    } else if (warningAlerts.length > 2) {
      overall = 'degraded';
    }

    // Calculate system load based on recent metrics
    const recentMetrics = this.healthMetrics.slice(-10);
    const avgCpuUsage = recentMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentMetrics.length || 0;
    const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memory.percentage, 0) / recentMetrics.length || 0;
    const systemLoad = Math.max(avgCpuUsage, avgMemoryUsage) / 100;

    return {
      overall,
      uptime: now - this.startTime,
      lastHealthCheck: this.healthMetrics.length > 0 ? this.healthMetrics[this.healthMetrics.length - 1].timestamp : now,
      activeAlerts: activeAlerts.length,
      resolvedAlerts: resolvedAlerts.length,
      systemLoad
    };
  }

  public getHealthMetrics(limit: number = 100): SystemHealthMetrics[] {
    return this.healthMetrics.slice(-limit);
  }

  public getUserAnalytics(category?: UserAnalytics['category'], limit: number = 1000): UserAnalytics[] {
    let analytics = this.userAnalytics;
    
    if (category) {
      analytics = analytics.filter(a => a.category === category);
    }
    
    return analytics.slice(-limit);
  }

  public getSystemAlerts(resolved?: boolean): SystemAlert[] {
    if (resolved !== undefined) {
      return this.systemAlerts.filter(alert => alert.resolved === resolved);
    }
    return this.systemAlerts;
  }

  public getFeatureUsageStats(): FeatureUsageStats[] {
    return Array.from(this.featureUsage.values())
      .sort((a, b) => b.popularityScore - a.popularityScore);
  }

  public getAPIUsageStats(): APIUsageStats[] {
    return Array.from(this.apiUsage.values())
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  public getModelUsageStats(): ModelUsageStats[] {
    return Array.from(this.modelUsage.values())
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  public getSessionStats(): SessionStats[] {
    // Update current session before returning
    this.currentSession.duration = Date.now() - this.currentSession.startTime;
    return Array.from(this.sessionStats.values())
      .sort((a, b) => b.startTime - a.startTime);
  }

  public getCurrentSessionStats(): SessionStats {
    this.currentSession.duration = Date.now() - this.currentSession.startTime;
    return { ...this.currentSession };
  }

  public getTokenConsumptionSummary(): {
    totalTokens: number;
    totalCost: number;
    byProvider: { provider: string; tokens: number; cost: number }[];
    byModel: { model: string; tokens: number; cost: number }[];
    dailyUsage: { date: string; tokens: number; cost: number }[];
  } {
    let totalTokens = 0;
    let totalCost = 0;
    const byProvider = new Map<string, { tokens: number; cost: number }>();
    const byModel = new Map<string, { tokens: number; cost: number }>();
    const dailyUsage = new Map<string, { tokens: number; cost: number }>();

    // Aggregate from API usage
    this.apiUsage.forEach(api => {
      totalTokens += api.totalTokens;
      totalCost += api.totalCost;

      // By provider
      const providerData = byProvider.get(api.provider) || { tokens: 0, cost: 0 };
      providerData.tokens += api.totalTokens;
      providerData.cost += api.totalCost;
      byProvider.set(api.provider, providerData);

      // Daily usage
      api.dailyUsage.forEach(day => {
        const dayData = dailyUsage.get(day.date) || { tokens: 0, cost: 0 };
        dayData.tokens += day.tokens;
        // Estimate cost based on average cost per token
        const avgCostPerToken = api.totalCost / api.totalTokens || 0;
        dayData.cost += day.tokens * avgCostPerToken;
        dailyUsage.set(day.date, dayData);
      });
    });

    // By model
    this.modelUsage.forEach((model, modelId) => {
      const modelData = byModel.get(modelId) || { tokens: 0, cost: 0 };
      modelData.tokens += model.totalTokens;
      // Estimate cost - would need actual pricing data
      modelData.cost += model.totalTokens * 0.001; // Placeholder cost
      byModel.set(modelId, modelData);
    });

    return {
      totalTokens,
      totalCost,
      byProvider: Array.from(byProvider.entries()).map(([provider, data]) => ({
        provider,
        tokens: data.tokens,
        cost: data.cost
      })),
      byModel: Array.from(byModel.entries()).map(([model, data]) => ({
        model,
        tokens: data.tokens,
        cost: data.cost
      })),
      dailyUsage: Array.from(dailyUsage.entries()).map(([date, data]) => ({
        date,
        tokens: data.tokens,
        cost: data.cost
      })).sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.systemAlerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      return true;
    }
    return false;
  }

  public setAlertThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  public exportAnalytics(): {
    healthMetrics: SystemHealthMetrics[];
    userAnalytics: UserAnalytics[];
    systemAlerts: SystemAlert[];
    featureUsage: FeatureUsageStats[];
    apiUsage: APIUsageStats[];
    modelUsage: ModelUsageStats[];
    sessionStats: SessionStats[];
    tokenSummary: any;
    systemStatus: SystemStatus;
  } {
    return {
      healthMetrics: this.healthMetrics,
      userAnalytics: this.userAnalytics,
      systemAlerts: this.systemAlerts,
      featureUsage: this.getFeatureUsageStats(),
      apiUsage: this.getAPIUsageStats(),
      modelUsage: this.getModelUsageStats(),
      sessionStats: this.getSessionStats(),
      tokenSummary: this.getTokenConsumptionSummary(),
      systemStatus: this.getSystemStatus()
    };
  }

  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }
    
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }
    
    // Mark current session as ended
    this.currentSession.endTime = Date.now();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
    
    // Upload remaining data before destroying
    if (this.backendConfig.enabled && this.uploadQueue.length > 0) {
      this.uploadDataToBackend('session_end');
    }
  }

  // Backend Integration Methods

  public configureBackend(config: Partial<BackendConfig>): void {
    this.backendConfig = { ...this.backendConfig, ...config };
    
    if (this.backendConfig.enabled && !this.uploadInterval) {
      this.startDataUpload();
    } else if (!this.backendConfig.enabled && this.uploadInterval) {
      this.stopDataUpload();
    }
  }

  private startDataUpload(): void {
    if (this.uploadInterval) return;
    
    this.uploadInterval = setInterval(() => {
      this.uploadDataToBackend('scheduled');
    }, this.backendConfig.uploadInterval);
  }

  private stopDataUpload(): void {
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }
  }

  private async uploadDataToBackend(reason: AnalyticsUploadPayload['metadata']['uploadReason']): Promise<void> {
    if (!this.backendConfig.enabled) return;

    try {
      const payload: AnalyticsUploadPayload = {
        sessionId: this.sessionId,
        timestamp: Date.now(),
        appVersion: this.getAppVersion(),
        userAgent: navigator.userAgent,
        healthMetrics: this.healthMetrics.slice(-this.backendConfig.batchSize),
        userAnalytics: this.userAnalytics.slice(-this.backendConfig.batchSize),
        systemAlerts: this.systemAlerts.slice(-50), // Last 50 alerts
        featureUsage: this.getFeatureUsageStats(),
        systemStatus: this.getSystemStatus(),
        metadata: {
          uploadReason: reason,
          dataRange: {
            startTime: this.lastUploadTime || this.startTime,
            endTime: Date.now()
          }
        }
      };

      // Remove personal data if not allowed
      if (!this.backendConfig.includePersonalData) {
        payload.userAnalytics = payload.userAnalytics.map(analytics => ({
          ...analytics,
          userId: undefined,
          data: this.sanitizePersonalData(analytics.data)
        }));
      }

      await this.sendToBackend(payload);
      this.lastUploadTime = Date.now();
      
      console.log(`[SystemMonitoring] Data uploaded successfully (${reason})`);
      
    } catch (error) {
      console.error('[SystemMonitoring] Failed to upload data:', error);
      this.createAlert('warning', 'service', 'Data Upload Failed', 
        'Failed to upload analytics data to backend', 'SystemMonitoringService', 
        { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async sendToBackend(payload: AnalyticsUploadPayload): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.backendConfig.apiKey) {
      headers['Authorization'] = `Bearer ${this.backendConfig.apiKey}`;
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.backendConfig.retryAttempts; attempt++) {
      try {
        const response = await fetch(this.backendConfig.endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.backendConfig.retryAttempts - 1) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError;
  }

  private sanitizePersonalData(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data };
    
    // Remove potentially personal fields
    const personalFields = ['email', 'name', 'phone', 'address', 'ip', 'userId'];
    personalFields.forEach(field => {
      if (field in sanitized) {
        delete sanitized[field];
      }
    });

    // Hash any remaining string values that might be personal
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 50) {
        sanitized[key] = `[HASHED:${this.simpleHash(sanitized[key])}]`;
      }
    });

    return sanitized;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getAppVersion(): string {
    // Try to get version from package.json or environment
    return process.env.REACT_APP_VERSION || '1.0.0';
  }

  // Manual upload trigger
  public async uploadNow(): Promise<void> {
    await this.uploadDataToBackend('manual');
  }

  // Get backend configuration
  public getBackendConfig(): BackendConfig {
    return { ...this.backendConfig };
  }

  // ===== STANDARDIZED DATA COLLECTION BACKEND METHODS =====

  /**
   * Configure data retention policies for admin consumption
   */
  public configureDataRetention(policy: Partial<DataRetentionPolicy>): void {
    this.dataRetentionPolicy = { ...this.dataRetentionPolicy, ...policy };
    this.logAdminAction('info', 'system', 'Data retention policy updated', { policy });
    
    // Trigger immediate cleanup with new policy
    this.performDataRetentionCleanup();
  }

  /**
   * Configure admin API endpoints
   */
  public configureAdminEndpoints(endpoints: Partial<AdminEndpointConfig>): void {
    this.adminEndpoints = { ...this.adminEndpoints, ...endpoints };
    this.logAdminAction('info', 'system', 'Admin endpoints configured', { endpoints });
  }

  /**
   * Configure comprehensive logging for admin analysis
   */
  public configureLogging(config: Partial<ComprehensiveLogging>): void {
    this.loggingConfig = { ...this.loggingConfig, ...config };
    this.logAdminAction('info', 'system', 'Logging configuration updated', { config });
  }

  /**
   * Comprehensive logging method for admin analysis
   */
  private logAdminAction(
    level: 'debug' | 'info' | 'warn' | 'error',
    category: string,
    message: string,
    data?: any,
    error?: Error
  ): void {
    if (!this.loggingConfig.categories.includes(category)) {
      return;
    }

    const logEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      stackTrace: error && this.loggingConfig.includeStackTrace ? error.stack : undefined
    };

    this.adminLogs.push(logEntry);

    // Rotate logs if they exceed max size
    if (this.adminLogs.length > 1000) {
      this.adminLogs = this.adminLogs.slice(-500); // Keep last 500 entries
    }

    // Also log to console for development
    if (level === 'error') {
      console.error(`[${category}] ${message}`, data, error);
    } else if (level === 'warn') {
      console.warn(`[${category}] ${message}`, data);
    } else if (level === 'info') {
      console.info(`[${category}] ${message}`, data);
    } else if (level === 'debug') {
      console.debug(`[${category}] ${message}`, data);
    }
  }

  /**
   * Perform data retention cleanup based on configured policies
   */
  private performDataRetentionCleanup(): void {
    const now = Date.now();
    const policy = this.dataRetentionPolicy;

    try {
      // Clean up health metrics
      const healthCutoff = now - (policy.healthMetrics * 24 * 60 * 60 * 1000);
      const originalHealthCount = this.healthMetrics.length;
      this.healthMetrics = this.healthMetrics.filter(m => m.timestamp > healthCutoff);
      
      // Enforce max records limit
      if (this.healthMetrics.length > policy.maxRecordsPerCategory) {
        this.healthMetrics = this.healthMetrics.slice(-policy.maxRecordsPerCategory);
      }

      // Clean up user analytics
      const analyticsCutoff = now - (policy.userAnalytics * 24 * 60 * 60 * 1000);
      const originalAnalyticsCount = this.userAnalytics.length;
      this.userAnalytics = this.userAnalytics.filter(a => a.timestamp > analyticsCutoff);
      
      if (this.userAnalytics.length > policy.maxRecordsPerCategory) {
        this.userAnalytics = this.userAnalytics.slice(-policy.maxRecordsPerCategory);
      }

      // Clean up system alerts
      const alertsCutoff = now - (policy.systemAlerts * 24 * 60 * 60 * 1000);
      const originalAlertsCount = this.systemAlerts.length;
      this.systemAlerts = this.systemAlerts.filter(a => a.timestamp > alertsCutoff);

      // Clean up session stats
      const sessionsCutoff = now - (policy.sessionStats * 24 * 60 * 60 * 1000);
      const originalSessionsCount = this.sessionStats.size;
      for (const [sessionId, session] of this.sessionStats.entries()) {
        if (session.startTime < sessionsCutoff) {
          this.sessionStats.delete(sessionId);
        }
      }

      // Clean up feature usage (keep recent activity)
      const featureCutoff = now - (policy.featureUsage * 24 * 60 * 60 * 1000);
      for (const [featureId, stats] of this.featureUsage.entries()) {
        if (stats.lastUsed < featureCutoff) {
          this.featureUsage.delete(featureId);
        }
      }

      // Clean up API usage
      const apiCutoff = now - (policy.apiUsage * 24 * 60 * 60 * 1000);
      for (const [endpoint, stats] of this.apiUsage.entries()) {
        if (stats.lastUsed < apiCutoff) {
          this.apiUsage.delete(endpoint);
        }
      }

      // Clean up model usage
      const modelCutoff = now - (policy.modelUsage * 24 * 60 * 60 * 1000);
      for (const [modelId, stats] of this.modelUsage.entries()) {
        if (stats.lastUsed < modelCutoff) {
          this.modelUsage.delete(modelId);
        }
      }

      // Log cleanup results
      this.logAdminAction('info', 'system', 'Data retention cleanup completed', {
        healthMetrics: { before: originalHealthCount, after: this.healthMetrics.length },
        userAnalytics: { before: originalAnalyticsCount, after: this.userAnalytics.length },
        systemAlerts: { before: originalAlertsCount, after: this.systemAlerts.length },
        sessionStats: { before: originalSessionsCount, after: this.sessionStats.size },
        featureUsage: this.featureUsage.size,
        apiUsage: this.apiUsage.size,
        modelUsage: this.modelUsage.size
      });

    } catch (error) {
      this.logAdminAction('error', 'system', 'Data retention cleanup failed', { error }, error as Error);
    }
  }

  /**
   * Get standardized admin endpoint URLs
   */
  public getAdminEndpoints(): AdminEndpointConfig {
    return { ...this.adminEndpoints };
  }

  /**
   * Get admin logs for analysis
   */
  public getAdminLogs(limit?: number): Array<{
    timestamp: number;
    level: string;
    category: string;
    message: string;
    data?: any;
    stackTrace?: string;
  }> {
    const logs = [...this.adminLogs].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? logs.slice(0, limit) : logs;
  }

  /**
   * Get data retention policy status
   */
  public getDataRetentionStatus(): {
    policy: DataRetentionPolicy;
    currentCounts: {
      healthMetrics: number;
      userAnalytics: number;
      systemAlerts: number;
      featureUsage: number;
      apiUsage: number;
      modelUsage: number;
      sessionStats: number;
    };
    lastCleanup: number;
    nextCleanup: number;
  } {
    return {
      policy: { ...this.dataRetentionPolicy },
      currentCounts: {
        healthMetrics: this.healthMetrics.length,
        userAnalytics: this.userAnalytics.length,
        systemAlerts: this.systemAlerts.length,
        featureUsage: this.featureUsage.size,
        apiUsage: this.apiUsage.size,
        modelUsage: this.modelUsage.size,
        sessionStats: this.sessionStats.size
      },
      lastCleanup: Date.now(), // Simplified - would track actual last cleanup time
      nextCleanup: Date.now() + (24 * 60 * 60 * 1000) // Next cleanup in 24 hours
    };
  }

  /**
   * Initialize standardized data collection with cleanup intervals
   */
  private initializeStandardizedCollection(): void {
    // Set up periodic data retention cleanup (daily)
    this.cleanupInterval = setInterval(() => {
      this.performDataRetentionCleanup();
    }, 24 * 60 * 60 * 1000); // Every 24 hours

    // Log system initialization
    this.logAdminAction('info', 'system', 'Standardized data collection initialized', {
      retentionPolicy: this.dataRetentionPolicy,
      adminEndpoints: this.adminEndpoints,
      loggingConfig: this.loggingConfig
    });

    // Perform initial cleanup
    this.performDataRetentionCleanup();
  }

  /**
   * Standardized data export for admin consumption
   */
  public exportStandardizedData(format: 'json' | 'csv' = 'json'): string {
    const exportData = {
      metadata: {
        exportTime: Date.now(),
        dataRetentionPolicy: this.dataRetentionPolicy,
        systemInfo: {
          sessionId: this.sessionId,
          startTime: this.startTime,
          uptime: Date.now() - this.startTime
        }
      },
      healthMetrics: this.healthMetrics,
      userAnalytics: this.userAnalytics,
      systemAlerts: this.systemAlerts,
      featureUsage: Array.from(this.featureUsage.values()),
      apiUsage: Array.from(this.apiUsage.values()),
      modelUsage: Array.from(this.modelUsage.values()),
      sessionStats: Array.from(this.sessionStats.values()),
      adminLogs: this.adminLogs
    };

    if (format === 'csv') {
      // Simplified CSV export - in production, use proper CSV library
      return this.convertToCSV(exportData);
    }

    return JSON.stringify(exportData, null, 2);
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion - in production, use proper CSV library
    let csv = 'Category,Timestamp,Data\n';
    
    // Add health metrics
    data.healthMetrics.forEach((metric: any) => {
      csv += `Health Metrics,${metric.timestamp},"${JSON.stringify(metric)}"\n`;
    });

    // Add user analytics
    data.userAnalytics.forEach((analytic: any) => {
      csv += `User Analytics,${analytic.timestamp},"${JSON.stringify(analytic)}"\n`;
    });

    // Add system alerts
    data.systemAlerts.forEach((alert: any) => {
      csv += `System Alerts,${alert.timestamp},"${JSON.stringify(alert)}"\n`;
    });

    return csv;
  }

  /**
   * Clean shutdown with data preservation
   */
  public shutdown(): void {
    // Clear intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
    }
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Final data upload
    this.uploadDataToBackend('session_end');

    // Log shutdown
    this.logAdminAction('info', 'system', 'System monitoring service shutdown', {
      sessionDuration: Date.now() - this.startTime,
      finalDataCounts: {
        healthMetrics: this.healthMetrics.length,
        userAnalytics: this.userAnalytics.length,
        systemAlerts: this.systemAlerts.length
      }
    });
  }
}

export default SystemMonitoringService;