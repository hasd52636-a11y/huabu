/**
 * ConfigValidator - 配置验证工具类
 * 
 * 功能：
 * - 验证提供商凭证是否完整且有效
 * - 验证完整的ModelConfig配置
 * - 提供详细的错误和警告信息
 */

import { ProviderType, ProviderSettings, NewModelConfig, ProviderCredentials } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConfigValidationResult {
  valid: boolean;
  issues: {
    providers: Record<ProviderType, ValidationResult>;
    modalities: {
      text: ValidationResult;
      image: ValidationResult;
      video: ValidationResult;
    };
  };
}

export class ConfigValidator {
  /**
   * 验证提供商凭证是否完整且有效
   */
  static validateProviderCredentials(
    provider: ProviderType, 
    credentials: ProviderCredentials | undefined
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!credentials) {
      errors.push(`提供商 ${provider} 未配置`);
      return { valid: false, errors, warnings };
    }

    // 检查API密钥
    if (!credentials.apiKey || credentials.apiKey.trim() === '') {
      errors.push('API密钥不能为空');
    } else if (credentials.apiKey.length < 10) {
      warnings.push('API密钥长度可能不正确（少于10个字符）');
    } else if (!/^[\x00-\x7F]*$/.test(credentials.apiKey)) {
      errors.push('API密钥包含非ASCII字符，请检查是否复制正确');
    }

    // 检查baseUrl
    if (!credentials.baseUrl || credentials.baseUrl.trim() === '') {
      // Google不需要baseUrl
      if (provider !== 'google') {
        errors.push('API地址不能为空');
      }
    } else if (!credentials.baseUrl.startsWith('http')) {
      errors.push('API地址格式不正确（必须以http或https开头）');
    }

    // 检查是否启用
    if (!credentials.enabled) {
      warnings.push('此提供商已禁用');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证ProviderSettings（旧格式）
   */
  static validateProviderSettings(settings: ProviderSettings): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查provider
    if (!settings.provider) {
      errors.push('未指定提供商类型');
    }

    // 检查modelId
    if (!settings.modelId || settings.modelId.trim() === '') {
      errors.push('未指定模型ID');
    }

    // 检查API密钥（Google除外）
    if (settings.provider !== 'google') {
      if (!settings.apiKey || settings.apiKey.trim() === '') {
        errors.push('API密钥不能为空');
      } else if (settings.apiKey.length < 10) {
        warnings.push('API密钥长度可能不正确');
      }
    }

    // 检查baseUrl（需要的提供商）
    if (settings.provider === 'openai-compatible' || 
        settings.provider === 'zhipu' || 
        settings.provider === 'shenma') {
      if (!settings.baseUrl || settings.baseUrl.trim() === '') {
        errors.push('API地址不能为空');
      } else if (!settings.baseUrl.startsWith('http')) {
        errors.push('API地址格式不正确');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证完整的NewModelConfig
   */
  static validateNewModelConfig(config: NewModelConfig): ConfigValidationResult {
    const issues: ConfigValidationResult['issues'] = {
      providers: {} as Record<ProviderType, ValidationResult>,
      modalities: {
        text: { valid: true, errors: [], warnings: [] },
        image: { valid: true, errors: [], warnings: [] },
        video: { valid: true, errors: [], warnings: [] }
      }
    };

    // 验证所有配置的提供商
    const providers: ProviderType[] = ['google', 'openai-compatible', 'shenma', 'zhipu'];
    providers.forEach(provider => {
      const credentials = config.providers[provider];
      if (credentials) {
        issues.providers[provider] = this.validateProviderCredentials(provider, credentials);
      }
    });

    // 验证每个模态的配置
    const modalities: ('text' | 'image' | 'video')[] = ['text', 'image', 'video'];
    modalities.forEach(modality => {
      const modalityConfig = config[modality];
      const credentials = config.providers[modalityConfig.provider];

      if (!credentials) {
        issues.modalities[modality].errors.push(
          `${modality}模态选择的提供商 ${modalityConfig.provider} 未配置凭证`
        );
        issues.modalities[modality].valid = false;
      } else {
        const credValidation = this.validateProviderCredentials(modalityConfig.provider, credentials);
        issues.modalities[modality].errors.push(...credValidation.errors);
        issues.modalities[modality].warnings.push(...credValidation.warnings);
        issues.modalities[modality].valid = credValidation.valid;
      }

      // 检查模型ID
      if (!modalityConfig.modelId || modalityConfig.modelId.trim() === '') {
        issues.modalities[modality].errors.push('未指定模型ID');
        issues.modalities[modality].valid = false;
      }
    });

    // 计算总体有效性
    const allModalitiesValid = modalities.every(m => issues.modalities[m].valid);

    return {
      valid: allModalitiesValid,
      issues
    };
  }

  /**
   * 获取验证结果的摘要信息
   */
  static getValidationSummary(result: ConfigValidationResult): string {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // 收集所有错误和警告
    Object.values(result.issues.modalities).forEach(modalityResult => {
      allErrors.push(...modalityResult.errors);
      allWarnings.push(...modalityResult.warnings);
    });

    if (allErrors.length === 0 && allWarnings.length === 0) {
      return '✓ 配置验证通过';
    }

    let summary = '';
    if (allErrors.length > 0) {
      summary += `❌ 发现 ${allErrors.length} 个错误:\n${allErrors.map(e => `  • ${e}`).join('\n')}`;
    }
    if (allWarnings.length > 0) {
      if (summary) summary += '\n\n';
      summary += `⚠️ 发现 ${allWarnings.length} 个警告:\n${allWarnings.map(w => `  • ${w}`).join('\n')}`;
    }

    return summary;
  }

  /**
   * 脱敏显示API密钥（显示前4位和后4位）
   */
  static maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return '****';
    }
    return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
  }

  /**
   * 检查API密钥格式是否合理
   */
  static isValidApiKeyFormat(apiKey: string, provider: ProviderType): boolean {
    if (!apiKey || apiKey.trim() === '') {
      return false;
    }

    // 检查是否包含非ASCII字符
    if (!/^[\x00-\x7F]*$/.test(apiKey)) {
      return false;
    }

    // 提供商特定的格式检查
    switch (provider) {
      case 'google':
        // Google API密钥通常以AIza开头
        return apiKey.startsWith('AIza') && apiKey.length >= 39;
      
      case 'openai-compatible':
      case 'shenma':
        // OpenAI格式通常以sk-开头
        return apiKey.startsWith('sk-') && apiKey.length >= 20;
      
      case 'zhipu':
        // 智谱API密钥格式较灵活，只检查长度
        return apiKey.length >= 32;
      
      default:
        // 默认只检查长度
        return apiKey.length >= 10;
    }
  }
}
