/**
 * ContentSyncService - 内容同步服务
 * 
 * 功能：
 * - 管理聊天对话框和参数面板之间的双向内容同步
 * - 处理文本、附件和模型配置的同步
 * - 提供订阅机制监听同步状态变化
 */

export interface ContentSyncState {
  prompt: string;
  attachments: {
    image?: string;
    video?: string;
    file?: { name: string; content: string };
    videoUrl?: string;
  };
  mode: 'text' | 'image' | 'video';
  modelId: string;
  lastSyncTimestamp: number;
  source: 'chat' | 'parameter-panel';
}

export type ContentSyncListener = (state: ContentSyncState) => void;

export class ContentSyncService {
  private syncState: ContentSyncState;
  private listeners: Set<ContentSyncListener>;
  private storageKey = 'canvas-content-sync-state';

  constructor() {
    this.listeners = new Set();
    this.syncState = this.loadFromStorage() || this.getDefaultState();
  }

  /**
   * 获取默认同步状态
   */
  private getDefaultState(): ContentSyncState {
    return {
      prompt: '',
      attachments: {},
      mode: 'text',
      modelId: '',
      lastSyncTimestamp: Date.now(),
      source: 'chat'
    };
  }

  /**
   * 从本地存储加载同步状态
   */
  private loadFromStorage(): ContentSyncState | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 验证数据结构
        if (this.validateSyncState(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('[ContentSyncService] Failed to load from storage:', error);
    }
    return null;
  }

  /**
   * 保存同步状态到本地存储
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.syncState));
    } catch (error) {
      console.warn('[ContentSyncService] Failed to save to storage:', error);
    }
  }

  /**
   * 验证同步状态数据结构
   */
  private validateSyncState(state: any): state is ContentSyncState {
    return (
      typeof state === 'object' &&
      typeof state.prompt === 'string' &&
      typeof state.attachments === 'object' &&
      ['text', 'image', 'video'].includes(state.mode) &&
      typeof state.modelId === 'string' &&
      typeof state.lastSyncTimestamp === 'number' &&
      ['chat', 'parameter-panel'].includes(state.source)
    );
  }

  /**
   * 通知所有监听器状态变化
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.syncState);
      } catch (error) {
        console.error('[ContentSyncService] Listener error:', error);
      }
    });
  }

  /**
   * 从聊天对话框同步内容到参数面板
   */
  syncFromChatDialog(
    prompt: string,
    attachments: {
      image?: string;
      video?: string;
      file?: { name: string; content: string };
      videoUrl?: string;
    },
    mode: 'text' | 'image' | 'video',
    modelId: string
  ): void {
    try {
      this.syncState = {
        prompt: prompt || '',
        attachments: { ...attachments },
        mode,
        modelId: modelId || '',
        lastSyncTimestamp: Date.now(),
        source: 'chat'
      };

      this.saveToStorage();
      this.notifyListeners();

      console.log('[ContentSyncService] Synced from chat dialog:', {
        promptLength: prompt.length,
        attachmentCount: Object.keys(attachments).length,
        mode,
        modelId
      });
    } catch (error) {
      console.error('[ContentSyncService] Failed to sync from chat dialog:', error);
      throw new Error(`同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 从参数面板同步内容到聊天对话框
   */
  syncToChatDialog(
    prompt: string,
    attachments: {
      image?: string;
      video?: string;
      file?: { name: string; content: string };
      videoUrl?: string;
    }
  ): void {
    try {
      this.syncState = {
        ...this.syncState,
        prompt: prompt || '',
        attachments: { ...attachments },
        lastSyncTimestamp: Date.now(),
        source: 'parameter-panel'
      };

      this.saveToStorage();
      this.notifyListeners();

      console.log('[ContentSyncService] Synced to chat dialog:', {
        promptLength: prompt.length,
        attachmentCount: Object.keys(attachments).length
      });
    } catch (error) {
      console.error('[ContentSyncService] Failed to sync to chat dialog:', error);
      throw new Error(`同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 订阅同步状态变化
   */
  subscribe(listener: ContentSyncListener): () => void {
    this.listeners.add(listener);
    
    // 立即调用一次监听器，提供当前状态
    try {
      listener(this.syncState);
    } catch (error) {
      console.error('[ContentSyncService] Initial listener call error:', error);
    }

    // 返回取消订阅函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 获取当前同步状态
   */
  getCurrentState(): ContentSyncState {
    return { ...this.syncState };
  }

  /**
   * 清除同步状态
   */
  clearState(): void {
    this.syncState = this.getDefaultState();
    this.saveToStorage();
    this.notifyListeners();
    console.log('[ContentSyncService] State cleared');
  }

  /**
   * 检查是否有待同步的内容
   */
  hasPendingContent(): boolean {
    return !!(
      this.syncState.prompt.trim() ||
      Object.keys(this.syncState.attachments).length > 0
    );
  }

  /**
   * 获取同步状态摘要（用于调试）
   */
  getStateSummary(): string {
    const { prompt, attachments, mode, modelId, source, lastSyncTimestamp } = this.syncState;
    return `ContentSync: ${source} -> ${mode}/${modelId}, prompt:${prompt.length}chars, attachments:${Object.keys(attachments).length}, synced:${new Date(lastSyncTimestamp).toLocaleTimeString()}`;
  }
}

// 单例实例
export const contentSyncService = new ContentSyncService();