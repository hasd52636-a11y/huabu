/**
 * 模型错误处理服务
 * Model Error Handler Service
 * 
 * 负责处理模型选择和使用过程中的各种错误情况
 */

import { getAllImageModels, getAllVideoModels, DEFAULT_MODEL_PREFERENCES } from '../types';

export interface ModelError {
  type: 'unavailable' | 'invalid' | 'storage' | 'conflict' | 'network';
  message: string;
  modelId?: string;
  featureId?: string;
  fallbackModel?: string;
  timestamp: Date;
}

export interface ModelFallbackResult {
  success: boolean;
  selectedModel: string;
  originalModel?: string;
  reason: string;
  error?: ModelError;
}

export class ModelErrorHandler {
  private static errorLog: ModelError[] = [];
  private static readonly MAX_ERROR_LOG_SIZE = 100;

  /**
   * 处理模型不可用的情况
   * Handle model unavailability
   */
  static handleModelUnavailable(
    modelId: string, 
    generationType: 'text' | 'image' | 'video',
    lang: 'zh' | 'en' = 'zh'
  ): ModelFallbackResult {
    const error: ModelError = {
      type: 'unavailable',
      message: lang === 'zh' 
        ? `模型 ${modelId} 当前不可用` 
        : `Model ${modelId} is currently unavailable`,
      modelId,
      timestamp: new Date()
    };

    this.logError(error);

    // 获取降级模型
    const fallbackModel = this.getFallbackModel(generationType);
    
    return {
      success: true,
      selectedModel: fallbackModel,
      originalModel: modelId,
      reason: lang === 'zh' 
        ? `原模型不可用，已切换到默认模型 ${fallbackModel}`
        : `Original model unavailable, switched to default model ${fallbackModel}`,
      error
    };
  }

  /**
   * 处理无效模型选择
   * Handle invalid model selection
   */
  static handleInvalidModel(
    modelId: string,
    generationType: 'text' | 'image' | 'video',
    lang: 'zh' | 'en' = 'zh'
  ): ModelFallbackResult {
    const error: ModelError = {
      type: 'invalid',
      message: lang === 'zh' 
        ? `无效的${generationType === 'image' ? '图像' : generationType === 'video' ? '视频' : '文本'}模型: ${modelId}`
        : `Invalid ${generationType} model: ${modelId}`,
      modelId,
      timestamp: new Date()
    };

    this.logError(error);

    const fallbackModel = this.getFallbackModel(generationType);
    
    return {
      success: true,
      selectedModel: fallbackModel,
      originalModel: modelId,
      reason: lang === 'zh' 
        ? `无效模型，已切换到默认模型 ${fallbackModel}`
        : `Invalid model, switched to default model ${fallbackModel}`,
      error
    };
  }

  /**
   * 处理存储失败
   * Handle storage failure
   */
  static handleStorageFailure(
    operation: 'save' | 'load',
    lang: 'zh' | 'en' = 'zh'
  ): ModelFallbackResult {
    const error: ModelError = {
      type: 'storage',
      message: lang === 'zh' 
        ? `存储操作失败: ${operation === 'save' ? '保存' : '加载'}用户偏好`
        : `Storage operation failed: ${operation} user preferences`,
      timestamp: new Date()
    };

    this.logError(error);

    return {
      success: false,
      selectedModel: DEFAULT_MODEL_PREFERENCES.defaultImageModel, // 使用默认值
      reason: lang === 'zh' 
        ? '存储不可用，使用会话存储'
        : 'Storage unavailable, using session storage',
      error
    };
  }

  /**
   * 处理功能冲突
   * Handle feature conflict
   */
  static handleFeatureConflict(
    featureId: string,
    userPreference: string,
    requiredModel: string,
    reason: string,
    lang: 'zh' | 'en' = 'zh'
  ): ModelFallbackResult {
    const error: ModelError = {
      type: 'conflict',
      message: lang === 'zh' 
        ? `功能 ${featureId} 需要特定模型，与用户偏好冲突`
        : `Feature ${featureId} requires specific model, conflicts with user preference`,
      modelId: userPreference,
      featureId,
      fallbackModel: requiredModel,
      timestamp: new Date()
    };

    this.logError(error);

    return {
      success: true,
      selectedModel: requiredModel,
      originalModel: userPreference,
      reason: reason,
      error
    };
  }

