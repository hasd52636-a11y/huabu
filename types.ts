
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
  volcAccountId?: string;
  qwenWorkspace?: string;
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
// MULTI-MODEL TEXT CHAT TYPES
// ============================================================================

/**
 * 模型类型分类
 * Model type classification for better organization
 */
export type ModelType = 
  | 'fast-lightweight'    // 快速轻量型
  | 'deep-analysis'       // 深度分析型  
  | 'reasoning-focused'   // 推理专用型
  | 'network-enabled'     // 联网功能型
  | 'multimodal'          // 全模态型
  | 'standard';           // 标准型

/**
 * 模型能力标识
 * Model capability flags
 */
export interface ModelCapability {
  supportsImages: boolean;      // 支持图像分析
  supportsVideo: boolean;       // 支持视频分析
  supportsInternet: boolean;    // 支持联网搜索
  supportsThinking: boolean;    // 支持思维链推理
  supportsCodeExecution: boolean; // 支持代码执行
  isRecommended: boolean;       // 是否推荐使用
  isExperimental: boolean;      // 是否为实验性模型
}

/**
 * 模型信息定义
 * Complete model information structure
 */
export interface ModelInfo {
  id: string;                   // 模型ID，如 'gemini-3-pro-preview-thinking'
  name: string;                 // 显示名称，如 'Gemini 3.0 Pro (思维链)'
  description: string;          // 模型描述
  provider: ProviderType;       // 所属提供商
  type: ModelType;              // 模型类型分类
  capabilities: ModelCapability; // 模型能力
  pricing?: {                   // 价格信息（可选）
    input: number;              // 输入token价格（每1K tokens）
    output: number;             // 输出token价格（每1K tokens）
    currency: string;           // 货币单位
  };
  limits?: {                    // 限制信息（可选）
    maxTokens: number;          // 最大token数
    contextWindow: number;      // 上下文窗口大小
  };
  isAvailable: boolean;         // 是否可用
  lastUpdated: number;          // 最后更新时间
  platformInfo?: {              // 平台信息（可选）
    name: string;               // 平台名称
    icon: string;               // 平台图标
    color: string;              // 平台颜色
  };
}

/**
 * 智能路由配置
 * Smart routing configuration for automatic model selection
 */
export interface SmartRoutingConfig {
  enabled: boolean;             // 是否启用智能路由
  preferredModels: {            // 不同场景的首选模型
    quickResponse: string;      // 快速响应场景
    complexAnalysis: string;    // 复杂分析场景
    reasoning: string;          // 推理场景
    multimodal: string;         // 多模态场景
    internetSearch: string;     // 联网搜索场景
  };
  fallbackModel: string;        // 降级模型
  autoSwitch: boolean;          // 是否自动切换
}

/**
 * 用户偏好设置
 * User preference settings for model selection
 */
export interface UserPreferences {
  defaultTextModel: string;     // 默认文本模型
  smartRouting: SmartRoutingConfig; // 智能路由配置
  showModelCapabilities: boolean; // 是否显示模型能力标识
  showPricing: boolean;         // 是否显示价格信息
  autoSaveConversations: boolean; // 是否自动保存对话
  preferredLanguage: 'zh' | 'en'; // 首选语言
}

/**
 * 对话消息扩展
 * Extended conversation message with model information
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  modelId?: string;             // 使用的模型ID
  modelName?: string;           // 模型显示名称
  tokenUsage?: {                // token使用情况
    input: number;
    output: number;
    total: number;
  };
  attachments?: Array<{         // 附件信息
    type: 'image' | 'video' | 'file';
    url: string;
    name?: string;
  }>;
  metadata?: Record<string, any>; // 额外元数据
}

/**
 * 模型使用统计
 * Model usage statistics for analytics
 */
export interface ModelUsageStats {
  modelId: string;
  totalRequests: number;
  totalTokens: number;
  averageResponseTime: number;
  successRate: number;
  lastUsed: number;
  errorCount: number;
  userRating?: number;          // 用户评分（1-5）
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
 * 3. availableModels: 可用模型列表，支持动态模型管理
 * 4. userPreferences: 用户偏好设置
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
  
  // 新增：可用模型列表
  availableModels?: {
    text: ModelInfo[];          // 可用的文本模型列表
    image: ModelInfo[];         // 可用的图像模型列表  
    video: ModelInfo[];         // 可用的视频模型列表
  };
  
