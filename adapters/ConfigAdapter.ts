/**
 * Configuration Adapter - 配置系统扩展适配器
 * 
 * 功能：
 * - 实现配置系统扩展逻辑
 * - 支持神马和智谱的配置管理
 * - 保持现有配置格式向后兼容
 * - 提供配置验证和迁移功能
 */

import { ModelConfig, ProviderSettings, ProviderType } from '../types.js';

export interface ConfigAdapter {
  extendConfig(existingConfig: ModelConfig): ModelConfig;
  validateProviderSettings(provider: ProviderType, settings: ProviderSettings): boolean;
  migrateConfig(oldConfig: any): ModelConfig;
  getDefaultSettings(provider: ProviderType): ProviderSettings;
}

export class ConfigurationAdapter implements ConfigAdapter {
  private readonly supportedProviders: ProviderType[] = ['google', 'openai-compatible', 'zhipu', 'shenma'];

  /**
   * 扩展现有配置以支持新提供商
   */
  extendConfig(existingConfig: ModelConfig): ModelConfig {
    const extendedConfig: ModelConfig = {
      ...existingConfig,
      // 确保现有配置完全保留
      text: existingConfig.text || this.getDefaultSettings('google'),
      image: existingConfig.image || this.getDefaultSettings('google'),
      video: existingConfig.video || this.getDefaultSettings('google'),
    };

    // 添加智谱专用配置
    if (!extendedConfig.zhipu) {
      extendedConfig.zhipu = {
        textModel: 'glm-4-flash',
        visionModel: 'glm-4v-flash',
        imageModel: 'cogview-3-flash',
        videoModel: 'cogvideox-flash'
      };
    }

    // 添加神马专用配置
    if (!extendedConfig.shenma) {
      extendedConfig.shenma = {
        chatModel: 'gpt-4o', // 修正为正确的模型
        imageModel: 'nano-banana',
        videoModel: 'sora_video2' // 修正为正确的视频模型
      };
    }

    return extendedConfig;
  }

  /**
   * 验证提供商设置
   */
  validateProviderSettings(provider: ProviderType, settings: ProviderSettings): boolean {
    if (!this.supportedProviders.includes(provider)) {
      return false;
    }

    // 基本验证
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      return false;
    }

