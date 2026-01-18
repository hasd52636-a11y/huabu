/**
 * 智能路由服务 - 实现多模态AI的智能选择和回退机制
 * 
 * 策略：
 * 1. 主模型：神马API的Gemini（多模态能力强）
 * 2. 备份模型：神马API的GPT-4o（稳定性好）
 * 3. 智能检测：根据内容类型自动选择最佳模型
 * 4. 可用性检查：确保提供商配置有效后再使用
 */

import { ProviderSettings } from '../types';
import { SMART_ROUTING_CONFIG, getRecommendedModel, createProviderSettings } from '../config/smartRouting';

export interface SmartRoutingConfig {
  primaryProvider: ProviderSettings;
  fallbackProvider: ProviderSettings;
  enableSmartDetection: boolean;
  maxRetries: number;
}

export interface ContentAnalysis {
  hasImages: boolean;
  hasVideo: boolean;
  hasText: boolean;
  isMultimodal: boolean;
  contentType: 'text' | 'image' | 'video' | 'multimodal';
  recommendedModel: string;
}

export class SmartRoutingService {
  private config: SmartRoutingConfig;

  constructor(config?: Partial<SmartRoutingConfig>) {
    this.config = {
      primaryProvider: SMART_ROUTING_CONFIG.PRIMARY_PROVIDER,
      fallbackProvider: SMART_ROUTING_CONFIG.FALLBACK_PROVIDER,
      enableSmartDetection: SMART_ROUTING_CONFIG.DETECTION_RULES.ENABLE_CONTENT_DETECTION,
      maxRetries: SMART_ROUTING_CONFIG.DETECTION_RULES.MAX_RETRIES,
      ...config
    };
  }

  /**
   * 检查提供商是否可用（API密钥有效）
   * Task 5.1: 添加提供商可用性检查
   */
  isProviderAvailable(settings: ProviderSettings): boolean {
    // 检查 API 密钥
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      console.warn(`[SmartRouting] Provider ${settings.provider} has no API key`);
      return false;
    }

    // 检查 API 密钥长度（基本格式验证）
    if (settings.apiKey.length < 10) {
      console.warn(`[SmartRouting] Provider ${settings.provider} has invalid API key format (too short)`);
      return false;
    }

    // 检查 Base URL
    if (!settings.baseUrl || settings.baseUrl.trim() === '') {
      console.warn(`[SmartRouting] Provider ${settings.provider} has no base URL`);
      return false;
    }

    // 检查 Base URL 格式
    if (!settings.baseUrl.startsWith('http://') && !settings.baseUrl.startsWith('https://')) {
      console.warn(`[SmartRouting] Provider ${settings.provider} has invalid base URL format`);
      return false;
    }

    // 检查模型 ID
    if (!settings.modelId || settings.modelId.trim() === '') {
      console.warn(`[SmartRouting] Provider ${settings.provider} has no model ID`);
      return false;
    }

