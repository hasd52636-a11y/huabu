/**
 * 实时分享组件类型定义
 * Real-time Share Component Type Definitions
 */

import { ReactNode } from 'react';

// ============================================================================
// 核心数据类型 (Core Data Types)
// ============================================================================

/**
 * 可分享的数据结构
 * Shareable Data Structure
 */
export interface ShareableData {
  id: string;                    // 数据唯一标识
  type: string;                  // 数据类型 (canvas, block, connection, etc.)
  content: any;                  // 数据内容
  timestamp: number;             // 时间戳
  version?: number;              // 数据版本号
  metadata?: Record<string, any>; // 元数据
  checksum?: string;             // 数据校验和
}

/**
 * 分享会话信息
 * Share Session Information
 */
export interface ShareSession {
  id: string;                    // 会话ID
  hostId: string;                // 主持人ID
  title?: string;                // 会话标题
  createdAt: number;             // 创建时间
  lastUpdate: number;            // 最后更新时间
  isActive: boolean;             // 是否活跃
  data: ShareableData[];         // 共享数据
  viewers: ViewerInfo[];         // 观看者列表
  settings: SessionSettings;     // 会话设置
}

/**
 * 观看者信息
 * Viewer Information
 */
export interface ViewerInfo {
  id: string;                    // 观看者ID
  name?: string;                 // 观看者名称
  joinTime: number;              // 加入时间
  lastSeen: number;              // 最后活跃时间
  connectionType: ConnectionType; // 连接类型
  status: 'connected' | 'disconnected' | 'reconnecting';
  metadata?: Record<string, any>; // 观看者元数据
}

/**
 * 会话设置
 * Session Settings
 */
export interface SessionSettings {
  maxViewers: number;            // 最大观看者数量
  allowAnonymous: boolean;       // 允许匿名观看
  requireAuth: boolean;          // 需要认证
  autoCleanup: boolean;          // 自动清理
  sessionTimeout: number;        // 会话超时时间（毫秒）
  dataRetention: number;         // 数据保留时间（毫秒）
}

// ============================================================================
// 配置类型 (Configuration Types)
// ============================================================================

/**
 * 分享配置
 * Share Configuration
 */
export interface ShareConfig {
  appId: string;                 // 应用ID
  appName?: string;              // 应用名称
  connection?: ConnectionConfig; // 连接配置
  sync?: SyncConfig;            // 同步配置
  ui?: UIConfig;                // UI配置
  permissions?: PermissionConfig; // 权限配置
  storage?: StorageConfig;       // 存储配置
  security?: SecurityConfig;     // 安全配置
}

/**
 * 连接配置
 * Connection Configuration
 */
export interface ConnectionConfig {
  mode: ConnectionMode;          // 连接模式
  servers?: string[];            // STUN/TURN服务器
  timeout: number;              // 连接超时时间
  retryAttempts: number;        // 重试次数
  retryDelay: number;           // 重试延迟
  heartbeatInterval: number;    // 心跳间隔
  qualityCheck: boolean;        // 连接质量检查
}

/**
 * 同步配置
 * Sync Configuration
 */
export interface SyncConfig {
  throttle: number;             // 数据同步节流（毫秒）
  batchSize: number;            // 批量传输大小
  compression: boolean;         // 启用数据压缩
  encryption: boolean;          // 启用数据加密
  conflictResolution: 'latest' | 'merge' | 'manual'; // 冲突解决策略
  maxRetries: number;           // 最大重试次数
}

/**
 * UI配置
 * UI Configuration
 */
export interface UIConfig {
  theme: 'light' | 'dark' | 'auto'; // 主题
  language: 'zh' | 'en';        // 语言
  showStatus: boolean;          // 显示连接状态
  showViewerCount: boolean;     // 显示观看者数量
  customStyles?: Record<string, any>; // 自定义样式
  animations: boolean;          // 启用动画
}

/**
 * 权限配置
 * Permission Configuration
 */
export interface PermissionConfig {
  maxViewers: number;           // 最大观看者数量
  allowAnonymous: boolean;      // 允许匿名观看
  requireAuth: boolean;         // 需要认证
  allowedDomains?: string[];    // 允许的域名
  blockedIPs?: string[];        // 阻止的IP
}

/**
 * 存储配置
 * Storage Configuration
 */
export interface StorageConfig {
  provider: 'localStorage' | 'sessionStorage' | 'indexedDB' | 'memory';
  prefix: string;               // 存储键前缀
  encryption: boolean;          // 存储加密
  compression: boolean;         // 存储压缩
  ttl: number;                 // 数据生存时间
}

/**
 * 安全配置
 * Security Configuration
 */
export interface SecurityConfig {
  encryption: {
    enabled: boolean;
    algorithm: 'AES-256' | 'ChaCha20';
    keyRotation: number;        // 密钥轮换间隔（毫秒）
  };
  validation: {
    enabled: boolean;
    checksums: boolean;
    signatures: boolean;
  };
  privacy: {
    anonymizeIPs: boolean;
    dataMinimization: boolean;
    autoCleanup: boolean;
  };
}