    // 提供商特定验证
    switch (provider) {
      case 'zhipu':
        return this.validateZhipuSettings(settings);
      
      case 'shenma':
        return this.validateShenmaSettings(settings);
      
      case 'google':
      case 'openai-compatible':
        return this.validateStandardSettings(settings);
      
      default:
        return true;
    }
  }

  /**
   * 验证智谱设置
   */
  private validateZhipuSettings(settings: ProviderSettings): boolean {
    // 智谱API Key格式验证
    if (!settings.apiKey.includes('.')) {
      return false;
    }

    // 基础URL验证
    const validBaseUrls = [
      'https://open.bigmodel.cn/api/paas/v4',
      'https://open.bigmodel.cn/api/paas/v3'
    ];
    
    if (settings.baseUrl && !validBaseUrls.some(url => settings.baseUrl?.startsWith(url))) {
      console.warn('Non-standard Zhipu base URL detected');
    }

    return true;
  }

  /**
   * 验证神马设置
   */
  private validateShenmaSettings(settings: ProviderSettings): boolean {
    // 神马API Key长度验证
    if (settings.apiKey.length < 10) {
      return false;
    }

    // 基础URL验证 - 支持参考项目中的多个神马API地址
    const validBaseUrls = [
      'https://api.whatai.cc',        // 官方地址
      'https://api.gptbest.vip',      // 美国线路
      'https://hk-api.gptbest.vip'    // 香港线路
    ];
    
    if (settings.baseUrl && !validBaseUrls.some(url => settings.baseUrl?.startsWith(url))) {
      console.warn('Non-standard Shenma base URL detected');
    }

    return true;
  }

  /**
   * 验证标准设置
   */
  private validateStandardSettings(settings: ProviderSettings): boolean {
    // 基本API Key验证
    return settings.apiKey.length >= 8;
  }

  /**
   * 迁移旧配置格式
   */
  migrateConfig(oldConfig: any): ModelConfig {
    // 如果已经是新格式，直接返回
    if (this.isNewConfigFormat(oldConfig)) {
      return this.extendConfig(oldConfig as ModelConfig);
    }

    // 迁移旧格式配置
    const migratedConfig: ModelConfig = {
      text: this.migrateProviderSettings(oldConfig.text || oldConfig.textProvider),
      image: this.migrateProviderSettings(oldConfig.image || oldConfig.imageProvider),
      video: this.migrateProviderSettings(oldConfig.video || oldConfig.videoProvider),
    };

    return this.extendConfig(migratedConfig);
  }

  /**
   * 检查是否为新配置格式
   */
  private isNewConfigFormat(config: any): boolean {
    return config && 
           typeof config === 'object' &&
           config.text && 
           config.image && 
           config.video &&
           typeof config.text === 'object' &&
           config.text.provider !== undefined;
  }

  /**
   * 迁移单个提供商设置
   */
  private migrateProviderSettings(oldSettings: any): ProviderSettings {
    if (!oldSettings) {
      return this.getDefaultSettings('google');
    }

    // 如果已经是新格式
    if (oldSettings.provider && oldSettings.apiKey) {
      return oldSettings as ProviderSettings;
    }

    // 迁移旧格式
    return {
      provider: oldSettings.type || oldSettings.provider || 'google',
      apiKey: oldSettings.apiKey || oldSettings.key || '',
      baseUrl: oldSettings.baseUrl || oldSettings.url || '',
      model: oldSettings.model || oldSettings.modelName || ''
    };
  }

  /**
   * 获取默认设置
   */
  getDefaultSettings(provider: ProviderType): ProviderSettings {
    const baseSettings = {
      provider,
      apiKey: '',
      baseUrl: '',
      model: ''
    };

    switch (provider) {
      case 'zhipu':
        return {
          ...baseSettings,
          baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
          model: 'glm-4-flash'
        };
      
      case 'shenma':
        return {
          ...baseSettings,
          baseUrl: 'https://api.whatai.cc', // 修正为参考项目的正确地址
          model: 'gpt-4o' // 修正为参考项目的正确模型
        };
      
      case 'google':
        return {
          ...baseSettings,
          baseUrl: 'https://generativelanguage.googleapis.com',
          model: 'gemini-pro'
        };
      
      case 'openai-compatible':
        return {
          ...baseSettings,
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-3.5-turbo'
        };
      
      default:
        return baseSettings;
    }
  }

  /**
   * 获取提供商显示名称
   */
  getProviderDisplayName(provider: ProviderType): string {
    const displayNames: Record<ProviderType, string> = {
      'google': 'Google Gemini',
      'openai-compatible': 'OpenAI Compatible',
      'zhipu': '智谱清言',
      'shenma': '神马AI'
    };

    return displayNames[provider] || provider;
  }

  /**
   * 获取提供商支持的模型列表
   */
  getSupportedModels(provider: ProviderType): string[] {
    switch (provider) {
      case 'zhipu':
        return [
          'glm-4-flash',
          'glm-4v-flash',
          'cogview-3-flash',
          'cogvideox-flash'
        ];
      
      case 'shenma':
        return [
          'gpt-4o', // 修正为正确的模型
          'nano-banana',
          'sora_video2' // 修正为正确的视频模型
        ];
      
      case 'google':
        return [
          'gemini-pro',
          'gemini-pro-vision',
          'gemini-1.5-pro'
        ];
      
      case 'openai-compatible':
        return [
          'gpt-3.5-turbo',
          'gpt-4',
          'gpt-4-vision-preview'
        ];
      
      default:
        return [];
    }
  }

  /**
   * 验证配置完整性
   */
  validateConfig(config: ModelConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必需字段
    if (!config.text) {
      errors.push('Text provider configuration is missing');
    } else if (!this.validateProviderSettings(config.text.provider, config.text)) {
      errors.push('Invalid text provider settings');
    }

    if (!config.image) {
      errors.push('Image provider configuration is missing');
    } else if (!this.validateProviderSettings(config.image.provider, config.image)) {
      errors.push('Invalid image provider settings');
    }

    if (!config.video) {
      errors.push('Video provider configuration is missing');
    } else if (!this.validateProviderSettings(config.video.provider, config.video)) {
      errors.push('Invalid video provider settings');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 生成配置摘要
   */
  getConfigSummary(config: ModelConfig): string {
    const textProvider = this.getProviderDisplayName(config.text.provider);
    const imageProvider = this.getProviderDisplayName(config.image.provider);
    const videoProvider = this.getProviderDisplayName(config.video.provider);

    return `Text: ${textProvider}, Image: ${imageProvider}, Video: ${videoProvider}`;
  }
}

/**
 * 创建配置适配器实例
 */
export function createConfigAdapter(): ConfigurationAdapter {
  return new ConfigurationAdapter();
}

/**
 * 默认导出
 */
export default ConfigurationAdapter;