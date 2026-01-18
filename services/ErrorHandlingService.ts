// services/ErrorHandlingService.ts
// 综合错误处理和恢复服务

import { Character } from '../types';

export interface ErrorRecoveryOptions {
  maxRetries: number;
  retryDelay: number;
  fallbackToCache: boolean;
  notifyUser: boolean;
}

export interface StorageQuotaInfo {
  used: number;
  available: number;
  total: number;
  percentage: number;
}

export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private readonly STORAGE_KEYS = {
    characters: 'shenma-characters',
    characterUsage: 'shenma-character-usage',
    characterPreviews: 'shenma-character-previews',
    errorLog: 'shenma-error-log'
  };

  private constructor() {}

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * 检查存储配额状态
   */
  async checkStorageQuota(): Promise<StorageQuotaInfo> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const total = estimate.quota || 0;
        const available = total - used;
        const percentage = total > 0 ? (used / total) * 100 : 0;

        return {
          used,
          available,
          total,
          percentage
        };
      }
    } catch (error) {
      console.warn('[ErrorHandlingService] Failed to check storage quota:', error);
    }

    // Fallback estimation
    return this.estimateStorageUsage();
  }

  /**
   * 估算存储使用情况（fallback方法）
   */
  private estimateStorageUsage(): StorageQuotaInfo {
    let totalSize = 0;
    
    try {
      // 估算localStorage使用量
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length;
        }
      }
    } catch (error) {
      console.warn('[ErrorHandlingService] Failed to estimate storage usage:', error);
    }

    // 假设总配额为5MB（保守估计）
    const estimatedQuota = 5 * 1024 * 1024; // 5MB
    const used = totalSize * 2; // 字符串存储大约占用2倍字节
    const available = Math.max(0, estimatedQuota - used);
    const percentage = (used / estimatedQuota) * 100;

    return {
      used,
      available,
      total: estimatedQuota,
      percentage
    };
  }

  /**
   * 处理存储配额超限
   */
  async handleStorageQuotaExceeded(): Promise<boolean> {
    console.log('[ErrorHandlingService] Handling storage quota exceeded...');
    
    try {
      // 1. 清理旧的错误日志
      this.cleanupErrorLogs();
      
      // 2. 清理角色预览缓存
      this.cleanupCharacterPreviews();
      
      // 3. 清理旧的使用统计
      this.cleanupOldUsageStats();
      
      // 4. 压缩角色数据
      await this.compressCharacterData();
      
      console.log('[ErrorHandlingService] ✓ Storage cleanup completed');
      return true;
    } catch (error) {
      console.error('[ErrorHandlingService] Failed to handle storage quota:', error);
      return false;
    }
  }

  /**
   * 清理错误日志
   */
  private cleanupErrorLogs(): void {
    try {
      const errorLog = localStorage.getItem(this.STORAGE_KEYS.errorLog);
      if (errorLog) {
        const logs = JSON.parse(errorLog);
        if (Array.isArray(logs)) {
          // 只保留最近7天的日志
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const recentLogs = logs.filter(log => log.timestamp > sevenDaysAgo);
          
          if (recentLogs.length < logs.length) {
            localStorage.setItem(this.STORAGE_KEYS.errorLog, JSON.stringify(recentLogs));
            console.log(`[ErrorHandlingService] Cleaned up ${logs.length - recentLogs.length} old error logs`);
          }
        }
      }
    } catch (error) {
      console.warn('[ErrorHandlingService] Failed to cleanup error logs:', error);
      // 如果解析失败，直接删除
      localStorage.removeItem(this.STORAGE_KEYS.errorLog);
    }
  }

  /**
   * 清理角色预览缓存
   */
  private cleanupCharacterPreviews(): void {
    try {
      const keys = Object.keys(localStorage);
      const previewKeys = keys.filter(key => key.startsWith('shenma-character-previews_'));
      
      // 删除超过30天的预览缓存
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      let cleanedCount = 0;
      
      previewKeys.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            // 尝试解析时间戳（如果有的话）
            const timestamp = parseInt(key.split('_').pop() || '0');
            if (timestamp < thirtyDaysAgo) {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          // 如果解析失败，删除该缓存
          localStorage.removeItem(key);
          cleanedCount++;
        }
      });
      
      if (cleanedCount > 0) {
        console.log(`[ErrorHandlingService] Cleaned up ${cleanedCount} character preview caches`);
      }
    } catch (error) {
      console.warn('[ErrorHandlingService] Failed to cleanup character previews:', error);
    }
  }

  /**
   * 清理旧的使用统计
   */
  private cleanupOldUsageStats(): void {
    try {
      const statsData = localStorage.getItem(this.STORAGE_KEYS.characterUsage);
      if (statsData) {
        const allStats = JSON.parse(statsData);
        const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
        
        // 删除6个月未使用的统计数据
        const activeStats: Record<string, any> = {};
        let cleanedCount = 0;
        
        for (const [characterId, stats] of Object.entries(allStats)) {
          if (stats && typeof stats === 'object' && 'lastUsed' in stats) {
            if (stats.lastUsed > sixMonthsAgo) {
              activeStats[characterId] = stats;
            } else {
              cleanedCount++;
            }
          }
        }
        
        if (cleanedCount > 0) {
          localStorage.setItem(this.STORAGE_KEYS.characterUsage, JSON.stringify(activeStats));
          console.log(`[ErrorHandlingService] Cleaned up ${cleanedCount} old usage statistics`);
        }
      }
    } catch (error) {
      console.warn('[ErrorHandlingService] Failed to cleanup usage stats:', error);
      // 如果解析失败，删除整个统计数据
      localStorage.removeItem(this.STORAGE_KEYS.characterUsage);
    }
  }

  /**
   * 压缩角色数据
   */
  private async compressCharacterData(): Promise<void> {
    try {
      const charactersData = localStorage.getItem(this.STORAGE_KEYS.characters);
      if (charactersData) {
        const characters: Character[] = JSON.parse(charactersData);
        
        // 移除不必要的字段，压缩数据
        const compressedCharacters = characters.map(char => ({
          id: char.id,
          username: char.username,
          permalink: char.permalink,
          profile_picture_url: char.profile_picture_url,
          url: char.url,
          timestamps: char.timestamps,
          from_task: char.from_task,
          created_at: char.created_at,
          status: char.status,
          usage_count: char.usage_count || 0,
          last_used: char.last_used,
          // 移除可选字段以节省空间
          ...(char.description && char.description.length < 100 ? { description: char.description } : {}),
          ...(char.tags && char.tags.length > 0 ? { tags: char.tags.slice(0, 5) } : {}), // 最多保留5个标签
          ...(char.error_message ? { error_message: char.error_message.substring(0, 200) } : {}) // 截断错误消息
        }));
        
        const compressedData = JSON.stringify(compressedCharacters);
        
        if (compressedData.length < charactersData.length) {
          localStorage.setItem(this.STORAGE_KEYS.characters, compressedData);
          const savedBytes = charactersData.length - compressedData.length;
          console.log(`[ErrorHandlingService] Compressed character data, saved ${savedBytes} bytes`);
        }
      }
    } catch (error) {
      console.warn('[ErrorHandlingService] Failed to compress character data:', error);
    }
  }

  /**
   * 检测存储损坏
   */
  detectStorageCorruption(): { isCorrupted: boolean; corruptedKeys: string[]; errors: string[] } {
    const corruptedKeys: string[] = [];
    const errors: string[] = [];
    
    // 检查关键存储项
    for (const [name, key] of Object.entries(this.STORAGE_KEYS)) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          // 尝试解析JSON
          JSON.parse(data);
          
          // 特定验证
          if (name === 'characters') {
            const characters = JSON.parse(data);
            if (!Array.isArray(characters)) {
              throw new Error('Characters data is not an array');
            }
            
            // 验证每个角色的必需字段
            characters.forEach((char, index) => {
              if (!char.id || !char.username || !char.status) {
                throw new Error(`Character at index ${index} is missing required fields`);
              }
            });
          }
        }
      } catch (error) {
        corruptedKeys.push(key);
        errors.push(`${name}: ${error.message}`);
      }
    }
    
    return {
      isCorrupted: corruptedKeys.length > 0,
      corruptedKeys,
      errors
    };
  }

  /**
   * 恢复损坏的存储
   */
  async recoverCorruptedStorage(corruptedKeys: string[]): Promise<boolean> {
    console.log('[ErrorHandlingService] Recovering corrupted storage...', corruptedKeys);
    
    try {
      for (const key of corruptedKeys) {
        // 尝试从备份恢复
        const backupKey = `${key}_backup`;
        const backup = localStorage.getItem(backupKey);
        
        if (backup) {
          try {
            // 验证备份数据
            JSON.parse(backup);
            localStorage.setItem(key, backup);
            console.log(`[ErrorHandlingService] ✓ Restored ${key} from backup`);
            continue;
          } catch (error) {
            console.warn(`[ErrorHandlingService] Backup for ${key} is also corrupted`);
          }
        }
        
        // 如果没有备份或备份也损坏，重置为默认值
        if (key === this.STORAGE_KEYS.characters) {
          localStorage.setItem(key, JSON.stringify([]));
          console.log(`[ErrorHandlingService] ✓ Reset ${key} to empty array`);
        } else if (key === this.STORAGE_KEYS.characterUsage) {
          localStorage.setItem(key, JSON.stringify({}));
          console.log(`[ErrorHandlingService] ✓ Reset ${key} to empty object`);
        } else {
          localStorage.removeItem(key);
          console.log(`[ErrorHandlingService] ✓ Removed corrupted ${key}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('[ErrorHandlingService] Failed to recover corrupted storage:', error);
      return false;
    }
  }

  /**
   * 创建数据备份
   */
  createBackup(): boolean {
    try {
      for (const [name, key] of Object.entries(this.STORAGE_KEYS)) {
        const data = localStorage.getItem(key);
        if (data) {
          const backupKey = `${key}_backup`;
          localStorage.setItem(backupKey, data);
        }
      }
      
      console.log('[ErrorHandlingService] ✓ Created data backup');
      return true;
    } catch (error) {
      console.error('[ErrorHandlingService] Failed to create backup:', error);
      return false;
    }
  }

  /**
   * 网络错误处理
   */
  async handleNetworkError(error: Error, options: ErrorRecoveryOptions): Promise<any> {
    console.log('[ErrorHandlingService] Handling network error:', error.message);
    
    // 记录错误
    this.logError('network', error.message, { options });
    
    if (options.fallbackToCache) {
      // 尝试从缓存获取数据
      const cachedData = this.getCachedData();
      if (cachedData) {
        console.log('[ErrorHandlingService] ✓ Using cached data as fallback');
        return cachedData;
      }
    }
    
    if (options.notifyUser) {
      // 显示用户友好的错误消息
      this.showUserFriendlyError('network', error.message);
    }
    
    throw error;
  }

  /**
   * 获取缓存数据
   */
  private getCachedData(): any {
    try {
      const characters = localStorage.getItem(this.STORAGE_KEYS.characters);
      if (characters) {
        return JSON.parse(characters);
      }
    } catch (error) {
      console.warn('[ErrorHandlingService] Failed to get cached data:', error);
    }
    return null;
  }

  /**
   * 记录错误
   */
  private logError(type: string, message: string, context?: any): void {
    try {
      const errorLog = localStorage.getItem(this.STORAGE_KEYS.errorLog);
      const logs = errorLog ? JSON.parse(errorLog) : [];
      
      logs.push({
        type,
        message,
        context,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
      
      // 只保留最近100条错误日志
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem(this.STORAGE_KEYS.errorLog, JSON.stringify(logs));
    } catch (error) {
      console.warn('[ErrorHandlingService] Failed to log error:', error);
    }
  }

  /**
   * 显示用户友好的错误消息
   */
  private showUserFriendlyError(type: string, originalMessage: string): void {
    let userMessage = '';
    
    switch (type) {
      case 'network':
        userMessage = '网络连接出现问题，请检查网络连接后重试。';
        break;
      case 'storage':
        userMessage = '存储空间不足，系统已自动清理缓存，请重试。';
        break;
      case 'api':
        userMessage = 'API服务暂时不可用，请稍后重试。';
        break;
      default:
        userMessage = '操作失败，请重试。如问题持续存在，请联系技术支持。';
    }
    
    // 这里可以集成到应用的通知系统
    console.error(`[用户错误] ${userMessage} (原始错误: ${originalMessage})`);
    
    // 可以触发应用级别的错误通知
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('app-error', {
        detail: { type, message: userMessage, originalMessage }
      }));
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStatistics(): { total: number; byType: Record<string, number>; recent: any[] } {
    try {
      const errorLog = localStorage.getItem(this.STORAGE_KEYS.errorLog);
      if (!errorLog) {
        return { total: 0, byType: {}, recent: [] };
      }
      
      const logs = JSON.parse(errorLog);
      const byType: Record<string, number> = {};
      
      logs.forEach((log: any) => {
        byType[log.type] = (byType[log.type] || 0) + 1;
      });
      
      // 最近24小时的错误
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recent = logs.filter((log: any) => log.timestamp > oneDayAgo);
      
      return {
        total: logs.length,
        byType,
        recent
      };
    } catch (error) {
      console.warn('[ErrorHandlingService] Failed to get error statistics:', error);
      return { total: 0, byType: {}, recent: [] };
    }
  }
}

// 创建全局实例
export const errorHandlingService = ErrorHandlingService.getInstance();
export default ErrorHandlingService;