/**
 * 功能模型管理器
 * Feature Model Manager
 * 
 * 负责管理画布功能与模型的绑定关系，实现智能模型选择
 */

import { FEATURE_BINDINGS } from '../types';

export interface FeatureModelBinding {
  featureId: string;
  model: string;
  reason: string;
}

export interface ModelSelectionResult {
  selectedModel: string;
  isLocked: boolean;
  lockReason?: string;
  conflictWithPreference: boolean;
}

export class FeatureModelManager {
  private bindings: Record<string, { model: string; reason: string }>;

  constructor() {
    this.bindings = FEATURE_BINDINGS;
  }

  /**
   * 获取功能所需的模型
   * Get required model for a feature
   */
  getRequiredModel(featureId: string): string | null {
    const binding = this.bindings[featureId];
    return binding ? binding.model : null;
  }

  /**
   * 检查是否需要锁定模型
   * Check if model should be locked for a feature
   */
  shouldLockModel(featureId: string, userPreference?: string): boolean {
    const requiredModel = this.getRequiredModel(featureId);
    if (!requiredModel) return false;
    
    // 如果功能需要特定模型，且与用户偏好不同，则需要锁定
    return userPreference ? requiredModel !== userPreference : true;
  }

  /**
   * 获取锁定原因的友好提示
   * Get friendly lock reason message
   */
  getLockReason(featureId: string): string {
    const binding = this.bindings[featureId];
    return binding ? binding.reason : '此功能需要特定模型';
  }

  /**
   * 获取模型选择结果
   * Get model selection result for a feature
   */
  getModelForFeature(featureId: string, userPreference?: string): ModelSelectionResult {
    const requiredModel = this.getRequiredModel(featureId);
    
    if (!requiredModel) {
      // 功能没有特定模型要求，使用用户偏好
      return {
        selectedModel: userPreference || 'nano-banana-hd', // 默认模型
        isLocked: false,
        conflictWithPreference: false
      };
    }

    // 功能需要特定模型
    const conflictWithPreference = userPreference && userPreference !== requiredModel;
    
    return {
      selectedModel: requiredModel,
      isLocked: true,
      lockReason: this.getLockReason(featureId),
      conflictWithPreference: !!conflictWithPreference
    };
  }

  /**
   * 获取所有功能绑定
   * Get all feature bindings
   */
  getFeatureBindings(): FeatureModelBinding[] {
    return Object.entries(this.bindings).map(([featureId, binding]) => ({
      featureId,
      model: binding.model,
      reason: binding.reason
    }));
  }

  /**
   * 检查模型是否被某个功能绑定
   * Check if a model is bound to any feature
   */
  isModelBoundToFeature(modelId: string): boolean {
    return Object.values(this.bindings).some(binding => binding.model === modelId);
  }

  /**
   * 获取使用特定模型的功能列表
   * Get features that use a specific model
   */
  getFeaturesUsingModel(modelId: string): string[] {
    return Object.entries(this.bindings)
      .filter(([, binding]) => binding.model === modelId)
      .map(([featureId]) => featureId);
  }

  /**
   * 验证功能ID是否存在
   * Validate if feature ID exists
   */
  isValidFeature(featureId: string): boolean {
    return featureId in this.bindings;
  }

  /**
   * 获取功能的显示名称
   * Get display name for a feature
   */
  getFeatureDisplayName(featureId: string, lang: 'zh' | 'en' = 'zh'): string {
    const displayNames: Record<string, { zh: string; en: string }> = {
      'smear-removal': { zh: '涂抹去除', en: 'Smear Removal' },
      'style-transfer': { zh: '风格转换', en: 'Style Transfer' },
      'background-removal': { zh: '背景去除', en: 'Background Removal' },
      'image-enhance': { zh: '图像增强', en: 'Image Enhancement' },
      'character-cameo': { zh: '角色客串', en: 'Character Cameo' },
      'video-style-transfer': { zh: '视频风格转换', en: 'Video Style Transfer' },
      'character-animation': { zh: '角色动画', en: 'Character Animation' }
    };

    const displayName = displayNames[featureId];
    return displayName ? displayName[lang] : featureId;
  }
}

// 导出单例实例
export const featureModelManager = new FeatureModelManager();