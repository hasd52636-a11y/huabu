/**
 * 智能路由配置 - 定义AI模型的智能选择策略
 */

import { ProviderSettings } from '../types';

// 完整的神马API模型配置 - 基于官方API文档
export const SHENMA_MODELS = {
  // 文本对话模型
  TEXT_MODELS: {
    'gpt-4o': { name: 'GPT-4o', description: '最新GPT-4o模型，性能优异', priority: 2 },
    'gpt-4-turbo': { name: 'GPT-4 Turbo', description: 'GPT-4 Turbo版本，速度更快', priority: 3 },
    'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', description: '经典GPT-3.5模型，性价比高', priority: 4 },
    'gemini-2.0-flash-exp': { name: 'Gemini 2.0 Flash', description: 'Google最新Gemini模型，多模态能力强', priority: 1 },
    'gemini-3-flash-preview': { name: 'Gemini 3 Flash Preview', description: 'Gemini 3预览版，最新功能', priority: 1 },
    'gemini-3-pro-preview': { name: 'Gemini 3 Pro Preview', description: 'Gemini 3 Pro预览版，专业级性能', priority: 1 },
    'gemini-2.5-pro-preview-05-06': { name: 'Gemini 2.5 Pro', description: '支持视频分析的Gemini模型', priority: 2 }
  },

  // 图像生成模型
  IMAGE_MODELS: {
    'nano-banana': { name: 'Nano Banana', description: '基于Gemini优化的图像生成模型', priority: 1 },
    'nano-banana-hd': { name: 'Nano Banana HD', description: '高清版Nano Banana，4K画质', priority: 1 },
    'nano-banana-2': { name: 'Nano Banana 2', description: '最新版Nano Banana，支持更多尺寸', priority: 1 },
    'flux-kontext-pro': { name: 'Flux Kontext Pro', description: 'Flux专业版，高质量图像生成', priority: 2 },
    'flux-kontext-max': { name: 'Flux Kontext Max', description: 'Flux最高版本，极致画质', priority: 2 },
    'flux-kontext-dev': { name: 'Flux Kontext Dev', description: 'Flux开发版，需要参考图', priority: 3 },
    'gpt-image-1': { name: 'GPT Image 1', description: 'OpenAI图像生成模型', priority: 3 },
    'gpt-4o-image': { name: 'GPT-4o Image', description: 'GPT-4o图像生成版本', priority: 2 },
    'recraftv3': { name: 'Recraft V3', description: '专业设计图像生成模型', priority: 2 },
    'dall-e-3': { name: 'DALL-E 3', description: 'OpenAI经典图像生成模型', priority: 3 },
    'byteedit-v2.0': { name: 'ByteEdit V2.0', description: '字节跳动图像编辑模型', priority: 3 }
  },

  // 视频生成模型
  VIDEO_MODELS: {
    'sora-2': { name: 'Sora 2', description: 'OpenAI Sora 2标准版', priority: 2 },
    'sora-2-pro': { name: 'Sora 2 Pro', description: 'Sora 2专业版，支持HD和25秒', priority: 1 },
    'sora_video2': { name: 'Sora Video 2', description: '兼容格式的Sora视频生成', priority: 2 },
    'sora_video2-portrait': { name: 'Sora Video 2 竖屏', description: '竖屏视频生成', priority: 1 },
    'sora_video2-landscape': { name: 'Sora Video 2 横屏', description: '横屏视频生成', priority: 2 },
    'sora_video2-portrait-hd': { name: 'Sora Video 2 竖屏HD', description: '高清竖屏视频', priority: 1 },
    'sora_video2-portrait-15s': { name: 'Sora Video 2 竖屏15秒', description: '15秒竖屏视频', priority: 2 },
    'sora_video2-portrait-hd-15s': { name: 'Sora Video 2 竖屏HD15秒', description: '15秒高清竖屏视频', priority: 1 }
  }
};

