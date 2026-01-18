/**
 * 智能路由配置 - 定义AI模型的智能选择策略
 */

import { ProviderSettings } from '../types';

export const SMART_ROUTING_CONFIG = {
  // 主模型配置：神马API的Gemini（多模态能力强）- 基于shenmaAPI文档更新
  PRIMARY_PROVIDER: {
    provider: 'shenma' as const,
    modelId: 'gemini-2.0-flash-exp', // 更新为实际可用的模型
    baseUrl: 'https://hk-api.gptbest.vip', // 使用实际的神马API地址
    apiKey: '' // 将从用户配置中获取
  },

  // 备用模型配置：神马API的GPT-4o（稳定性好）
  FALLBACK_PROVIDER: {
    provider: 'shenma' as const,
    modelId: 'gpt-4o',
    baseUrl: 'https://hk-api.gptbest.vip',
    apiKey: '' // 将从用户配置中获取
  },

  // 特殊用途模型映射 - 基于shenmaAPI文档的实际可用模型
  SPECIAL_MODELS: {
    // 视频分析专用 - 支持视频分析的Gemini模型
    VIDEO_ANALYSIS: 'gemini-2.5-pro-preview-05-06',
    
    // 图像生成 - 神马API的Nano Banana 2最新版模型
    IMAGE_GENERATION: 'nano-banana-2',
    
    // 视频生成 - 使用Sora竖屏模型（支持角色选择功能）
    VIDEO_GENERATION: 'sora_video2-portrait',
    
    // 多模态对话 - 支持图片、视频分析的模型
    MULTIMODAL_CHAT: 'gemini-2.0-flash-exp',
    
    // 纯文本对话 - 快速响应的文本模型
    TEXT_CHAT: 'gemini-2.0-flash-exp'
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
    case 'video-generation':
      return SMART_ROUTING_CONFIG.SPECIAL_MODELS.VIDEO_GENERATION;
    case 'text':
    default:
      return SMART_ROUTING_CONFIG.SPECIAL_MODELS.TEXT_CHAT;
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