  // 新增：用户偏好设置
  userPreferences?: UserPreferences;
  
  // 新增：模型使用统计
  usageStats?: ModelUsageStats[];
  
  // 元数据
  _meta?: {
    version: string;
    lastSaved: number;
    lastValidated?: number;
    configVersion?: string;      // 配置版本，用于迁移（可选）
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
  
  // === VEO DEBUG: getProviderSettings ===
  console.log('[VEO-DEBUG] getProviderSettings called:', {
    modality,
    modalityConfig: modalityConfig,
    selectedModelId: modalityConfig.modelId,
    provider: modalityConfig.provider,
    hasCredentials: !!credentials,
    isVeoModel: modalityConfig.modelId && modalityConfig.modelId.includes('veo'),
    timestamp: new Date().toISOString(),
    buildId: 'VEO-FIX-' + Date.now()
  });
  
  if (!credentials) {
    throw new Error(`Provider ${modalityConfig.provider} not configured`);
  }
  
  if (!credentials.enabled) {
    throw new Error(`Provider ${modalityConfig.provider} is disabled`);
  }
  
  const result = {
    provider: modalityConfig.provider,
    apiKey: credentials.apiKey,
    baseUrl: credentials.baseUrl,
    modelId: modalityConfig.modelId
  };
  
  // === VEO DEBUG: getProviderSettings result ===
  console.log('[VEO-DEBUG] getProviderSettings result:', {
    result,
    isVeoModel: result.modelId && result.modelId.includes('veo'),
    timestamp: new Date().toISOString()
  });
  
  return result;
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
      llmModel: newConfig.text.provider === 'shenma' ? newConfig.text.modelId : 'gemini-2.0-flash-exp',
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
  
  // 附件相关字段
  attachmentContent?: string;   // 附件内容（文本块专用）
  attachmentFileName?: string;  // 附件文件名
  
  // 图片功能增强字段
  originalPrompt?: string;     // 生成时使用的原始提示词
  imageMetadata?: {           // 图片元数据
    width?: number;
    height?: number;
    aspectRatio?: string;
    model?: string;
    generatedAt?: number;
    fileSize?: number;
    originalReferenceImage?: string; // 参考图片
    referenceFileName?: string;      // 参考图片文件名
  };
  
  // 视频功能增强字段
  videoMetadata?: {           // 视频元数据
    duration?: number;
    aspectRatio?: string;
    model?: string;
    generatedAt?: number;
    fileSize?: number;
    originalReferenceVideo?: string; // 参考视频
    referenceFileName?: string;      // 参考视频文件名
  };
  
  // 多图生成相关字段
  multiImageGroupId?: string; // 所属多图组ID
  multiImageIndex?: number;   // 在多图组中的索引
  isMultiImageSource?: boolean; // 是否为多图源模块
  
  // 批量生成相关字段
  batchIndex?: number; // 批量生成时的索引
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
  // 扩展字段用于复合数据传输
  attachmentContent?: string;   // 附件内容
  instructionContent?: string;  // 指令内容
  generatedContent?: string;    // 生成结果内容
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
  customTitle?: string; // 用户自定义标题，最多8个字符
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

// ============================================================================
// PREDEFINED MODEL INFORMATION
// ============================================================================

/**
 * 预定义的神马API可用模型信息
 * Predefined model information for ShenmaAPI models
 */
export const SHENMA_TEXT_MODELS: ModelInfo[] = [
  {
    id: 'gemini-3-pro-preview-thinking-*',
    name: 'Gemini 3.0 Pro (思维链)',
    description: '最新的高级AI模型，支持深度思维链推理，适合复杂问题分析',
    provider: 'shenma',
    type: 'deep-analysis',
    capabilities: {
      supportsImages: true,
      supportsVideo: true,
      supportsInternet: false,
      supportsThinking: true,
      supportsCodeExecution: false,
      isRecommended: true,
      isExperimental: false
    },
    pricing: {
      input: 0.002,
      output: 0.012,
      currency: 'USD'
    },
    limits: {
      maxTokens: 4096,
      contextWindow: 32768
    },
    isAvailable: true,
    lastUpdated: Date.now()
  },
  {
    id: 'gemini-3-flash-preview-nothinking',
    name: 'Gemini 3.0 Flash (快速)',
    description: 'Google最新的高级AI模型，速度很快，智商和gemini-3-pro差不多',
    provider: 'shenma',
    type: 'fast-lightweight',
    capabilities: {
      supportsImages: true,
      supportsVideo: true,
      supportsInternet: false,
      supportsThinking: false,
      supportsCodeExecution: false,
      isRecommended: true,
      isExperimental: false
    },
    pricing: {
      input: 0.0005,
      output: 0.003,
      currency: 'USD'
    },
    limits: {
      maxTokens: 4096,
      contextWindow: 32768
    },
    isAvailable: true,
    lastUpdated: Date.now()
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3.0 Flash (标准)',
    description: 'Gemini 3.0 Flash标准版本，平衡速度和质量',
    provider: 'shenma',
    type: 'standard',
    capabilities: {
      supportsImages: true,
      supportsVideo: true,
      supportsInternet: false,
      supportsThinking: false,
      supportsCodeExecution: false,
      isRecommended: false,
      isExperimental: false
    },
    pricing: {
      input: 0.0005,
      output: 0.003,
      currency: 'USD'
    },
    limits: {
      maxTokens: 4096,
      contextWindow: 32768
    },
    isAvailable: true,
    lastUpdated: Date.now()
  },
  {
    id: 'gpt-4-all',
    name: 'GPT-4 All (联网版)',
    description: '集合官方GPT-4、联网、读图、绘图功能、code interpreter一体',
    provider: 'shenma',
    type: 'network-enabled',
    capabilities: {
      supportsImages: true,
      supportsVideo: false,
      supportsInternet: true,
      supportsThinking: false,
      supportsCodeExecution: true,
      isRecommended: true,
      isExperimental: false
    },
    pricing: {
      input: 0.002,
      output: 0.012,
      currency: 'USD'
    },
    limits: {
      maxTokens: 4096,
      contextWindow: 32768
    },
    isAvailable: true,
    lastUpdated: Date.now()
  },
  {
    id: 'gpt-4o-all',
    name: 'GPT-4o All (全模态)',
    description: 'GPT All模型，集合官方GPT-4、联网、读图、绘图功能、code interpreter一体',
    provider: 'shenma',
    type: 'multimodal',
    capabilities: {
      supportsImages: true,
      supportsVideo: false,
      supportsInternet: true,
      supportsThinking: false,
      supportsCodeExecution: true,
      isRecommended: true,
      isExperimental: false
    },
    pricing: {
      input: 0.002,
      output: 0.012,
      currency: 'USD'
    },
    limits: {
      maxTokens: 4096,
      contextWindow: 32768
    },
    isAvailable: true,
    lastUpdated: Date.now()
  },
  {
    id: 'gpt-5-nano-2025-08-07',
    name: 'GPT-5 Nano (实验版)',
    description: 'GPT-5 Nano实验版本，支持联网和响应创建',
    provider: 'shenma',
    type: 'reasoning-focused',
    capabilities: {
      supportsImages: true,
      supportsVideo: false,
      supportsInternet: true,
      supportsThinking: true,
      supportsCodeExecution: false,
      isRecommended: false,
      isExperimental: true
    },
    pricing: {
      input: 0.003,
      output: 0.015,
      currency: 'USD'
    },
    limits: {
      maxTokens: 4096,
      contextWindow: 32768
    },
    isAvailable: true,
    lastUpdated: Date.now()
  }
];

/**
 * 默认的智能路由配置
 * Default smart routing configuration
 */
export const DEFAULT_SMART_ROUTING_CONFIG: SmartRoutingConfig = {
  enabled: true,
  preferredModels: {
    quickResponse: 'gemini-3-flash-preview-nothinking',
    complexAnalysis: 'gemini-3-pro-preview-thinking',
    reasoning: 'gpt-5-nano-2025-08-07',
    multimodal: 'gpt-4o-all',
    internetSearch: 'gpt-4-all'
  },
  fallbackModel: 'gemini-3-flash-preview',
  autoSwitch: false
};

/**
 * 默认的用户偏好设置
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultTextModel: 'gemini-3-flash-preview-nothinking',
  smartRouting: DEFAULT_SMART_ROUTING_CONFIG,
  showModelCapabilities: true,
  showPricing: false,
  autoSaveConversations: true,
  preferredLanguage: 'zh'
};

/**
 * 模型类型的显示信息
 * Display information for model types
 */
export const MODEL_TYPE_INFO: Record<ModelType, { 
  name: string; 
  nameEn: string; 
  icon: string; 
  description: string; 
  descriptionEn: string; 
}> = {
  'fast-lightweight': {
    name: '快速轻量型',
    nameEn: 'Fast & Lightweight',
    icon: '⚡',
    description: '响应速度快，适合日常对话和简单任务',
    descriptionEn: 'Fast response, suitable for daily conversations and simple tasks'
  },
  'deep-analysis': {
    name: '深度分析型',
    nameEn: 'Deep Analysis',
    icon: '🧠',
    description: '支持复杂推理和深度分析，适合专业问题',
    descriptionEn: 'Supports complex reasoning and deep analysis for professional questions'
  },
  'reasoning-focused': {
    name: '推理专用型',
    nameEn: 'Reasoning Focused',
    icon: '🤔',
    description: '专注于逻辑推理和问题解决',
    descriptionEn: 'Focused on logical reasoning and problem solving'
  },
  'network-enabled': {
    name: '联网功能型',
    nameEn: 'Network Enabled',
    icon: '🌐',
    description: '支持实时信息搜索和联网功能',
    descriptionEn: 'Supports real-time information search and network features'
  },
  'multimodal': {
    name: '全模态型',
    nameEn: 'Multimodal',
    icon: '🎭',
    description: '支持文本、图像、视频等多种模态处理',
    descriptionEn: 'Supports text, image, video and other multimodal processing'
  },
  'standard': {
    name: '标准型',
    nameEn: 'Standard',
    icon: '📝',
    description: '标准功能模型，平衡性能和功能',
    descriptionEn: 'Standard model with balanced performance and features'
  }
};

/**
 * 图像模型常量定义 - 仅包含确认可用的模型
 * Image Models Constants - Only confirmed working models
 */
export const IMAGE_MODELS = {
  // 基础生成模型 - 确认可用
  basic: [
    'nano-banana',      // 神马基础图像模型 (确认可用)
    'nano-banana-hd',   // 神马高清图像模型 (确认可用)
    'nano-banana-2',    // 神马图像模型v2 (确认可用)
    'gpt-image-1'       // GPT图像模型 (确认可用)
  ],
  
  // 高级生成模型 - 确认可用
  advanced: [
    'flux-kontext-pro', // Flux专业版 (确认可用)
    'flux-kontext-max', // Flux最大版 (确认可用)
    'dall-e-3'          // DALL-E 3 (确认可用)
  ],
  
  // 编辑专用模型 - 暂无确认可用的编辑模型
  editing: [
    // 所有编辑模型均不可用，已移除
  ]
} as const;

/**
 * 视频模型常量定义 - 仅包含确认可用的模型
 * Video Models Constants - Only confirmed working models
 */
export const VIDEO_MODELS = {
  // Sora系列 - 确认可用
  sora: [
    'sora_video2',              // Sora Video 2 (确认可用)
    'sora-2',                   // Sora 2 (确认可用)
    'sora-2-pro'                // Sora 2 Pro (确认可用)
  ],
  
  // Veo系列 - 确认可用
  veo: [
    'veo3',           // Veo 3 (确认可用)
    'veo3-fast',      // Veo 3 Fast (确认可用)
    'veo3-pro',       // Veo 3 Pro (确认可用)
    'veo3.1-pro'      // Veo 3.1 Pro (确认可用)
  ],
  
  // WanX系列 - 暂无确认可用的模型
  wanx: [
    // 所有WanX模型均不可用，已移除
  ],
  
  // 专用功能 - 暂无确认可用的模型
  special: [
    // 所有专用功能模型均不可用，已移除
  ]
} as const;

/**
 * 模型平台分类映射 - 仅包含确认可用的模型
 * Model Platform Classification Mapping - Only confirmed working models
 */
export const MODEL_PLATFORM_INFO = {
  // 神马平台 (Shenma Platform) - 确认可用的模型
  shenma: {
    name: '神马',
    nameEn: 'Shenma',
    description: '神马AI平台提供的模型',
    descriptionEn: 'Models provided by Shenma AI Platform',
    icon: '🐎',
    color: 'text-purple-500',
    models: {
      text: ['gemini-3-flash-preview-nothinking', 'gemini-3-flash-preview', 'gpt-5-nano-2025-08-07', 'gpt-4o-all', 'gpt-4-all', 'gpt-4o'],
      image: ['nano-banana', 'nano-banana-hd', 'nano-banana-2', 'gpt-image-1', 'flux-kontext-pro', 'flux-kontext-max', 'dall-e-3'],
      video: ['sora_video2', 'sora-2', 'sora-2-pro', 'veo3', 'veo3-fast', 'veo3-pro', 'veo3.1-pro']
    }
  }
} as const;

/**
 * 根据模型ID获取平台信息
 * Get platform information by model ID
 */
export const getModelPlatform = (modelId: string, generationType: 'text' | 'image' | 'video'): keyof typeof MODEL_PLATFORM_INFO | null => {
  for (const [platformKey, platformInfo] of Object.entries(MODEL_PLATFORM_INFO)) {
    const models = platformInfo.models[generationType];
    if ((models as readonly string[]).includes(modelId)) {
      return platformKey as keyof typeof MODEL_PLATFORM_INFO;
    }
  }
  return null;
};

/**
 * 按平台分组模型
 * Group models by platform
 */
export const groupModelsByPlatform = (modelIds: string[], generationType: 'text' | 'image' | 'video'): Record<string, string[]> => {
  const grouped: Record<string, string[]> = {};
  
  modelIds.forEach(modelId => {
    const platform = getModelPlatform(modelId, generationType);
    const platformKey = platform as string || 'unknown';
    
    if (!grouped[platformKey]) {
      grouped[platformKey] = [];
    }
    grouped[platformKey].push(modelId);
  });
  
  return grouped;
};
export const FEATURE_BINDINGS = {
  // 注意：以下功能绑定的模型当前不可用，已禁用相关功能
  // Note: Models bound to these features are currently unavailable, features disabled
  
  // 图像编辑功能 - 暂时禁用
  'smear-removal': {
    model: 'byteedit-v2.0',
    reason: '涂抹去除需要 ByteEdit 专用API (当前不可用)'
  },
  'style-transfer': {
    model: 'byteedit-v2.0', 
    reason: '风格转换需要 ByteEdit 专用API (当前不可用)'
  },
  'background-removal': {
    model: 'byteedit-v2.0',
    reason: '背景去除需要 ByteEdit 专用API (当前不可用)'
  },
  'image-enhance': {
    model: 'byteedit-enhance',
    reason: '图像增强需要 ByteEdit 增强API (当前不可用)'
  },
  
  // 视频特殊功能 - 暂时禁用
  'character-cameo': {
    model: 'sora-2',
    reason: '角色客串需要 Sora API (可用)'
  },
  'video-style-transfer': {
    model: 'video-style-transfer',
    reason: '视频风格转换需要专用API (当前不可用)'
  },
  'character-animation': {
    model: 'wan2.2-animate-mix',
    reason: '角色动画需要 WanX 专用API (当前不可用)'
  }
} as const;

/**
 * 获取所有图像模型列表
 * Get all image models list
 */
export const getAllImageModels = (): string[] => {
  return [
    ...IMAGE_MODELS.basic,
    ...IMAGE_MODELS.advanced,
    ...IMAGE_MODELS.editing
  ];
};

/**
 * 获取所有视频模型列表
 * Get all video models list
 */
export const getAllVideoModels = (): string[] => {
  return [
    ...VIDEO_MODELS.sora,
    ...VIDEO_MODELS.veo,
    ...VIDEO_MODELS.wanx,
    ...VIDEO_MODELS.special
  ];
};

/**
 * 用户模型偏好接口
 * User Model Preferences Interface
 */
export interface UserModelPreferences {
  defaultImageModel: string;
  defaultVideoModel: string;
  defaultTextModel: string;
  lastUpdated: Date;
}

/**
 * 默认用户模型偏好
 * Default User Model Preferences
 */
export const DEFAULT_MODEL_PREFERENCES: UserModelPreferences = {
  defaultImageModel: 'nano-banana-hd',
  defaultVideoModel: 'sora_video2',
  defaultTextModel: 'gemini-3-flash-preview-nothinking',
  lastUpdated: new Date()
};

// ============================================================================
// INTELLIGENT PARAMETER PANEL SYSTEM
// ============================================================================

/**
 * 生成参数接口 - 统一的参数配置结构
 * Generation Parameters Interface - Unified parameter configuration structure
 */
export interface GenerationParameters {
  // 通用参数 (Common parameters)
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  
  // 图像专用参数 (Image-specific parameters)
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '4:5' | '5:4' | '2:3' | '3:2' | '21:9';
  imageSize?: '1K' | '2K' | '4K';
  guidanceScale?: number;
  steps?: number;
  referenceImage?: File | string;
  
  // 视频专用参数 (Video-specific parameters)
  duration?: '5' | '10' | '15' | '25' | '30' | '60';
  fps?: number;
  motionStrength?: number;
  cameraMovement?: 'static' | 'pan' | 'zoom' | 'rotate';
  referenceVideo?: File | string;
  
  // 高级参数 (Advanced parameters)
  customParameters?: Record<string, any>;
}

/**
 * 模型参数定义接口
 * Model Parameter Definition Interface
 */
export interface ModelParameter {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'file' | 'range';
  defaultValue: any;
  required: boolean;
  validation: ParameterValidation;
  description?: string;
  category?: string;
  advanced?: boolean;
}

/**
 * 参数验证规则接口
 * Parameter Validation Rules Interface
 */
export interface ParameterValidation {
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  disabledOptions?: string[]; // 新增：禁用的选项列表
  pattern?: string;
  fileTypes?: string[];
  maxFileSize?: number;
  required?: boolean;
}

/**
 * 模型限制接口
 * Model Restrictions Interface
 */
export interface ModelRestrictions {
  maxFileSize: number; // in bytes
  supportedFormats: string[];
  supportedAspectRatios: string[];
  maxDuration?: number; // for video, in seconds
  maxResolution?: { width: number; height: number };
  parameterLimits: Record<string, { min?: number; max?: number; options?: string[] }>;
}

/**
 * 参数预设接口
 * Parameter Preset Interface
 */
export interface ParameterPreset {
  id: string;
  name: string;
  description?: string;
  generationType: 'image' | 'video';
  modelId?: string; // if null, applies to all models
  parameters: GenerationParameters;
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
}

/**
 * 验证结果接口 (扩展现有的ValidationResult)
 * Validation Result Interface (extends existing ValidationResult)
 */
export interface ParameterValidationResult {
  isValid: boolean;
  errors: ParameterValidationError[];
  warnings: ParameterValidationWarning[];
}

/**
 * 参数验证错误接口
 * Parameter Validation Error Interface
 */
export interface ParameterValidationError {
  parameterKey: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

/**
 * 参数验证警告接口
 * Parameter Validation Warning Interface
 */
export interface ParameterValidationWarning {
  parameterKey: string;
  message: string;
  suggestion?: string;
}

/**
 * 参数面板状态接口
 * Parameter Panel State Interface
 */
export interface ParameterPanelState {
  isOpen: boolean;
  activeTab: 'image' | 'video';
  selectedModel: string;
  parameters: GenerationParameters;
  validationResults: ParameterValidationResult[];
  presets: ParameterPreset[];
  isLoading: boolean;
  error?: string;
}

/**
 * 参数面板组件属性接口
 * Parameter Panel Component Props Interface
 */
export interface ParameterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  generationType: 'image' | 'video';
  onParametersChange: (parameters: GenerationParameters) => void;
  initialParameters?: GenerationParameters;
  theme?: 'light' | 'dark';
  lang?: 'zh' | 'en';
}

/**
 * 标签管理器组件属性接口
 * Tab Manager Component Props Interface
 */
export interface TabManagerProps {
  activeTab: 'image' | 'video';
  onTabChange: (tab: 'image' | 'video') => void;
  availableTabs: ('image' | 'video')[];
  theme: 'light' | 'dark';
}

/**
 * 参数控件组件属性接口
 * Parameter Controls Component Props Interface
 */
export interface ParameterControlsProps {
  generationType: 'image' | 'video';
  modelId: string;
  parameters: GenerationParameters;
  onParameterChange: (key: string, value: any) => void;
  validationErrors: ParameterValidationError[];
  theme: 'light' | 'dark';
}

/**
 * 预设管理器组件属性接口
 * Preset Manager Component Props Interface
 */
export interface PresetManagerProps {
  generationType: 'image' | 'video';
  currentParameters: GenerationParameters;
  onPresetLoad: (preset: ParameterPreset) => void;
  onPresetSave: (name: string, parameters: GenerationParameters) => void;
  theme: 'light' | 'dark';
}

/**
 * 模型配置服务接口
 * Model Config Service Interface
 */
export interface ModelConfigService {
  getModelParameters(modelId: string, generationType: 'image' | 'video'): ModelParameter[];
  getModelRestrictions(modelId: string): ModelRestrictions;
  validateParameter(modelId: string, parameterKey: string, value: any): ParameterValidationResult;
}

/**
 * 参数验证服务接口
 * Parameter Validation Service Interface
 */
export interface ParameterValidationService {
  validateParameters(modelId: string, parameters: GenerationParameters): ParameterValidationResult[];
  validateFileSize(file: File, maxSize: number): boolean;
  validateAspectRatio(ratio: string, supportedRatios: string[]): boolean;
  validateImageFormat(file: File, supportedFormats: string[]): boolean;
}

/**
 * 预设存储服务接口
 * Preset Storage Service Interface
 */
export interface PresetStorageService {
  savePreset(preset: ParameterPreset): Promise<void>;
  loadPresets(generationType: 'image' | 'video'): Promise<ParameterPreset[]>;
  deletePreset(presetId: string): Promise<void>;
  updatePreset(presetId: string, preset: ParameterPreset): Promise<void>;
}

/**
 * 模型复杂度级别
 * Model Complexity Level
 */
export type ModelComplexity = 'simple' | 'medium' | 'complex';

/**
 * 模型复杂度映射
 * Model Complexity Mapping
 */
export const MODEL_COMPLEXITY_MAPPING: Record<string, ModelComplexity> = {
  // 简单模型 (Simple models)
  'nano-banana': 'simple',
  'gpt-image-1': 'simple',
  'sora_video2': 'simple',
  'high-quality': 'simple',
  
  // 中等复杂度模型 (Medium complexity models)
  'nano-banana-hd': 'medium',
  'nano-banana-2': 'medium',
  'flux-kontext-pro': 'medium',
  'sora-2': 'medium',
  'sora_video2-portrait': 'medium',
  'sora_video2-landscape': 'medium',
  'sora_video2-portrait-hd': 'medium',
  'sora_video2-portrait-15s': 'medium',
  'sora_video2-portrait-hd-15s': 'medium',
  'veo3': 'medium',
  'veo3-fast': 'medium',
  'recraftv3': 'medium',
  'dall-e-2': 'medium',
  'wanx2.1-vace-plus': 'medium',
  'wan2.2-animate-move': 'medium',
  'wan2.2-animate-mix': 'medium',
  
  // 复杂模型 (Complex models)
  'byteedit-v2.0': 'complex',
  'byteedit-enhance': 'complex',
  'flux-kontext-max': 'complex',
  'sora-2-pro': 'complex',
  'veo3-pro': 'complex',
  'veo3.1': 'complex',
  'veo3.1-pro': 'complex',
  'dall-e-3': 'complex',
  'animate-anyone-gen2': 'complex',
  'video-style-transfer': 'complex'
};

/**
 * 获取模型复杂度
 * Get Model Complexity
 */
export const getModelComplexity = (modelId: string): ModelComplexity => {
  return MODEL_COMPLEXITY_MAPPING[modelId] || 'medium';
};

/**
 * 默认参数预设
 * Default Parameter Presets
 */
export const DEFAULT_PARAMETER_PRESETS: ParameterPreset[] = [
  {
    id: 'image-standard',
    name: '标准图像',
    description: '适合大多数图像生成场景的标准配置',
    generationType: 'image',
    parameters: {
      prompt: '',
      aspectRatio: '1:1',
      imageSize: '2K',
      guidanceScale: 7.5,
      steps: 20
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true
  },
  {
    id: 'image-high-quality',
    name: '高质量图像',
    description: '高质量图像生成配置，适合专业用途',
    generationType: 'image',
    parameters: {
      prompt: '',
      aspectRatio: '16:9',
      imageSize: '4K',
      guidanceScale: 10,
      steps: 30
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true
  },
  {
    id: 'video-standard',
    name: '标准视频',
    description: '适合大多数视频生成场景的标准配置',
    generationType: 'video',
    parameters: {
      prompt: '',
      aspectRatio: '16:9',
      duration: '10',
      fps: 24
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true
  },
  {
    id: 'video-portrait',
    name: '竖屏视频',
    description: '适合社交媒体的竖屏视频配置',
    generationType: 'video',
    parameters: {
      prompt: '',
      aspectRatio: '9:16',
      duration: '15',
      fps: 30
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true
  }
];

/**
 * Content Sync Service Interfaces
 * 内容同步服务接口
 */
export interface ContentSyncState {
  prompt: string;
  attachments: {
    image?: string;
    video?: string;
    file?: { name: string; content: string };
    videoUrl?: string;
  };
  mode: 'text' | 'image' | 'video';
  modelId: string;
  lastSyncTimestamp: number;
  source: 'chat' | 'parameter-panel';
}

export type ContentSyncListener = (state: ContentSyncState) => void;

/**
 * Results Manager Service Interfaces
 * 结果管理服务接口
 */
export interface GenerationResult {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string; // URL for media, text content for text
  thumbnail?: string; // Base64 thumbnail for media
  metadata: {
    prompt: string;
    model: string;
    parameters: GenerationParameters;
    timestamp: number;
    source: 'chat' | 'parameter-panel';
  };
  status: 'generating' | 'completed' | 'failed';
  error?: string; // Error message if status is 'failed'
}

export interface StoredResults {
  version: string;
  results: GenerationResult[];
  lastCleanup: number;
}

export type ResultsListener = (results: GenerationResult[]) => void;

/**
 * Thumbnail Generator Interfaces
 * 缩略图生成器接口
 */
export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Enhanced Parameter Panel Props
 * 增强参数面板属性
 */
export interface EnhancedParameterPanelProps extends ParameterPanelProps {
  contentSyncService?: IContentSyncService;
  resultsManager?: IResultsManagerService;
  initialSyncedContent?: ContentSyncState;
}

/**
 * Sidebar Results Area Props
 * 侧边栏结果区域属性
 */
export interface SidebarResultsAreaProps {
  results: GenerationResult[];
  onProjectToCanvas: (resultId: string) => void;
  onDeleteResult: (resultId: string) => void;
  onDeleteResults: (resultIds: string[]) => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  isLoading?: boolean;
}

/**
 * Results Grid Item Props
 * 结果网格项属性
 */
export interface ResultsGridItemProps {
  result: GenerationResult;
  isSelected: boolean;
  onSelect: (resultId: string) => void;
  onProjectToCanvas: (resultId: string) => void;
  onDelete: (resultId: string) => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

/**
 * Content Sync Service Interface
 * 内容同步服务接口
 */
export interface IContentSyncService {
  syncFromChatDialog(
    prompt: string,
    attachments: ContentSyncState['attachments'],
    mode: 'text' | 'image' | 'video',
    modelId: string
  ): void;
  
  syncToChatDialog(
    prompt: string,
    attachments: ContentSyncState['attachments']
  ): void;
  
  subscribe(listener: ContentSyncListener): () => void;
  getCurrentState(): ContentSyncState;
  clearState(): void;
  hasPendingContent(): boolean;
  getStateSummary(): string;
}

/**
 * Results Manager Service Interface
 * 结果管理服务接口
 */
export interface IResultsManagerService {
  addResult(result: Omit<GenerationResult, 'id' | 'metadata'> & {
    metadata: Omit<GenerationResult['metadata'], 'timestamp'>;
  }): string;
  
  updateResult(id: string, updates: Partial<GenerationResult>): void;
  getResults(): GenerationResult[];
  getResult(id: string): GenerationResult | undefined;
  deleteResult(id: string): boolean;
  deleteResults(ids: string[]): number;
  subscribe(listener: ResultsListener): () => void;
  clearAll(): void;
  getStats(): {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    storageSize: number;
  };
}

/**
 * Thumbnail Generator Interface
 * 缩略图生成器接口
 */
export interface IThumbnailGenerator {
  generateImageThumbnail(imageUrl: string, options?: ThumbnailOptions): Promise<string>;
  generateVideoThumbnail(videoUrl: string, options?: ThumbnailOptions, seekTime?: number): Promise<string>;
  clearCache(): void;
  getCacheStats(): { size: number; memoryUsage: number };
  cleanupCache(maxSize?: number): void;
  generateBatch(
    items: Array<{ url: string; type: 'image' | 'video' }>,
    options?: ThumbnailOptions
  ): Promise<Array<{ url: string; thumbnail: string; error?: string }>>;
}