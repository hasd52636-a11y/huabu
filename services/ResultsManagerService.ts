/**
 * ResultsManagerService - 生成结果管理服务
 * 
 * 功能：
 * - 管理生成的内容结果（文本、图片、视频）
 * - 处理缩略图生成和存储
 * - 提供结果投射到画布的功能
 * - 管理结果的持久化存储
 */

import { GenerationParameters } from '../types';

export interface GenerationResult {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string; // URL for media, text content for text
  thumbnail?: string; // Base64 thumbnail for media
  metadata: {
    prompt: string;
    model: string;
    parameters: GenerationParameters;
    timestamp: number;
    source: 'chat' | 'parameter-panel';
  };
  status: 'generating' | 'completed' | 'failed';
  error?: string; // Error message if status is 'failed'
}

export interface StoredResults {
  version: string;
  results: GenerationResult[];
  lastCleanup: number;
}

export type ResultsListener = (results: GenerationResult[]) => void;

export class ResultsManagerService {
  private results: Map<string, GenerationResult>;
  private listeners: Set<ResultsListener>;
  private storageKey = 'canvas-generation-results';
  private readonly maxResults = 100;
  private readonly maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly storageVersion = '1.0';

  constructor() {
    this.results = new Map();
    this.listeners = new Set();
    this.loadFromStorage();
    this.scheduleCleanup();
  }

  /**
   * 从本地存储加载结果
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data: StoredResults = JSON.parse(stored);
        if (data.version === this.storageVersion && Array.isArray(data.results)) {
          data.results.forEach(result => {
            if (this.validateResult(result)) {
              this.results.set(result.id, result);
            }
          });
          console.log(`[ResultsManager] Loaded ${this.results.size} results from storage`);
        }
      }
    } catch (error) {
      console.warn('[ResultsManager] Failed to load from storage:', error);
    }
  }

  /**
   * 保存结果到本地存储
   */
  private saveToStorage(): void {
    try {
      const data: StoredResults = {
        version: this.storageVersion,
        results: Array.from(this.results.values()),
        lastCleanup: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('[ResultsManager] Failed to save to storage:', error);
      // 如果存储失败，尝试清理旧数据
      this.cleanup();
    }
  }

  /**
   * 验证结果数据结构
   */
  private validateResult(result: any): result is GenerationResult {
    return (
      typeof result === 'object' &&
      typeof result.id === 'string' &&
      ['text', 'image', 'video'].includes(result.type) &&
      typeof result.content === 'string' &&
      typeof result.metadata === 'object' &&
      typeof result.metadata.prompt === 'string' &&
      typeof result.metadata.model === 'string' &&
      typeof result.metadata.timestamp === 'number' &&
      ['chat', 'parameter-panel'].includes(result.metadata.source) &&
      ['generating', 'completed', 'failed'].includes(result.status)
    );
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const results = this.getResults();
    this.listeners.forEach(listener => {
      try {
        listener(results);
      } catch (error) {
        console.error('[ResultsManager] Listener error:', error);
      }
    });
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 添加新的生成结果
   */
  addResult(result: Omit<GenerationResult, 'id' | 'metadata'> & {
    metadata: Omit<GenerationResult['metadata'], 'timestamp'>;
  }): string {
    const id = this.generateId();
    const newResult: GenerationResult = {
      ...result,
      id,
      metadata: {
        ...result.metadata,
        timestamp: Date.now()
      }
    };

    this.results.set(id, newResult);
    this.saveToStorage();
    this.notifyListeners();

    console.log(`[ResultsManager] Added result: ${id} (${result.type})`);
    return id;
  }

  /**
   * 更新结果
   */
  updateResult(id: string, updates: Partial<GenerationResult>): void {
    const existing = this.results.get(id);
    if (!existing) {
      console.warn(`[ResultsManager] Result not found: ${id}`);
      return;
    }

    const updated: GenerationResult = {
      ...existing,
      ...updates,
      id, // 确保ID不被覆盖
      metadata: {
        ...existing.metadata,
        ...(updates.metadata || {})
      }
    };

    this.results.set(id, updated);
    this.saveToStorage();
    this.notifyListeners();

    console.log(`[ResultsManager] Updated result: ${id}`);
  }

  /**
   * 获取所有结果（按时间倒序）
   */
  getResults(): GenerationResult[] {
    return Array.from(this.results.values())
      .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);
  }

  /**
   * 获取单个结果
   */
  getResult(id: string): GenerationResult | undefined {
    return this.results.get(id);
  }

  /**
   * 删除结果
   */
  deleteResult(id: string): boolean {
    const deleted = this.results.delete(id);
    if (deleted) {
      this.saveToStorage();
      this.notifyListeners();
      console.log(`[ResultsManager] Deleted result: ${id}`);
    }
    return deleted;
  }

  /**
   * 批量删除结果
   */
  deleteResults(ids: string[]): number {
    let deletedCount = 0;
    ids.forEach(id => {
      if (this.results.delete(id)) {
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      this.saveToStorage();
      this.notifyListeners();
      console.log(`[ResultsManager] Deleted ${deletedCount} results`);
    }

    return deletedCount;
  }

  /**
   * 清理过期结果
   */
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    // 删除过期结果
    this.results.forEach((result, id) => {
      if (now - result.metadata.timestamp > this.maxAge) {
        toDelete.push(id);
      }
    });

    // 如果结果数量超过限制，删除最旧的
    const sortedResults = this.getResults();
    if (sortedResults.length > this.maxResults) {
      const excess = sortedResults.slice(this.maxResults);
      excess.forEach(result => toDelete.push(result.id));
    }

    if (toDelete.length > 0) {
      this.deleteResults(toDelete);
      console.log(`[ResultsManager] Cleaned up ${toDelete.length} old results`);
    }
  }

  /**
   * 定期清理
   */
  private scheduleCleanup(): void {
    // 每小时清理一次
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  /**
   * 订阅结果变化
   */
  subscribe(listener: ResultsListener): () => void {
    this.listeners.add(listener);
    
    // 立即调用一次监听器
    try {
      listener(this.getResults());
    } catch (error) {
      console.error('[ResultsManager] Initial listener call error:', error);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 获取结果统计信息
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    storageSize: number;
  } {
    const results = this.getResults();
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    results.forEach(result => {
      byType[result.type] = (byType[result.type] || 0) + 1;
      byStatus[result.status] = (byStatus[result.status] || 0) + 1;
    });

    // 估算存储大小
    let storageSize = 0;
    try {
      const stored = localStorage.getItem(this.storageKey);
      storageSize = stored ? stored.length : 0;
    } catch (error) {
      // 忽略错误
    }

    return {
      total: results.length,
      byType,
      byStatus,
      storageSize
    };
  }

  /**
   * 清除所有结果
   */
  clearAll(): void {
    this.results.clear();
    this.saveToStorage();
    this.notifyListeners();
    console.log('[ResultsManager] Cleared all results');
  }

  /**
   * 导出结果数据
   */
  exportResults(): GenerationResult[] {
    return this.getResults();
  }

  /**
   * 导入结果数据
   */
  importResults(results: GenerationResult[]): number {
    let importedCount = 0;
    
    results.forEach(result => {
      if (this.validateResult(result)) {
        this.results.set(result.id, result);
        importedCount++;
      }
    });

    if (importedCount > 0) {
      this.saveToStorage();
      this.notifyListeners();
      console.log(`[ResultsManager] Imported ${importedCount} results`);
    }

    return importedCount;
  }
}

// 单例实例
export const resultsManagerService = new ResultsManagerService();