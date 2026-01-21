/**
 * 实时分享系统诊断服务
 * 用于监控和分析分享功能的性能和问题
 */

export interface DiagnosticInfo {
  browserInfo: BrowserInfo;
  networkInfo: NetworkInfo;
  deviceInfo: DeviceInfo;
  errorLog: ErrorLog[];
  performanceLog: PerformanceLog[];
  shareStatus: ShareStatus;
}

export interface BrowserInfo {
  userAgent: string;
  browser: string;
  version: string;
  platform: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
}

export interface NetworkInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  connectionType: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface DeviceInfo {
  screenWidth: number;
  screenHeight: number;
  availableWidth: number;
  availableHeight: number;
  colorDepth: number;
  pixelRatio: number;
  touchSupport: boolean;
  memoryInfo?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export interface ErrorLog {
  timestamp: number;
  level: 'error' | 'warning' | 'info';
  category: 'network' | 'service' | 'client' | 'data';
  message: string;
  details?: any;
  stack?: string;
}

export interface PerformanceLog {
  timestamp: number;
  metric: string;
  value: number;
  unit: string;
  context?: any;
}

export interface ShareStatus {
  isActive: boolean;
  mode: 'host' | 'viewer' | 'idle';
  sessionId?: string;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastUpdate: number;
  viewerCount: number;
  dataTransferRate: number;
  errorCount: number;
}

export class ShareDiagnosticService {
  private static instance: ShareDiagnosticService;
  private errorLogs: ErrorLog[] = [];
  private performanceLogs: PerformanceLog[] = [];
  private maxLogSize = 100;
  private startTime = Date.now();

  static getInstance(): ShareDiagnosticService {
    if (!ShareDiagnosticService.instance) {
      ShareDiagnosticService.instance = new ShareDiagnosticService();
    }
    return ShareDiagnosticService.instance;
  }

  /**
   * 收集完整的诊断信息
   */
  async collectDiagnosticInfo(): Promise<DiagnosticInfo> {
    return {
      browserInfo: this.getBrowserInfo(),
      networkInfo: await this.getNetworkInfo(),
      deviceInfo: this.getDeviceInfo(),
      errorLog: [...this.errorLogs],
      performanceLog: [...this.performanceLogs],
      shareStatus: this.getShareStatus()
    };
  }

  /**
   * 记录错误日志
   */
  logError(category: ErrorLog['category'], message: string, details?: any, error?: Error): void {
    const errorLog: ErrorLog = {
      timestamp: Date.now(),
      level: 'error',
      category,
      message,
      details,
      stack: error?.stack
    };

    this.errorLogs.push(errorLog);
    this.trimLogs();

    console.error(`[ShareDiagnostic] ${category.toUpperCase()}: ${message}`, details);
  }

  /**
   * 记录警告日志
   */
  logWarning(category: ErrorLog['category'], message: string, details?: any): void {
    const warningLog: ErrorLog = {
      timestamp: Date.now(),
      level: 'warning',
      category,
      message,
      details
    };

    this.errorLogs.push(warningLog);
    this.trimLogs();

    console.warn(`[ShareDiagnostic] ${category.toUpperCase()}: ${message}`, details);
  }

  /**
   * 记录信息日志
   */
  logInfo(category: ErrorLog['category'], message: string, details?: any): void {
    const infoLog: ErrorLog = {
      timestamp: Date.now(),
      level: 'info',
      category,
      message,
      details
    };

    this.errorLogs.push(infoLog);
    this.trimLogs();

    console.log(`[ShareDiagnostic] ${category.toUpperCase()}: ${message}`, details);
  }

  /**
   * 记录性能指标
   */
  logPerformance(metric: string, value: number, unit: string, context?: any): void {
    const performanceLog: PerformanceLog = {
      timestamp: Date.now(),
      metric,
      value,
      unit,
      context
    };

    this.performanceLogs.push(performanceLog);
    this.trimLogs();

    console.log(`[ShareDiagnostic] PERFORMANCE: ${metric} = ${value}${unit}`, context);
  }

