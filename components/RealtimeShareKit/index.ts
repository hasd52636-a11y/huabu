/**
 * 可插拔实时同屏分享组件套件
 * Pluggable Real-time Screen Sharing Component Kit
 * 
 * 设计理念：
 * 1. 零依赖集成 - 只需要React和基础Web API
 * 2. 渐进增强 - 从简单localStorage到完整P2P
 * 3. 类型安全 - 完整的TypeScript支持
 * 4. 高性能 - 智能数据同步和连接管理
 */

// 核心导出
export { ShareProvider } from './core/ShareProvider';
export { ShareManager } from './core/ShareManager';

// 组件导出
export { ShareButton } from './components/ShareButton';
export { ViewerPage } from './components/ViewerPage';
export { ShareStatus } from './components/ShareStatus';
export { ConnectionIndicator } from './components/ConnectionIndicator';

// Hooks导出
export { useShare } from './hooks/useShare';
export { useViewer } from './hooks/useViewer';
export { useConnection } from './hooks/useConnection';
export { useShareStatus } from './hooks/useShareStatus';

// 服务导出
export { ConnectionService } from './services/ConnectionService';
export { DataSyncService } from './services/DataSyncService';
export { StorageService } from './services/StorageService';

// 类型导出
export type {
  ShareConfig,
  ShareableData,
  ShareEvents,
  ShareController,
  ConnectionConfig,
  SyncConfig,
  UIConfig,
  PermissionConfig,
  ViewerInfo,
  ConnectionStatus,
  ShareError,
  ShareMode,
  DataSyncOptions,
  StorageOptions
} from './types';

// 工具导出
export { 
  generateShareId,
  validateShareId,
  encryptData,
  decryptData,
  compressData,
  decompressData
} from './utils';

// 预设配置导出
export {
  DEFAULT_SHARE_CONFIG,
  MINIMAL_SHARE_CONFIG,
  ENTERPRISE_SHARE_CONFIG
} from './presets';

// 版本信息
export const VERSION = '1.0.0';
export const COMPATIBLE_REACT_VERSIONS = '>=18.0.0';

/**
 * 快速开始示例
 * Quick Start Example
 */
export const QuickStartExample = `
import { ShareProvider, ShareButton, useShare } from '@realtime-share-kit/react';

function App() {
  return (
    <ShareProvider config={{ appId: 'my-app' }}>
      <MyCanvas />
      <ShareButton />
    </ShareProvider>
  );
}

function MyCanvas() {
  const { shareData, isSharing } = useShare();
  
  const handleDataChange = (data) => {
    shareData(data);
  };
  
  return <div>Your content here</div>;
}
`;

/**
 * 组件特性
 * Component Features
 */
export const FEATURES = {
  // 核心特性
  core: [
    '零配置启动',
    '渐进式增强',
    '类型安全',
    '高性能同步'
  ],
  
  // 连接特性
  connection: [
    'P2P直连',
    '自动重连',
    '连接降级',
    '质量监控'
  ],
  
  // 安全特性
  security: [
    '端到端加密',
    '访问控制',
    '数据验证',
    '会话管理'
  ],
  
  // 用户体验
  ux: [
    '实时状态',
    '错误恢复',
    '离线支持',
    '响应式设计'
  ]
};

/**
 * 浏览器兼容性检查
 * Browser Compatibility Check
 */
export const checkCompatibility = (): {
  compatible: boolean;
  missing: string[];
  warnings: string[];
} => {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // 检查必需的API
  if (!window.localStorage) missing.push('localStorage');
  if (!window.WebSocket) missing.push('WebSocket');
  if (!window.crypto) missing.push('crypto');
  
  // 检查可选的API
  if (!window.RTCPeerConnection) warnings.push('WebRTC not supported - will use fallback');
  if (!navigator.mediaDevices) warnings.push('MediaDevices not supported - limited functionality');
  
  return {
    compatible: missing.length === 0,
    missing,
    warnings
  };
};

/**
 * 性能监控
 * Performance Monitoring
 */
export const getPerformanceMetrics = () => {
  return {
    memory: (performance as any).memory ? {
      used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
    } : null,
    timing: performance.timing ? {
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
    } : null,
    connection: (navigator as any).connection ? {
      type: (navigator as any).connection.effectiveType,
      downlink: (navigator as any).connection.downlink,
      rtt: (navigator as any).connection.rtt
    } : null
  };
};