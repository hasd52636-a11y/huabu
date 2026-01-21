/**
 * 实时同屏分享服务 - 增强版
 * 适用于 Vercel 部署的服务器端分享系统
 * 支持中国用户的实时协作需求
 * 
 * 新增功能：
 * - 智能连接检测和自动重连
 * - 多重连接方案和故障转移
 * - 连接质量监控和自适应调整
 * - 会话状态持久化和恢复
 * - 数据压缩和增量更新
 */

import { shareDiagnosticService } from './ShareDiagnosticService';
import { shareErrorHandler } from './ShareErrorHandler';

export interface ShareSession {
  id: string;
  hostId: string;
  title: string;
  createdAt: number;
  lastUpdate: number;
  canvasState: {
    blocks: any[];
    connections: any[];
    zoom: number;
    pan: { x: number; y: number };
  };
  viewers: ViewerInfo[];
  isActive: boolean;
  connectionMode: ConnectionMode;
  quality: ConnectionQuality;
  settings: SessionSettings;
}

export interface ViewerInfo {
  id: string;
  joinTime: number;
  lastSeen: number;
  connectionType: string;
  userAgent: string;
}

export interface ConnectionMode {
  type: 'websocket' | 'polling' | 'hybrid';
  priority: number;
  config: {
    pollInterval: number;
    timeout: number;
    retryAttempts: number;
  };
}

export interface ConnectionQuality {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number;
  bandwidth: number;
  stability: number;
  lastMeasured: number;
}

export interface SessionSettings {
  maxViewers: number;
  autoReconnect: boolean;
  compressionEnabled: boolean;
  updateThrottle: number;
  qualityAdaptive: boolean;
}

export interface ShareUpdate {
  sessionId: string;
  type: 'canvas_update' | 'viewer_join' | 'viewer_leave' | 'session_end' | 'connection_status';
  data: any;
  timestamp: number;
  sequence?: number;
}

export class RealtimeShareService {
  private static instance: RealtimeShareService;
  private baseUrl: string;
  private currentSession: ShareSession | null = null;
  private isHost: boolean = false;
  private isViewer: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private onUpdateCallback: ((update: ShareUpdate) => void) | null = null;
  
