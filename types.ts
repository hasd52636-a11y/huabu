
export type BlockType = 'text' | 'image' | 'video';
export type ProviderType = 'google' | 'openai-compatible' | 'zhipu' | 'shenma';

// 新增：神马和智谱API提供商类型
export type ModelProvider = 'google' | 'openai-compatible' | 'zhipu' | 'shenma';
export type VideoAPIProvider = 'openai' | 'dyu' | 'shenma' | 'zhipu';

// 新增：扩展的提供商配置
export interface ExtendedProviderConfig {
  provider: ModelProvider;
  apiKey: string;
  baseUrl: string;
  llmModel: string;
  imageModel: string;
  videoModel?: string;
  visionModel?: string;
  thinkingModel?: string;
}

export interface ProviderSettings {
  provider: ProviderType;
  modelId: string;
  apiKey?: string;
  baseUrl?: string; // For OpenAI-compatible services like Qwen, DeepSeek, etc.
}

// 新增：批量视频处理相关类型
export interface VideoItem {
  id: string;
  taskId: string;
  sceneId?: string;
  prompt: string;
  videoPrompt?: string;
  visualPrompt?: string;
  status: 'loading' | 'completed' | 'failed' | 'pending' | 'generating';
  progress: number;
  videoUrl?: string;
  error?: string;
  errorMessage?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: number;
  updatedAt?: number;
  completedAt?: number;
  downloadPath?: string;
  retryCount?: number;
  maxRetries?: number;
  lastRetryAt?: number;
  // Character guest integration fields
  characterId?: string;
  characterUrl?: string;
  characterTimestamps?: string;
  // Video generation parameters
  aspectRatio?: string;
  duration?: string;
  referenceImage?: string | string[];
}

export interface BatchScript {
  id: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoUrl?: string;
  error?: string;
  retryCount?: number;
}

export interface BatchGenerationState {
  id: string;
  items: VideoItem[];
  total: number;
  completed: number;
  failed: number;
  pending: number;
  status: 'idle' | 'processing' | 'completed' | 'paused';
  startedAt?: number;
  completedAt?: number;
}

// 新增：视频方向类型
export type VideoOrientation = 'landscape' | 'portrait';

// 新增：视频方向到宽高比的映射
export const VIDEO_ORIENTATION_MAPPING: Record<VideoOrientation, string> = {
  landscape: '16:9',
  portrait: '9:16'
} as const;

// 新增：向后兼容的BatchConfig类型（用于迁移）
export interface LegacyBatchConfig {
  videoDuration: number;
  processingInterval: number;
  aspectRatio: string; // 旧版本使用aspectRatio
  referenceImageUrl?: string;
  downloadPath?: string;
  maxRetries?: number;
  retryDelay?: number;
  enableNotifications?: boolean;
}

export interface BatchConfig {
  videoDuration: number;
  processingInterval: number;
  videoOrientation: VideoOrientation; // 替换 aspectRatio
  referenceImageUrl?: string;
  downloadPath?: string;
  maxRetries?: number;
  retryDelay?: number;
  enableNotifications?: boolean;
  autoDownload?: boolean; // 新增：自动下载选项
}

// 新增：配置迁移工具函数
export const migrateBatchConfig = (config: LegacyBatchConfig | BatchConfig): BatchConfig => {
  // 如果已经是新格式，直接返回
  if ('videoOrientation' in config) {
    return config;
  }

  // 从旧格式迁移到新格式
  const legacyConfig = config as LegacyBatchConfig;
  const videoOrientation: VideoOrientation = 
    legacyConfig.aspectRatio === '9:16' ? 'portrait' : 'landscape';

  return {
    videoDuration: legacyConfig.videoDuration,
    processingInterval: legacyConfig.processingInterval,
    videoOrientation,
    referenceImageUrl: legacyConfig.referenceImageUrl,
    downloadPath: legacyConfig.downloadPath,
    maxRetries: legacyConfig.maxRetries,
    retryDelay: legacyConfig.retryDelay,
    enableNotifications: legacyConfig.enableNotifications,
    autoDownload: false // 默认值
  };
};

