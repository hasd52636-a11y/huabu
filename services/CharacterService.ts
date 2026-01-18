// services/CharacterService.ts
// 角色客串管理服务

import { Character, CreateCharacterOptions, CharacterUsageStats } from '../types';
import { errorHandlingService } from './ErrorHandlingService';
import { performanceMonitoringService } from './PerformanceMonitoringService';

export class CharacterService {
  private characters: Character[] = [];
  private storageKey = 'shenma-characters';
  private usageStatsKey = 'shenma-character-usage';
  private previewCacheKey = 'shenma-character-previews';

  constructor() {
    this.loadCharacters();
    this.initializeErrorHandling();
  }

  /**
   * 初始化错误处理
   */
  private async initializeErrorHandling(): Promise<void> {
    try {
      // 检查存储损坏
      const corruption = errorHandlingService.detectStorageCorruption();
      if (corruption.isCorrupted) {
        console.warn('[CharacterService] Storage corruption detected:', corruption.errors);
        await errorHandlingService.recoverCorruptedStorage(corruption.corruptedKeys);
        // 重新加载角色数据
        this.loadCharacters();
      }

      // 检查存储配额
      const quota = await errorHandlingService.checkStorageQuota();
      if (quota.percentage > 90) {
        console.warn('[CharacterService] Storage quota nearly full:', quota);
        await errorHandlingService.handleStorageQuotaExceeded();
      }

      // 创建数据备份
      errorHandlingService.createBackup();
    } catch (error) {
      console.error('[CharacterService] Failed to initialize error handling:', error);
    }
  }