export const SMART_ROUTING_CONFIG = {
  // 主模型配置：神马API的Gemini（多模态能力强）
  PRIMARY_PROVIDER: {
    provider: 'shenma' as const,
    modelId: 'gemini-2.0-flash-exp',
    baseUrl: 'https://hk-api.gptbest.vip',
    apiKey: '' // 将从用户配置中获取
  },

  // 备用模型配置：神马API的GPT-4o（稳定性好）
  FALLBACK_PROVIDER: {
    provider: 'shenma' as const,
    modelId: 'gpt-4o',
    baseUrl: 'https://hk-api.gptbest.vip',
    apiKey: '' // 将从用户配置中获取
  },

  // 特殊用途模型映射 - 基于完整的模型列表
  SPECIAL_MODELS: {
    // 视频分析专用
    VIDEO_ANALYSIS: 'gemini-2.5-pro-preview-05-06',
    
    // 图像生成 - 优先nano-banana系列
    IMAGE_GENERATION: 'nano-banana-2',
    IMAGE_GENERATION_HD: 'nano-banana-hd',
    IMAGE_GENERATION_STANDARD: 'nano-banana',
    
    // 视频生成 - 智能选择策略
    VIDEO_GENERATION: 'sora_video2-portrait-hd',
    VIDEO_GENERATION_FALLBACK: 'sora_video2',
    VIDEO_GENERATION_EXTENDED: 'sora_video2-portrait-hd-15s',
    VIDEO_GENERATION_PRO: 'sora-2-pro',
    
    // 多模态对话
    MULTIMODAL_CHAT: 'gemini-2.0-flash-exp',
    
    // 纯文本对话
    TEXT_CHAT: 'gemini-2.0-flash-exp',
    TEXT_CHAT_FALLBACK: 'gpt-4o'
  },

  // 智能检测规则
  DETECTION_RULES: {
    // 启用智能内容检测
    ENABLE_CONTENT_DETECTION: true,
    
    // 启用自动回退
    ENABLE_AUTO_FALLBACK: true,
    
    // 最大重试次数
    MAX_RETRIES: 2,
    
    // 回退延迟（毫秒）
    FALLBACK_DELAY: 1000
  },

  // 性能优化配置
  PERFORMANCE: {
    // 缓存模型选择结果
    CACHE_MODEL_SELECTION: true,
    
    // 缓存时间（毫秒）
    CACHE_DURATION: 5 * 60 * 1000, // 5分钟
    
    // 预热常用模型 - 基于shenmaAPI文档的实际模型
    PRELOAD_MODELS: ['gemini-2.0-flash-exp', 'gpt-4o', 'nano-banana-2']
  }
};

/**
 * 根据内容类型获取推荐模型
 */
export function getRecommendedModel(contentType: string, hasMultimodal: boolean = false): string {
  if (hasMultimodal) {
    return SMART_ROUTING_CONFIG.SPECIAL_MODELS.MULTIMODAL_CHAT;
  }

  switch (contentType) {
    case 'video-analysis':
      return SMART_ROUTING_CONFIG.SPECIAL_MODELS.VIDEO_ANALYSIS;
    case 'image-generation':
      return SMART_ROUTING_CONFIG.SPECIAL_MODELS.IMAGE_GENERATION;
    case 'image-generation-hd':
      return SMART_ROUTING_CONFIG.SPECIAL_MODELS.IMAGE_GENERATION_HD;
    case 'video-generation':
      return SMART_ROUTING_CONFIG.SPECIAL_MODELS.VIDEO_GENERATION;
    case 'video-generation-fallback':
      return SMART_ROUTING_CONFIG.SPECIAL_MODELS.VIDEO_GENERATION_FALLBACK;
    case 'video-generation-extended':
      return SMART_ROUTING_CONFIG.SPECIAL_MODELS.VIDEO_GENERATION_EXTENDED;
    case 'video-generation-pro':
      return SMART_ROUTING_CONFIG.SPECIAL_MODELS.VIDEO_GENERATION_PRO;
    case 'text':
    default:
      return SMART_ROUTING_CONFIG.SPECIAL_MODELS.TEXT_CHAT;
  }
}