// 新增：从视频方向获取宽高比
export const getAspectRatioFromOrientation = (orientation: VideoOrientation): string => {
  return VIDEO_ORIENTATION_MAPPING[orientation];
};

// 新增：从宽高比推断视频方向
export const getOrientationFromAspectRatio = (aspectRatio: string): VideoOrientation => {
  return aspectRatio === '9:16' ? 'portrait' : 'landscape';
};

// 新增：分镜导出相关类型
export type ExportLayout = '2x2' | '2x3' | '3x3' | '4x3' | 'main-2x2' | 'main-2x3' | 'main-3x3' | 'main-4x3';

// 新增：视频服务配置类型
export interface VideoServiceConfig {
  baseUrl: string;
  apiKey: string;
}

export interface VideoServiceConfigWithProvider extends VideoServiceConfig {
  provider?: VideoAPIProvider;
}

export interface VideoStatus {
  task_id: string;
  status: 'NOT_START' | 'SUBMITTED' | 'QUEUED' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE';
  progress: string;
  created_at?: number;
  submit_time?: number;
  start_time?: number;
  finish_time?: number;
  model?: string;
  duration?: number;
  seconds?: number; // Video duration in seconds
  size?: string;
  video_url?: string;
  fail_reason?: string;
  error?: {
    code: string;
    message: string;
  };
  object?: string;
  created?: number;
  choices?: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

export interface Character {
  id: string;
  username: string;
  permalink: string;
  profile_picture_url: string;
  url?: string;
  timestamps?: string;
  from_task?: string;
  created_at?: number;
  // Enhanced fields for character guest integration
  preview_image?: string;
  description?: string;
  tags?: string[];
  usage_count?: number;
  last_used?: number;
  status: 'creating' | 'ready' | 'error';
  error_message?: string;
}

export interface CreateCharacterOptions {
  url?: string;
  timestamps: string;
  from_task?: string;
}

export interface CharacterGuestOptions {
  characterUrl: string;
  characterTimestamps: string;
}

export interface CharacterUsageStats {
  characterId: string;
  totalUsage: number;
  successfulGenerations: number;
  failedGenerations: number;
  averageGenerationTime: number;
  lastUsed: number;
  popularVideoTypes: string[];
}

export interface CreateVideoOptions {
  model: 'sora-2' | 'sora-2-pro' | 'sora_video2' | 'sora_video2-portrait' | 'sora_video2-landscape' | 'sora_video2-portrait-hd' | 'sora_video2-portrait-15s' | 'sora_video2-portrait-hd-15s';
  aspect_ratio?: '16:9' | '9:16';
  duration?: 10 | 15 | 25;
  hd?: boolean;
  images?: string[];
  reference_image?: string;
  notify_hook?: string;
  watermark?: boolean;
  private?: boolean;
  character_url?: string;
  character_timestamps?: string;
  style?: string;
  storyboard?: boolean;
}

export interface TokenQuota {
  total_quota: number;
  used_quota: number;
  remaining_quota: number;
}

// ============================================================================
// NEW SIMPLIFIED CONFIGURATION STRUCTURE (API Config Persistence Fix)
// ============================================================================

/**
 * 提供商凭证配置 - 每个提供商只需配置一次
 * Provider credentials - configure once per provider
 */
export interface ProviderCredentials {
  apiKey: string;
  baseUrl: string;
  enabled: boolean;  // 是否启用此提供商
}

/**
 * 模态配置 - 选择使用哪个提供商和模型
 * Modality configuration - select which provider and model to use
 */
export interface ModalityConfig {
  provider: ProviderType;  // 选择使用哪个提供商
  modelId: string;         // 该提供商的哪个模型
}

/**
 * 新的简化配置结构
 * New simplified configuration structure
 * 
 * 设计理念：
 * 1. providers: 全局配置，每个提供商只需配置一次API密钥和Base URL
 * 2. text/image/video: 模态选择，选择使用哪个提供商
 */
export interface NewModelConfig {
  // 提供商凭证配置（全局，只需配置一次）
  providers: {
    google?: ProviderCredentials;
    'openai-compatible'?: ProviderCredentials;
    shenma?: ProviderCredentials;
    zhipu?: ProviderCredentials;
  };
  
