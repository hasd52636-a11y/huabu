/**
 * 分享上下文提供者
 * Share Context Provider
 * 
 * 核心功能：
 * 1. 提供分享上下文
 * 2. 管理分享状态
 * 3. 处理配置和事件
 * 4. 提供错误边界
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ShareManager } from './ShareManager';
import type {
  ShareProviderProps,
  ShareConfig,
  ShareEvents,
  ShareController,
  ViewerController,
  ShareSession,
  ConnectionStatus,
  ShareError,
  ViewerInfo,
  ShareableData
} from '../types';

// ============================================================================
// 上下文定义 (Context Definition)
// ============================================================================

interface ShareContextValue {
  // 配置
  config: ShareConfig;
  
  // 管理器
  shareManager: ShareManager;
  
  // 控制器
  shareController: ShareController;
  viewerController: ViewerController;
  
  // 状态
  isSharing: boolean;
  isViewing: boolean;
  shareId: string | null;
  session: ShareSession | null;
  viewers: ViewerInfo[];
  connectionStatus: ConnectionStatus;
  
  // 错误状态
  error: ShareError | null;
  clearError: () => void;
  
  // 事件处理
  events: ShareEvents;
}

const ShareContext = createContext<ShareContextValue | null>(null);

// ============================================================================
// Hook定义 (Hook Definition)
// ============================================================================

/**
 * 使用分享上下文
 * Use Share Context
 */
export const useShareContext = (): ShareContextValue => {
  const context = useContext(ShareContext);
  if (!context) {
    throw new Error('useShareContext must be used within a ShareProvider');
  }
  return context;
};

// ============================================================================
// 提供者组件 (Provider Component)
// ============================================================================

/**
 * 分享提供者组件
 * Share Provider Component
 */
export const ShareProvider: React.FC<ShareProviderProps> = ({
  config,
  events = {},
  children,
  fallback
}) => {
  // 状态管理
  const [shareManager] = useState(() => new ShareManager(config));
  const [isSharing, setIsSharing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [session, setSession] = useState<ShareSession | null>(null);
  const [viewers, setViewers] = useState<ViewerInfo[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    type: 'localStorage',
    state: 'disconnected',
    quality: 'good',
    latency: 0,
    bandwidth: 0,
    stability: 1,
    lastUpdate: Date.now(),
    reconnectAttempts: 0
  });
  const [error, setError] = useState<ShareError | null>(null);
  
  // 引用管理
  const eventsRef = useRef(events);
  const controllersRef = useRef<{
    shareController: ShareController | null;
    viewerController: ViewerController | null;
  }>({
    shareController: null,
    viewerController: null
  });
  
  // 更新事件引用
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);
  
  // 错误处理
  const handleError = useCallback((error: ShareError) => {
    console.error('[ShareProvider] Error:', error);
    setError(error);
    eventsRef.current.onError?.(error);
  }, []);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // 初始化管理器
  useEffect(() => {
    const initializeManager = async () => {
      try {
        // 设置事件监听器
        shareManager.on('shareStart', (shareId: string) => {
          setIsSharing(true);
          setShareId(shareId);
          eventsRef.current.onShareStart?.(shareId);
        });
        
        shareManager.on('shareEnd', () => {
          setIsSharing(false);
          setShareId(null);
          setSession(null);
          setViewers([]);
          eventsRef.current.onShareEnd?.();
        });
        
        shareManager.on('viewerJoin', (viewer: ViewerInfo) => {
          setViewers(prev => [...prev, viewer]);
          eventsRef.current.onViewerJoin?.(viewer);
        });
        
        shareManager.on('viewerLeave', (viewerId: string) => {
          setViewers(prev => prev.filter(v => v.id !== viewerId));
          eventsRef.current.onViewerLeave?.(viewerId);
        });
        
        shareManager.on('dataSync', (data: ShareableData) => {
          eventsRef.current.onDataSync?.(data);
        });
        
        shareManager.on('connectionChange', (status: ConnectionStatus) => {
          setConnectionStatus(status);
          eventsRef.current.onConnectionChange?.(status);
        });
        
        shareManager.on('error', handleError);
        
        // 初始化管理器
        await shareManager.initialize();
        
        // 创建控制器
        controllersRef.current.shareController = shareManager.createShareController();
        controllersRef.current.viewerController = shareManager.createViewerController();
        
        // 检查URL参数，自动进入观看模式
        const urlParams = new URLSearchParams(window.location.search);
        const watchId = urlParams.get('watch');
        if (watchId) {
          setIsViewing(true);
          setShareId(watchId);
          try {
            await controllersRef.current.viewerController?.joinSession(watchId);
          } catch (error) {
            handleError({
              code: 'AUTO_JOIN_FAILED',
              message: `Failed to auto-join session: ${watchId}`,
              type: 'connection',
              severity: 'medium',
              timestamp: Date.now(),
              recoverable: true,
              retryable: true
            });
          }
        }
        
      } catch (error) {
        handleError({
          code: 'INITIALIZATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to initialize ShareManager',
          type: 'system',
          severity: 'critical',
          timestamp: Date.now(),
          recoverable: false,
          retryable: false
        });
      }
    };
    
    initializeManager();
    
    // 清理函数
    return () => {
      shareManager.destroy();
    };
  }, [shareManager, handleError]);
  
  // 定期更新会话信息
  useEffect(() => {
    if (!isSharing && !isViewing) return;
    
    const updateInterval = setInterval(() => {
      if (controllersRef.current.shareController?.isSharing()) {
        const currentSession = controllersRef.current.shareController.getSession();
        if (currentSession) {
          setSession(currentSession);
          setViewers(currentSession.viewers);
        }
      }
      
      // 更新连接状态
      const status = shareManager.getConnectionStatus();
      setConnectionStatus(status);
    }, 1000);
    
    return () => clearInterval(updateInterval);
  }, [isSharing, isViewing, shareManager]);
  
  // 上下文值
  const contextValue: ShareContextValue = {
    config,
    shareManager,
    shareController: controllersRef.current.shareController!,
    viewerController: controllersRef.current.viewerController!,
    isSharing,
    isViewing,
    shareId,
    session,
    viewers,
    connectionStatus,
    error,
    clearError,
    events
  };
  
  // 错误边界渲染
  if (error && error.severity === 'critical') {
    return (
      <div className="share-provider-error">
        <h3>分享功能初始化失败</h3>
        <p>{error.message}</p>
        <button onClick={clearError}>重试</button>
        {fallback}
      </div>
    );
  }
  
  // 正常渲染
  return (
    <ShareContext.Provider value={contextValue}>
      {children}
    </ShareContext.Provider>
  );
};