// ============================================================================
// 连接类型 (Connection Types)
// ============================================================================

/**
 * 连接模式
 * Connection Mode
 */
export type ConnectionMode = 
  | 'p2p'           // P2P直连
  | 'server'        // 服务器中转
  | 'hybrid'        // 混合模式
  | 'localStorage'; // 本地存储（开发/演示）

/**
 * 连接类型
 * Connection Type
 */
export type ConnectionType = 
  | 'webrtc'        // WebRTC连接
  | 'websocket'     // WebSocket连接
  | 'polling'       // 轮询连接
  | 'localStorage'; // 本地存储

/**
 * 连接状态
 * Connection Status
 */
export interface ConnectionStatus {
  type: ConnectionType;
  state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number;              // 延迟（毫秒）
  bandwidth: number;            // 带宽（kbps）
  stability: number;            // 稳定性（0-1）
  lastUpdate: number;           // 最后更新时间
  reconnectAttempts: number;    // 重连尝试次数
  error?: ShareError;           // 错误信息
}

// ============================================================================
// 事件类型 (Event Types)
// ============================================================================

/**
 * 分享事件
 * Share Events
 */
export interface ShareEvents {
  onShareStart?: (shareId: string) => void;
  onShareEnd?: () => void;
  onViewerJoin?: (viewer: ViewerInfo) => void;
  onViewerLeave?: (viewerId: string) => void;
  onDataSync?: (data: ShareableData) => void;
  onDataConflict?: (local: ShareableData, remote: ShareableData) => ShareableData;
  onConnectionChange?: (status: ConnectionStatus) => void;
  onError?: (error: ShareError) => void;
}

/**
 * 分享错误
 * Share Error
 */
export interface ShareError {
  code: string;
  message: string;
  type: 'connection' | 'sync' | 'permission' | 'validation' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  context?: Record<string, any>;
  recoverable: boolean;
  retryable: boolean;
}

// ============================================================================
// 控制接口 (Control Interfaces)
// ============================================================================

/**
 * 分享控制器
 * Share Controller
 */
export interface ShareController {
  // 会话管理
  startShare(title?: string): Promise<string>;
  endShare(): Promise<void>;
  getSession(): ShareSession | null;
  
  // 数据管理
  shareData(data: ShareableData): void;
  updateData(id: string, data: Partial<ShareableData>): void;
  removeData(id: string): void;
  getData(id?: string): ShareableData | ShareableData[];
  
  // 观看者管理
  getViewers(): ViewerInfo[];
  kickViewer(viewerId: string): void;
  
  // 连接管理
  getConnectionStatus(): ConnectionStatus;
  reconnect(): Promise<void>;
  
  // 状态查询
  isSharing(): boolean;
  isViewing(): boolean;
  getShareId(): string | null;
}

/**
 * 观看控制器
 * Viewer Controller
 */
export interface ViewerController {
  // 会话管理
  joinSession(shareId: string): Promise<void>;
  leaveSession(): Promise<void>;
  
  // 数据访问
  getData(): ShareableData[];
  subscribeToUpdates(callback: (data: ShareableData) => void): () => void;
  
  // 连接管理
  getConnectionStatus(): ConnectionStatus;
  reconnect(): Promise<void>;
  
  // 状态查询
  isConnected(): boolean;
  getSessionInfo(): Omit<ShareSession, 'data'> | null;
}

// ============================================================================
// 组件属性 (Component Props)
// ============================================================================

/**
 * 分享提供者属性
 * Share Provider Props
 */
export interface ShareProviderProps {
  config: ShareConfig;
  events?: ShareEvents;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * 分享按钮属性
 * Share Button Props
 */
export interface ShareButtonProps {
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  icon?: ReactNode;
  children?: ReactNode;
  onClick?: (shareId: string) => void;
}

/**
 * 观看页面属性
 * Viewer Page Props
 */
export interface ViewerPageProps {
  shareId: string;
  className?: string;
  style?: React.CSSProperties;
  showHeader?: boolean;
  showStatus?: boolean;
  onDataReceive?: (data: ShareableData) => void;
  onError?: (error: ShareError) => void;
  renderContent?: (data: ShareableData[]) => ReactNode;
}

/**
 * 分享状态属性
 * Share Status Props
 */
export interface ShareStatusProps {
  className?: string;
  style?: React.CSSProperties;
  showDetails?: boolean;
  showViewerCount?: boolean;
  showConnectionQuality?: boolean;
  compact?: boolean;
}

/**
 * 连接指示器属性
 * Connection Indicator Props
 */
export interface ConnectionIndicatorProps {
  className?: string;
  style?: React.CSSProperties;
  showLabel?: boolean;
  showLatency?: boolean;
  size?: 'small' | 'medium' | 'large';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// ============================================================================
// Hook返回类型 (Hook Return Types)
// ============================================================================

/**
 * useShare Hook返回类型
 * useShare Hook Return Type
 */
export interface UseShareReturn {
  // 状态
  isSharing: boolean;
  shareId: string | null;
  session: ShareSession | null;
  viewers: ViewerInfo[];
  connectionStatus: ConnectionStatus;
  
