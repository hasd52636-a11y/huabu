import { Peer, DataConnection } from 'peerjs';
import { ShareableData, ConnectionStatus, ViewerInfo } from '../types';
import { generateId } from '../utils';
import { PERFORMANCE_CONFIG, PerformanceMonitor } from '../performance-config';
import { DeltaSync } from './DeltaSync';
import { DataCompressor } from './DataCompressor';

export class ShareManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private onDataCallback: ((data: ShareableData) => void) | null = null;
  private onStatusChange: ((status: ConnectionStatus) => void) | null = null;
  private onViewersChange: ((viewers: ViewerInfo[]) => void) | null = null;
  private onNewViewerCallback: ((viewerId: string) => void) | null = null;
  private currentState: any = null;
  private isConnectedToHost: boolean = false;
  private performanceMonitor: PerformanceMonitor = new PerformanceMonitor();
  private lastBroadcastTime: number = 0;
  private deltaSync: DeltaSync = new DeltaSync();

  constructor(private appId: string) {}

  public async init(id?: string): Promise<string> {
    // 重要：PeerJS ID 只能包含英文字母、数字和连字符，不支持中文字符
    // 错误示例：'曹操画布-xxxxx' 会导致 "ID is invalid" 错误
    // 正确示例：'caocao-canvas-xxxxx' 
    const peerId = id || `caocao-canvas-${generateId(6)}`;
    
    return new Promise((resolve, reject) => {
      // 检查 PeerJS 是否可用
      if (typeof (window as any).Peer === 'undefined') {
        reject(new Error('PeerJS 未加载'));
        return;
      }
      
      // @ts-ignore - PeerJS is loaded via CDN in index.html for simplicity in this demo environment
      this.peer = new (window as any).Peer(peerId, {
        debug: 2,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        }
      });

      this.peer?.on('open', (id) => {
        this.updateStatus('connected');
        resolve(id);
      });

      this.peer?.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer?.on('error', (err) => {
        console.error('Peer error:', err);
        this.updateStatus('error');
        reject(err);
      });
    });
  }

  private handleIncomingConnection(conn: DataConnection) {
    console.log('[ShareManager] 收到新的连接请求:', conn.peer);
    
    if (this.connections.size >= 3) {
      console.warn('[ShareManager] 观看者数量已达上限，拒绝连接:', conn.peer);
      conn.close();
      return;
    }

    conn.on('open', () => {
      console.log('[ShareManager] 新观看者连接成功:', conn.peer);
      this.connections.set(conn.peer, conn);
      this.notifyViewers();
      
      // 立即发送当前状态给新观看者
      if (this.currentState) {
        console.log('[ShareManager] 立即发送当前状态给新观看者:', conn.peer);
        this.sendToSpecificViewer(conn.peer, this.currentState, 'initial-state');
      } else {
        console.log('[ShareManager] 没有当前状态，等待主机数据...');
      }
      
      // 触发新观看者回调
      if (this.onNewViewerCallback) {
        this.onNewViewerCallback(conn.peer);
      }
    });

    conn.on('data', (data: any) => {
      console.log('[ShareManager] 从观看者接收到数据:', conn.peer, data);
      
      // 处理观看者的初始数据请求
      if (data.type === 'request-initial-state') {
        console.log('[ShareManager] 观看者请求初始数据:', conn.peer);
        
        if (this.currentState) {
          console.log('[ShareManager] 发送初始数据给观看者:', conn.peer);
          this.sendToSpecificViewer(conn.peer, this.currentState, 'initial-state');
        } else {
          console.log('[ShareManager] 没有初始数据可发送');
        }
      } else if (this.onDataCallback) {
        this.onDataCallback(data as ShareableData);
      }
    });

    conn.on('close', () => {
      console.log('[ShareManager] 观看者断开连接:', conn.peer);
      this.connections.delete(conn.peer);
      this.notifyViewers();
    });
    
    conn.on('error', (err) => {
      console.error('[ShareManager] 观看者连接错误:', conn.peer, err);
      this.connections.delete(conn.peer);
      this.notifyViewers();
    });
  }

  public connect(targetId: string): void {
    console.log('[ShareManager] 尝试连接到主机:', targetId);
    if (!this.peer) {
      console.error('[ShareManager] Peer 未初始化');
      return;
    }
    
    this.updateStatus('connecting');
    console.log('[ShareManager] 创建连接...');
    const conn = this.peer.connect(targetId);
    
    conn.on('open', () => {
      console.log('[ShareManager] 观看者连接已建立:', targetId);
      this.isConnectedToHost = true;
      this.updateStatus('connected');
      
      // 延时后请求初始数据，给主机时间准备
      setTimeout(() => {
        console.log('[ShareManager] 向主机请求初始数据...');
        const requestPacket = {
          id: generateId(),
          type: 'request-initial-state',
          content: { message: 'Please send initial state' },
          lastUpdate: Date.now()
        };
        conn.send(requestPacket);
      }, 1000);
    });
    
    conn.on('data', (data: any) => {
      console.log('[ShareManager] 观看者接收到数据:', data);
      if (this.onDataCallback) this.onDataCallback(data as ShareableData);
    });
    
    conn.on('close', () => {
      console.log('[ShareManager] 观看者连接已关闭:', targetId);
      this.isConnectedToHost = false;
      this.updateStatus('disconnected');
    });
    
    conn.on('error', (err) => {
      console.error('[ShareManager] 观看者连接错误:', err);
      this.isConnectedToHost = false;
      this.updateStatus('error');
    });
  }

  public isConnected(): boolean {
    return this.isConnectedToHost || this.connections.size > 0;
  }

  public broadcast(data: any, type: ShareableData['type'] = 'state-update'): void {
    const now = Date.now();
    
    console.log('[ShareManager] 开始广播数据:', { 
      dataType: typeof data, 
      hasData: !!data, 
      connectionsCount: this.connections.size,
      type 
    });
    
    // 如果没有连接，直接存储状态并返回
    if (this.connections.size === 0) {
      this.currentState = data;
      console.log('[ShareManager] 没有观看者连接，仅存储状态');
      return;
    }
    
    // 简化的节流控制 - 减少节流间隔
    if (now - this.lastBroadcastTime < 50) { // 从200ms减少到50ms
      return;
    }
    
    this.lastBroadcastTime = now;
    
    // 存储原始状态
    this.currentState = data;
    
    // 简化数据传输 - 暂时跳过压缩和增量同步以确保数据能够传输
    const packet: ShareableData = {
      id: generateId(),
      type: type,
      content: data,
      lastUpdate: now
    };

    // 计算数据大小
    const packetSize = JSON.stringify(packet).length;
    console.log('[ShareManager] 数据包大小:', packetSize, '字节');
    
    // 向所有活跃连接发送数据
    let sentCount = 0;
    this.connections.forEach((conn, peerId) => {
      if (conn.open) {
        try {
          console.log(`[ShareManager] 向观看者 ${peerId} 发送数据`);
          conn.send(packet);
          sentCount++;
        } catch (error) {
          console.warn(`[ShareManager] 发送失败，移除连接: ${peerId}`, error);
          this.connections.delete(peerId);
          this.performanceMonitor.recordError();
        }
      } else {
        console.warn(`[ShareManager] 连接已关闭，移除: ${peerId}`);
        this.connections.delete(peerId);
      }
    });
    
    // 记录性能指标
    const latency = Date.now() - now;
    this.performanceMonitor.recordSync(latency);
    
    console.log(`[ShareManager] 数据广播完成: 发送给 ${sentCount} 个观看者，耗时 ${latency}ms`);
  }

  public sendToSpecificViewer(viewerId: string, data: any, type: ShareableData['type'] = 'initial-state'): void {
    const conn = this.connections.get(viewerId);
    if (conn && conn.open) {
      const packet: ShareableData = {
        id: generateId(),
        type,
        content: data,
        lastUpdate: Date.now()
      };
      
      console.log(`[ShareManager] 发送数据给观看者 ${viewerId}:`, {
        type,
        dataSize: JSON.stringify(packet).length,
        hasContent: !!data
      });
      
      conn.send(packet);
    } else {
      console.warn(`[ShareManager] 无法发送数据给观看者 ${viewerId}: 连接不可用`);
    }
  }

  public setCallbacks(callbacks: {
    onData: (data: ShareableData) => void;
    onStatus: (status: ConnectionStatus) => void;
    onViewers: (viewers: ViewerInfo[]) => void;
    onNewViewer?: (viewerId: string) => void;
  }) {
    this.onDataCallback = callbacks.onData;
    this.onStatusChange = callbacks.onStatus;
    this.onViewersChange = callbacks.onViewers;
    this.onNewViewerCallback = callbacks.onNewViewer || null;
  }

  private updateStatus(status: ConnectionStatus) {
    if (this.onStatusChange) this.onStatusChange(status);
  }

  private notifyViewers() {
    if (this.onViewersChange) {
      const viewers: ViewerInfo[] = Array.from(this.connections.keys()).map(id => ({
        id,
        joinTime: Date.now()
      }));
      this.onViewersChange(viewers);
    }
  }

  public destroy() {
    this.connections.forEach(c => c.close());
    this.peer?.destroy();
  }
}