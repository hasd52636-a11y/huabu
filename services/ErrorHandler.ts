/**
 * Enhanced Error Handler Service
 * Provides comprehensive error handling, retry mechanisms, and user-friendly error messages
 */

export interface ErrorInfo {
  code: string;
  message: string;
  details?: string;
  timestamp: number;
  retryable: boolean;
  userMessage: string;
  suggestedAction?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface ErrorLog {
  id: string;
  error: ErrorInfo;
  context: Record<string, any>;
  stackTrace?: string;
  resolved: boolean;
  resolvedAt?: number;
}

export class ErrorHandler {
  private errorLogs: ErrorLog[] = [];
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'RATE_LIMIT_ERROR',
      'TEMPORARY_API_ERROR',
      'DOWNLOAD_ERROR'
    ]
  };

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * Process and categorize an error
   */
  processError(error: Error | string, context?: Record<string, any>): ErrorInfo {
    const errorMessage = error instanceof Error ? error.message : error;
    const stackTrace = error instanceof Error ? error.stack : undefined;
    
    const errorInfo = this.categorizeError(errorMessage);
    
    // Log the error
    const errorLog: ErrorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      error: errorInfo,
      context: context || {},
      stackTrace,
      resolved: false
    };
    
    this.errorLogs.push(errorLog);
    
    // Keep only last 100 error logs
    if (this.errorLogs.length > 100) {
      this.errorLogs = this.errorLogs.slice(-100);
    }
    
    return errorInfo;
  }

  /**
   * Categorize error and provide user-friendly information
   */
  private categorizeError(errorMessage: string): ErrorInfo {
    const timestamp = Date.now();
    
    // Check more specific errors first to avoid conflicts
    
    // Authentication errors (check before API errors)
    if (this.isAuthError(errorMessage)) {
      return {
        code: 'AUTH_ERROR',
        message: errorMessage,
        timestamp,
        retryable: false,
        userMessage: 'API 密钥无效或已过期',
        suggestedAction: '请检查并更新 API 密钥配置'
      };
    }
    
    // Rate limiting errors (check before API errors)
    if (this.isRateLimitError(errorMessage)) {
      return {
        code: 'RATE_LIMIT_ERROR',
        message: errorMessage,
        timestamp,
        retryable: true,
        userMessage: 'API 调用频率过高，已达到限制',
        suggestedAction: '请稍后重试，系统将自动调整请求频率'
      };
    }
    
    // Download errors (check before network errors)
    if (this.isDownloadError(errorMessage)) {
      return {
        code: 'DOWNLOAD_ERROR',
        message: errorMessage,
        timestamp,
        retryable: true,
        userMessage: '视频下载失败',
        suggestedAction: '请检查网络连接和下载路径权限后重试'
      };
    }
    
    // Timeout errors (check before network errors)
    if (this.isTimeoutError(errorMessage)) {
      return {
        code: 'TIMEOUT_ERROR',
        message: errorMessage,
        timestamp,
        retryable: true,
        userMessage: '请求超时，服务器响应缓慢',
        suggestedAction: '请稍后重试，或检查网络连接'
      };
    }
    
    // Network errors
    if (this.isNetworkError(errorMessage)) {
      return {
        code: 'NETWORK_ERROR',
        message: errorMessage,
        timestamp,
        retryable: true,
        userMessage: '网络连接失败，请检查网络连接',
        suggestedAction: '请检查网络连接后重试'
      };
    }
    
    // File parsing errors
    if (this.isFileParsingError(errorMessage)) {
      return {
        code: 'FILE_PARSING_ERROR',
        message: errorMessage,
        timestamp,
        retryable: false,
        userMessage: '文件格式错误或内容无效',
        suggestedAction: '请检查文件格式，确保使用正确的分隔符'
      };
    }
    
    // Storage errors
    if (this.isStorageError(errorMessage)) {
      return {
        code: 'STORAGE_ERROR',
        message: errorMessage,
        timestamp,
        retryable: false,
        userMessage: '本地存储空间不足或权限不够',
        suggestedAction: '请清理磁盘空间或检查文件夹权限'
      };
    }
    
    // API errors (check after more specific errors)
    if (this.isAPIError(errorMessage)) {
      return {
        code: 'API_ERROR',
        message: errorMessage,
        timestamp,
        retryable: this.isRetryableAPIError(errorMessage),
        userMessage: 'API 服务出现问题',
        suggestedAction: this.isRetryableAPIError(errorMessage) 
          ? '请稍后重试' 
          : '请检查 API 配置或联系技术支持'
      };
    }
    
    // Generic error
    return {
      code: 'UNKNOWN_ERROR',
      message: errorMessage,
      timestamp,
      retryable: false,
      userMessage: '发生未知错误',
      suggestedAction: '请重试，如问题持续请联系技术支持'
    };
  }

  /**
   * Check if error is retryable
   */
  isRetryable(errorCode: string): boolean {
    return this.retryConfig.retryableErrors.includes(errorCode);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(retryCount: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Check if should retry based on retry count and error type
   */
  shouldRetry(errorCode: string, retryCount: number): boolean {
    return this.isRetryable(errorCode) && retryCount < this.retryConfig.maxRetries;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: Error | string, lang: 'zh' | 'en' = 'zh'): string {
    const errorInfo = this.processError(error);
    
    if (lang === 'en') {
      return this.translateToEnglish(errorInfo);
    }
    
    return errorInfo.userMessage;
  }

  /**
   * Get suggested action for error
   */
  getSuggestedAction(error: Error | string, lang: 'zh' | 'en' = 'zh'): string {
    const errorInfo = this.processError(error);
    
    if (lang === 'en') {
      return this.translateActionToEnglish(errorInfo);
    }
    
    return errorInfo.suggestedAction || '请重试或联系技术支持';
  }

  /**
   * Get error logs
   */
  getErrorLogs(limit?: number): ErrorLog[] {
    const logs = [...this.errorLogs].reverse(); // Most recent first
    return limit ? logs.slice(0, limit) : logs;
  }

  /**
   * Mark error as resolved
   */
  markErrorResolved(errorId: string): boolean {
    const errorLog = this.errorLogs.find(log => log.id === errorId);
    if (errorLog) {
      errorLog.resolved = true;
      errorLog.resolvedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Clear error logs
   */
  clearErrorLogs(): void {
    this.errorLogs = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    resolved: number;
    unresolved: number;
    byType: Record<string, number>;
    recentErrors: number;
  } {
    const total = this.errorLogs.length;
    const resolved = this.errorLogs.filter(log => log.resolved).length;
    const unresolved = total - resolved;
    
    // Count by error type
    const byType: Record<string, number> = {};
    this.errorLogs.forEach(log => {
      const code = log.error.code;
      byType[code] = (byType[code] || 0) + 1;
    });
    
    // Recent errors (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentErrors = this.errorLogs.filter(log => log.error.timestamp > oneHourAgo).length;
    
    return {
      total,
      resolved,
      unresolved,
      byType,
      recentErrors
    };
  }

  // Error detection methods
  private isNetworkError(message: string): boolean {
    const networkKeywords = [
      'ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'offline', 'connection refused',
      'connection failed', 'connection timeout'
    ];
    const lowerMessage = message.toLowerCase();
    
    // Exclude download-specific network errors
    if (lowerMessage.includes('download') && lowerMessage.includes('network')) {
      return false;
    }
    
    return networkKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    ) || (lowerMessage.includes('network') && !lowerMessage.includes('download'));
  }

  private isTimeoutError(message: string): boolean {
    const timeoutKeywords = ['timeout', 'timed out', 'time out', 'ETIMEDOUT'];
    return timeoutKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private isAPIError(message: string): boolean {
    const apiKeywords = ['server error', 'internal server', '500', '502', '503', '504'];
    const lowerMessage = message.toLowerCase();
    
    // Exclude auth-specific API errors
    if (this.isAuthError(message)) {
      return false;
    }
    
    return apiKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    ) || (lowerMessage.includes('api') && !lowerMessage.includes('key') && !lowerMessage.includes('unauthorized'));
  }

  private isRetryableAPIError(message: string): boolean {
    const retryableKeywords = ['500', '502', '503', '504', 'temporary', 'unavailable'];
    return retryableKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private isRateLimitError(message: string): boolean {
    const rateLimitKeywords = ['rate limit', 'too many requests', '429', 'quota exceeded'];
    return rateLimitKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private isAuthError(message: string): boolean {
    const authKeywords = ['unauthorized', '401', '403', 'forbidden', 'invalid api key', 'authentication failed'];
    return authKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private isFileParsingError(message: string): boolean {
    const fileKeywords = ['parse error', 'invalid format', 'file format', 'separator', 'encoding'];
    return fileKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private isDownloadError(message: string): boolean {
    const downloadKeywords = ['download failed', 'download error', 'save failed', 'write file failed'];
    const lowerMessage = message.toLowerCase();
    
    return downloadKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    ) || (lowerMessage.includes('download') && (lowerMessage.includes('failed') || lowerMessage.includes('error')));
  }

  private isStorageError(message: string): boolean {
    const storageKeywords = ['storage', 'disk space', 'quota', 'ENOSPC', 'no space'];
    return storageKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // Translation methods
  private translateToEnglish(errorInfo: ErrorInfo): string {
    const translations: Record<string, string> = {
      '网络连接失败，请检查网络连接': 'Network connection failed, please check your network connection',
      '请求超时，服务器响应缓慢': 'Request timeout, server response is slow',
      'API 服务出现问题': 'API service encountered an issue',
      'API 调用频率过高，已达到限制': 'API call rate limit exceeded',
      'API 密钥无效或已过期': 'API key is invalid or expired',
      '文件格式错误或内容无效': 'File format error or invalid content',
      '视频下载失败': 'Video download failed',
      '本地存储空间不足或权限不够': 'Insufficient local storage space or permissions',
      '发生未知错误': 'An unknown error occurred'
    };
    
    return translations[errorInfo.userMessage] || errorInfo.userMessage;
  }

  private translateActionToEnglish(errorInfo: ErrorInfo): string {
    const translations: Record<string, string> = {
      '请检查网络连接后重试': 'Please check your network connection and retry',
      '请稍后重试，或检查网络连接': 'Please retry later or check your network connection',
      '请稍后重试': 'Please retry later',
      '请检查 API 配置或联系技术支持': 'Please check API configuration or contact technical support',
      '请稍后重试，系统将自动调整请求频率': 'Please retry later, the system will automatically adjust request frequency',
      '请检查并更新 API 密钥配置': 'Please check and update API key configuration',
      '请检查文件格式，确保使用正确的分隔符': 'Please check file format and ensure correct separators are used',
      '请检查网络连接和下载路径权限后重试': 'Please check network connection and download path permissions, then retry',
      '请清理磁盘空间或检查文件夹权限': 'Please free up disk space or check folder permissions',
      '请重试或联系技术支持': 'Please retry or contact technical support'
    };
    
    return translations[errorInfo.suggestedAction || ''] || errorInfo.suggestedAction || 'Please retry or contact technical support';
  }
}

export default ErrorHandler;