  // 模态选择（选择使用哪个提供商）
  text: ModalityConfig;
  image: ModalityConfig;
  video: ModalityConfig;
  
  // 元数据
  _meta?: {
    version: string;
    lastSaved: number;
    lastValidated?: number;
  };
}

/**
 * 配置转换函数：将新配置转换为旧的ProviderSettings格式
 * 用于向后兼容和实际API调用
 */
export function getProviderSettings(
  config: NewModelConfig, 
  modality: 'text' | 'image' | 'video'
): ProviderSettings {
  const modalityConfig = config[modality];
  const credentials = config.providers[modalityConfig.provider];
  
  if (!credentials) {
    throw new Error(`Provider ${modalityConfig.provider} not configured`);
  }
  
  if (!credentials.enabled) {
    throw new Error(`Provider ${modalityConfig.provider} is disabled`);
  }
  
  return {
    provider: modalityConfig.provider,
    apiKey: credentials.apiKey,
    baseUrl: credentials.baseUrl,
    modelId: modalityConfig.modelId
  };
}

/**
 * 配置转换函数：将旧配置转换为新配置格式
 * 用于配置迁移
 */
export function convertLegacyToNewConfig(legacy: ModelConfig): NewModelConfig {
  const newConfig: NewModelConfig = {
    providers: {},
    text: { provider: legacy.text.provider, modelId: legacy.text.modelId },
    image: { provider: legacy.image.provider, modelId: legacy.image.modelId },
    video: { provider: legacy.video.provider, modelId: legacy.video.modelId },
    _meta: {
      version: '2.0',
      lastSaved: Date.now()
    }
  };

  // 提取所有提供商的凭证
  const providers = new Set<ProviderType>([
    legacy.text.provider,
    legacy.image.provider,
    legacy.video.provider
  ]);

  providers.forEach(provider => {
    // 从text/image/video中找到该提供商的配置
    const settings = [legacy.text, legacy.image, legacy.video].find(s => s.provider === provider);
    if (settings && settings.apiKey) {
      newConfig.providers[provider] = {
        apiKey: settings.apiKey,
        baseUrl: settings.baseUrl || '',
        enabled: true
      };
    }
  });

  return newConfig;
}

/**
 * 配置转换函数：将新配置转换为旧配置格式
 * 用于向后兼容
 */
export function convertNewToLegacyConfig(newConfig: NewModelConfig): ModelConfig {
  return {
    text: getProviderSettings(newConfig, 'text'),
    image: getProviderSettings(newConfig, 'image'),
    video: getProviderSettings(newConfig, 'video'),
    // 保留扩展配置以兼容现有代码
    zhipu: newConfig.providers.zhipu ? {
      provider: 'zhipu',
      apiKey: newConfig.providers.zhipu.apiKey,
      baseUrl: newConfig.providers.zhipu.baseUrl,
      llmModel: newConfig.text.provider === 'zhipu' ? newConfig.text.modelId : 'GLM-4-Flash',
      imageModel: newConfig.image.provider === 'zhipu' ? newConfig.image.modelId : 'CogView-3-Flash',
      videoModel: newConfig.video.provider === 'zhipu' ? newConfig.video.modelId : 'CogVideoX-Flash'
    } : undefined,
    shenma: newConfig.providers.shenma ? {
      provider: 'shenma',
      apiKey: newConfig.providers.shenma.apiKey,
      baseUrl: newConfig.providers.shenma.baseUrl,
      llmModel: newConfig.text.provider === 'shenma' ? newConfig.text.modelId : 'gpt-4o',
      imageModel: newConfig.image.provider === 'shenma' ? newConfig.image.modelId : 'nano-banana-hd',
      videoModel: newConfig.video.provider === 'shenma' ? newConfig.video.modelId : 'sora_video2'
    } : undefined
  };
}

// ============================================================================
// LEGACY CONFIGURATION STRUCTURE (Backward Compatibility)
// ============================================================================

export interface ModelConfig {
  text: ProviderSettings;
  image: ProviderSettings;
  video: ProviderSettings;
  // 新增：扩展配置支持神马和智谱
  zhipu?: ExtendedProviderConfig;
  shenma?: ExtendedProviderConfig;
}

export interface Block {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  status: 'idle' | 'processing' | 'error';
  number: string;
  fontSize?: number;
  textColor?: string;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '9:16';
  isCropped?: boolean;
  duration?: '10' | '15' | '25';
  // 角色客串相关字段
  characterId?: string;
  characterUrl?: string;
  characterTimestamps?: string;
  // 存储已创建的角色列表
  availableCharacters?: Character[];
  
