/**
 * 实时同屏分享服务
 * 适用于 Vercel 部署的服务器端分享系统
 * 支持中国用户的实时协作需求
 */

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
  viewers: string[];
  isActive: boolean;
}

export interface ShareUpdate {
  sessionId: string;
  type: 'canvas_update' | 'viewer_join' | 'viewer_leave' | 'session_end';
  data: any;
  timestamp: number;
}

export class RealtimeShareService {
  private static instance: RealtimeShareService;
  private baseUrl: string;
  private currentSession: ShareSession | null = null;
  private isHost: boolean = false;
  private isViewer: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private onUpdateCallback: ((update: ShareUpdate) => void) | null = null;

  constructor() {
    // 自动检测环境
    this.baseUrl = this.getBaseUrl();
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
   * 创建分享会话（主持人）
   */
  async createSession(title: string, canvasState: any): Promise<{ sessionId: string; shareUrl: string }> {
    const sessionId = this.generateSessionId();
    const session: ShareSession = {
      id: sessionId,
      hostId: this.generateUserId(),
      title: title || '画布分享',
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      canvasState,
      viewers: [],
      isActive: true
    };

    try {
      // 在生产环境中，这里会调用 API
      if (this.isProduction()) {
        await this.saveSessionToServer(session);
      } else {
        // 开发环境使用 localStorage
        this.saveSessionToLocal(session);
      }

      this.currentSession = session;
      this.isHost = true;
      this.startPolling();

      const shareUrl = `${this.baseUrl}?watch=${sessionId}`;
      
      console.log('[RealtimeShare] Session created:', { sessionId, shareUrl });
      return { sessionId, shareUrl };
    } catch (error) {
      console.error('[RealtimeShare] Failed to create session:', error);
      throw new Error('创建分享会话失败');
    }
  }

  /**
   * 加入分享会话（观众）
   */
  async joinSession(sessionId: string): Promise<ShareSession> {
    try {
      let session: ShareSession | null = null;

      if (this.isProduction()) {
        session = await this.getSessionFromServer(sessionId);
      } else {
        session = this.getSessionFromLocal(sessionId);
      }

      if (!session || !session.isActive) {
        throw new Error('分享会话不存在或已结束');
      }

      // 添加观众
      const viewerId = this.generateUserId();
      session.viewers.push(viewerId);
      
      if (this.isProduction()) {
        await this.updateSessionOnServer(session);
      } else {
        this.saveSessionToLocal(session);
      }

      this.currentSession = session;
      this.isViewer = true;
      this.startPolling();

      console.log('[RealtimeShare] Joined session:', sessionId);
      return session;
    } catch (error) {
      console.error('[RealtimeShare] Failed to join session:', error);
      throw new Error('加入分享会话失败');
    }
  }

  /**
   * 更新画布状态（仅主持人）
   */
  async updateCanvas(canvasState: any): Promise<void> {
    if (!this.isHost || !this.currentSession) {
      return;
    }

    this.currentSession.canvasState = canvasState;
    this.currentSession.lastUpdate = Date.now();

    try {
      if (this.isProduction()) {
        await this.updateSessionOnServer(this.currentSession);
      } else {
        this.saveSessionToLocal(this.currentSession);
      }

      // 通知观众更新
      const update: ShareUpdate = {
        sessionId: this.currentSession.id,
        type: 'canvas_update',
        data: canvasState,
        timestamp: Date.now()
      };

      if (this.onUpdateCallback) {
        this.onUpdateCallback(update);
      }
    } catch (error) {
      console.error('[RealtimeShare] Failed to update canvas:', error);
    }
  }

  /**
   * 结束分享会话
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

      this.stopPolling();
      this.currentSession = null;
      this.isHost = false;
      this.isViewer = false;

      console.log('[RealtimeShare] Session ended');
    } catch (error) {
      console.error('[RealtimeShare] Failed to end session:', error);
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
      this.pollInterval = setInterval(async () => {
        await this.checkForUpdates();
      }, 2000); // 每2秒检查一次更新
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

        if (this.onUpdateCallback) {
          this.onUpdateCallback(update);
        }
      }
    } catch (error) {
      console.error('[RealtimeShare] Failed to check for updates:', error);
    }
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
}

// 导出单例实例
export const realtimeShareService = RealtimeShareService.getInstance();