  /**
   * 从本地存储加载角色列表
   */
  private loadCharacters(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // 验证数据完整性
        if (!Array.isArray(parsed)) {
          throw new Error('Characters data is not an array');
        }
        
        // 验证每个角色的必需字段并修复数据
        this.characters = parsed.map(char => {
          if (!char.id || !char.username || char.id.trim().length === 0 || char.username.trim().length === 0) {
            console.warn('[CharacterService] Invalid character data:', char);
            return null;
          }
          
          return {
            ...char,
            status: char.status || 'ready',
            usage_count: char.usage_count || 0,
            created_at: char.created_at !== undefined ? char.created_at : Date.now()
          };
        }).filter(Boolean); // 移除无效角色
        
        console.log(`[CharacterService] Loaded ${this.characters.length} characters`);
      } else {
        this.characters = [];
      }
    } catch (error) {
      console.error('[CharacterService] Failed to load characters:', error);
      
      // 尝试从备份恢复
      try {
        const backup = localStorage.getItem(`${this.storageKey}_backup`);
        if (backup) {
          const backupData = JSON.parse(backup);
          if (Array.isArray(backupData)) {
            this.characters = backupData.map(char => ({
              ...char,
              status: char.status || 'ready',
              usage_count: char.usage_count || 0,
              created_at: char.created_at !== undefined ? char.created_at : Date.now()
            }));
            console.log(`[CharacterService] ✓ Restored ${this.characters.length} characters from backup`);
            
            // 保存恢复的数据
            this.saveCharacters();
            return;
          }
        }
      } catch (backupError) {
        console.warn('[CharacterService] Failed to restore from backup:', backupError);
      }
      
      // 如果恢复失败，重置为空数组
      this.characters = [];
      console.log('[CharacterService] Reset to empty character list due to corruption');
    }
  }

  /**
   * 保存角色列表到本地存储
   */
  private async saveCharacters(): Promise<void> {
    try {
      // 检查存储配额
      const quota = await errorHandlingService.checkStorageQuota();
      if (quota.percentage > 95) {
        console.warn('[CharacterService] Storage quota critical, cleaning up...');
        await errorHandlingService.handleStorageQuotaExceeded();
      }

      localStorage.setItem(this.storageKey, JSON.stringify(this.characters));
      
      // 创建备份
      errorHandlingService.createBackup();
    } catch (error) {
      console.error('[CharacterService] Failed to save characters:', error);
      
      // 处理存储配额超限
      if (error.name === 'QuotaExceededError') {
        const cleanupSuccess = await errorHandlingService.handleStorageQuotaExceeded();
        if (cleanupSuccess) {
          try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.characters));
            console.log('[CharacterService] ✓ Saved characters after cleanup');
          } catch (retryError) {
            console.error('[CharacterService] Failed to save after cleanup:', retryError);
            throw new Error('存储空间不足，请清理浏览器缓存后重试');
          }
        } else {
          throw new Error('存储空间不足，无法保存角色数据');
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * 清理旧角色以释放存储空间
   */
  private cleanupOldCharacters(): void {
    // 按最后使用时间排序，删除最旧的20%
    const sortedChars = [...this.characters].sort((a, b) => 
      (b.last_used || b.created_at || 0) - (a.last_used || a.created_at || 0)
    );
    const keepCount = Math.floor(sortedChars.length * 0.8);
    this.characters = sortedChars.slice(0, keepCount);
    console.log(`[CharacterService] Cleaned up ${sortedChars.length - keepCount} old characters`);
  }

  /**
   * 获取所有角色（异步优化版本）
   */
  async getAllCharactersAsync(): Promise<Character[]> {
    return performanceMonitoringService.loadCharactersAsync(async () => {
      return [...this.characters];
    });
  }

  /**
   * 获取所有角色
   */
  getAllCharacters(): Character[] {
    return [...this.characters];
  }

  /**
   * 根据ID获取角色
   */
  getCharacterById(id: string): Character | undefined {
    return this.characters.find(char => char.id === id);
  }

  /**
   * 搜索和过滤角色
   */
  searchCharacters(
    query: string = '',
    filterStatus: 'all' | 'ready' | 'creating' | 'error' = 'all',
    tags: string[] = []
  ): Character[] {
    let filtered = [...this.characters];

    // 状态过滤
    if (filterStatus !== 'all') {
      filtered = filtered.filter(char => char.status === filterStatus);
    }

    // 标签过滤
    if (tags.length > 0) {
      filtered = filtered.filter(char => 
        char.tags && char.tags.some(tag => tags.includes(tag))
      );
    }

    // 文本搜索
    if (query.trim()) {
      const searchQuery = query.toLowerCase();
      filtered = filtered.filter(char => 
        char.username.toLowerCase().includes(searchQuery) ||
        (char.description && char.description.toLowerCase().includes(searchQuery)) ||
        (char.tags && char.tags.some(tag => tag.toLowerCase().includes(searchQuery)))
      );
    }

    // 按最后使用时间排序
    return filtered.sort((a, b) => 
      (b.last_used || b.created_at || 0) - (a.last_used || a.created_at || 0)
    );
  }

  /**
   * 获取所有标签
   */
  getAllTags(): string[] {
    const tagSet = new Set<string>();
    this.characters.forEach(char => {
      if (char.tags) {
        char.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }

  /**
   * 批量创建角色
   */
  async createCharacterFromBatch(
    videoUrls: string[], 
    timestamps: string,
    shenmaService: any
  ): Promise<Character[]> {
    console.log('[CharacterService] Creating batch characters:', { videoUrls, timestamps });
    
    const results: Character[] = [];
    const errors: string[] = [];

    for (const url of videoUrls) {
      try {
        const character = await this.createCharacterFromVideo(url, timestamps, shenmaService);
        results.push(character);
      } catch (error) {
        console.error(`[CharacterService] Failed to create character from ${url}:`, error);
        errors.push(`${url}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      console.warn('[CharacterService] Batch creation completed with errors:', errors);
    }

    return results;
  }

  /**
   * 验证角色与视频生成参数的兼容性
   */
  validateCharacterCompatibility(
    character: Character, 
    videoOptions: any
  ): boolean {
    try {
      // 检查角色状态
      if (character.status !== 'ready') {
        console.warn('[CharacterService] Character not ready:', character.status);
        return false;
      }

      // 检查时间戳格式
      if (character.timestamps && !this.validateTimestamps(character.timestamps)) {
        console.warn('[CharacterService] Invalid character timestamps:', character.timestamps);
        return false;
      }

      // 检查视频参数兼容性
      if (videoOptions.duration && character.timestamps) {
        const segments = this.parseTimestamps(character.timestamps);
        const totalDuration = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
        if (totalDuration > videoOptions.duration) {
          console.warn('[CharacterService] Character duration exceeds video duration');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('[CharacterService] Compatibility validation error:', error);
      return false;
    }
  }

  /**
   * 生成角色预览（带缓存优化）
   */
  async generateCharacterPreview(character: Character): Promise<string> {
    try {
      // 使用性能监控服务的缓存功能
      if (character.profile_picture_url) {
        return await performanceMonitoringService.cacheCharacterPreview(
          character.id, 
          character.profile_picture_url
        );
      }

      // 检查缓存
      const cacheKey = `${this.previewCacheKey}_${character.id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return cached;
      }

      // 生成预览（使用角色的profile_picture_url或从视频截图）
      let previewUrl = character.profile_picture_url;
      
      if (!previewUrl && character.url && character.timestamps) {
        // 从视频URL和时间戳生成预览截图
        const segments = this.parseTimestamps(character.timestamps);
        const firstSegment = segments[0];
        previewUrl = `${character.url}#t=${firstSegment.start}`;
      }

      // 缓存预览
      if (previewUrl) {
        localStorage.setItem(cacheKey, previewUrl);
      }

      return previewUrl || '';
    } catch (error) {
      console.error('[CharacterService] Failed to generate preview:', error);
      return '';
    }
  }

  /**
   * 获取角色使用统计
   */
  getCharacterUsageStats(characterId: string): CharacterUsageStats {
    try {
      const statsData = localStorage.getItem(this.usageStatsKey);
      const allStats: Record<string, CharacterUsageStats> = statsData ? JSON.parse(statsData) : {};
      
      return allStats[characterId] || {
        characterId,
        totalUsage: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        averageGenerationTime: 0,
        lastUsed: 0,
        popularVideoTypes: []
      };
    } catch (error) {
      console.error('[CharacterService] Failed to get usage stats:', error);
      return {
        characterId,
        totalUsage: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        averageGenerationTime: 0,
        lastUsed: 0,
        popularVideoTypes: []
      };
    }
  }

  /**
   * 更新角色使用统计
   */
  updateCharacterUsage(
    characterId: string, 
    success: boolean, 
    generationTime: number,
    videoType?: string
  ): void {
    try {
      const statsData = localStorage.getItem(this.usageStatsKey);
      const allStats: Record<string, CharacterUsageStats> = statsData ? JSON.parse(statsData) : {};
      
      const stats = allStats[characterId] || {
        characterId,
        totalUsage: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        averageGenerationTime: 0,
        lastUsed: 0,
        popularVideoTypes: []
      };

      // 更新统计
      stats.totalUsage++;
      stats.lastUsed = Date.now();
      
      if (success) {
        stats.successfulGenerations++;
      } else {
        stats.failedGenerations++;
      }

      // 更新平均生成时间
      const totalTime = stats.averageGenerationTime * (stats.totalUsage - 1) + generationTime;
      stats.averageGenerationTime = totalTime / stats.totalUsage;

      // 更新流行视频类型
      if (videoType && success) {
        const typeIndex = stats.popularVideoTypes.indexOf(videoType);
        if (typeIndex === -1) {
          stats.popularVideoTypes.push(videoType);
        }
      }

      // 更新角色的使用计数和最后使用时间
      const character = this.getCharacterById(characterId);
      if (character) {
        character.usage_count = stats.totalUsage;
        character.last_used = stats.lastUsed;
        this.saveCharacters();
      }

      // 保存统计数据
      allStats[characterId] = stats;
      localStorage.setItem(this.usageStatsKey, JSON.stringify(allStats));
    } catch (error) {
      console.error('[CharacterService] Failed to update usage stats:', error);
    }
  }

  /**
   * 创建新角色
   */
  async createCharacter(
    options: CreateCharacterOptions,
    shenmaService: any
  ): Promise<Character> {
    console.log('[CharacterService] Creating character with options:', options);

    // 创建临时角色对象（状态为creating）
    const tempCharacter: Character = {
      id: `char_${Date.now()}`,
      username: `角色_${Date.now()}`,
      permalink: '',
      profile_picture_url: '',
      url: options.url,
      timestamps: options.timestamps,
      from_task: options.from_task,
      created_at: Date.now(),
      status: 'creating',
      usage_count: 0
    };

    // 添加到本地列表（显示创建中状态）
    this.characters.push(tempCharacter);
    this.saveCharacters();

    try {
      // 调用神马API创建角色
      const response = await shenmaService.createCharacter(options);
      
      // 更新角色对象
      const character: Character = {
        ...tempCharacter,
        id: response.id || tempCharacter.id,
        username: response.username || `角色_${Date.now()}`,
        permalink: response.permalink || response.url || options.url || '',
        profile_picture_url: response.profile_picture_url || response.url || options.url || '',
        status: 'ready'
      };

      // 更新本地列表
      const index = this.characters.findIndex(c => c.id === tempCharacter.id);
      if (index !== -1) {
        this.characters[index] = character;
      }
      this.saveCharacters();

      console.log('[CharacterService] ✓ Character created successfully:', character);
      return character;
    } catch (error) {
      console.error('[CharacterService] Failed to create character:', error);
      
      // 更新角色状态为错误
      const index = this.characters.findIndex(c => c.id === tempCharacter.id);
      if (index !== -1) {
        this.characters[index] = {
          ...tempCharacter,
          status: 'error',
          error_message: error.message || 'Character creation failed'
        };
        this.saveCharacters();
      }
      
      throw error;
    }
  }

  /**
   * 从视频URL创建角色
   */
  async createCharacterFromVideo(
    videoUrl: string,
    timestamps: string,
    shenmaService: any
  ): Promise<Character> {
    return this.createCharacter({
      url: videoUrl,
      timestamps
    }, shenmaService);
  }

  /**
   * 从任务ID创建角色
   */
  async createCharacterFromTask(
    taskId: string,
    timestamps: string,
    shenmaService: any
  ): Promise<Character> {
    return this.createCharacter({
      from_task: taskId,
      timestamps
    }, shenmaService);
  }

  /**
   * 删除角色
   */
  deleteCharacter(id: string): boolean {
    const index = this.characters.findIndex(char => char.id === id);
    if (index !== -1) {
      this.characters.splice(index, 1);
      this.saveCharacters();
      
      // 清理相关缓存
      const cacheKey = `${this.previewCacheKey}_${id}`;
      localStorage.removeItem(cacheKey);
      
      console.log('[CharacterService] Character deleted:', id);
      return true;
    }
    return false;
  }

  /**
   * 更新角色信息
   */
  updateCharacter(id: string, updates: Partial<Character>): Character | null {
    const character = this.characters.find(char => char.id === id);
    if (character) {
      Object.assign(character, updates);
      this.saveCharacters();
      console.log('[CharacterService] Character updated:', character);
      return character;
    }
    return null;
  }

  /**
   * 验证时间戳格式
   */
  validateTimestamps(timestamps: string): boolean {
    // 支持格式：0-5,10-15 或 2-8
    const timestampPattern = /^(\d+)-(\d+)(,\d+-\d+)*$/;
    if (!timestampPattern.test(timestamps)) {
      return false;
    }

    // 验证每个时间段的开始时间小于结束时间
    try {
      const segments = timestamps.split(',');
      for (const segment of segments) {
        const [start, end] = segment.split('-').map(Number);
        if (start >= end) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 解析时间戳字符串
   */
  parseTimestamps(timestamps: string): Array<{ start: number; end: number }> {
    if (!this.validateTimestamps(timestamps)) {
      throw new Error('Invalid timestamp format. Use format like "0-5,10-15"');
    }

    return timestamps.split(',').map(segment => {
      const [start, end] = segment.split('-').map(Number);
      return { start, end };
    });
  }

  /**
   * 格式化时间戳显示
   */
  formatTimestamps(timestamps: string): string {
    try {
      const segments = this.parseTimestamps(timestamps);
      return segments.map(({ start, end }) => `${start}s-${end}s`).join(', ');
    } catch {
      return timestamps;
    }
  }

  /**
   * 清空所有角色
   */
  clearAllCharacters(): void {
    this.characters = [];
    this.saveCharacters();
    console.log('[CharacterService] All characters cleared');
  }

  /**
   * 导出角色数据
   */
  exportCharacters(): string {
    return JSON.stringify(this.characters, null, 2);
  }

  /**
   * 导入角色数据
   */
  importCharacters(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      if (Array.isArray(imported)) {
        // 确保导入的角色有必要的字段
        this.characters = imported.map(char => ({
          ...char,
          status: char.status || 'ready',
          usage_count: char.usage_count || 0,
          created_at: char.created_at !== undefined ? char.created_at : Date.now()
        }));
        this.saveCharacters();
        console.log('[CharacterService] Characters imported successfully');
        return true;
      }
    } catch (error) {
      console.error('[CharacterService] Failed to import characters:', error);
    }
    return false;
  }

  /**
   * 获取角色统计信息
   */
  getCharacterStats(): {
    total: number;
    fromVideo: number;
    fromTask: number;
    recent: number;
    ready: number;
    creating: number;
    error: number;
  } {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    return {
      total: this.characters.length,
      fromVideo: this.characters.filter(char => char.url).length,
      fromTask: this.characters.filter(char => char.from_task).length,
      recent: this.characters.filter(char => 
        char.created_at && char.created_at > oneWeekAgo
      ).length,
      ready: this.characters.filter(char => char.status === 'ready').length,
      creating: this.characters.filter(char => char.status === 'creating').length,
      error: this.characters.filter(char => char.status === 'error').length
    };
  }
}

// 创建全局实例
export const characterService = new CharacterService();
export default CharacterService;