/**
 * 模型偏好存储工具
 * Model Preferences Storage Utility
 * 
 * 负责管理用户的模型偏好设置，支持 localStorage 存储和降级机制
 */

import { UserModelPreferences, DEFAULT_MODEL_PREFERENCES } from '../types';

const STORAGE_KEY = 'user-model-preferences';

export class ModelPreferencesStorage {
  /**
   * 获取用户模型偏好
   * Get user model preferences
   */
  static getPreferences(): UserModelPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 确保所有必需字段都存在
        return {
          defaultImageModel: parsed.defaultImageModel || DEFAULT_MODEL_PREFERENCES.defaultImageModel,
          defaultVideoModel: parsed.defaultVideoModel || DEFAULT_MODEL_PREFERENCES.defaultVideoModel,
          defaultTextModel: parsed.defaultTextModel || DEFAULT_MODEL_PREFERENCES.defaultTextModel,
          lastUpdated: parsed.lastUpdated ? new Date(parsed.lastUpdated) : new Date()
        };
      }
    } catch (error) {
      console.warn('[ModelPreferencesStorage] Failed to load preferences from localStorage:', error);
    }
    
    // 返回默认偏好
    return { ...DEFAULT_MODEL_PREFERENCES };
  }

  /**
   * 保存用户模型偏好
   * Save user model preferences
   */
  static savePreferences(preferences: Partial<UserModelPreferences>): boolean {
    try {
      const current = this.getPreferences();
      const updated: UserModelPreferences = {
        ...current,
        ...preferences,
        lastUpdated: new Date()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log('[ModelPreferencesStorage] Preferences saved successfully');
      return true;
    } catch (error) {
      console.error('[ModelPreferencesStorage] Failed to save preferences to localStorage:', error);
      return false;
    }
  }

  /**
   * 获取图像模型偏好
   * Get image model preference
   */
  static getImageModelPreference(): string {
    return this.getPreferences().defaultImageModel;
  }

  /**
   * 设置图像模型偏好
   * Set image model preference
   */
  static setImageModelPreference(modelId: string): boolean {
    return this.savePreferences({ defaultImageModel: modelId });
  }

  /**
   * 获取视频模型偏好
   * Get video model preference
   */
  static getVideoModelPreference(): string {
    return this.getPreferences().defaultVideoModel;
  }

  /**
   * 设置视频模型偏好
   * Set video model preference
   */
  static setVideoModelPreference(modelId: string): boolean {
    return this.savePreferences({ defaultVideoModel: modelId });
  }

  /**
   * 获取文本模型偏好
   * Get text model preference
   */
  static getTextModelPreference(): string {
    return this.getPreferences().defaultTextModel;
  }

  /**
   * 设置文本模型偏好
   * Set text model preference
   */
  static setTextModelPreference(modelId: string): boolean {
    return this.savePreferences({ defaultTextModel: modelId });
  }

  /**
   * 重置为默认偏好
   * Reset to default preferences
   */
  static resetToDefaults(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[ModelPreferencesStorage] Preferences reset to defaults');
      return true;
    } catch (error) {
      console.error('[ModelPreferencesStorage] Failed to reset preferences:', error);
      return false;
    }
  }

  /**
   * 检查 localStorage 是否可用
   * Check if localStorage is available
   */
  static isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取存储状态信息
   * Get storage status information
   */
  static getStorageStatus(): {
    isAvailable: boolean;
    hasStoredPreferences: boolean;
    lastUpdated?: Date;
  } {
    const isAvailable = this.isStorageAvailable();
    let hasStoredPreferences = false;
    let lastUpdated: Date | undefined;

    if (isAvailable) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        hasStoredPreferences = !!stored;
        if (stored) {
          const parsed = JSON.parse(stored);
          lastUpdated = parsed.lastUpdated ? new Date(parsed.lastUpdated) : undefined;
        }
      } catch {
        // Ignore parsing errors
      }
    }

    return {
      isAvailable,
      hasStoredPreferences,
      lastUpdated
    };
  }

  /**
   * 迁移旧版本的偏好设置
   * Migrate old version preferences
   */
  static migrateOldPreferences(): boolean {
    try {
      // 检查是否有旧版本的存储格式需要迁移
      const oldKeys = ['selected-text-model', 'selected-image-model', 'selected-video-model'];
      const hasOldData = oldKeys.some(key => localStorage.getItem(key));
      
      if (hasOldData) {
        const preferences: Partial<UserModelPreferences> = {};
        
        const oldTextModel = localStorage.getItem('selected-text-model');
        if (oldTextModel) preferences.defaultTextModel = oldTextModel;
        
        const oldImageModel = localStorage.getItem('selected-image-model');
        if (oldImageModel) preferences.defaultImageModel = oldImageModel;
        
        const oldVideoModel = localStorage.getItem('selected-video-model');
        if (oldVideoModel) preferences.defaultVideoModel = oldVideoModel;
        
        // 保存到新格式
        this.savePreferences(preferences);
        
        // 清理旧数据
        oldKeys.forEach(key => localStorage.removeItem(key));
        
        console.log('[ModelPreferencesStorage] Successfully migrated old preferences');
        return true;
      }
    } catch (error) {
      console.error('[ModelPreferencesStorage] Failed to migrate old preferences:', error);
    }
    
    return false;
  }
}

// 在模块加载时尝试迁移旧偏好
ModelPreferencesStorage.migrateOldPreferences();