  /**
   * 测试网络连接
   */
  async testNetworkConnection(): Promise<{
    latency: number;
    bandwidth: number;
    quality: NetworkInfo['quality'];
    errors: string[];
  }> {
    const errors: string[] = [];
    let latency = 0;
    let bandwidth = 0;

    try {
      // 测试延迟
      const startTime = performance.now();
      await fetch(window.location.origin + '/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      latency = performance.now() - startTime;

      this.logPerformance('network_latency', latency, 'ms');

    } catch (error) {
      errors.push(`延迟测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
      this.logError('network', '网络延迟测试失败', { error });
    }

    try {
      // 估算带宽（简单测试）
      const testSize = 1024; // 1KB
      const startTime = performance.now();
      const response = await fetch(window.location.origin + '/favicon.ico', {
        cache: 'no-cache'
      });
      const endTime = performance.now();
      
      if (response.ok) {
        const duration = (endTime - startTime) / 1000; // 转换为秒
        bandwidth = (testSize * 8) / duration; // bps
        this.logPerformance('network_bandwidth', bandwidth, 'bps');
      }

    } catch (error) {
      errors.push(`带宽测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
      this.logError('network', '网络带宽测试失败', { error });
    }

    // 评估网络质量
    let quality: NetworkInfo['quality'] = 'poor';
    if (latency < 100 && bandwidth > 1000000) { // < 100ms, > 1Mbps
      quality = 'excellent';
    } else if (latency < 300 && bandwidth > 500000) { // < 300ms, > 500Kbps
      quality = 'good';
    } else if (latency < 1000 && bandwidth > 100000) { // < 1s, > 100Kbps
      quality = 'fair';
    }

    return { latency, bandwidth, quality, errors };
  }

  /**
   * 测试 API 连接
   */
  async testAPIConnection(): Promise<{
    available: boolean;
    responseTime: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let available = false;
    let responseTime = 0;

    try {
      const startTime = performance.now();
      
      // 测试创建会话 API
      const testSession = {
        id: 'diagnostic-test-' + Date.now(),
        hostId: 'diagnostic-host',
        title: '诊断测试会话',
        canvasState: { blocks: [], connections: [], zoom: 1, pan: { x: 0, y: 0 } },
        viewers: [],
        isActive: true
      };

      const response = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testSession)
      });

      responseTime = performance.now() - startTime;
      available = response.ok;

      if (response.ok) {
        this.logInfo('service', 'API 连接测试成功', { responseTime });
      } else {
        errors.push(`API 响应错误: ${response.status} ${response.statusText}`);
        this.logError('service', 'API 连接测试失败', { status: response.status, statusText: response.statusText });
      }

    } catch (error) {
      errors.push(`API 连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
      this.logError('service', 'API 连接测试异常', { error });
    }

    this.logPerformance('api_response_time', responseTime, 'ms');
    return { available, responseTime, errors };
  }

  /**
   * 生成诊断报告
   */
  async generateDiagnosticReport(): Promise<string> {
    const info = await this.collectDiagnosticInfo();
    const networkTest = await this.testNetworkConnection();
    const apiTest = await this.testAPIConnection();

    const report = `
# 实时分享系统诊断报告

## 生成时间
${new Date().toLocaleString()}

## 浏览器信息
- 浏览器: ${info.browserInfo.browser} ${info.browserInfo.version}
- 平台: ${info.browserInfo.platform}
- 语言: ${info.browserInfo.language}
- 在线状态: ${info.browserInfo.onLine ? '在线' : '离线'}
- Cookie 支持: ${info.browserInfo.cookieEnabled ? '是' : '否'}

## 设备信息
- 屏幕分辨率: ${info.deviceInfo.screenWidth} x ${info.deviceInfo.screenHeight}
- 可用区域: ${info.deviceInfo.availableWidth} x ${info.deviceInfo.availableHeight}
- 像素比: ${info.deviceInfo.pixelRatio}
- 触摸支持: ${info.deviceInfo.touchSupport ? '是' : '否'}
${info.deviceInfo.memoryInfo ? `- 内存使用: ${(info.deviceInfo.memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB` : ''}

## 网络信息
- 连接类型: ${info.networkInfo.connectionType}
- 有效类型: ${info.networkInfo.effectiveType}
- 下行速度: ${info.networkInfo.downlink} Mbps
- 往返时间: ${info.networkInfo.rtt} ms
- 省流量模式: ${info.networkInfo.saveData ? '开启' : '关闭'}
- 网络质量: ${info.networkInfo.quality}

## 网络测试结果
- 延迟: ${networkTest.latency.toFixed(2)} ms
- 带宽: ${(networkTest.bandwidth / 1000000).toFixed(2)} Mbps
- 质量评估: ${networkTest.quality}
${networkTest.errors.length > 0 ? `- 错误: ${networkTest.errors.join(', ')}` : ''}

## API 测试结果
- API 可用性: ${apiTest.available ? '可用' : '不可用'}
- 响应时间: ${apiTest.responseTime.toFixed(2)} ms
${apiTest.errors.length > 0 ? `- 错误: ${apiTest.errors.join(', ')}` : ''}

## 分享状态
- 活动状态: ${info.shareStatus.isActive ? '活跃' : '非活跃'}
- 模式: ${info.shareStatus.mode}
- 连接状态: ${info.shareStatus.connectionStatus}
${info.shareStatus.sessionId ? `- 会话ID: ${info.shareStatus.sessionId}` : ''}
- 观众数量: ${info.shareStatus.viewerCount}
- 数据传输率: ${info.shareStatus.dataTransferRate.toFixed(2)} KB/s
- 错误计数: ${info.shareStatus.errorCount}

## 最近错误 (最多显示10条)
${info.errorLog.slice(-10).map(log => 
  `- [${new Date(log.timestamp).toLocaleTimeString()}] ${log.level.toUpperCase()} (${log.category}): ${log.message}`
).join('\n') || '无错误记录'}

## 性能指标 (最多显示10条)
${info.performanceLog.slice(-10).map(log => 
  `- [${new Date(log.timestamp).toLocaleTimeString()}] ${log.metric}: ${log.value}${log.unit}`
).join('\n') || '无性能记录'}

## 建议
${this.generateRecommendations(info, networkTest, apiTest)}
`;

    return report.trim();
  }

  /**
   * 导出诊断数据
   */
  exportDiagnosticData(): string {
    const data = {
      timestamp: Date.now(),
      errorLogs: this.errorLogs,
      performanceLogs: this.performanceLogs,
      sessionDuration: Date.now() - this.startTime
    };

    return JSON.stringify(data, null, 2);
  }

  // 私有方法

  private getBrowserInfo(): BrowserInfo {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';

    if (ua.includes('Chrome')) {
      browser = 'Chrome';
      version = ua.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
      version = ua.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Safari')) {
      browser = 'Safari';
      version = ua.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Edge')) {
      browser = 'Edge';
      version = ua.match(/Edge\/([0-9.]+)/)?.[1] || 'Unknown';
    }

    return {
      userAgent: ua,
      browser,
      version,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }

  private async getNetworkInfo(): Promise<NetworkInfo> {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    let effectiveType = 'unknown';
    let downlink = 0;
    let rtt = 0;
    let saveData = false;

    if (connection) {
      effectiveType = connection.effectiveType || 'unknown';
      downlink = connection.downlink || 0;
      rtt = connection.rtt || 0;
      saveData = connection.saveData || false;
    }

    // 评估网络质量
    let quality: NetworkInfo['quality'] = 'poor';
    if (effectiveType === '4g' && downlink > 10) {
      quality = 'excellent';
    } else if (effectiveType === '4g' || (effectiveType === '3g' && downlink > 1)) {
      quality = 'good';
    } else if (effectiveType === '3g' || effectiveType === '2g') {
      quality = 'fair';
    }

    return {
      effectiveType,
      downlink,
      rtt,
      saveData,
      connectionType: connection?.type || 'unknown',
      quality
    };
  }

  private getDeviceInfo(): DeviceInfo {
    const screen = window.screen;
    const performance = (window as any).performance;

    let memoryInfo;
    if (performance && performance.memory) {
      memoryInfo = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }

    return {
      screenWidth: screen.width,
      screenHeight: screen.height,
      availableWidth: screen.availWidth,
      availableHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      touchSupport: 'ontouchstart' in window,
      memoryInfo
    };
  }

  private getShareStatus(): ShareStatus {
    // 这里需要与实际的分享服务集成
    // 暂时返回默认状态
    return {
      isActive: false,
      mode: 'idle',
      connectionStatus: 'disconnected',
      lastUpdate: 0,
      viewerCount: 0,
      dataTransferRate: 0,
      errorCount: this.errorLogs.filter(log => log.level === 'error').length
    };
  }

  private generateRecommendations(info: DiagnosticInfo, networkTest: any, apiTest: any): string {
    const recommendations: string[] = [];

    // 网络建议
    if (networkTest.quality === 'poor') {
      recommendations.push('- 网络质量较差，建议切换到更稳定的网络环境');
    }
    if (networkTest.latency > 500) {
      recommendations.push('- 网络延迟较高，可能影响实时同步效果');
    }

    // API 建议
    if (!apiTest.available) {
      recommendations.push('- API 服务不可用，请检查服务器状态或使用本地存储模式');
    }
    if (apiTest.responseTime > 2000) {
      recommendations.push('- API 响应时间较长，建议优化服务器性能');
    }

    // 浏览器建议
    if (!info.browserInfo.onLine) {
      recommendations.push('- 浏览器显示离线状态，请检查网络连接');
    }

    // 设备建议
    if (info.deviceInfo.memoryInfo && info.deviceInfo.memoryInfo.usedJSHeapSize > 100 * 1024 * 1024) {
      recommendations.push('- 内存使用较高，建议关闭其他标签页或重启浏览器');
    }

    // 错误建议
    const recentErrors = info.errorLog.filter(log => Date.now() - log.timestamp < 5 * 60 * 1000); // 最近5分钟
    if (recentErrors.length > 5) {
      recommendations.push('- 最近错误频繁，建议刷新页面或重新启动分享');
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '- 系统运行正常，无特殊建议';
  }

  private trimLogs(): void {
    if (this.errorLogs.length > this.maxLogSize) {
      this.errorLogs = this.errorLogs.slice(-this.maxLogSize);
    }
    if (this.performanceLogs.length > this.maxLogSize) {
      this.performanceLogs = this.performanceLogs.slice(-this.maxLogSize);
    }
  }
}

// 导出单例实例
export const shareDiagnosticService = ShareDiagnosticService.getInstance();