  // 操作
  startShare: (title?: string) => Promise<string>;
  endShare: () => Promise<void>;
  shareData: (data: ShareableData) => void;
  updateData: (id: string, data: Partial<ShareableData>) => void;
  removeData: (id: string) => void;
  
  // 工具
  generateShareUrl: (shareId?: string) => string;
  copyShareUrl: (shareId?: string) => Promise<void>;
}

/**
 * useViewer Hook返回类型
 * useViewer Hook Return Type
 */
export interface UseViewerReturn {
  // 状态
  isViewing: boolean;
  isConnected: boolean;
  shareId: string | null;
  sessionInfo: Omit<ShareSession, 'data'> | null;
  data: ShareableData[];
  connectionStatus: ConnectionStatus;
  
  // 操作
  joinSession: (shareId: string) => Promise<void>;
  leaveSession: () => Promise<void>;
  
  // 订阅
  subscribeToUpdates: (callback: (data: ShareableData) => void) => () => void;
}

/**
 * useConnection Hook返回类型
 * useConnection Hook Return Type
 */
export interface UseConnectionReturn {
  status: ConnectionStatus;
  isConnected: boolean;
  reconnect: () => Promise<void>;
  getMetrics: () => ConnectionMetrics;
}

/**
 * useShareStatus Hook返回类型
 * useShareStatus Hook Return Type
 */
export interface UseShareStatusReturn {
  isSharing: boolean;
  isViewing: boolean;
  shareId: string | null;
  viewerCount: number;
  connectionStatus: ConnectionStatus;
  lastUpdate: number;
}

// ============================================================================
// 服务接口 (Service Interfaces)
// ============================================================================

/**
 * 数据同步选项
 * Data Sync Options
 */
export interface DataSyncOptions {
  throttle?: number;
  compression?: boolean;
  encryption?: boolean;
  batchSize?: number;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * 存储选项
 * Storage Options
 */
export interface StorageOptions {
  provider?: 'localStorage' | 'sessionStorage' | 'indexedDB' | 'memory';
  encryption?: boolean;
  compression?: boolean;
  ttl?: number;
}

/**
 * 连接指标
 * Connection Metrics
 */
export interface ConnectionMetrics {
  latency: number;
  bandwidth: number;
  packetLoss: number;
  jitter: number;
  throughput: number;
  connectionTime: number;
  dataTransferred: number;
  reconnectCount: number;
}

// ============================================================================
// 分享模式 (Share Modes)
// ============================================================================

/**
 * 分享模式
 * Share Mode
 */
export type ShareMode = 
  | 'host'          // 主持人模式
  | 'viewer'        // 观看者模式
  | 'collaborative' // 协作模式
  | 'readonly';     // 只读模式

// ============================================================================
// 预设配置 (Preset Configurations)
// ============================================================================

/**
 * 预设配置类型
 * Preset Configuration Types
 */
export interface PresetConfig {
  name: string;
  description: string;
  config: ShareConfig;
  recommended: boolean;
  useCase: string[];
}

// ============================================================================
// 工具类型 (Utility Types)
// ============================================================================

/**
 * 深度部分类型
 * Deep Partial Type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 必需字段类型
 * Required Fields Type
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 可选字段类型
 * Optional Fields Type
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 事件处理器类型
 * Event Handler Type
 */
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

/**
 * 异步操作结果类型
 * Async Operation Result Type
 */
export type AsyncResult<T> = Promise<{
  success: boolean;
  data?: T;
  error?: ShareError;
}>;

// ============================================================================
// 常量定义 (Constants)
// ============================================================================

/**
 * 默认配置常量
 * Default Configuration Constants
 */
export const DEFAULT_VALUES = {
  CONNECTION_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
  HEARTBEAT_INTERVAL: 30000,
  SYNC_THROTTLE: 100,
  BATCH_SIZE: 10,
  MAX_VIEWERS: 10,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24小时
  DATA_RETENTION: 7 * 24 * 60 * 60 * 1000, // 7天
} as const;

/**
 * 错误代码常量
 * Error Code Constants
 */
export const ERROR_CODES = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  DATA_VALIDATION_FAILED: 'DATA_VALIDATION_FAILED',
  SYNC_CONFLICT: 'SYNC_CONFLICT',
  STORAGE_ERROR: 'STORAGE_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  BROWSER_NOT_SUPPORTED: 'BROWSER_NOT_SUPPORTED',
} as const;

/**
 * 事件类型常量
 * Event Type Constants
 */
export const EVENT_TYPES = {
  SHARE_START: 'share:start',
  SHARE_END: 'share:end',
  VIEWER_JOIN: 'viewer:join',
  VIEWER_LEAVE: 'viewer:leave',
  DATA_SYNC: 'data:sync',
  DATA_CONFLICT: 'data:conflict',
  CONNECTION_CHANGE: 'connection:change',
  ERROR: 'error',
} as const;