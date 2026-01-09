
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
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  instruction: string;
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
