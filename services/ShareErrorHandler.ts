/**
 * 实时分享错误处理服务
 * 统一的错误分类、处理和恢复机制
 */

import { shareDiagnosticService } from './ShareDiagnosticService';

export type ErrorType = 'network' | 'service' | 'client' | 'data';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ShareError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  code: string;
  message: string;
  userMessage: string;
  details?: any;
  timestamp: number;
  context?: any;
  stack?: string;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'manual' | 'ignore';
  description: string;
  action?: () => Promise<void>;
  delay?: number;
  maxAttempts?: number;
}

export interface ErrorHandlerConfig {
  maxRetryAttempts: number;
  retryDelay: number;
  enableAutoRecovery: boolean;
  showUserNotifications: boolean;
  logErrors: boolean;
}

export class ShareErrorHandler {
  private static instance: ShareErrorHandler;
  private config: ErrorHandlerConfig;
  private errorHistory: ShareError[] = [];
  private retryAttempts: Map<string, number> = new Map();
  private onErrorCallback?: (error: ShareError, recovery: RecoveryAction[]) => void;

  constructor(config?: Partial<ErrorHandlerConfig>) {
    this.config = {
      maxRetryAttempts: 3,
      retryDelay: 2000,
      enableAutoRecovery: true,
      showUserNotifications: true,
      logErrors: true,
      ...config
    };
  }

  static getInstance(config?: Partial<ErrorHandlerConfig>): ShareErrorHandler {
    if (!ShareErrorHandler.instance) {
      ShareErrorHandler.instance = new ShareErrorHandler(config);
    }
    return ShareErrorHandler.instance;
  }

  /**
   * 处理错误
   */
  async handleError(error: Error | ShareError, context?: any): Promise<RecoveryAction[]> {
    let shareError: ShareError;

    if (error instanceof Error) {
      shareError = this.classifyError(error, context);
    } else {
      shareError = error;
    }

    // 记录错误
    this.recordError(shareError);

    // 生成恢复建议
    const recoveryActions = this.generateRecoveryActions(shareError);

    // 执行自动恢复（如果启用）
    if (this.config.enableAutoRecovery) {
      await this.attemptAutoRecovery(shareError, recoveryActions);
    }

    // 通知用户（如果有回调）
    if (this.onErrorCallback) {
      this.onErrorCallback(shareError, recoveryActions);
    }

    return recoveryActions;
  }

  /**
   * 分类错误
   */
  classifyError(error: Error, context?: any): ShareError {
    const errorId = this.generateErrorId();
    let type: ErrorType = 'client';
    let severity: ErrorSeverity = 'medium';
    let code = 'UNKNOWN_ERROR';
    let userMessage = '发生了未知错误，请重试';

    // 网络错误
    if (error.message.includes('fetch') || 
        error.message.includes('network') || 
        error.message.includes('Failed to fetch') ||
        error.name === 'NetworkError') {
      type = 'network';
      code = 'NETWORK_ERROR';
      userMessage = '网络连接出现问题，请检查网络后重试';
      
      if (error.message.includes('timeout')) {
        code = 'NETWORK_TIMEOUT';
        userMessage = '网络请求超时，请检查网络连接';
        severity = 'high';
      }
    }
    
    // 服务器错误
    else if (error.message.includes('500') || 
             error.message.includes('502') || 
             error.message.includes('503') ||
             error.message.includes('server')) {
      type = 'service';
      code = 'SERVER_ERROR';
      userMessage = '服务器暂时不可用，请稍后重试';
      severity = 'high';
    }
    
    // API 错误
    else if (error.message.includes('404')) {
      type = 'service';
      code = 'SESSION_NOT_FOUND';
      userMessage = '分享会话不存在或已过期';
      severity = 'high';
    }
    
    else if (error.message.includes('401') || error.message.includes('403')) {
      type = 'service';
      code = 'ACCESS_DENIED';
      userMessage = '访问被拒绝，请检查权限';
      severity = 'medium';
    }
    
    // 数据错误
    else if (error.message.includes('JSON') || 
             error.message.includes('parse') ||
             error.message.includes('serialize')) {
      type = 'data';
      code = 'DATA_FORMAT_ERROR';
      userMessage = '数据格式错误，请刷新页面重试';
      severity = 'medium';
    }
    
    // 客户端错误
    else if (error.message.includes('localStorage') || 
             error.message.includes('quota')) {
      type = 'client';
      code = 'STORAGE_ERROR';
      userMessage = '本地存储空间不足，请清理浏览器缓存';
      severity = 'medium';
    }
    
    else if (error.message.includes('permission')) {
      type = 'client';
      code = 'PERMISSION_DENIED';
      userMessage = '缺少必要权限，请允许相关权限后重试';
      severity = 'medium';
    }

    // PeerJS 相关错误
    else if (error.message.includes('peer') || error.message.includes('PeerJS')) {
      type = 'network';
      code = 'P2P_CONNECTION_ERROR';
      userMessage = 'P2P连接失败，将切换到服务器模式';
      severity = 'medium';
    }

    return {
      id: errorId,
      type,
      severity,
      code,
      message: error.message,
      userMessage,
      details: context,
      timestamp: Date.now(),
      context,
      stack: error.stack
    };
  }