  // 图片功能增强字段
  originalPrompt?: string;     // 生成时使用的原始提示词
  imageMetadata?: {           // 图片元数据
    width?: number;
    height?: number;
    aspectRatio?: string;
    model?: string;
    generatedAt?: number;
    fileSize?: number;
  };
  
  // 多图生成相关字段
  multiImageGroupId?: string; // 所属多图组ID
  multiImageIndex?: number;   // 在多图组中的索引
  isMultiImageSource?: boolean; // 是否为多图源模块
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  instruction: string;
}

// Enhanced Connection interface for automation data flow
export interface EnhancedConnection extends Connection {
  dataFlow: {
    enabled: boolean;
    lastUpdate: number;
    dataType: 'text' | 'image' | 'video';
    lastData?: string; // Cache of last transmitted data
  };
}

// Data structure for block output/input
export interface BlockData {
  blockId: string;
  blockNumber: string;
  content: string;
  type: BlockType;
  timestamp: number;
}

// Variable reference for prompt enhancement
export interface VariableReference {
  variable: string;        // e.g., "[A01]"
  blockNumber: string;     // e.g., "A01"
  position: [number, number]; // start, end positions in text
}

// Validation result for connections and variables
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'circular_dependency' | 'invalid_variable' | 'missing_block' | 'type_mismatch';
  message: string;
  blockId?: string;
  connectionId?: string;
}

export interface ValidationWarning {
  type: 'performance' | 'compatibility' | 'best_practice';
  message: string;
  blockId?: string;
}

export interface AppState {
  blocks: Block[];
  connections: Connection[];
  zoom: number;
  pan: { x: number; y: number };
  theme: 'light' | 'dark';
  selectedBlockIds: string[];
  sidebarWidth: number;
  modelConfig: ModelConfig;
}

export interface FrameData {
  id: string;
  prompt: string;
  referenceImage?: string;
}

