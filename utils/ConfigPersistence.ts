/**
 * ConfigPersistence - 配置持久化工具类
 * 
 * 功能：
 * - 保存配置到localStorage（带版本号和时间戳）
 * - 从localStorage加载配置（兼容旧格式）
 * - 清除配置
 * - 添加详细的调试日志
 */

import { NewModelConfig, ModelConfig, convertLegacyToNewConfig, convertNewToLegacyConfig } from '../types';

export interface StoredConfig {
  version: string;
  timestamp: number;
  config: NewModelConfig | ModelConfig;
}

export class ConfigPersistence {
  private static readonly STORAGE_KEY = 'creative-flow-master-config';
  private static readonly CURRENT_VERSION = '2.0';
  private static readonly LEGACY_VERSION = '1.0';

  /**
   * 保存配置到localStorage（新格式）
   */
  static saveNewConfig(config: NewModelConfig): void {
    try {
      const storedConfig: StoredConfig = {
        version: this.CURRENT_VERSION,
        timestamp: Date.now(),
        config: {
          ...config,
          _meta: {
            version: this.CURRENT_VERSION,
            lastSaved: Date.now(),
            lastValidated: config._meta?.lastValidated
          }
        }
      };

      const serialized = JSON.stringify(storedConfig);
      localStorage.setItem(this.STORAGE_KEY, serialized);

      console.log('[ConfigPersistence] ✓ Configuration saved successfully (v2.0)');
      console.log('[ConfigPersistence] Config summary:', this.getConfigSummary(config));
    } catch (error) {
      console.error('[ConfigPersistence] ❌ Failed to save configuration:', error);
      throw new Error('配置保存失败: ' + (error as Error).message);
    }
  }

  /**
   * 保存配置到localStorage（旧格式，向后兼容）
   */
  static saveLegacyConfig(config: ModelConfig): void {
    try {
      // 转换为新格式后保存
      const newConfig = convertLegacyToNewConfig(config);
      this.saveNewConfig(newConfig);
    } catch (error) {
      console.error('[ConfigPersistence] ❌ Failed to save legacy configuration:', error);
      throw new Error('配置保存失败: ' + (error as Error).message);
    }
  }

  /**
   * 从localStorage加载配置（新格式）
   */
  static loadNewConfig(): NewModelConfig | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      
      if (!stored) {
        console.log('[ConfigPersistence] No saved configuration found');
        return null;
      }

      const parsed: StoredConfig = JSON.parse(stored);
      
      // 检查版本
      if (parsed.version === this.CURRENT_VERSION) {
        const config = parsed.config as NewModelConfig;
        console.log('[ConfigPersistence] ✓ Configuration loaded successfully (v2.0)');
        console.log('[ConfigPersistence] Config summary:', this.getConfigSummary(config));
        return config;
      } else if (parsed.version === this.LEGACY_VERSION || !parsed.version) {
        // 旧版本配置，需要迁移
        console.log('[ConfigPersistence] ⚠️ Legacy configuration detected, migrating...');
        const legacyConfig = parsed.config as ModelConfig;
        const newConfig = convertLegacyToNewConfig(legacyConfig);
        
        // 自动保存迁移后的配置
        this.saveNewConfig(newConfig);
        console.log('[ConfigPersistence] ✓ Configuration migrated to v2.0');
        
        return newConfig;
      } else {
        console.warn('[ConfigPersistence] ⚠️ Unknown configuration version:', parsed.version);
        return null;
      }
    } catch (error) {
      console.error('[ConfigPersistence] ❌ Failed to load configuration:', error);
      return null;
    }
  }

  /**
   * 从localStorage加载配置（旧格式，向后兼容）
   */
  static loadLegacyConfig(): ModelConfig | null {
    try {
      const newConfig = this.loadNewConfig();
      if (!newConfig) {
        return null;
      }

      // 转换为旧格式
      const legacyConfig = convertNewToLegacyConfig(newConfig);
      console.log('[ConfigPersistence] ✓ Configuration converted to legacy format');
      return legacyConfig;
    } catch (error) {
      console.error('[ConfigPersistence] ❌ Failed to load legacy configuration:', error);
      return null;
    }
  }

  /**
   * 清除配置
   */
  static clearConfig(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('[ConfigPersistence] ✓ Configuration cleared');
    } catch (error) {
      console.error('[ConfigPersistence] ❌ Failed to clear configuration:', error);
    }
  }

  /**
   * 检查是否存在保存的配置
   */
  static hasConfig(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }

  /**
   * 获取配置版本
   */
  static getConfigVersion(): string | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const parsed: StoredConfig = JSON.parse(stored);
      return parsed.version || this.LEGACY_VERSION;
    } catch (error) {
      console.error('[ConfigPersistence] ❌ Failed to get configuration version:', error);
      return null;
    }
  }

  /**
   * 获取配置摘要（用于日志）
   */
  private static getConfigSummary(config: NewModelConfig): object {
    const summary: any = {
      providers: {},
      modalities: {
        text: `${config.text.provider} - ${config.text.modelId}`,
        image: `${config.image.provider} - ${config.image.modelId}`,
        video: `${config.video.provider} - ${config.video.modelId}`
      }
    };

    // 提供商配置状态
    const providers: Array<'google' | 'openai-compatible' | 'shenma' | 'zhipu'> = 
      ['google', 'openai-compatible', 'shenma', 'zhipu'];
    
    providers.forEach(provider => {
      const cred = config.providers[provider];
      if (cred) {
        summary.providers[provider] = {
          configured: !!cred.apiKey,
          enabled: cred.enabled,
          apiKeyLength: cred.apiKey?.length || 0
        };
      }
    });

    return summary;
  }

  /**
   * 导出配置为JSON（用于备份）
   */
  static exportConfig(): string | null {
    try {
      const config = this.loadNewConfig();
      if (!config) {
        return null;
      }

      return JSON.stringify(config, null, 2);
    } catch (error) {
      console.error('[ConfigPersistence] ❌ Failed to export configuration:', error);
      return null;
    }
  }

  /**
   * 从JSON导入配置（用于恢复）
   */
  static importConfig(jsonString: string): boolean {
    try {
      const config: NewModelConfig = JSON.parse(jsonString);
      
      // 基本验证
      if (!config.providers || !config.text || !config.image || !config.video) {
        throw new Error('Invalid configuration format');
      }

      this.saveNewConfig(config);
      console.log('[ConfigPersistence] ✓ Configuration imported successfully');
      return true;
    } catch (error) {
      console.error('[ConfigPersistence] ❌ Failed to import configuration:', error);
      return false;
    }
  }

  /**
   * 获取配置统计信息
   */
  static getConfigStats(): {
    version: string | null;
    lastSaved: number | null;
    providersConfigured: number;
    totalProviders: number;
  } {
    const config = this.loadNewConfig();
    
    if (!config) {
      return {
        version: null,
        lastSaved: null,
        providersConfigured: 0,
        totalProviders: 4
      };
    }

    const providersConfigured = Object.values(config.providers).filter(
      cred => cred && cred.apiKey && cred.enabled
    ).length;

    return {
      version: config._meta?.version || this.CURRENT_VERSION,
      lastSaved: config._meta?.lastSaved || null,
      providersConfigured,
      totalProviders: 4
    };
  }
}
