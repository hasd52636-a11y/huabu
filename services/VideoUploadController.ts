/**
 * Video Upload Controller - 管理视频上传权限和用户引导
 * 
 * 功能：
 * - 检查视频上传权限
 * - 生成限制原因说明
 * - 提供快速操作建议
 * - 多语言支持
 */

import { BlockType, ModelConfig } from '../types';
import { modelCapabilityDetector } from './ModelCapabilityDetector';

export interface QuickAction {
  label: string;
  action: () => void;
  description: string;
  type: 'switch-mode' | 'switch-model' | 'info';
}

export interface UploadRestriction {
  reason: string;
  suggestion: string;
  quickAction?: QuickAction;
}

export interface VideoUploadPermission {
  enabled: boolean;
  restriction?: UploadRestriction;
  supportedTypes: string[];
  acceptAttribute: string;
}

export class VideoUploadController {
  private lang: 'zh' | 'en' = 'zh';

  constructor(lang: 'zh' | 'en' = 'zh') {
    this.lang = lang;
  }

  /**
   * 设置语言
   */
  setLanguage(lang: 'zh' | 'en'): void {
    this.lang = lang;
  }

  /**
   * 检查视频上传是否启用
   */
  isVideoUploadEnabled(chatMode: BlockType, modelConfig: ModelConfig): boolean {
    return modelCapabilityDetector.isVideoUploadEnabled(chatMode, modelConfig);
  }

  /**
   * 获取上传权限信息
   */
  getUploadPermission(
    chatMode: BlockType, 
    modelConfig: ModelConfig,
    onModeChange?: (mode: BlockType) => void,
    onModelChange?: () => void
  ): VideoUploadPermission {
    const enabled = this.isVideoUploadEnabled(chatMode, modelConfig);
    const supportedTypes = modelCapabilityDetector.getSupportedFileTypes(chatMode, modelConfig);
    const acceptAttribute = modelCapabilityDetector.getAcceptAttribute(chatMode, modelConfig);

    if (enabled) {
      return {
        enabled: true,
        supportedTypes,
        acceptAttribute
      };
    }

    // 生成限制信息
    const restriction = this.getRestrictionInfo(chatMode, modelConfig, onModeChange, onModelChange);

    return {
      enabled: false,
      restriction,
      supportedTypes,
      acceptAttribute
    };
  }

  /**
   * 获取限制信息
   */
  private getRestrictionInfo(
    chatMode: BlockType,
    modelConfig: ModelConfig,
    onModeChange?: (mode: BlockType) => void,
    onModelChange?: () => void
  ): UploadRestriction {
    const t = this.getTranslations();

    // 检查聊天模式
    if (chatMode !== 'text') {
      return {
        reason: t.restrictions.wrongMode,
        suggestion: t.suggestions.switchToText,
        quickAction: onModeChange ? {
          label: t.actions.switchToText,
          action: () => onModeChange('text'),
          description: t.actionDescriptions.switchToText,
          type: 'switch-mode'
        } : undefined
      };
    }

    // 检查模型配置
    const textModel = modelConfig.text;
    if (!textModel) {
      return {
        reason: t.restrictions.noModel,
        suggestion: t.suggestions.configureModel,
        quickAction: onModelChange ? {
          label: t.actions.configureModel,
          action: onModelChange,
          description: t.actionDescriptions.configureModel,
          type: 'switch-model'
        } : undefined
      };
    }

    // 检查是否为Gemini模型
    if (!modelCapabilityDetector.isGeminiModel(textModel.modelId)) {
      return {
        reason: t.restrictions.nonGeminiModel.replace('{model}', textModel.modelId),
        suggestion: t.suggestions.useGemini,
        quickAction: onModelChange ? {
          label: t.actions.switchToGemini,
          action: onModelChange,
          description: t.actionDescriptions.switchToGemini,
          type: 'switch-model'
        } : undefined
      };
    }

    // 默认限制（不应该到达这里）
    return {
      reason: t.restrictions.unknown,
      suggestion: t.suggestions.checkConfig
    };
  }

  /**
   * 获取文件上传提示文本
   */
  getUploadHintText(chatMode: BlockType, modelConfig: ModelConfig): string {
    const t = this.getTranslations();
    const enabled = this.isVideoUploadEnabled(chatMode, modelConfig);
    
    if (enabled) {
      const limits = modelCapabilityDetector.getVideoUploadLimits();
      return t.hints.videoEnabled
        .replace('{formats}', limits.supportedFormats.join(', '))
        .replace('{maxSize}', `${limits.maxSizeMB}MB`);
    }

    const restriction = this.getRestrictionInfo(chatMode, modelConfig);
    return restriction.reason;
  }

