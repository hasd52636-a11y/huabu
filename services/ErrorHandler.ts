import { ErrorInfo, RetryPolicy, ErrorType, ExecutionError } from '../types';

// User-friendly error messages and recovery suggestions
export interface ErrorRecoveryInfo {
  userMessage: string;
  technicalMessage: string;
  recoveryActions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

export class ErrorHandler {
  private retryPolicies: Map<ErrorType, RetryPolicy> = new Map();
  private errorLog: ExecutionError[] = [];
  private maxLogSize = 1000;
  private errorRecoveryMap: Map<ErrorType, ErrorRecoveryInfo> = new Map();

  constructor() {
    this.initializeDefaultPolicies();
    this.initializeErrorRecoveryInfo();
  }

  private initializeDefaultPolicies(): void {
    // Network errors - aggressive retry with exponential backoff
    this.retryPolicies.set('network', {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true
    });

    // API errors - moderate retry
    this.retryPolicies.set('api', {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 15000,
      backoffMultiplier: 1.5,
      jitter: true
    });

    // Rate limit errors - patient retry with longer delays
    this.retryPolicies.set('rate_limit', {
      maxRetries: 10,
      baseDelay: 5000,
      maxDelay: 60000,
      backoffMultiplier: 1.2,
      jitter: false
    });

    // Timeout errors - moderate retry
    this.retryPolicies.set('timeout', {
      maxRetries: 4,
      baseDelay: 3000,
      maxDelay: 20000,
      backoffMultiplier: 1.8,
      jitter: true
    });

    // Quota errors - patient retry with long delays
    this.retryPolicies.set('quota', {
      maxRetries: 8,
      baseDelay: 10000,
      maxDelay: 120000,
      backoffMultiplier: 1.3,
      jitter: false
    });

    // Authentication errors - limited retry
    this.retryPolicies.set('authentication', {
      maxRetries: 1,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 1,
      jitter: false
    });

    // Permission errors - no retry
    this.retryPolicies.set('permission', {
      maxRetries: 0,
      baseDelay: 0,
      maxDelay: 0,
      backoffMultiplier: 1,
      jitter: false
    });

    // Validation errors - no retry
    this.retryPolicies.set('validation', {
      maxRetries: 0,
      baseDelay: 0,
      maxDelay: 0,
      backoffMultiplier: 1,
      jitter: false
    });

    // Format errors - no retry
    this.retryPolicies.set('format', {
      maxRetries: 0,
      baseDelay: 0,
      maxDelay: 0,
      backoffMultiplier: 1,
      jitter: false
    });

    // Resource errors - moderate retry
    this.retryPolicies.set('resource', {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 12000,
      backoffMultiplier: 2,
      jitter: true
    });

    // System errors - limited retry
    this.retryPolicies.set('system', {
      maxRetries: 2,
      baseDelay: 3000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true
    });
  }