    console.log(`[SmartRouting] ✓ Provider ${settings.provider} is available (API key: ${this.maskApiKey(settings.apiKey)})`);
    return true;
  }

  /**
   * 脱敏显示 API 密钥
   */
  private maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return '••••••••';
    }
    return apiKey.substring(0, 4) + '••••••••' + apiKey.substring(apiKey.length - 4);
  }

  /**
   * 获取可用的提供商列表
   * Task 5.3: 添加 getAvailableProviders 方法
   */
  getAvailableProviders(providers: ProviderSettings[]): ProviderSettings[] {
    const available = providers.filter(provider => this.isProviderAvailable(provider));
    
    console.log(`[SmartRouting] Available providers: ${available.length}/${providers.length}`);
    available.forEach(provider => {
      console.log(`[SmartRouting]   - ${provider.provider}: ${provider.modelId}`);
    });
    
    return available;
  }

  /**
   * 分析内容类型，智能选择最佳模型
   */
  analyzeContent(contents: any): ContentAnalysis {
    let hasImages = false;
    let hasVideo = false;
    let hasText = false;

    if (contents && contents.parts && Array.isArray(contents.parts)) {
      contents.parts.forEach((part: any) => {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || '';
          if (mimeType.startsWith('image/')) {
            hasImages = true;
          } else if (mimeType.startsWith('video/')) {
            hasVideo = true;
          }
        } else if (part.text) {
          hasText = true;
        }
      });
    } else if (typeof contents === 'string') {
      hasText = true;
    }

    const isMultimodal = (hasImages && hasText) || (hasVideo && hasText) || (hasImages && hasVideo);
    
    let contentType: ContentAnalysis['contentType'] = 'text';
    let recommendedModel = getRecommendedModel('text', isMultimodal);

    if (isMultimodal) {
      contentType = 'multimodal';
      recommendedModel = getRecommendedModel('multimodal', true);
    } else if (hasVideo) {
      contentType = 'video';
      recommendedModel = getRecommendedModel('video-analysis');
    } else if (hasImages) {
      contentType = 'image';
      recommendedModel = getRecommendedModel('text', true); // 图像+文本
    } else {
      contentType = 'text';
      recommendedModel = getRecommendedModel('text');
    }

    return {
      hasImages,
      hasVideo,
      hasText,
      isMultimodal,
      contentType,
      recommendedModel
    };
  }

  /**
   * 获取智能路由的提供商设置
   */
  getSmartProvider(contents: any, userSettings?: ProviderSettings): ProviderSettings {
    const analysis = this.analyzeContent(contents);
    
    // 必须尊重用户配置，优先使用userSettings
    if (userSettings) {
      console.log(`[SmartRouting] User settings provided, using them directly`);
      console.log(`[SmartRouting] User settings:`, {
        provider: userSettings.provider,
        hasApiKey: !!userSettings.apiKey,
        apiKeyLength: userSettings.apiKey?.length || 0,
        baseUrl: userSettings.baseUrl,
        modelId: userSettings.modelId
      });
      
      // 只更新模型ID，保持其他配置不变
      return {
        ...userSettings,
        modelId: analysis.recommendedModel
      };
    }

    // 没有用户配置时，才使用默认提供商
    const baseProvider = this.config.primaryProvider;
    
    // 根据内容分析结果选择最佳提供商
    const smartSettings = createProviderSettings(
      analysis.recommendedModel,
      baseProvider.apiKey,
      baseProvider
    );

    console.log(`[SmartRouting] Content analysis:`, analysis);
    console.log(`[SmartRouting] Selected model: ${smartSettings.modelId}`);
    console.log(`[SmartRouting] Using provider: ${smartSettings.provider}, API key: ${smartSettings.apiKey?.substring(0, 4)}...${smartSettings.apiKey?.substring(smartSettings.apiKey.length - 4)}`);

    return smartSettings;
  }

  /**
   * 获取回退提供商设置
   */
  getFallbackProvider(userSettings?: ProviderSettings): ProviderSettings {
    // 尊重用户配置的提供商，而不是硬编码使用默认提供商
    if (userSettings) {
      console.log(`[SmartRouting] Using user settings for fallback provider`);
      return {
        ...userSettings,
        modelId: this.config.fallbackProvider.modelId
      };
    }
    
    return createProviderSettings(
      this.config.fallbackProvider.modelId,
      this.config.fallbackProvider.apiKey,
      this.config.fallbackProvider
    );
  }

  /**
   * 智能执行策略 - 主模型失败时自动回退
   * Task 5.2: 增强版，检查API密钥有效性后再尝试调用
   */
  async executeWithFallback<T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
    operation: string = 'AI operation',
    primarySettings?: ProviderSettings,
    fallbackSettings?: ProviderSettings
  ): Promise<T> {
    let lastError: Error | null = null;

    // 检查主提供商是否可用
    const primaryAvailable = primarySettings ? this.isProviderAvailable(primarySettings) : true;
    const fallbackAvailable = fallbackSettings ? this.isProviderAvailable(fallbackSettings) : true;

    // 如果两个提供商都不可用，直接抛出错误
    if (!primaryAvailable && !fallbackAvailable) {
      const errorMsg = '没有可用的AI服务提供商，请检查API配置';
      console.error(`[SmartRouting] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // 如果主提供商不可用，直接跳到备用提供商
    if (!primaryAvailable) {
      console.warn(`[SmartRouting] Primary provider ${primarySettings?.provider} is not available, skipping to fallback`);
      
      if (fallbackAvailable) {
        try {
          console.log(`[SmartRouting] Using fallback model for ${operation}`);
          return await fallbackFn();
        } catch (error) {
          const fallbackError = (error as Error)?.message || 'Unknown fallback error';
          throw new Error(`备用模型调用失败: ${fallbackError}`);
        }
      }
    }

    // 尝试主模型
    if (primaryAvailable) {
      try {
        console.log(`[SmartRouting] Trying primary model for ${operation}`);
        return await primaryFn();
      } catch (error) {
        lastError = error as Error;
        console.warn(`[SmartRouting] Primary model failed for ${operation}:`, error);
      }
    }

    // 检查备用提供商是否可用
    if (!fallbackAvailable) {
      const primaryError = lastError?.message || 'Primary provider not available';
      throw new Error(`主模型失败，且备用模型不可用: ${primaryError}`);
    }

    // 回退到备用模型
    try {
      console.log(`[SmartRouting] Falling back to secondary model for ${operation}`);
      return await fallbackFn();
    } catch (error) {
      console.error(`[SmartRouting] Fallback model also failed for ${operation}:`, error);
      
      // 抛出更详细的错误信息
      const primaryError = lastError?.message || 'Unknown primary error';
      const fallbackError = (error as Error)?.message || 'Unknown fallback error';
      
      const primaryModel = primarySettings?.modelId || this.config.primaryProvider.modelId;
      const fallbackModel = fallbackSettings?.modelId || this.config.fallbackProvider.modelId;
      
      throw new Error(
        `所有模型都失败了:\n主模型 (${primaryModel}): ${primaryError}\n备用模型 (${fallbackModel}): ${fallbackError}`
      );
    }
  }

  /**
   * 检测是否需要特殊模型
   */
  needsSpecialModel(contents: any): { needed: boolean; model?: string; reason?: string } {
    const analysis = this.analyzeContent(contents);

    // 视频分析需要特殊模型
    if (analysis.hasVideo) {
      return {
        needed: true,
        model: getRecommendedModel('video-analysis'),
        reason: 'Video analysis requires specialized Gemini model'
      };
    }

    // 复杂多模态内容
    if (analysis.isMultimodal && analysis.hasImages && analysis.hasVideo) {
      return {
        needed: true,
        model: getRecommendedModel('video-analysis'),
        reason: 'Complex multimodal content requires advanced model'
      };
    }

    return { needed: false };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SmartRoutingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): SmartRoutingConfig {
    return { ...this.config };
  }
}

// 创建全局实例
export const smartRoutingService = new SmartRoutingService();

export default SmartRoutingService;