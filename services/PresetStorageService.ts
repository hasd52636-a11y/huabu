/**
 * PresetStorageService - 预设存储服务
 * 
 * 功能：
 * - 基于localStorage的预设管理
 * - 预设的保存、加载、删除、更新
 * - 错误处理和数据验证
 * - 预设分类和搜索
 * - 导入导出功能
 */

import { 
  ParameterPreset,
  GenerationParameters
} from '../types';

interface PresetStorage {
  version: string;
  presets: ParameterPreset[];
  lastUpdated: number;
  metadata: {
    totalPresets: number;
    imagePresets: number;
    videoPresets: number;
  };
}

export class PresetStorageService {
  private static instance: PresetStorageService;
  private readonly STORAGE_KEY = 'intelligent-parameter-panel-presets';
  private readonly STORAGE_VERSION = '1.0';
  private cache: Map<string, ParameterPreset> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): PresetStorageService {
    if (!PresetStorageService.instance) {
      PresetStorageService.instance = new PresetStorageService();
    }
    return PresetStorageService.instance;
  }

  /**
   * 初始化服务
   * Initialize service
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadPresetsFromStorage();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize PresetStorageService:', error);
      // 初始化失败时创建空存储
      await this.createEmptyStorage();
      this.isInitialized = true;
    }
  }

  /**
   * 保存预设
   * Save preset
   */
  public async savePreset(
    name: string, 
    parameters: GenerationParameters, 
    generationType: 'image' | 'video',
    modelId?: string,
    description?: string
  ): Promise<ParameterPreset> {
    await this.initialize();

    // 验证输入
    if (!name || name.trim().length === 0) {
      throw new Error('预设名称不能为空');
    }

    if (!parameters || !parameters.prompt) {
      throw new Error('参数不能为空，至少需要提示词');
    }

    // 检查名称是否已存在
    const existingPreset = this.findPresetByName(name, generationType);
    if (existingPreset) {
      throw new Error(`预设名称 "${name}" 已存在`);
    }

    // 创建新预设
    const preset: ParameterPreset = {
      id: this.generatePresetId(),
      name: name.trim(),
      description,
      generationType,
      modelId,
      parameters: { ...parameters },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: false
    };

    // 添加到缓存
    this.cache.set(preset.id, preset);

    // 保存到存储
    await this.savePresetsToStorage();

    return preset;
  }

  /**
   * 加载预设列表
   * Load presets
   */
  public async loadPresets(
    generationType?: 'image' | 'video',
    modelId?: string
  ): Promise<ParameterPreset[]> {
    await this.initialize();

    let presets = Array.from(this.cache.values());

    // 按生成类型过滤
    if (generationType) {
      presets = presets.filter(preset => preset.generationType === generationType);
    }

    // 按模型过滤
    if (modelId) {
      presets = presets.filter(preset => 
        !preset.modelId || preset.modelId === modelId
      );
    }

    // 按更新时间排序（最新的在前）
    return presets.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * 根据ID获取预设
   * Get preset by ID
   */
  public async getPreset(id: string): Promise<ParameterPreset | null> {
    await this.initialize();
    return this.cache.get(id) || null;
  }

  /**
   * 删除预设
   * Delete preset
   */
  public async deletePreset(id: string): Promise<boolean> {
    await this.initialize();

    if (!this.cache.has(id)) {
      return false;
    }

    this.cache.delete(id);
    await this.savePresetsToStorage();
    return true;
  }

  /**
   * 更新预设
   * Update preset
   */
  public async updatePreset(
    id: string,
    updates: Partial<Omit<ParameterPreset, 'id' | 'createdAt'>>
  ): Promise<ParameterPreset | null> {
    await this.initialize();

    const existingPreset = this.cache.get(id);
    if (!existingPreset) {
      return null;
    }

    // 如果更新名称，检查是否与其他预设冲突
    if (updates.name && updates.name !== existingPreset.name) {
      const conflictPreset = this.findPresetByName(updates.name, existingPreset.generationType);
      if (conflictPreset && conflictPreset.id !== id) {
        throw new Error(`预设名称 "${updates.name}" 已存在`);
      }
    }

    // 更新预设
    const updatedPreset: ParameterPreset = {
      ...existingPreset,
      ...updates,
      id, // 确保ID不被更改
      createdAt: existingPreset.createdAt, // 确保创建时间不被更改
      updatedAt: Date.now()
    };

    this.cache.set(id, updatedPreset);
    await this.savePresetsToStorage();

    return updatedPreset;
  }

  /**
   * 复制预设
   * Duplicate preset
   */
  public async duplicatePreset(id: string, newName?: string): Promise<ParameterPreset | null> {
    await this.initialize();

    const originalPreset = this.cache.get(id);
    if (!originalPreset) {
      return null;
    }

    const duplicateName = newName || `${originalPreset.name} (副本)`;
    
    // 确保名称唯一
    let finalName = duplicateName;
    let counter = 1;
    while (this.findPresetByName(finalName, originalPreset.generationType)) {
      finalName = `${duplicateName} (${counter})`;
      counter++;
    }

    return await this.savePreset(
      finalName,
      originalPreset.parameters,
      originalPreset.generationType,
      originalPreset.modelId,
      originalPreset.description
    );
  }

  /**
   * 搜索预设
   * Search presets
   */
  public async searchPresets(
    query: string,
    generationType?: 'image' | 'video'
  ): Promise<ParameterPreset[]> {
    await this.initialize();

    const allPresets = await this.loadPresets(generationType);
    const lowerQuery = query.toLowerCase();

    return allPresets.filter(preset => 
      preset.name.toLowerCase().includes(lowerQuery) ||
      (preset.description && preset.description.toLowerCase().includes(lowerQuery)) ||
      preset.parameters.prompt.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 获取默认预设
   * Get default presets
   */
  public async getDefaultPresets(generationType: 'image' | 'video'): Promise<ParameterPreset[]> {
    await this.initialize();

    const presets = await this.loadPresets(generationType);
    return presets.filter(preset => preset.isDefault);
  }

  /**
   * 设置默认预设
   * Set default preset
   */
  public async setDefaultPreset(id: string, isDefault: boolean = true): Promise<boolean> {
    await this.initialize();

    const preset = this.cache.get(id);
    if (!preset) {
      return false;
    }

    // 如果设置为默认，先取消同类型的其他默认预设
    if (isDefault) {
      for (const [presetId, existingPreset] of this.cache.entries()) {
        if (existingPreset.generationType === preset.generationType && 
            existingPreset.isDefault && 
            presetId !== id) {
          existingPreset.isDefault = false;
          existingPreset.updatedAt = Date.now();
        }
      }
    }

    preset.isDefault = isDefault;
    preset.updatedAt = Date.now();

    await this.savePresetsToStorage();
    return true;
  }

  /**
   * 导出预设
   * Export presets
   */
  public async exportPresets(ids?: string[]): Promise<string> {
    await this.initialize();

    let presetsToExport: ParameterPreset[];

    if (ids && ids.length > 0) {
      presetsToExport = ids.map(id => this.cache.get(id)).filter(Boolean) as ParameterPreset[];
    } else {
      presetsToExport = Array.from(this.cache.values());
    }

    const exportData = {
      version: this.STORAGE_VERSION,
      exportedAt: Date.now(),
      presets: presetsToExport
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 导入预设
   * Import presets
   */
  public async importPresets(
    jsonData: string, 
    options: {
      overwrite?: boolean;
      prefix?: string;
    } = {}
  ): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    await this.initialize();

    const result = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.presets || !Array.isArray(importData.presets)) {
        throw new Error('无效的导入数据格式');
      }

      for (const presetData of importData.presets) {
        try {
          // 验证预设数据
          if (!this.validatePresetData(presetData)) {
            result.errors.push(`无效的预设数据: ${presetData.name || '未知'}`);
            continue;
          }

          let finalName = presetData.name;
          if (options.prefix) {
            finalName = `${options.prefix}${finalName}`;
          }

          // 检查名称冲突
          const existingPreset = this.findPresetByName(finalName, presetData.generationType);
          if (existingPreset) {
            if (!options.overwrite) {
              result.skipped++;
              continue;
            } else {
              // 覆盖现有预设
              await this.updatePreset(existingPreset.id, {
                ...presetData,
                name: finalName,
                isDefault: false // 导入的预设不设为默认
              });
              result.imported++;
              continue;
            }
          }

          // 创建新预设
          await this.savePreset(
            finalName,
            presetData.parameters,
            presetData.generationType,
            presetData.modelId,
            presetData.description
          );
          result.imported++;

        } catch (error) {
          result.errors.push(`导入预设失败 "${presetData.name}": ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

    } catch (error) {
      result.errors.push(`解析导入数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return result;
  }

  /**
   * 获取存储统计信息
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalPresets: number;
    imagePresets: number;
    videoPresets: number;
    storageSize: number;
    lastUpdated: number;
  }> {
    await this.initialize();

    const allPresets = Array.from(this.cache.values());
    const imagePresets = allPresets.filter(p => p.generationType === 'image').length;
    const videoPresets = allPresets.filter(p => p.generationType === 'video').length;

    // 估算存储大小
    const storageData = localStorage.getItem(this.STORAGE_KEY);
    const storageSize = storageData ? new Blob([storageData]).size : 0;

    return {
      totalPresets: allPresets.length,
      imagePresets,
      videoPresets,
      storageSize,
      lastUpdated: Math.max(...allPresets.map(p => p.updatedAt), 0)
    };
  }

  /**
   * 清理存储
   * Clean up storage
   */
  public async cleanup(options: {
    removeOlderThan?: number; // 删除指定时间之前的预设（毫秒）
    maxPresets?: number; // 保留最多指定数量的预设
    keepDefaults?: boolean; // 是否保留默认预设
  } = {}): Promise<number> {
    await this.initialize();

    let presetsToRemove: string[] = [];
    const allPresets = Array.from(this.cache.values());

    // 按时间清理
    if (options.removeOlderThan) {
      const cutoffTime = Date.now() - options.removeOlderThan;
      presetsToRemove.push(
        ...allPresets
          .filter(preset => 
            preset.updatedAt < cutoffTime && 
            (!options.keepDefaults || !preset.isDefault)
          )
          .map(preset => preset.id)
      );
    }

    // 按数量清理
    if (options.maxPresets && allPresets.length > options.maxPresets) {
      const sortedPresets = allPresets
        .filter(preset => !options.keepDefaults || !preset.isDefault)
        .sort((a, b) => b.updatedAt - a.updatedAt);
      
      const excessPresets = sortedPresets.slice(options.maxPresets);
      presetsToRemove.push(...excessPresets.map(preset => preset.id));
    }

    // 删除预设
    const uniqueToRemove = [...new Set(presetsToRemove)];
    for (const id of uniqueToRemove) {
      this.cache.delete(id);
    }

    if (uniqueToRemove.length > 0) {
      await this.savePresetsToStorage();
    }

    return uniqueToRemove.length;
  }

  /**
   * 从存储加载预设
   * Load presets from storage
   */
  private async loadPresetsFromStorage(): Promise<void> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        await this.createEmptyStorage();
        return;
      }

      const storage: PresetStorage = JSON.parse(data);
      
      // 验证存储格式
      if (!storage.presets || !Array.isArray(storage.presets)) {
        throw new Error('Invalid storage format');
      }

      // 加载到缓存
      this.cache.clear();
      for (const preset of storage.presets) {
        if (this.validatePresetData(preset)) {
          this.cache.set(preset.id, preset);
        }
      }

    } catch (error) {
      console.error('Failed to load presets from storage:', error);
      throw error;
    }
  }

  /**
   * 保存预设到存储
   * Save presets to storage
   */
  private async savePresetsToStorage(): Promise<void> {
    try {
      const presets = Array.from(this.cache.values());
      const storage: PresetStorage = {
        version: this.STORAGE_VERSION,
        presets,
        lastUpdated: Date.now(),
        metadata: {
          totalPresets: presets.length,
          imagePresets: presets.filter(p => p.generationType === 'image').length,
          videoPresets: presets.filter(p => p.generationType === 'video').length
        }
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storage));
    } catch (error) {
      console.error('Failed to save presets to storage:', error);
      throw new Error('保存预设失败，可能是存储空间不足');
    }
  }

  /**
   * 创建空存储
   * Create empty storage
   */
  private async createEmptyStorage(): Promise<void> {
    const emptyStorage: PresetStorage = {
      version: this.STORAGE_VERSION,
      presets: [],
      lastUpdated: Date.now(),
      metadata: {
        totalPresets: 0,
        imagePresets: 0,
        videoPresets: 0
      }
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(emptyStorage));
    this.cache.clear();
  }

  /**
   * 根据名称查找预设
   * Find preset by name
   */
  private findPresetByName(name: string, generationType: 'image' | 'video'): ParameterPreset | null {
    for (const preset of this.cache.values()) {
      if (preset.name === name && preset.generationType === generationType) {
        return preset;
      }
    }
    return null;
  }

  /**
   * 生成预设ID
   * Generate preset ID
   */
  private generatePresetId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 验证预设数据
   * Validate preset data
   */
  private validatePresetData(data: any): data is ParameterPreset {
    return (
      data &&
      typeof data.id === 'string' &&
      typeof data.name === 'string' &&
      (data.generationType === 'image' || data.generationType === 'video') &&
      data.parameters &&
      typeof data.parameters.prompt === 'string' &&
      typeof data.createdAt === 'number' &&
      typeof data.updatedAt === 'number'
    );
  }

  /**
   * 清理资源
   * Clean up resources
   */
  public cleanupResources(): void {
    this.cache.clear();
    this.isInitialized = false;
  }
}

// 导出单例实例
export const presetStorageService = PresetStorageService.getInstance();