  // 新增：连接管理相关
  private connectionModes: ConnectionMode[] = [];
  private currentConnectionMode: ConnectionMode | null = null;
  private connectionQuality: ConnectionQuality | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private isReconnecting: boolean = false;
  private lastSuccessfulConnection: number = 0;
  private updateSequence: number = 0;
  private pendingUpdates: Map<number, ShareUpdate> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private qualityCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 自动检测环境
    this.baseUrl = this.getBaseUrl();
    this.initializeConnectionModes();
    this.startQualityMonitoring();
  }

  static getInstance(): RealtimeShareService {
    if (!RealtimeShareService.instance) {
      RealtimeShareService.instance = new RealtimeShareService();
    }
    return RealtimeShareService.instance;
  }

  private getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      // 浏览器环境
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return window.location.origin;
      }
      // 生产环境 - 使用当前域名
      return window.location.origin;
    }
    return '';
  }

  /**
   * 创建分享会话（主持人）- 增强版
   */
  async createSession(title: string, canvasState: any): Promise<{ sessionId: string; shareUrl: string }> {
    const sessionId = this.generateSessionId();
    
    // 检测最佳连接模式
    const bestConnectionMode = await this.detectBestConnectionMode();
    
    const session: ShareSession = {
      id: sessionId,
      hostId: this.generateUserId(),
      title: title || '画布分享',
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      canvasState,
      viewers: [],
      isActive: true,
      connectionMode: bestConnectionMode,
      quality: this.connectionQuality || this.getDefaultQuality(),
      settings: this.getDefaultSettings()
    };

    try {
      // 尝试建立连接
      await this.establishConnection(bestConnectionMode);
      
      // 保存会话
      if (this.isProduction()) {
        await this.saveSessionToServer(session);
      } else {
        this.saveSessionToLocal(session);
      }

      this.currentSession = session;
      this.isHost = true;
      this.lastSuccessfulConnection = Date.now();
      
      // 启动连接监控
      this.startConnectionMonitoring();
      this.startHeartbeat();

      const shareUrl = `${this.baseUrl}?watch=${sessionId}`;
      
      shareDiagnosticService.logInfo('service', '分享会话创建成功', { 
        sessionId, 
        shareUrl, 
        connectionMode: bestConnectionMode.type,
        quality: session.quality.level
      });
      
      console.log('[RealtimeShare] Session created:', { sessionId, shareUrl });
      return { sessionId, shareUrl };
    } catch (error) {
      console.error('[RealtimeShare] Failed to create session:', error);
      
      // 尝试降级连接模式
      const fallbackMode = this.getFallbackConnectionMode(bestConnectionMode);
      if (fallbackMode) {
        shareDiagnosticService.logWarning('service', '主连接模式失败，尝试降级模式', { 
          failed: bestConnectionMode.type, 
          fallback: fallbackMode.type 
        });
        
        try {
          await this.establishConnection(fallbackMode);
          session.connectionMode = fallbackMode;
          
          if (this.isProduction()) {
            await this.saveSessionToServer(session);
          } else {
            this.saveSessionToLocal(session);
          }
          
          this.currentSession = session;
          this.isHost = true;
          this.startConnectionMonitoring();
          
          const shareUrl = `${this.baseUrl}?watch=${sessionId}`;
          return { sessionId, shareUrl };
        } catch (fallbackError) {
          await shareErrorHandler.handleError(fallbackError instanceof Error ? fallbackError : new Error('创建分享会话失败'));
          throw new Error('创建分享会话失败');
        }
      }
      
      await shareErrorHandler.handleError(error instanceof Error ? error : new Error('创建分享会话失败'));
      throw new Error('创建分享会话失败');
    }
  }

  /**
   * 加入分享会话（观众）- 增强版
   */
  async joinSession(sessionId: string): Promise<ShareSession> {
    try {
      let session: ShareSession | null = null;
      let connectionAttempts = 0;
      const maxAttempts = 3;

      // 尝试多次连接
      while (connectionAttempts < maxAttempts && !session) {
        try {
          if (this.isProduction()) {
            session = await this.getSessionFromServer(sessionId);
          } else {
            session = this.getSessionFromLocal(sessionId);
          }
          
          if (session) break;
          
        } catch (error) {
          connectionAttempts++;
          if (connectionAttempts < maxAttempts) {
            shareDiagnosticService.logWarning('service', `连接尝试 ${connectionAttempts} 失败，重试中`, { sessionId, error });
            await this.delay(1000 * connectionAttempts); // 递增延迟
          }
        }
      }

      if (!session || !session.isActive) {
        throw new Error('分享会话不存在或已结束');
      }

      // 尝试建立连接
      await this.establishConnection(session.connectionMode);

      // 添加观众信息
      const viewerInfo: ViewerInfo = {
        id: this.generateUserId(),
        joinTime: Date.now(),
        lastSeen: Date.now(),
        connectionType: session.connectionMode.type,
        userAgent: navigator.userAgent
      };
      
      session.viewers.push(viewerInfo);
      
      // 更新会话
      if (this.isProduction()) {
        await this.updateSessionOnServer(session);
      } else {
        this.saveSessionToLocal(session);
      }

      this.currentSession = session;
      this.isViewer = true;
      this.lastSuccessfulConnection = Date.now();
      
      // 启动连接监控
      this.startConnectionMonitoring();
      this.startHeartbeat();

      shareDiagnosticService.logInfo('service', '成功加入分享会话', { 
        sessionId, 
        viewerId: viewerInfo.id,
        connectionMode: session.connectionMode.type,
        viewerCount: session.viewers.length
      });

      console.log('[RealtimeShare] Joined session:', sessionId);
      return session;
    } catch (error) {
      console.error('[RealtimeShare] Failed to join session:', error);
      await shareErrorHandler.handleError(error instanceof Error ? error : new Error('加入分享会话失败'));
      throw new Error('加入分享会话失败');
    }
  }
  /**
   * 更新画布状态（仅主持人）- 增强版
   */
  async updateCanvas(canvasState: any): Promise<void> {
    if (!this.isHost || !this.currentSession) {
      return;
    }

    // 检查连接状态
    if (!this.isConnectionHealthy()) {
      shareDiagnosticService.logWarning('service', '连接不健康，尝试重连后更新画布');
      await this.attemptReconnection();
    }

    this.currentSession.canvasState = canvasState;
    this.currentSession.lastUpdate = Date.now();
    this.updateSequence++;

    try {
      // 根据连接质量调整更新策略
      const shouldCompress = this.shouldCompressData();
      const processedData = shouldCompress ? this.compressCanvasData(canvasState) : canvasState;

      if (this.isProduction()) {
        await this.updateSessionOnServer(this.currentSession);
      } else {
        this.saveSessionToLocal(this.currentSession);
      }

      // 创建更新通知
      const update: ShareUpdate = {
        sessionId: this.currentSession.id,
        type: 'canvas_update',
        data: processedData,
        timestamp: Date.now(),
        sequence: this.updateSequence
      };

      // 记录性能指标
      shareDiagnosticService.logPerformance('canvas_update_size', JSON.stringify(processedData).length, 'bytes');
      shareDiagnosticService.logPerformance('canvas_update_latency', Date.now() - this.currentSession.lastUpdate, 'ms');

      if (this.onUpdateCallback) {
        this.onUpdateCallback(update);
      }

    } catch (error) {
      console.error('[RealtimeShare] Failed to update canvas:', error);
      
      // 尝试重连并重试
      if (this.currentSession.settings.autoReconnect) {
        await this.attemptReconnection();
        // 重试一次
        try {
          if (this.isProduction()) {
            await this.updateSessionOnServer(this.currentSession);
          } else {
            this.saveSessionToLocal(this.currentSession);
          }
        } catch (retryError) {
          await shareErrorHandler.handleError(retryError instanceof Error ? retryError : new Error('画布更新失败'));
        }
      }
    }
  }

  /**
   * 结束分享会话 - 增强版
   */
  async endSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    this.currentSession.isActive = false;
    
    try {
      if (this.isProduction()) {
        await this.updateSessionOnServer(this.currentSession);
      } else {
        this.saveSessionToLocal(this.currentSession);
      }

      // 停止所有监控和连接
      this.stopAllMonitoring();
      
      // 重置状态
      this.currentSession = null;
      this.isHost = false;
      this.isViewer = false;
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.updateSequence = 0;
      this.pendingUpdates.clear();

      shareDiagnosticService.logInfo('service', '分享会话已结束');
      console.log('[RealtimeShare] Session ended');
    } catch (error) {
      console.error('[RealtimeShare] Failed to end session:', error);
      await shareErrorHandler.handleError(error instanceof Error ? error : new Error('结束会话失败'));
    }
  }

  /**
   * 设置更新回调
   */
  setUpdateCallback(callback: (update: ShareUpdate) => void): void {
    this.onUpdateCallback = callback;
  }

  /**
   * 获取当前会话
   */
  getCurrentSession(): ShareSession | null {
    return this.currentSession;
  }

  /**
   * 检查是否为主持人
   */
  isHosting(): boolean {
    return this.isHost;
  }

  /**
   * 检查是否为观众
   */
  isWatching(): boolean {
    return this.isViewer;
  }

  // 私有方法

  private generateSessionId(): string {
    return 'share-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  }

  private generateUserId(): string {
    return 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  }

  private isProduction(): boolean {
    return typeof window !== 'undefined' && 
           window.location.hostname !== 'localhost' && 
           window.location.hostname !== '127.0.0.1';
  }

  private startPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    // 观众需要轮询获取更新
    if (this.isViewer) {
      const pollInterval = this.currentConnectionMode?.config.pollInterval || 1000;
      this.pollInterval = setInterval(async () => {
        await this.checkForUpdates();
      }, pollInterval);
    }
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async checkForUpdates(): Promise<void> {
    if (!this.currentSession || !this.isViewer) {
      return;
    }

    try {
      let latestSession: ShareSession | null = null;

      if (this.isProduction()) {
        latestSession = await this.getSessionFromServer(this.currentSession.id);
      } else {
        latestSession = this.getSessionFromLocal(this.currentSession.id);
      }

      if (latestSession && latestSession.lastUpdate > this.currentSession.lastUpdate) {
        const update: ShareUpdate = {
          sessionId: latestSession.id,
          type: 'canvas_update',
          data: latestSession.canvasState,
          timestamp: latestSession.lastUpdate
        };

        this.currentSession = latestSession;
        
        // 更新观众的最后活跃时间
        const viewerIndex = latestSession.viewers.findIndex(v => v.id === this.getCurrentViewerId());
        if (viewerIndex >= 0) {
          latestSession.viewers[viewerIndex].lastSeen = Date.now();
        }

        // 记录更新性能
        shareDiagnosticService.logPerformance('update_check_latency', 
          Date.now() - latestSession.lastUpdate, 'ms');

        if (this.onUpdateCallback) {
          this.onUpdateCallback(update);
        }
      }
    } catch (error) {
      console.error('[RealtimeShare] Failed to check for updates:', error);
      
      // 如果是网络错误且启用了自动重连，尝试重连
      if (this.currentSession?.settings.autoReconnect && 
          (error instanceof Error && error.message.includes('fetch'))) {
        await this.attemptReconnection();
      }
    }
  }

  /**
   * 获取当前观众ID
   */
  private getCurrentViewerId(): string {
    // 这里应该返回当前观众的ID，暂时返回一个模拟值
    return 'current-viewer-' + Date.now();
  }

  // 本地存储方法（开发环境）

  private saveSessionToLocal(session: ShareSession): void {
    localStorage.setItem(`share-session-${session.id}`, JSON.stringify(session));
  }

  private getSessionFromLocal(sessionId: string): ShareSession | null {
    try {
      const data = localStorage.getItem(`share-session-${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[RealtimeShare] Failed to get session from local:', error);
      return null;
    }
  }

  // 服务器 API 方法（生产环境）

  private async saveSessionToServer(session: ShareSession): Promise<void> {
    const response = await fetch('/api/share/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(session),
    });

    if (!response.ok) {
      throw new Error('Failed to save session to server');
    }
  }

  private async getSessionFromServer(sessionId: string): Promise<ShareSession | null> {
    const response = await fetch(`/api/share/${sessionId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to get session from server');
    }

    return await response.json();
  }

  private async updateSessionOnServer(session: ShareSession): Promise<void> {
    const response = await fetch(`/api/share/${session.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(session),
    });

    if (!response.ok) {
      throw new Error('Failed to update session on server');
    }
  }
  // 新增：连接管理方法

  /**
   * 初始化连接模式
   */
  private initializeConnectionModes(): void {
    this.connectionModes = [
      {
        type: 'websocket',
        priority: 1,
        config: {
          pollInterval: 0,
          timeout: 5000,
          retryAttempts: 3
        }
      },
      {
        type: 'polling',
        priority: 2,
        config: {
          pollInterval: 1000, // 1秒轮询，比原来的2秒更快
          timeout: 10000,
          retryAttempts: 5
        }
      },
      {
        type: 'hybrid',
        priority: 3,
        config: {
          pollInterval: 2000,
          timeout: 15000,
          retryAttempts: 3
        }
      }
    ];
  }

  /**
   * 检测最佳连接模式
   */
  private async detectBestConnectionMode(): Promise<ConnectionMode> {
    // 测试网络质量
    await this.measureConnectionQuality();
    
    // 根据网络质量选择连接模式
    if (this.connectionQuality) {
      if (this.connectionQuality.level === 'excellent' || this.connectionQuality.level === 'good') {
        return this.connectionModes[0]; // WebSocket
      } else if (this.connectionQuality.level === 'fair') {
        return this.connectionModes[1]; // Polling
      } else {
        return this.connectionModes[2]; // Hybrid
      }
    }
    
    // 默认使用轮询模式（最稳定）
    return this.connectionModes[1];
  }

  /**
   * 建立连接
   */
  private async establishConnection(mode: ConnectionMode): Promise<void> {
    this.currentConnectionMode = mode;
    
    shareDiagnosticService.logInfo('service', '建立连接', { 
      mode: mode.type, 
      config: mode.config 
    });

    switch (mode.type) {
      case 'websocket':
        await this.establishWebSocketConnection();
        break;
      case 'polling':
        this.establishPollingConnection();
        break;
      case 'hybrid':
        await this.establishHybridConnection();
        break;
    }
  }

  /**
   * WebSocket 连接（暂时模拟，实际需要服务器支持）
   */
  private async establishWebSocketConnection(): Promise<void> {
    // 在实际实现中，这里会建立 WebSocket 连接
    // 目前先模拟成功
    shareDiagnosticService.logInfo('service', 'WebSocket 连接建立（模拟）');
    
    // 降级到轮询模式
    this.establishPollingConnection();
  }

  /**
   * 轮询连接
   */
  private establishPollingConnection(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    const pollInterval = this.currentConnectionMode?.config.pollInterval || 1000;
    
    this.pollInterval = setInterval(async () => {
      await this.checkForUpdates();
    }, pollInterval);

    shareDiagnosticService.logInfo('service', '轮询连接建立', { interval: pollInterval });
  }

  /**
   * 混合连接模式
   */
  private async establishHybridConnection(): Promise<void> {
    // 尝试 WebSocket，失败则降级到轮询
    try {
      await this.establishWebSocketConnection();
    } catch (error) {
      shareDiagnosticService.logWarning('service', 'WebSocket 失败，降级到轮询模式');
      this.establishPollingConnection();
    }
  }

  /**
   * 获取降级连接模式
   */
  private getFallbackConnectionMode(failedMode: ConnectionMode): ConnectionMode | null {
    const currentIndex = this.connectionModes.findIndex(mode => mode.type === failedMode.type);
    if (currentIndex < this.connectionModes.length - 1) {
      return this.connectionModes[currentIndex + 1];
    }
    return null;
  }

  /**
   * 测量连接质量
   */
  private async measureConnectionQuality(): Promise<void> {
    const startTime = performance.now();
    let latency = 0;
    let bandwidth = 0;
    
    try {
      // 测试延迟
      const response = await fetch(this.baseUrl + '/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      latency = performance.now() - startTime;
      
      // 简单的带宽估算
      if (response.ok) {
        bandwidth = 1000; // 基础带宽，实际应该通过下载测试文件计算
      }
      
    } catch (error) {
      latency = 9999;
      bandwidth = 0;
    }

    // 计算稳定性（基于历史数据）
    const stability = this.calculateConnectionStability();

    // 评估质量等级
    let level: ConnectionQuality['level'] = 'poor';
    if (latency < 100 && bandwidth > 500) {
      level = 'excellent';
    } else if (latency < 300 && bandwidth > 200) {
      level = 'good';
    } else if (latency < 1000 && bandwidth > 50) {
      level = 'fair';
    }

    this.connectionQuality = {
      level,
      latency,
      bandwidth,
      stability,
      lastMeasured: Date.now()
    };

    shareDiagnosticService.logPerformance('connection_latency', latency, 'ms');
    shareDiagnosticService.logPerformance('connection_bandwidth', bandwidth, 'kbps');
    shareDiagnosticService.logInfo('service', '连接质量测量完成', this.connectionQuality);
  }

  /**
   * 计算连接稳定性
   */
  private calculateConnectionStability(): number {
    // 基于重连次数和成功连接时间计算稳定性
    const timeSinceLastConnection = Date.now() - this.lastSuccessfulConnection;
    const maxStableTime = 5 * 60 * 1000; // 5分钟
    
    let stability = Math.max(0, 1 - (this.reconnectAttempts * 0.2));
    
    if (timeSinceLastConnection < maxStableTime) {
      stability *= (timeSinceLastConnection / maxStableTime);
    }
    
    return Math.max(0, Math.min(1, stability));
  }

  /**
   * 检查连接是否健康
   */
  private isConnectionHealthy(): boolean {
    if (!this.connectionQuality) return false;
    
    const timeSinceLastMeasure = Date.now() - this.connectionQuality.lastMeasured;
    const maxAge = 30 * 1000; // 30秒
    
    if (timeSinceLastMeasure > maxAge) {
      return false;
    }
    
    return this.connectionQuality.level !== 'poor' && 
           this.connectionQuality.stability > 0.5;
  }

  /**
   * 尝试重连
   */
  private async attemptReconnection(): Promise<boolean> {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return false;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    shareDiagnosticService.logInfo('service', '尝试重连', { 
      attempt: this.reconnectAttempts, 
      maxAttempts: this.maxReconnectAttempts 
    });

    try {
      // 重新测量连接质量
      await this.measureConnectionQuality();
      
      // 选择最佳连接模式
      const bestMode = await this.detectBestConnectionMode();
      
      // 重新建立连接
      await this.establishConnection(bestMode);
      
      // 更新会话连接模式
      if (this.currentSession) {
        this.currentSession.connectionMode = bestMode;
        this.currentSession.quality = this.connectionQuality!;
      }
      
      this.lastSuccessfulConnection = Date.now();
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      
      shareDiagnosticService.logInfo('service', '重连成功', { mode: bestMode.type });
      return true;
      
    } catch (error) {
      this.isReconnecting = false;
      
      shareDiagnosticService.logError('service', '重连失败', { 
        attempt: this.reconnectAttempts, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
      
      // 指数退避延迟
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      await this.delay(Math.min(delay, 30000)); // 最大30秒
      
      return false;
    }
  }

  /**
   * 启动连接监控
   */
  private startConnectionMonitoring(): void {
    // 观众需要轮询获取更新
    if (this.isViewer && this.currentConnectionMode) {
      this.startPolling();
    }
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      if (!this.isConnectionHealthy()) {
        shareDiagnosticService.logWarning('service', '心跳检测发现连接问题');
        
        if (this.currentSession?.settings.autoReconnect) {
          await this.attemptReconnection();
        }
      }
    }, 10000); // 每10秒检查一次
  }

  /**
   * 启动质量监控
   */
  private startQualityMonitoring(): void {
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
    }

    this.qualityCheckInterval = setInterval(async () => {
      await this.measureConnectionQuality();
      
      // 根据质量调整连接参数
      if (this.currentSession?.settings.qualityAdaptive) {
        await this.adaptToQuality();
      }
    }, 30000); // 每30秒检查一次质量
  }

  /**
   * 根据质量调整连接参数
   */
  private async adaptToQuality(): Promise<void> {
    if (!this.connectionQuality || !this.currentConnectionMode) return;

    const currentQuality = this.connectionQuality.level;
    let needsAdjustment = false;

    // 根据质量调整轮询间隔
    if (currentQuality === 'poor' && this.currentConnectionMode.config.pollInterval < 3000) {
      this.currentConnectionMode.config.pollInterval = 3000;
      needsAdjustment = true;
    } else if (currentQuality === 'excellent' && this.currentConnectionMode.config.pollInterval > 500) {
      this.currentConnectionMode.config.pollInterval = 500;
      needsAdjustment = true;
    }

    if (needsAdjustment) {
      shareDiagnosticService.logInfo('service', '根据网络质量调整连接参数', {
        quality: currentQuality,
        newInterval: this.currentConnectionMode.config.pollInterval
      });
      
      // 重新建立连接以应用新参数
      await this.establishConnection(this.currentConnectionMode);
    }
  }
  /**
   * 判断是否应该压缩数据
   */
  private shouldCompressData(): boolean {
    if (!this.currentSession?.settings.compressionEnabled) return false;
    if (!this.connectionQuality) return true; // 默认压缩
    
    // 网络质量差时启用压缩
    return this.connectionQuality.level === 'poor' || this.connectionQuality.level === 'fair';
  }

  /**
   * 压缩画布数据
   */
  private compressCanvasData(data: any): any {
    // 简单的数据压缩：移除不必要的字段，减少精度等
    const compressed = {
      ...data,
      blocks: data.blocks?.map((block: any) => ({
        id: block.id,
        type: block.type,
        x: Math.round(block.x || 0),
        y: Math.round(block.y || 0),
        width: Math.round(block.width || 0),
        height: Math.round(block.height || 0),
        content: block.content ? String(block.content).substring(0, 1000) : '' // 限制内容长度
      })) || [],
      connections: data.connections?.map((conn: any) => ({
        id: conn.id,
        from: conn.from,
        to: conn.to
      })) || [],
      zoom: Math.round((data.zoom || 1) * 100) / 100, // 保留2位小数
      pan: {
        x: Math.round(data.pan?.x || 0),
        y: Math.round(data.pan?.y || 0)
      }
    };

    const originalSize = JSON.stringify(data).length;
    const compressedSize = JSON.stringify(compressed).length;
    
    shareDiagnosticService.logPerformance('data_compression_ratio', 
      Math.round((1 - compressedSize / originalSize) * 100), '%');
    
    return compressed;
  }

  /**
   * 实现增量更新检测
   */
  private detectCanvasChanges(oldState: any, newState: any): any {
    if (!oldState) return newState;

    const changes: any = {};
    
    // 检测块的变化
    if (JSON.stringify(oldState.blocks) !== JSON.stringify(newState.blocks)) {
      changes.blocks = newState.blocks;
    }
    
    // 检测连接的变化
    if (JSON.stringify(oldState.connections) !== JSON.stringify(newState.connections)) {
      changes.connections = newState.connections;
    }
    
    // 检测视图变化
    if (oldState.zoom !== newState.zoom) {
      changes.zoom = newState.zoom;
    }
    
    if (JSON.stringify(oldState.pan) !== JSON.stringify(newState.pan)) {
      changes.pan = newState.pan;
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * 获取默认质量设置
   */
  private getDefaultQuality(): ConnectionQuality {
    return {
      level: 'good',
      latency: 200,
      bandwidth: 500,
      stability: 0.8,
      lastMeasured: Date.now()
    };
  }

  /**
   * 获取默认会话设置
   */
  private getDefaultSettings(): SessionSettings {
    return {
      maxViewers: 10,
      autoReconnect: true,
      compressionEnabled: true,
      updateThrottle: 500,
      qualityAdaptive: true
    };
  }

  /**
   * 停止所有监控
   */
  private stopAllMonitoring(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
      this.qualityCheckInterval = null;
    }
  }

  /**
   * 延迟工具方法
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): {
    isConnected: boolean;
    mode: string;
    quality: ConnectionQuality | null;
    reconnectAttempts: number;
    lastSuccessfulConnection: number;
  } {
    return {
      isConnected: this.isConnectionHealthy(),
      mode: this.currentConnectionMode?.type || 'none',
      quality: this.connectionQuality,
      reconnectAttempts: this.reconnectAttempts,
      lastSuccessfulConnection: this.lastSuccessfulConnection
    };
  }
}

// 导出单例实例
export const realtimeShareService = RealtimeShareService.getInstance();