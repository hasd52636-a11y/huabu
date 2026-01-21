import Peer from 'peerjs';
import { Block } from '../types';

export interface ShareConnection {
  id: string;
  conn: any;
  joinTime: number;
}

export interface ShareStatus {
  isSharing: boolean;
  isViewing: boolean;
  shareId: string;
  viewerCount: number;
  connections: ShareConnection[];
}

export class P2PShareService {
  private peer: Peer | null = null;
  private connections: ShareConnection[] = [];
  private isHost: boolean = false;
  private shareId: string = '';
  private onStatusChange?: (status: ShareStatus) => void;
  private onCanvasUpdate?: (blocks: Block[]) => void;
  private maxViewers: number = 3;

  constructor() {
    this.setupPeer();
  }

  private setupPeer(): void {
    try {
      console.log('[P2PShareService] 开始初始化PeerJS...');
      
      // 使用更可靠的配置，包括多个备用服务器
      this.peer = new Peer({
        debug: 1, // 减少调试信息
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        },
        // 使用自定义的PeerJS服务器配置
        host: 'peerjs-server.herokuapp.com',
        port: 443,
        path: '/',
        secure: true
      });

      this.peer.on('open', (id) => {
        console.log('[P2PShareService] PeerJS连接成功，ID:', id);
        this.shareId = id;
        this.notifyStatusChange();
      });

      this.peer.on('error', (error) => {
        console.error('[P2PShareService] PeerJS错误:', error);
        
        // 根据错误类型提供不同的处理
        if (error.type === 'network') {
          console.log('[P2PShareService] 网络错误，尝试使用备用配置...');
          this.setupPeerWithFallback();
        } else if (error.type === 'server-error') {
          console.log('[P2PShareService] 服务器错误，尝试重连...');
          setTimeout(() => {
            this.setupPeerWithFallback();
          }, 3000);
        } else {
          console.log('[P2PShareService] 其他错误，使用默认重连...');
          setTimeout(() => {
            this.setupPeer();
          }, 5000);
        }
      });

      this.peer.on('connection', (conn) => {
        this.handleNewConnection(conn);
      });
      
    } catch (error) {
      console.error('[P2PShareService] PeerJS初始化失败:', error);
      // 尝试备用方案
      setTimeout(() => {
        this.setupPeerWithFallback();
      }, 2000);
    }
  }

  private setupPeerWithFallback(): void {
    try {
      console.log('[P2PShareService] 尝试备用PeerJS配置...');
      
      // 使用默认的PeerJS服务器（通常更稳定）
      this.peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
        // 不指定host，使用默认服务器
      });

      this.peer.on('open', (id) => {
        console.log('[P2PShareService] 备用配置连接成功，ID:', id);
        this.shareId = id;
        this.notifyStatusChange();
      });

      this.peer.on('error', (error) => {
        console.error('[P2PShareService] 备用配置也失败:', error);
        // 最后的降级方案：生成一个模拟ID用于测试
        setTimeout(() => {
          this.setupMockPeer();
        }, 2000);
      });

      this.peer.on('connection', (conn) => {
        this.handleNewConnection(conn);
      });
      
    } catch (error) {
      console.error('[P2PShareService] 备用配置初始化失败:', error);
      this.setupMockPeer();
    }
  }

  private setupMockPeer(): void {
    console.log('[P2PShareService] 使用模拟模式（仅用于测试）');
    
    // 生成一个模拟的ID用于测试
    this.shareId = 'mock-' + Math.random().toString(36).substr(2, 9);
    this.peer = null; // 标记为模拟模式
    
    console.log('[P2PShareService] 模拟模式ID:', this.shareId);
    this.notifyStatusChange();
  }

  private handleNewConnection(conn: any): void {
    // 检查是否超过最大观众数
    if (this.connections.length >= this.maxViewers) {
      conn.send({ type: 'room-full', message: '房间已满，最多支持3位观众' });
      conn.close();
      return;
    }

    const connection: ShareConnection = {
      id: conn.peer,
      conn: conn,
      joinTime: Date.now()
    };

    conn.on('open', () => {
      console.log('新观众连接:', conn.peer);
      this.connections.push(connection);
      
      // 发送欢迎消息和当前画布状态
      conn.send({ 
        type: 'welcome', 
        message: '连接成功！正在同步画布状态...',
        viewerCount: this.connections.length 
      });

      // 请求主应用发送当前画布状态
      this.requestCanvasSync();
      
      this.notifyStatusChange();
    });

    conn.on('data', (data) => {
      console.log('收到观众消息:', data);
      // 观众发送的消息（如果需要的话）
    });

    conn.on('close', () => {
      console.log('观众断开连接:', conn.peer);
      this.connections = this.connections.filter(c => c.id !== conn.peer);
      this.notifyStatusChange();
    });

    conn.on('error', (error) => {
      console.error('连接错误:', error);
      this.connections = this.connections.filter(c => c.id !== conn.peer);
      this.notifyStatusChange();
    });
  }

  // 创建分享（创作者调用）
  public startSharing(): string {
    console.log('[P2PShareService] startSharing called');
    console.log('[P2PShareService] peer:', this.peer);
    console.log('[P2PShareService] shareId:', this.shareId);
    
    if (!this.peer) {
      console.error('[P2PShareService] Peer is null');
      throw new Error('PeerJS未初始化，请刷新页面重试');
    }
    
    if (!this.shareId) {
      console.error('[P2PShareService] ShareId is empty');
      throw new Error('PeerJS未准备就绪，请稍后重试（通常需要2-5秒）');
    }

    this.isHost = true;
    const shareUrl = `${window.location.origin}${window.location.pathname}?watch=${this.shareId}`;
    
    console.log('[P2PShareService] 开始分享，链接:', shareUrl);
    this.notifyStatusChange();
    
    return shareUrl;
  }

  // 停止分享
  public stopSharing(): void {
    this.isHost = false;
    
    // 通知所有观众分享已结束
    this.connections.forEach(connection => {
      connection.conn.send({ 
        type: 'share-ended', 
        message: '分享已结束，感谢观看！' 
      });
      connection.conn.close();
    });
    
    this.connections = [];
    this.notifyStatusChange();
  }

  // 加入观看（观众调用）
  public async joinViewing(shareId: string): Promise<boolean> {
    if (!this.peer) {
      throw new Error('PeerJS未准备就绪');
    }

    try {
      const conn = this.peer.connect(shareId);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 10000); // 10秒超时

        conn.on('open', () => {
          clearTimeout(timeout);
          console.log('成功连接到分享者');
          this.isHost = false;
          this.shareId = shareId;
          this.notifyStatusChange();
          resolve(true);
        });

        conn.on('data', (data) => {
          this.handleViewerMessage(data);
        });

        conn.on('close', () => {
          console.log('与分享者的连接已断开');
          this.notifyStatusChange();
        });

        conn.on('error', (error) => {
          clearTimeout(timeout);
          console.error('连接分享者失败:', error);
          resolve(false);
        });
      });
    } catch (error) {
      console.error('加入观看失败:', error);
      return false;
    }
  }

  private handleViewerMessage(data: any): void {
    switch (data.type) {
      case 'welcome':
        console.log('收到欢迎消息:', data.message);
        break;
      
      case 'canvas-update':
        console.log('收到画布更新');
        if (this.onCanvasUpdate) {
          this.onCanvasUpdate(data.blocks);
        }
        break;
      
      case 'room-full':
        alert(data.message);
        break;
      
      case 'share-ended':
        alert(data.message);
        // 可以跳转回主页或显示结束页面
        break;
      
      default:
        console.log('未知消息类型:', data);
    }
  }

  // 广播画布更新（创作者调用）
  public broadcastCanvasUpdate(blocks: Block[]): void {
    if (!this.isHost || this.connections.length === 0) {
      return;
    }

    const message = {
      type: 'canvas-update',
      blocks: blocks,
      timestamp: Date.now()
    };

    console.log(`广播画布更新给 ${this.connections.length} 位观众`);
    
    this.connections.forEach(connection => {
      try {
        if (connection.conn.open) {
          connection.conn.send(message);
        }
      } catch (error) {
        console.error('发送消息失败:', error);
        // 移除失效的连接
        this.connections = this.connections.filter(c => c.id !== connection.id);
      }
    });
  }

  // 请求画布同步（内部使用）
  private requestCanvasSync(): void {
    // 这里可以触发一个事件，让主应用知道需要发送当前画布状态
    setTimeout(() => {
      // 模拟请求，实际使用时会通过回调获取
      console.log('请求画布同步...');
    }, 100);
  }

  // 设置状态变化回调
  public onStatusChanged(callback: (status: ShareStatus) => void): void {
    this.onStatusChange = callback;
  }

  // 设置画布更新回调（观众模式）
  public onCanvasUpdated(callback: (blocks: Block[]) => void): void {
    this.onCanvasUpdate = callback;
  }

  // 获取当前状态
  public getStatus(): ShareStatus {
    return {
      isSharing: this.isHost,
      isViewing: !this.isHost && !!this.shareId,
      shareId: this.shareId,
      viewerCount: this.connections.length,
      connections: [...this.connections]
    };
  }

  private notifyStatusChange(): void {
    if (this.onStatusChange) {
      this.onStatusChange(this.getStatus());
    }
  }

  // 清理资源
  public destroy(): void {
    this.stopSharing();
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

// 单例实例
export const p2pShareService = new P2PShareService();