  /**
   * 获取详细的配置说明
   */
  getConfigurationHelp(chatMode: BlockType, modelConfig: ModelConfig): string {
    const t = this.getTranslations();
    const description = modelCapabilityDetector.getConfigurationDescription(chatMode, modelConfig);
    
    return `${t.help.currentConfig}\n${description}\n\n${t.help.videoRequirement}`;
  }

  /**
   * 验证上传的文件
   */
  validateUploadedFile(file: File, chatMode: BlockType, modelConfig: ModelConfig): { valid: boolean; error?: string } {
    const t = this.getTranslations();

    // 检查是否允许视频上传
    if (!this.isVideoUploadEnabled(chatMode, modelConfig)) {
      return {
        valid: false,
        error: t.errors.uploadNotAllowed
      };
    }

    // 检查是否为视频文件
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const limits = modelCapabilityDetector.getVideoUploadLimits();
    
    if (limits.supportedFormats.includes(fileExtension)) {
      // 验证视频文件
      return modelCapabilityDetector.validateVideoFile(file);
    }

    // 非视频文件，检查是否为支持的其他类型
    const supportedTypes = modelCapabilityDetector.getSupportedFileTypes(chatMode, modelConfig);
    if (!supportedTypes.includes(fileExtension)) {
      return {
        valid: false,
        error: t.errors.unsupportedFormat.replace('{formats}', supportedTypes.join(', '))
      };
    }

    return { valid: true };
  }

  /**
   * 获取翻译文本
   */
  private getTranslations() {
    const translations = {
      zh: {
        restrictions: {
          wrongMode: '多模态分析仅在文本模式下可用',
          noModel: '未配置文本模型',
          nonGeminiModel: '当前模型 {model} 不支持多模态分析（文本、图片、视频）',
          unknown: '多模态分析暂不可用'
        },
        suggestions: {
          switchToText: '请切换到文本模式以启用多模态分析',
          configureModel: '请配置文本模型',
          useGemini: '请使用支持多模态的Gemini模型（可理解文本、图片、视频）',
          checkConfig: '请检查模型配置'
        },
        actions: {
          switchToText: '切换到文本模式',
          configureModel: '配置模型',
          switchToGemini: '切换到Gemini'
        },
        actionDescriptions: {
          switchToText: '切换聊天模式到文本以启用多模态分析',
          configureModel: '打开模型配置面板',
          switchToGemini: '切换到支持多模态的Gemini模型（文本+图片+视频理解）'
        },
        hints: {
          videoEnabled: '支持多模态分析：{formats}，最大 {maxSize}（可分析文本、图片、视频内容）',
          videoDisabled: '当前配置不支持多模态分析'
        },
        help: {
          currentConfig: '当前配置：',
          videoRequirement: '多模态分析要求：文本模式 + Gemini模型（支持文本、图片、视频理解）'
        },
        errors: {
          uploadNotAllowed: '当前配置不允许视频上传',
          unsupportedFormat: '不支持的文件格式。支持：{formats}'
        }
      },
      en: {
        restrictions: {
          wrongMode: 'Video upload is only available in text mode',
          noModel: 'No text model configured',
          nonGeminiModel: 'Current model {model} does not support video analysis',
          unknown: 'Video upload is not available'
        },
        suggestions: {
          switchToText: 'Please switch to text mode to upload videos',
          configureModel: 'Please configure text model',
          useGemini: 'Please use Gemini model with multimodal support',
          checkConfig: 'Please check model configuration'
        },
        actions: {
          switchToText: 'Switch to Text Mode',
          configureModel: 'Configure Model',
          switchToGemini: 'Switch to Gemini'
        },
        actionDescriptions: {
          switchToText: 'Switch chat mode to text to enable video upload',
          configureModel: 'Open model configuration panel',
          switchToGemini: 'Switch to Gemini model with multimodal support'
        },
        hints: {
          videoEnabled: 'Video upload supported: {formats}, max {maxSize}',
          videoDisabled: 'Video upload not supported with current configuration'
        },
        help: {
          currentConfig: 'Current configuration:',
          videoRequirement: 'Video upload requires: Text mode + Gemini model'
        },
        errors: {
          uploadNotAllowed: 'Video upload not allowed with current configuration',
          unsupportedFormat: 'Unsupported file format. Supported: {formats}'
        }
      }
    };

    return translations[this.lang];
  }
}

// 导出单例实例
export const videoUploadController = new VideoUploadController();

export default VideoUploadController;