// ============================================================================
// 错误边界组件 (Error Boundary Component)
// ============================================================================

interface ShareErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 分享错误边界
 * Share Error Boundary
 */
export class ShareErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ShareErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): ShareErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ShareErrorBoundary] Caught error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="share-error-boundary">
          <h3>分享组件出现错误</h3>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            重试
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// ============================================================================
// 高阶组件 (Higher-Order Component)
// ============================================================================

/**
 * 带分享功能的高阶组件
 * Higher-Order Component with Share Functionality
 */
export const withShare = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.forwardRef<any, P & { shareConfig?: ShareConfig }>((props, ref) => {
    const { shareConfig, ...componentProps } = props;
    
    if (shareConfig) {
      return (
        <ShareProvider config={shareConfig}>
          <Component {...(componentProps as P)} ref={ref} />
        </ShareProvider>
      );
    }
    
    return <Component {...(componentProps as P)} ref={ref} />;
  });
};

// ============================================================================
// 工具函数 (Utility Functions)
// ============================================================================

/**
 * 检查分享支持
 * Check Share Support
 */
export const checkShareSupport = (): {
  supported: boolean;
  missing: string[];
  warnings: string[];
} => {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // 检查必需的API
  if (!window.localStorage) missing.push('localStorage');
  if (!window.crypto) missing.push('crypto');
  if (!window.URL) missing.push('URL');
  
  // 检查可选的API
  if (!window.RTCPeerConnection) warnings.push('WebRTC not supported');
  if (!window.WebSocket) warnings.push('WebSocket not supported');
  if (!navigator.clipboard) warnings.push('Clipboard API not supported');
  
  return {
    supported: missing.length === 0,
    missing,
    warnings
  };
};

/**
 * 创建默认配置
 * Create Default Configuration
 */
export const createDefaultConfig = (appId: string): ShareConfig => ({
  appId,
  connection: {
    mode: 'localStorage',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 2000,
    heartbeatInterval: 30000,
    qualityCheck: false
  },
  sync: {
    throttle: 100,
    batchSize: 10,
    compression: false,
    encryption: false,
    conflictResolution: 'latest',
    maxRetries: 3
  },
  ui: {
    theme: 'auto',
    language: 'zh',
    showStatus: true,
    showViewerCount: true,
    animations: true
  },
  permissions: {
    maxViewers: 10,
    allowAnonymous: true,
    requireAuth: false
  },
  storage: {
    provider: 'localStorage',
    prefix: 'share-',
    encryption: false,
    compression: false,
    ttl: 24 * 60 * 60 * 1000 // 24小时
  },
  security: {
    encryption: {
      enabled: false,
      algorithm: 'AES-256',
      keyRotation: 60 * 60 * 1000 // 1小时
    },
    validation: {
      enabled: true,
      checksums: true,
      signatures: false
    },
    privacy: {
      anonymizeIPs: true,
      dataMinimization: true,
      autoCleanup: true
    }
  }
});