// My Prompt feature types
export interface PresetPrompt {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresetPromptStorage {
  version: string;
  prompts: PresetPrompt[];
  selectedIndex: number | null;
  lastUpdated: Date;
}

// Template Management types for automation
export interface Template {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  canvasState: CanvasState;
  metadata: {
    blockCount: number;
    connectionCount: number;
    hasFileInput: boolean;
  };
  // Automation template fields
  isAutomation?: boolean;
  automationConfig?: AutomationConfig;
}

export interface CanvasState {
  blocks: Block[];
  connections: EnhancedConnection[];
  settings: {
    zoom: number;
    pan: { x: number; y: number };
  };
  attachments?: AttachmentData[];
}

// Enhanced Canvas State for automation templates
export interface EnhancedCanvasState extends CanvasState {
  isAutomation?: boolean;
  automationConfig?: AutomationConfig;
  batchInputConfig?: BatchInputConfig;
}

export interface AttachmentData {
  id: string;
  name: string;
  type: 'text' | 'image';
  content: string;
  size: number;
}

export interface TemplateStorage {
  version: string;
  templates: Template[];
  lastUpdated: Date;
}
// Execution History types for automation
export interface ExecutionRecord {
  id: string;
  templateId?: string;
  templateName: string;
  executionType: 'manual' | 'scheduled' | 'batch';
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  totalBlocks: number;
  completedBlocks: number;
  failedBlocks: number;
  skippedBlocks: number;
  results: ExecutionBlockResult[];
  configuration: ExecutionConfiguration;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionBlockResult {
  blockId: string;
  blockNumber: string;
  blockType: 'text' | 'image' | 'video';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  duration?: number;
  input?: string;
  output?: string;
  outputUrl?: string;
  error?: string;
  retryCount?: number;
}

export interface ExecutionConfiguration {
  templateId?: string;
  batchInputs?: string[];
  variables?: Record<string, string>;
  scheduledTime?: number;
  downloadConfig?: {
    enabled: boolean;
    directory?: string;
    organizationPattern?: string;
  };
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
}

export interface ExecutionStatistics {
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;
  averageDuration: number;
  totalBlocksProcessed: number;
  successRate: number;
  mostUsedTemplates: Array<{ templateName: string; count: number }>;
  executionsByType: Record<string, number>;
  executionsByDay: Array<{ date: string; count: number }>;
}

export interface HistoryFilter {
  templateId?: string;
  templateName?: string;
  executionType?: 'manual' | 'scheduled' | 'batch';
  status?: 'running' | 'completed' | 'failed' | 'cancelled';
  dateRange?: {
    start: number;
    end: number;
  };
  limit?: number;
  offset?: number;
}
// Error Handling Types
export type ErrorType = 'network' | 'api' | 'rate_limit' | 'validation' | 'system' | 'timeout' | 'quota' | 'authentication' | 'permission' | 'format' | 'resource';

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  stack?: string;
  context: {
    blockId: string;
    executionId: string;
    operation: string;
    attempt: number;
  };
  timestamp: number;
  recoverable: boolean;
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface ExecutionError {
  blockId: string;
  message: string;
  timestamp: number;
  type?: ErrorType;
  context?: string;
  stack?: string;
}

// Resource Management Types
export interface ResourceUsage {
  memory: number; // MB
  cpu: number; // percentage
  activeConnections: number;
}

export interface ResourceLimits {
  maxMemory: number;
  maxCpu: number;
  maxConnections: number;
  maxConcurrentExecutions: number;
  apiRateLimit: number; // requests per minute
}

export interface ResourceAllocation {
  executionId: string;
  allocatedResources: ResourceUsage;
  priority: ExecutionPriority;
  timestamp: number;
}

export type ExecutionPriority = 'low' | 'normal' | 'high';

// Security and Privacy Types
export interface SecurityConfig {
  localProcessingOnly: boolean;
  autoCleanup: boolean;
  encryptSensitiveData: boolean;
  secureNetworkOnly: boolean;
  dataRetentionDays: number;
}

export interface EncryptionKey {
  id: string;
  key: string;
  algorithm: string;
  created: number;
}

export interface SecureData {
  encrypted: boolean;
  data: string;
  classification: DataClassification;
  timestamp: number;
}

export type DataClassification = 'public' | 'personal' | 'sensitive';

// State Management Types for Recovery
export interface ExecutionState {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentBlockId: string;
  completedBlocks: string[];
  progress: number;
  startTime: number;
  variables: Record<string, any>;
  errors: ExecutionError[];
}

export interface WorkflowState {
  id: string;
  blocks: Block[];
  connections: EnhancedConnection[];
  variables: Record<string, any>;
  lastModified: number;
}

export interface AutomationState {
  isRunning: boolean;
  currentExecution?: string;
  queuedExecutions: string[];
  activeSchedules: string[];
  resourceUsage: ResourceUsage;
}

// Automation Template Configuration Types
export interface AutomationConfig {
  mode: 'conservative' | 'standard' | 'fast';
  pauseOnError: boolean;
  enableSmartInterval: boolean;
}

export interface BatchInputConfig {
  supportedFileTypes: string[];
  maxFileSize: number;
  maxFileCount: number;
}

// Batch Input Source Types
export interface BatchInputSource {
  type: 'delimited_file' | 'multiple_files';
  source: DelimitedFileSource | MultipleFilesSource;
}

export interface DelimitedFileSource {
  file: File;
  delimiter: string;    // 分隔符：换行符、分号、逗号等
  contentColumn?: number; // 如果是CSV，指定内容列
  hasHeader?: boolean;    // 是否包含标题行
}

export interface MultipleFilesSource {
  files: File[];
  maxFileSize: number;   // 5MB per file
  maxFileCount: number;  // 100 files max
}

// Batch Execution Queue Types
export interface BatchExecutionQueue {
  id: string;
  templateId: string;
  inputSource: BatchInputSource;
  processedItems: BatchItem[];
  currentItemIndex: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'error';
  progress: BatchExecutionProgress;
}

export interface BatchItem {
  id: string;
  content: string;
  metadata?: {
    fileName?: string;
    lineNumber?: number;
    folderPath?: string;
  };
  type: 'text' | 'image';
  targetBlockId: string;
}

export interface BatchExecutionProgress {
  totalItems: number;
  processedItems: number;
  currentItem: string;
  estimatedTimeRemaining: number;
}

// Component Props for Automation UI
export interface AutomationControlPanelProps {
  isAutomationTemplate: boolean;
  onBatchInputConfig: () => void;
  onStartExecution: (source: BatchInputSource) => void;
  onPauseExecution: () => void;
  onStopExecution: () => void;
  executionProgress?: ExecutionProgress;
}

export interface SaveTemplateDialogProps {
  isOpen: boolean;
  templateName: string;
  onSave: (name: string, isAutomation: boolean) => void;
  onCancel: () => void;
}

export interface BatchInputConfigProps {
  onConfigComplete: (source: BatchInputSource) => void;
  onCancel: () => void;
}

// Import ExecutionProgress from AutoExecutionService
export interface ExecutionProgress {
  currentNodeIndex: number;
  totalNodes: number;
  currentNodeId: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  startTime?: number;
  estimatedEndTime?: number;
  errorMessage?: string;
  executionHistory: ExecutionRecord[];
}

// 多图生成功能相关类型定义
export interface MultiImageConfig {
  count: number; // 2-10
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '4:5' | '5:4' | '2:3' | '3:2' | '21:9';
  imageSize?: '1K' | '2K' | '4K';
  model?: 'nano-banana' | 'nano-banana-hd' | 'nano-banana-2';
  layoutPreference?: 'grid' | 'horizontal' | 'vertical';
  projectToCanvas: boolean; // 是否投射到画布
  enableLayoutOptimization?: boolean; // 是否启用智能布局优化
}

export interface MultiImageGroup {
  id: string;
  sourceBlockId: string;
  generatedBlockIds: string[];
  createdAt: number;
  prompt: string;
  config: MultiImageConfig;
}

export interface MultiImageGroup {
  id: string;
  sourceBlockId: string;
  generatedBlockIds: string[];
  createdAt: number;
  prompt: string;
  config: MultiImageConfig;
}

export interface MultiImageState {
  groups: Map<string, MultiImageGroup>;
  activeGenerations: Map<string, GenerationProgress>;
}

export interface GenerationProgress {
  sourceBlockId: string;
  totalCount: number;
  completedCount: number;
  status: 'configuring' | 'generating' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface LayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number; // 在多图组中的索引
}

export interface ProcessedImage {
  url: string;
  base64?: string;
  index: number;
  status: 'loading' | 'ready' | 'error';
  error?: string;
}

// Enhanced Multi-Image Generation Types
export interface ImageSet {
  images: ProcessedImage[];
  metadata: {
    totalCount: number;
    successCount: number;
    failedCount: number;
    averageGenerationTime: number;
    consistencyScore: number;
  };
  layout: LayoutResult;
}

export interface ConsistencyReport {
  overallScore: number; // 0-1, higher is more consistent
  styleConsistency: number; // 0-1
  colorConsistency: number; // 0-1
  compositionConsistency: number; // 0-1
  recommendations: string[];
  issues: ConsistencyIssue[];
}

export interface ConsistencyIssue {
  type: 'style_mismatch' | 'color_deviation' | 'composition_variance' | 'quality_difference';
  severity: 'low' | 'medium' | 'high';
  affectedImages: number[];
  description: string;
  suggestion: string;
}

export interface LayoutResult {
  positions: LayoutPosition[];
  canvasSize: Dimensions;
  spacing: number;
  arrangement: 'grid' | 'horizontal' | 'vertical' | 'custom';
  metadata: {
    totalArea: number;
    efficiency: number; // 0-1, how well space is utilized
    visualBalance: number; // 0-1, how balanced the layout appears
  };
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface ErrorRecoveryAction {
  type: 'reduce_count' | 'retry' | 'manual_retry';
  suggestedCount?: number;
  retryDelay?: number;
  message: string;
}

// Multi-image editing types
export interface ImageInput {
  source: File | string;
  weight?: number;
  role?: 'primary' | 'reference' | 'style';
}

export interface EditResult {
  resultImage: string;
  metadata: {
    operation: string;
    timestamp: number;
    inputCount: number;
    processingTime: number;
  };
}

export interface BatchEditOperation {
  id: string;
  prompt: string;
  images: ImageInput[];
  options: ShenmaImageEditOptions;
}

export interface EditOperation {
  id: string;
  type: 'multi_edit' | 'variation' | 'batch_edit';
  inputs: ImageInput[];
  result: EditResult;
  timestamp: number;
}

export interface ImageEditSession {
  id: string;
  createdAt: number;
  operations: EditOperation[];
  currentState: {
    images: ImageInput[];
    prompt: string;
    options: ShenmaImageEditOptions;
  };
  history: EditOperation[];
  metadata: {
    totalOperations: number;
    totalProcessingTime: number;
    successRate: number;
  };
}

export interface EditPreset {
  id: string;
  name: string;
  description: string;
  options: Partial<ShenmaImageEditOptions>;
  category: 'style_transfer' | 'composition' | 'enhancement' | 'creative' | 'technical';
  thumbnail?: string;
  promptTemplate?: string; // 提示词模板，用于自动填充提示词
}

// Import ShenmaImageEditOptions from shenmaService
export interface ShenmaImageEditOptions {
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '4:5' | '5:4' | '2:3' | '3:2' | '21:9';
  imageSize?: '1K' | '2K' | '4K';
  responseFormat?: 'url' | 'b64_json';
  model?: 'nano-banana' | 'gpt-image-1' | 'flux-kontext-pro' | 'flux-kontext-max' | 'high-quality' | 'byteedit-v2.0';
  