  private initializeErrorRecoveryInfo(): void {
    // Network errors
    this.errorRecoveryMap.set('network', {
      userMessage: '网络连接失败，请检查您的网络连接',
      technicalMessage: 'Network connection failed or timed out',
      recoveryActions: [
        '检查网络连接是否正常',
        '尝试刷新页面',
        '检查防火墙设置',
        '稍后重试'
      ],
      severity: 'medium',
      category: '网络问题'
    });

    // API errors
    this.errorRecoveryMap.set('api', {
      userMessage: 'API服务暂时不可用，请稍后重试',
      technicalMessage: 'API service returned an error response',
      recoveryActions: [
        '稍后重试',
        '检查API服务状态',
        '联系技术支持'
      ],
      severity: 'medium',
      category: 'API问题'
    });

    // Rate limit errors
    this.errorRecoveryMap.set('rate_limit', {
      userMessage: '请求过于频繁，请稍后重试',
      technicalMessage: 'API rate limit exceeded',
      recoveryActions: [
        '等待几分钟后重试',
        '减少请求频率',
        '考虑升级API配额'
      ],
      severity: 'low',
      category: '频率限制'
    });

    // Timeout errors
    this.errorRecoveryMap.set('timeout', {
      userMessage: '请求超时，请重试',
      technicalMessage: 'Request timed out waiting for response',
      recoveryActions: [
        '重试请求',
        '检查网络连接',
        '尝试简化请求内容'
      ],
      severity: 'medium',
      category: '超时问题'
    });

    // Quota errors
    this.errorRecoveryMap.set('quota', {
      userMessage: 'API配额已用完，请稍后重试或升级配额',
      technicalMessage: 'API quota exceeded for current billing period',
      recoveryActions: [
        '等待配额重置',
        '升级API配额',
        '优化使用频率'
      ],
      severity: 'high',
      category: '配额限制'
    });

    // Authentication errors
    this.errorRecoveryMap.set('authentication', {
      userMessage: 'API密钥无效或已过期，请检查配置',
      technicalMessage: 'Authentication failed - invalid or expired API key',
      recoveryActions: [
        '检查API密钥配置',
        '重新生成API密钥',
        '确认API密钥权限'
      ],
      severity: 'high',
      category: '认证问题'
    });

    // Permission errors
    this.errorRecoveryMap.set('permission', {
      userMessage: '没有权限执行此操作',
      technicalMessage: 'Insufficient permissions for requested operation',
      recoveryActions: [
        '检查账户权限',
        '联系管理员',
        '升级账户等级'
      ],
      severity: 'high',
      category: '权限问题'
    });

    // Validation errors
    this.errorRecoveryMap.set('validation', {
      userMessage: '输入内容格式不正确，请检查后重试',
      technicalMessage: 'Input validation failed',
      recoveryActions: [
        '检查输入格式',
        '确认必填字段',
        '参考输入示例'
      ],
      severity: 'medium',
      category: '输入验证'
    });

    // Format errors
    this.errorRecoveryMap.set('format', {
      userMessage: '文件格式不支持或内容格式错误',
      technicalMessage: 'Unsupported file format or malformed content',
      recoveryActions: [
        '检查文件格式',
        '转换为支持的格式',
        '检查文件完整性'
      ],
      severity: 'medium',
      category: '格式问题'
    });

    // Resource errors
    this.errorRecoveryMap.set('resource', {
      userMessage: '系统资源不足，请稍后重试',
      technicalMessage: 'Insufficient system resources',
      recoveryActions: [
        '稍后重试',
        '减少并发请求',
        '优化请求内容'
      ],
      severity: 'medium',
      category: '资源问题'
    });

    // System errors
    this.errorRecoveryMap.set('system', {
      userMessage: '系统内部错误，请稍后重试',
      technicalMessage: 'Internal system error occurred',
      recoveryActions: [
        '稍后重试',
        '刷新页面',
        '联系技术支持'
      ],
      severity: 'high',
      category: '系统错误'
    });
  }

  /**
   * Handle an error with appropriate retry logic
   */
  async handleError(
    error: Error,
    context: {
      blockId: string;
      executionId: string;
      operation: string;
      attempt: number;
    }
  ): Promise<{ shouldRetry: boolean; delay: number; errorInfo: ErrorInfo }> {
    const errorType = this.classifyError(error);
    const errorInfo: ErrorInfo = {
      type: errorType,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      recoverable: this.isRecoverable(errorType)
    };

    // Log the error
    this.logError({
      blockId: context.blockId,
      message: error.message,
      timestamp: Date.now(),
      type: errorType,
      context: context.operation,
      stack: error.stack
    });

    const policy = this.retryPolicies.get(errorType);
    if (!policy || context.attempt >= policy.maxRetries) {
      return {
        shouldRetry: false,
        delay: 0,
        errorInfo
      };
    }

    const delay = this.calculateDelay(policy, context.attempt);
    
    return {
      shouldRetry: true,
      delay,
      errorInfo
    };
  }

