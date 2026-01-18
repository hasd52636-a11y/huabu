/**
 * Model Capability Detector - 检测AI模型的多模态能力
 * 
 * 功能：
 * - 检测模型是否支持视频分析
 * - 识别Gemini模型
 * - 根据模型能力返回支持的文件类型
 * - 提供视频上传限制信息
 */

import { BlockType, ModelConfig, ProviderSettings } from '../types';

export interface VideoUploadLimits {
  maxSizeBytes: number;
  maxSizeMB: number;
  supportedFormats: string[];
  description: string;
}

export interface FileTypeConfig {
  text: {
    base: string[];
    withVideo: string[];
  };
  image: string[];
  video: string[];
}

export interface ModelDetectionRules {
  geminiPatterns: RegExp[];
  supportedProviders: string[];
}

// 文件类型配置
const FILE_TYPE_CONFIG: FileTypeConfig = {
  text: {
    base: ['.txt', '.md', '.js', '.ts', '.tsx', '.json', '.css', '.html', '.doc', '.docx', '.pdf'],
    withVideo: ['.txt', '.md', '.js', '.ts', '.tsx', '.json', '.css', '.html', '.doc', '.docx', '.pdf', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']
  },
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
  video: [] // 视频模式不支持文件上传（仅用于生成）
};

// 模型检测规则
const DETECTION_RULES: ModelDetectionRules = {
  geminiPatterns: [
    /gemini/i,
    /gemini-\d+(\.\d+)?-flash/i,
    /gemini-\d+(\.\d+)?-pro/i,
    /gemini-\d+(\.\d+)?-preview/i
  ],
  supportedProviders: ['shenma', 'google']
};

// 视频上传限制（基于神马API的实际限制）
const VIDEO_UPLOAD_LIMITS: VideoUploadLimits = {
  maxSizeBytes: 30 * 1024 * 1024, // 30MB
  maxSizeMB: 30,
  supportedFormats: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'],
  description: '支持常见视频格式，最大30MB'
};

export class ModelCapabilityDetector {
  /**
   * 检查模型是否支持视频分析
   */
  supportsVideoAnalysis(modelConfig: ProviderSettings): boolean {
    if (!modelConfig || !modelConfig.modelId) {
      return false;
    }

    // 检查提供商是否支持
    if (!DETECTION_RULES.supportedProviders.includes(modelConfig.provider)) {
      return false;
    }

    // 检查是否为Gemini模型
    return this.isGeminiModel(modelConfig.modelId);
  }

  /**
   * 检查是否为Gemini模型
   */
  isGeminiModel(modelId: string): boolean {
    if (!modelId || typeof modelId !== 'string') {
      return false;
    }

    return DETECTION_RULES.geminiPatterns.some(pattern => pattern.test(modelId));
  }

  /**
   * 根据聊天模式和模型配置获取支持的文件类型
   */
  getSupportedFileTypes(chatMode: BlockType, modelConfig: ModelConfig): string[] {
    switch (chatMode) {
      case 'text':
        const textModelConfig = modelConfig.text;
        if (textModelConfig && this.supportsVideoAnalysis(textModelConfig)) {
          return FILE_TYPE_CONFIG.text.withVideo;
        }
        return FILE_TYPE_CONFIG.text.base;
      
      case 'image':
        return FILE_TYPE_CONFIG.image;
      
      case 'video':
        return FILE_TYPE_CONFIG.video; // 空数组，视频模式不支持文件上传
      
      default:
        return [];
    }
  }

  /**
   * 检查是否允许视频上传
   */
  isVideoUploadEnabled(chatMode: BlockType, modelConfig: ModelConfig): boolean {
    // 只有文本模式且使用Gemini模型时才允许视频上传
    if (chatMode !== 'text') {
      return false;
    }

    const textModelConfig = modelConfig.text;
    return textModelConfig ? this.supportsVideoAnalysis(textModelConfig) : false;
  }

  /**
   * 获取视频上传限制信息
   */
  getVideoUploadLimits(): VideoUploadLimits {
    return { ...VIDEO_UPLOAD_LIMITS };
  }

  /**
   * 验证视频文件是否符合限制
   */
  validateVideoFile(file: File): { valid: boolean; error?: string } {
    // 检查文件类型
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!VIDEO_UPLOAD_LIMITS.supportedFormats.includes(fileExtension)) {
      return {
        valid: false,
        error: `不支持的视频格式。支持的格式：${VIDEO_UPLOAD_LIMITS.supportedFormats.join(', ')}`
      };
    }

    // 检查文件大小
    if (file.size > VIDEO_UPLOAD_LIMITS.maxSizeBytes) {
      return {
        valid: false,
        error: `视频文件过大。最大支持 ${VIDEO_UPLOAD_LIMITS.maxSizeMB}MB，当前文件 ${Math.round(file.size / 1024 / 1024)}MB`
      };
    }

    return { valid: true };
  }

  /**
   * 获取文件类型的accept属性值
   */
  getAcceptAttribute(chatMode: BlockType, modelConfig: ModelConfig): string {
    const supportedTypes = this.getSupportedFileTypes(chatMode, modelConfig);
    return supportedTypes.join(',');
  }

  /**
   * 获取当前配置的描述信息
   */
  getConfigurationDescription(chatMode: BlockType, modelConfig: ModelConfig): string {
    const isVideoEnabled = this.isVideoUploadEnabled(chatMode, modelConfig);
    const supportedTypes = this.getSupportedFileTypes(chatMode, modelConfig);
    
    let description = `当前模式：${chatMode === 'text' ? '文本' : chatMode === 'image' ? '图像' : '视频'}`;
    
    if (chatMode === 'text') {
      const textModel = modelConfig.text?.modelId || '未配置';
      const isGemini = this.isGeminiModel(textModel);
      description += `\n模型：${textModel}${isGemini ? ' (支持多模态：文本+图片+视频理解)' : ' (仅文本)'}`;
    }
    
    if (supportedTypes.length > 0) {
      description += `\n支持文件：${supportedTypes.join(', ')}`;
    } else {
      description += '\n当前模式不支持文件上传';
    }
    
    if (isVideoEnabled) {
      description += `\n多模态限制：视频最大${VIDEO_UPLOAD_LIMITS.maxSizeMB}MB`;
    }
    
    return description;
  }
}

// 导出单例实例
export const modelCapabilityDetector = new ModelCapabilityDetector();

export default ModelCapabilityDetector;