  // Advanced parameters for multi-image editing
  seed?: number;
  guidanceScale?: number;
  negativePrompt?: string;
  steps?: number;
  
  // Multi-image specific options
  compositionMode?: 'blend' | 'reference' | 'style_transfer';
  imageWeights?: number[]; // Weight for each input image
  
  // Async mode options
  async?: boolean; // Enable asynchronous mode
  webhook?: string; // Webhook URL for async task completion notifications
  
  // Volc API options
  isVolcAPI?: boolean; // Whether to use Volc API
  req_key?: string; // Volc API request key
  image_urls?: string[]; // Image URLs for Volc API
  binary_data_base64?: string[]; // Base64 image data for Volc API
  return_url?: boolean; // Whether to return URL in Volc API response
  
  // Advanced editing options
  maskImage?: string; // Mask image for inpainting/outpainting
}

// Advanced video editing types
export interface VideoInput {
  source: File | string;
  type: 'video' | 'image';
  metadata?: {
    duration?: number;
    width?: number;
    height?: number;
    format?: string;
  };
}

export interface VideoAdvancedEditOptions {
  type: 'character-replace' | 'multi-image-to-video' | 'dance' | 'style-transfer' | 'image-to-action';
  sourceVideo?: string;
  sourceImages?: (File | string)[];
  targetCharacter?: Character;
  danceStyle?: string;
  styleReference?: string;
  model?: 'sora-2' | 'sora-2-pro' | 'sora_video2';
  aspectRatio?: '16:9' | '9:16';
  duration?: '10' | '15' | '25';
  hd?: boolean;
}

// Mask editing types
export interface MaskLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  canvas: HTMLCanvasElement;
}

export interface MaskEditingTool {
  type: 'brush' | 'eraser' | 'rectangle' | 'circle' | 'polygon' | 'magic_wand';
  size: number;
  opacity: number;
  hardness?: number;
  feather?: number;
}

export interface MaskEditingState {
  tool: MaskEditingTool;
  layers: MaskLayer[];
  activeLayerId: string;
  zoom: number;
  pan: { x: number; y: number };
  showMask: boolean;
  maskOpacity: number;
}

// Smear editing types
export interface SmearEditingOptions {
  brushSize: number;
  tool: 'brush' | 'eraser';
  opacity: number;
  hardness: number;
  flow: number;
}

export interface SmearEditingResult {
  maskDataUrl: string;
  editedImageUrl?: string;
  metadata: {
    toolUsed: string;
    editingTime: number;
    brushStrokes: number;
    affectedArea: number; // percentage of image affected
  };
}

// ============================================================================\n// FEATURE ASSEMBLY SYSTEM\n// ============================================================================\n
/**\n * 功能模块定义\n * Feature module definition\n */
export interface FeatureModule {
  id: string;               // 功能唯一标识
  name: string;             // 功能名称
  description: string;      // 功能描述
  icon?: string;            // 功能图标
  type: 'image' | 'text' | 'video' | 'voice' | 'general';  // 功能类型
  requiredModels: string[]; // 支持的模型列表
  requiredProviders?: string[]; // 支持的API提供商列表，为空表示所有提供商都支持
  category: 'basic' | 'advanced' | 'experimental'; // 功能分类
  enabled?: boolean;        // 是否启用
  priority?: number;        // 优先级，用于排序
  config?: any;             // 功能配置
}

/**\n * 菜单项配置\n * Menu item configuration\n */
export interface MenuItem {
  id: string;               // 菜单项唯一标识
  label: string;            // 菜单项显示文本
  icon?: string;            // 菜单项图标
  action: string;           // 点击事件类型
  featureId?: string;       // 关联的功能模块ID
  disabled?: boolean;       // 是否禁用
  children?: MenuItem[];    // 子菜单项
  hotkey?: string;          // 快捷键
}

/**\n * 菜单配置\n * Menu configuration\n */
export interface MenuConfig {
  id: string;               // 配置唯一标识
  name: string;             // 配置名称
  description?: string;     // 配置描述
  createdAt: number;        // 创建时间
  updatedAt: number;        // 更新时间
  type: 'floating' | 'context' | 'sidebar';  // 菜单类型
  items: MenuItem[];        // 菜单项列表
  active?: boolean;         // 是否为当前活动配置
}

/**\n * 功能管理状态\n * Feature assembly status\n */
export interface FeatureAssemblyState {
  availableFeatures: FeatureModule[];  // 可用功能列表
  activeFeatures: string[];            // 当前启用的功能ID列表
  menuConfigs: MenuConfig[];           // 菜单配置列表
  currentMenuConfigId?: string;        // 当前使用的菜单配置ID
  modelCapabilities: Record<string, string[]>;  // 模型能力映射
}

/**\n * 功能管理事件类型\n * Feature assembly event types\n */
export type FeatureAssemblyEvent = 
  | { type: 'ADD_FEATURE'; featureId: string }
  | { type: 'REMOVE_FEATURE'; featureId: string }
  | { type: 'TOGGLE_FEATURE'; featureId: string }
  | { type: 'APPLY_FEATURES'; featureIds: string[] }
  | { type: 'LOAD_MENU_CONFIG'; configId: string }
  | { type: 'SAVE_MENU_CONFIG'; config: MenuConfig }
  | { type: 'DELETE_MENU_CONFIG'; configId: string }
  | { type: 'UPDATE_MODEL_CAPABILITIES'; model: string; capabilities: string[] };

/**\n * 功能管理面板属性\n * Feature assembly panel props\n */
export interface FeatureAssemblyPanelProps {
  currentModel: string;     // 当前使用的模型
  currentProvider: string;  // 当前使用的API接口名（提供商名）
  onFeatureChange: (features: string[]) => void;  // 功能变更回调
  onMenuConfigChange: (config: MenuConfig) => void;  // 菜单配置变更回调
  initialFeatures?: string[];  // 初始启用的功能列表
  initialMenuConfig?: MenuConfig;  // 初始菜单配置
}