  /**
   * Enhanced error classification with more specific error types
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Authentication errors (401, unauthorized, invalid API key)
    if (message.includes('401') || 
        message.includes('unauthorized') || 
        message.includes('invalid api key') || 
        message.includes('authentication failed') ||
        message.includes('api key') && message.includes('invalid')) {
      return 'authentication';
    }

    // Permission errors (403, forbidden)
    if (message.includes('403') || 
        message.includes('forbidden') || 
        message.includes('permission denied') ||
        message.includes('access denied')) {
      return 'permission';
    }

    // Rate limit errors (429, too many requests)
    if (message.includes('429') ||
        message.includes('rate limit') || 
        message.includes('too many requests') ||
        message.includes('rate exceeded')) {
      return 'rate_limit';
    }

    // Quota errors (quota exceeded, billing)
    if (message.includes('quota exceeded') ||
        message.includes('quota limit') ||
        message.includes('billing') ||
        message.includes('usage limit')) {
      return 'quota';
    }

    // Timeout errors
    if (message.includes('timeout') || 
        message.includes('timed out') ||
        message.includes('request timeout') ||
        name.includes('timeouterror')) {
      return 'timeout';
    }

    // Network errors
    if (message.includes('network') || 
        message.includes('fetch failed') || 
        message.includes('connection') ||
        message.includes('econnrefused') ||
        message.includes('dns') ||
        name.includes('networkerror')) {
      return 'network';
    }

    // Format/validation errors
    if (message.includes('invalid format') ||
        message.includes('malformed') ||
        message.includes('parse error') ||
        message.includes('syntax error') ||
        message.includes('unsupported format')) {
      return 'format';
    }

    // Validation errors
    if (message.includes('validation') || 
        message.includes('invalid') && !message.includes('api key') ||
        message.includes('required') ||
        message.includes('missing') ||
        name.includes('validationerror')) {
      return 'validation';
    }

    // Resource errors (500, 502, 503, 504)
    if (message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504') ||
        message.includes('internal server error') ||
        message.includes('service unavailable') ||
        message.includes('bad gateway')) {
      return 'resource';
    }

    // API errors (400, 404, other HTTP errors)
    if (message.includes('400') ||
        message.includes('404') ||
        message.includes('bad request') ||
        message.includes('not found') ||
        message.includes('api') ||
        /\d{3}/.test(message)) { // Any HTTP status code
      return 'api';
    }

    // Default to system error
    return 'system';
  }

  /**
   * Check if error type is recoverable
   */
  private isRecoverable(errorType: ErrorType): boolean {
    const nonRecoverableTypes: ErrorType[] = ['validation', 'permission', 'format'];
    return !nonRecoverableTypes.includes(errorType);
  }

  /**
   * Get user-friendly error information
   */
  getErrorRecoveryInfo(errorType: ErrorType): ErrorRecoveryInfo {
    return this.errorRecoveryMap.get(errorType) || {
      userMessage: '发生未知错误，请稍后重试',
      technicalMessage: 'Unknown error occurred',
      recoveryActions: ['稍后重试', '刷新页面', '联系技术支持'],
      severity: 'medium',
      category: '未知错误'
    };
  }

