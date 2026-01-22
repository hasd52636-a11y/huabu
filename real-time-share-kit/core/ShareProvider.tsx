import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ShareManager } from './ShareManager';
import { ShareSession, ConnectionStatus, ViewerInfo, ShareableData, ShareConfig } from '../types';
import { getShareIdFromUrl, createShareUrl } from '../utils';
import { LocalStorageAdapter } from './StorageService';
import { DeltaSync } from './DeltaSync';
import { DataCompressor } from './DataCompressor';

interface ShareContextType {
  session: ShareSession;
  config: ShareConfig;
  createShare: (title: string, initialData?: any) => Promise<{ shareId: string; shareUrl: string }>;
  joinShare: (shareId: string) => Promise<void>;
  stopSharing: () => void;
  syncData: (data: any) => void;
  receivedData: any;
}

const ShareContext = createContext<ShareContextType | undefined>(undefined);

export const ShareProvider: React.FC<{ children: React.ReactNode; config: ShareConfig }> = ({ children, config }) => {
  const [session, setSession] = useState<ShareSession>({
    shareId: null,
    status: 'idle',
    viewers: [],
    isHost: false,
  });
  const [receivedData, setReceivedData] = useState<any>(null);
  const managerRef = useRef<ShareManager | null>(null);
  const currentDataRef = useRef<any>(null);
  const deltaSyncRef = useRef<DeltaSync>(new DeltaSync()); // 观看者端的增量同步
  const storage = config.storage || new LocalStorageAdapter();

  useEffect(() => {
    const shareId = getShareIdFromUrl();
    if (shareId && !managerRef.current) {
      joinShare(shareId);
    }
    return () => managerRef.current?.destroy();
  }, []);

  const joinShare = async (hostId: string) => {
    console.log('[ShareProvider] 开始连接到主机:', hostId);
    
    if (managerRef.current) managerRef.current.destroy();
    
    // 添加初始延时，给主机时间准备
    console.log('[ShareProvider] 等待主机准备...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const manager = new ShareManager(config.appName);
    managerRef.current = manager;
    
    manager.setCallbacks({
      onData: (data) => {
        console.log('[ShareProvider] 观看者接收到数据:', { 
          type: data.type, 
          hasContent: !!data.content,
          contentType: typeof data.content 
        });
        
        // 简化数据处理 - 暂时跳过增量同步和解压缩
        if (data.content) {
          currentDataRef.current = data.content;
          setReceivedData(data.content);
          console.log('[ShareProvider] 数据已更新到状态');
        } else {
          console.warn('[ShareProvider] 接收到空数据');
        }
      },
      onStatus: (status) => {
        console.log('[ShareProvider] 连接状态变化:', status);
        setSession(prev => ({ ...prev, status }));
      },
      onViewers: (viewers) => {
        console.log('[ShareProvider] 观看者列表更新:', viewers);
        setSession(prev => ({ ...prev, viewers }));
      },
    });

    try {
      console.log('[ShareProvider] 初始化 ShareManager...');
      await manager.init(); 
      console.log('[ShareProvider] ShareManager 初始化完成，开始连接...');
      
      // 连接重试机制
      let retryCount = 0;
      const maxRetries = 3;
      
      const attemptConnection = async () => {
        try {
          manager.connect(hostId);
          setSession(prev => ({ ...prev, shareId: hostId, isHost: false }));
          console.log('[ShareProvider] 连接请求已发送');
          
          // 等待连接建立，如果5秒内没有连接成功则重试
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`[ShareProvider] 连接超时，重试 ${retryCount}/${maxRetries}`);
                attemptConnection().then(resolve).catch(reject);
              } else {
                reject(new Error('连接超时，请检查主机是否在线'));
              }
            }, 5000);
            
            // 监听连接成功
            const checkConnection = setInterval(() => {
              if (manager.isConnected?.()) {
                clearTimeout(timeout);
                clearInterval(checkConnection);
                console.log('[ShareProvider] 连接建立成功');
                resolve(true);
              }
            }, 500);
          });
        } catch (error) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`[ShareProvider] 连接失败，重试 ${retryCount}/${maxRetries}:`, error);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return attemptConnection();
          } else {
            throw error;
          }
        }
      };
      
      await attemptConnection();
      
    } catch (err) {
      console.error('[ShareProvider] 连接失败:', err);
      setSession(prev => ({ ...prev, status: 'error' }));
    }
  };

  const createShare = async (title: string, initialData?: any) => {
    // 检查 PeerJS 是否可用
    if (typeof (window as any).Peer === 'undefined') {
      throw new Error('PeerJS 未加载，请检查网络连接');
    }
    
    const manager = new ShareManager(config.appName);
    managerRef.current = manager;

    manager.setCallbacks({
      onData: (data) => setReceivedData(data.content),
      onStatus: (status) => setSession(prev => ({ ...prev, status })),
      onViewers: (viewers) => setSession(prev => ({ ...prev, viewers })),
      onNewViewer: (viewerId) => {
        // Send current state to new viewer
        if (currentDataRef.current && manager) {
          console.log('[ShareProvider] Sending initial state to new viewer:', viewerId);
          manager.sendToSpecificViewer(viewerId, currentDataRef.current, 'initial-state');
        }
      }
    });

    const id = await manager.init();
    
    // Optional: Persist session info to storage
    await storage.save(`share_session_${id}`, { title, createdAt: Date.now() });

    setSession({
      shareId: id,
      status: 'connected',
      viewers: [],
      isHost: true,
    });

    if (initialData) {
      currentDataRef.current = initialData;
      manager.broadcast(initialData);
    }

    const shareUrl = createShareUrl(id);
    return { shareId: id, shareUrl };
  };

  const stopSharing = () => {
    managerRef.current?.destroy();
    managerRef.current = null;
    setSession({
      shareId: null,
      status: 'idle',
      viewers: [],
      isHost: false,
    });
  };

  const syncData = (data: any) => {
    if (session.isHost && managerRef.current) {
      console.log('[ShareProvider] 主机同步数据:', {
        hasData: !!data,
        dataType: typeof data,
        connectionsCount: managerRef.current.isConnected ? 'connected' : 'not connected'
      });
      
      // 存储当前数据供新观看者使用
      currentDataRef.current = data;
      
      // 简化节流机制 - 减少延迟
      if (!syncData.lastSyncTime || Date.now() - syncData.lastSyncTime > 100) { // 从200ms减少到100ms
        console.log('[ShareProvider] 执行数据广播');
        managerRef.current.broadcast(data);
        syncData.lastSyncTime = Date.now();
      } else {
        console.log('[ShareProvider] 数据同步被节流跳过');
      }
    } else {
      console.log('[ShareProvider] 跳过数据同步:', {
        isHost: session.isHost,
        hasManager: !!managerRef.current
      });
    }
  };
  
  // 添加静态属性来跟踪上次同步时间
  (syncData as any).lastSyncTime = 0;

  return (
    <ShareContext.Provider value={{ 
      session, 
      config,
      createShare, 
      joinShare, 
      stopSharing, 
      syncData, 
      receivedData 
    }}>
      {children}
    </ShareContext.Provider>
  );
};

export const useShare = () => {
  const context = useContext(ShareContext);
  if (!context) throw new Error('useShare must be used within a ShareProvider');
  return context;
};