  /**
   * 生成恢复建议
   */
  generateRecoveryActions(error: ShareError): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (error.code) {
      case 'NETWORK_ERROR':
      case 'NETWORK_TIMEOUT':
        actions.push({
          type: 'retry',
          description: '重新连接网络',
          delay: this.config.retryDelay,
          maxAttempts: this.config.maxRetryAttempts
        });
        actions.push({
          type: 'fallback',
          description: '切换到本地存储模式',
          action: async () => {
            // 实现切换到本地存储的逻辑
            console.log('[ErrorHandler] Switching to local storage mode');
          }
        });
        break;

      case 'SERVER_ERROR':
        actions.push({
          type: 'retry',
          description: '等待服务器恢复后重试',
          delay: this.config.retryDelay * 2,
          maxAttempts: 2
        });
        actions.push({
          type: 'fallback',
          description: '使用离线模式',
          action: async () => {
            console.log('[ErrorHandler] Switching to offline mode');
          }
        });
        break;

      case 'SESSION_NOT_FOUND':
        actions.push({
          type: 'manual',
          description: '请联系分享者获取新的分享链接'
        });
        break;

      case 'P2P_CONNECTION_ERROR':
        actions.push({
          type: 'fallback',
          description: '切换到服务器中转模式',
          action: async () => {
            console.log('[ErrorHandler] Switching to server relay mode');
          }
        });
        break;

      case 'DATA_FORMAT_ERROR':
        actions.push({
          type: 'retry',
          description: '重新获取数据',
          delay: 1000,
          maxAttempts: 2
        });
        actions.push({
          type: 'manual',
          description: '刷新页面重新开始'
        });
        break;

      case 'STORAGE_ERROR':
        actions.push({
          type: 'manual',
          description: '清理浏览器缓存和本地存储'
        });
        break;

      case 'PERMISSION_DENIED':
        actions.push({
          type: 'manual',
          description: '在浏览器设置中允许相关权限'
        });
        break;

      default:
        actions.push({
          type: 'retry',
          description: '重试操作',
          delay: this.config.retryDelay,
          maxAttempts: this.config.maxRetryAttempts
        });
        actions.push({
          type: 'manual',
          description: '刷新页面重新开始'
        });
    }

    return actions;
  }

  /**
   * 尝试自动恢复
   */
  async attemptAutoRecovery(error: ShareError, actions: RecoveryAction[]): Promise<boolean> {
    const retryAction = actions.find(action => action.type === 'retry');
    const fallbackAction = actions.find(action => action.type === 'fallback');

    // 检查重试次数
    const currentAttempts = this.retryAttempts.get(error.code) || 0;
    
    if (retryAction && currentAttempts < (retryAction.maxAttempts || this.config.maxRetryAttempts)) {
      this.retryAttempts.set(error.code, currentAttempts + 1);
      
      // 延迟后重试
      if (retryAction.delay) {
        await this.delay(retryAction.delay);
      }
      
      if (retryAction.action) {
        try {
          await retryAction.action();
          // 重试成功，清除计数
          this.retryAttempts.delete(error.code);
          return true;
        } catch (retryError) {
          console.error('[ErrorHandler] Retry failed:', retryError);
        }
      }
    }
    
    // 重试失败，尝试降级方案
    if (fallbackAction && fallbackAction.action) {
      try {
        await fallbackAction.action();
        return true;
      } catch (fallbackError) {
        console.error('[ErrorHandler] Fallback failed:', fallbackError);
      }
    }

    return false;
  }

  /**
   * 获取用户友好的错误信息
   */
  getUserErrorMessage(error: ShareError): string {
    return error.userMessage;
  }

  /**
   * 获取解决方案建议
   */
  getSolutionSuggestions(error: ShareError): string[] {
    const suggestions: string[] = [];

    switch (error.type) {
      case 'network':
        suggestions.push('检查网络连接是否正常');
        suggestions.push('尝试刷新页面');
        suggestions.push('切换到其他网络环境');
        if (error.code === 'P2P_CONNECTION_ERROR') {
          suggestions.push('系统将自动切换到服务器模式');
        }
        break;

      case 'service':
        suggestions.push('稍后重试');
        suggestions.push('联系技术支持');
        if (error.code === 'SESSION_NOT_FOUND') {
          suggestions.push('请联系分享者获取新的链接');
        }
        break;

      case 'client':
        suggestions.push('刷新页面重试');
        suggestions.push('清理浏览器缓存');
        suggestions.push('更新浏览器到最新版本');
        if (error.code === 'PERMISSION_DENIED') {
          suggestions.push('在浏览器设置中允许相关权限');
        }
        break;

      case 'data':
        suggestions.push('刷新页面重新加载');
        suggestions.push('清除浏览器缓存');
        break;
    }

    return suggestions;
  }

  /**
   * 设置错误回调
   */
  setErrorCallback(callback: (error: ShareError, recovery: RecoveryAction[]) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): ShareError[] {
    return [...this.errorHistory];
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
    this.retryAttempts.clear();
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recent: number; // 最近5分钟的错误数
  } {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    const stats = {
      total: this.errorHistory.length,
      byType: { network: 0, service: 0, client: 0, data: 0 } as Record<ErrorType, number>,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 } as Record<ErrorSeverity, number>,
      recent: 0
    };

    this.errorHistory.forEach(error => {
      stats.byType[error.type]++;
      stats.bySeverity[error.severity]++;
      if (error.timestamp > fiveMinutesAgo) {
        stats.recent++;
      }
    });

    return stats;
  }

  // 私有方法

  private recordError(error: ShareError): void {
    this.errorHistory.push(error);
    
    // 限制历史记录大小
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100);
    }

    // 记录到诊断服务
    if (this.config.logErrors) {
      shareDiagnosticService.logError(
        error.type,
        error.message,
        {
          code: error.code,
          severity: error.severity,
          userMessage: error.userMessage,
          details: error.details
        },
        error.stack ? new Error(error.message) : undefined
      );
    }

    console.error(`[ShareErrorHandler] ${error.type.toUpperCase()} (${error.code}): ${error.message}`, error);
  }

  private generateErrorId(): string {
    return 'err-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例实例
export const shareErrorHandler = ShareErrorHandler.getInstance();