/**
 * 获取指定类型的所有可用模型
 */
export function getAvailableModels(type: 'text' | 'image' | 'video'): Array<{
  id: string;
  name: string;
  description: string;
  priority: number;
}> {
  const modelMap = {
    text: SHENMA_MODELS.TEXT_MODELS,
    image: SHENMA_MODELS.IMAGE_MODELS,
    video: SHENMA_MODELS.VIDEO_MODELS
  };

  const models = modelMap[type];
  return Object.entries(models).map(([id, info]) => ({
    id,
    ...info
  })).sort((a, b) => a.priority - b.priority);
}

/**
 * 获取默认模型选择
 */
export function getDefaultModel(type: 'text' | 'image' | 'video'): string {
  const models = getAvailableModels(type);
  return models[0]?.id || '';
}

/**
 * 获取视频生成的最佳模型选择策略
 */
export function getVideoGenerationStrategy(requirements?: {
  duration?: number;
  aspectRatio?: '16:9' | '9:16';
  quality?: 'standard' | 'hd';
  priority?: 'speed' | 'quality' | 'compatibility';
}): { primary: string; fallback: string; extended?: string } {
  const { duration = 10, aspectRatio = '16:9', quality = 'standard', priority = 'quality' } = requirements || {};

  // 基于需求选择最佳策略
  if (priority === 'speed') {
    // 优先速度：使用标准模型
    return {
      primary: 'sora_video2',
      fallback: 'sora_video2-portrait'
    };
  } else if (priority === 'compatibility') {
    // 优先兼容性：使用最稳定的模型
    return {
      primary: 'sora_video2',
      fallback: 'sora_video2-landscape'
    };
  } else {
    // 优先质量（默认）
    if (aspectRatio === '9:16') {
      // 竖屏内容
      if (duration > 10 && quality === 'hd') {
        return {
          primary: 'sora_video2-portrait-hd-15s',
          fallback: 'sora_video2-portrait-hd',
          extended: 'sora_video2-portrait'
        };
      } else if (quality === 'hd') {
        return {
          primary: 'sora_video2-portrait-hd',
          fallback: 'sora_video2-portrait'
        };
      } else {
        return {
          primary: 'sora_video2-portrait',
          fallback: 'sora_video2'
        };
      }
    } else {
      // 横屏内容
      if (quality === 'hd') {
        return {
          primary: 'sora_video2-landscape',
          fallback: 'sora_video2'
        };
      } else {
        return {
          primary: 'sora_video2',
          fallback: 'sora_video2-landscape'
        };
      }
    }
  }
}

/**
 * 创建提供商设置
 */
export function createProviderSettings(
  modelId: string, 
  userApiKey?: string,
  baseProvider: ProviderSettings = SMART_ROUTING_CONFIG.PRIMARY_PROVIDER
): ProviderSettings {
  // 确保使用正确的API密钥和baseUrl
  const finalSettings = {
    ...baseProvider,
    modelId,
    // 优先使用用户提供的API密钥，然后是baseProvider中的API密钥
    apiKey: userApiKey || baseProvider.apiKey,
    // 确保baseUrl被正确保留
    baseUrl: baseProvider.baseUrl
  };
  
  console.log(`[SmartRouting] createProviderSettings - Final settings:`, {
    provider: finalSettings.provider,
    modelId: finalSettings.modelId,
    hasApiKey: !!finalSettings.apiKey,
    apiKeyLength: finalSettings.apiKey?.length || 0,
    baseUrl: finalSettings.baseUrl
  });
  
  return finalSettings;
}

export default SMART_ROUTING_CONFIG;