  /**
   * Create comprehensive error message for users
   */
  createUserFriendlyErrorMessage(error: Error, context?: string): string {
    const errorType = this.classifyError(error);
    const recoveryInfo = this.getErrorRecoveryInfo(errorType);
    
    let message = `${recoveryInfo.userMessage}\n\n`;
    message += `错误类型: ${recoveryInfo.category}\n`;
    
    if (context) {
      message += `操作: ${context}\n`;
    }
    
    message += `\n建议解决方案:\n`;
    recoveryInfo.recoveryActions.forEach((action, index) => {
      message += `${index + 1}. ${action}\n`;
    });
    
    if (recoveryInfo.severity === 'high' || recoveryInfo.severity === 'critical') {
      message += `\n⚠️ 这是一个${recoveryInfo.severity === 'critical' ? '严重' : '重要'}错误，建议优先处理。`;
    }
    
    return message;
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateDelay(policy: RetryPolicy, attempt: number): number {
    let delay = policy.baseDelay * Math.pow(policy.backoffMultiplier, attempt);
    delay = Math.min(delay, policy.maxDelay);

    if (policy.jitter) {
      // Add random jitter (±25%)
      const jitterRange = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }

    // For tests, use much shorter delays to avoid timeout
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      delay = Math.min(delay, 100); // Cap at 100ms in test environment
    }

    return Math.max(0, Math.floor(delay));
  }

  /**
   * Log error for debugging and analysis
   */
  private logError(error: ExecutionError): void {
    this.errorLog.push(error);
    
    // Maintain log size limit
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Console logging for development
    console.error(`[ErrorHandler] ${error.type}: ${error.message}`, {
      blockId: error.blockId,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString()
    });
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsByBlock: Record<string, number>;
    recentErrors: ExecutionError[];
  } {
    const errorsByType: Record<ErrorType, number> = {
      network: 0,
      api: 0,
      rate_limit: 0,
      validation: 0,
      system: 0,
      timeout: 0,
      quota: 0,
      authentication: 0,
      permission: 0,
      format: 0,
      resource: 0
    };

    const errorsByBlock: Record<string, number> = {};

    this.errorLog.forEach(error => {
      errorsByType[error.type]++;
      errorsByBlock[error.blockId] = (errorsByBlock[error.blockId] || 0) + 1;
    });

    // Get recent errors (last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentErrors = this.errorLog.filter(error => error.timestamp > oneHourAgo);

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      errorsByBlock,
      recentErrors
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Update retry policy for specific error type
   */
  updateRetryPolicy(errorType: ErrorType, policy: RetryPolicy): void {
    this.retryPolicies.set(errorType, policy);
  }

  /**
   * Get current retry policy for error type
   */
  getRetryPolicy(errorType: ErrorType): RetryPolicy | undefined {
    return this.retryPolicies.get(errorType);
  }

  /**
   * Check if error should be isolated (not affect other blocks)
   */
  shouldIsolateError(error: ErrorInfo): boolean {
    // Isolate validation and API errors to prevent cascade failures
    return error.type === 'validation' || error.type === 'api';
  }

  /**
   * Create error report for user display
   */
  createErrorReport(errors: ExecutionError[]): string {
    if (errors.length === 0) {
      return 'No errors to report.';
    }

    const report = ['Error Report:', ''];
    
    // Group by type
    const groupedErrors = errors.reduce((acc, error) => {
      if (!acc[error.type]) {
        acc[error.type] = [];
      }
      acc[error.type].push(error);
      return acc;
    }, {} as Record<ErrorType, ExecutionError[]>);

    Object.entries(groupedErrors).forEach(([type, typeErrors]) => {
      report.push(`${type.toUpperCase()} Errors (${typeErrors.length}):`);
      typeErrors.forEach(error => {
        const time = new Date(error.timestamp).toLocaleTimeString();
        report.push(`  [${time}] Block ${error.blockId}: ${error.message}`);
      });
      report.push('');
    });

    return report.join('\n');
  }

  /**
   * Execute operation with error handling and retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: {
      blockId: string;
      executionId: string;
      operation: string;
    }
  ): Promise<T> {
    let attempt = 0;
    let lastError: Error;

    while (true) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        const result = await this.handleError(lastError, {
          ...context,
          attempt
        });

        if (!result.shouldRetry) {
          throw lastError;
        }

        // Wait before retry
        if (result.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, result.delay));
        }

        attempt++;
      }
    }
  }
}