  /**
   * 处理网络错误
   * Handle network error
   */
  static handleNetworkError(
    modelId: string,
    lang: 'zh' | 'en' = 'zh'
  ): ModelFallbackResult {
    const error: ModelError = {
      type: 'network',
      message: lang === 'zh' 
        ? `网络错误，无法连接到模型 ${modelId}`
        : `Network error, cannot connect to model ${modelId}`,
      modelId,
      timestamp: new Date()
    };

    this.logError(error);

    return {
      success: false,
      selectedModel: modelId, // 保持原模型，让用户重试
      reason: lang === 'zh' 
        ? '网络连接问题，请稍后重试'
        : 'Network connection issue, please try again later',
      error
    };
  }

  /**
   * 获取降级模型
   * Get fallback model
   */
  private static getFallbackModel(generationType: 'text' | 'image' | 'video'): string {
    switch (generationType) {
      case 'image':
        const imageModels = getAllImageModels();
        return imageModels.includes(DEFAULT_MODEL_PREFERENCES.defaultImageModel) 
          ? DEFAULT_MODEL_PREFERENCES.defaultImageModel 
          : imageModels[0];
      
      case 'video':
        const videoModels = getAllVideoModels();
        return videoModels.includes(DEFAULT_MODEL_PREFERENCES.defaultVideoModel) 
          ? DEFAULT_MODEL_PREFERENCES.defaultVideoModel 
          : videoModels[0];
      
      default:
        return DEFAULT_MODEL_PREFERENCES.defaultTextModel;
    }
  }

  /**
   * 验证模型是否有效
   * Validate if model is valid
   */
  static validateModel(modelId: string, generationType: 'text' | 'image' | 'video'): boolean {
    switch (generationType) {
      case 'image':
        return getAllImageModels().includes(modelId);
      case 'video':
        return getAllVideoModels().includes(modelId);
      default:
        // 对于文本模型，我们假设它们在其他地方验证
        return true;
    }
  }

  /**
   * 获取用户友好的错误消息
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: ModelError, lang: 'zh' | 'en' = 'zh'): string {
    switch (error.type) {
      case 'unavailable':
        return lang === 'zh' 
          ? `模型暂时不可用，已自动切换到备用模型`
          : `Model temporarily unavailable, automatically switched to backup model`;
      
      case 'invalid':
        return lang === 'zh' 
          ? `选择的模型无效，已切换到默认模型`
          : `Selected model is invalid, switched to default model`;
      
      case 'storage':
        return lang === 'zh' 
          ? `无法保存设置，将使用临时配置`
          : `Cannot save settings, using temporary configuration`;
      
      case 'conflict':
        return lang === 'zh' 
          ? `此功能需要特定模型，已自动选择合适的模型`
          : `This feature requires a specific model, automatically selected appropriate model`;
      
      case 'network':
        return lang === 'zh' 
          ? `网络连接问题，请检查网络后重试`
          : `Network connection issue, please check network and retry`;
      
      default:
        return lang === 'zh' 
          ? `发生未知错误，请重试`
          : `Unknown error occurred, please retry`;
    }
  }

  /**
   * 记录错误
   * Log error
   */
  private static logError(error: ModelError): void {
    this.errorLog.push(error);
    
    // 限制错误日志大小
    if (this.errorLog.length > this.MAX_ERROR_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(-this.MAX_ERROR_LOG_SIZE);
    }

    // 输出到控制台用于调试
    console.warn('[ModelErrorHandler]', error);
  }

  /**
   * 获取错误日志
   * Get error log
   */
  static getErrorLog(): ModelError[] {
    return [...this.errorLog];
  }

  /**
   * 清除错误日志
   * Clear error log
   */
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * 获取错误统计
   * Get error statistics
   */
  static getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    this.errorLog.forEach(error => {
      stats[error.type] = (stats[error.type] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * 检查是否有频繁错误
   * Check for frequent errors
   */
  static hasFrequentErrors(modelId: string, timeWindowMs: number = 60000): boolean {
    const now = new Date();
    const recentErrors = this.errorLog.filter(error => 
      error.modelId === modelId && 
      (now.getTime() - error.timestamp.getTime()) < timeWindowMs
    );
    
    return recentErrors.length >= 3; // 1分钟内3次错误认为是频繁错误
  }

  /**
   * 获取模型健康状态
   * Get model health status
   */
  static getModelHealth(modelId: string): 'healthy' | 'warning' | 'error' {
    const recentErrors = this.errorLog.filter(error => 
      error.modelId === modelId && 
      (new Date().getTime() - error.timestamp.getTime()) < 300000 // 5分钟内
    );
    
    if (recentErrors.length === 0) return 'healthy';
    if (recentErrors.length <= 2) return 'warning';
    return 'error';
  }
}