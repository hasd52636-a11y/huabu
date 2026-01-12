import { ErrorInfo, RetryPolicy, ErrorType, ExecutionError } from '../types';

export class ErrorHandler {
  private retryPolicies: Map<ErrorType, RetryPolicy> = new Map();
  private errorLog: ExecutionError[] = [];
  private maxLogSize = 1000;

  constructor() {
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    // Network errors - aggressive retry
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

    // Rate limit errors - patient retry
    this.retryPolicies.set('rate_limit', {
      maxRetries: 10,
      baseDelay: 5000,
      maxDelay: 60000,
      backoffMultiplier: 1.2,
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

    // System errors - limited retry
    this.retryPolicies.set('system', {
      maxRetries: 2,
      baseDelay: 3000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true
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
   * Classify error type based on error characteristics
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors
    if (message.includes('network') || 
        message.includes('fetch') || 
        message.includes('connection') ||
        name.includes('networkerror')) {
      return 'network';
    }

    // Rate limit errors
    if (message.includes('rate limit') || 
        message.includes('too many requests') ||
        message.includes('quota exceeded')) {
      return 'rate_limit';
    }

    // API errors
    if (message.includes('api') || 
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('bad request')) {
      return 'api';
    }

    // Validation errors
    if (message.includes('validation') || 
        message.includes('invalid') ||
        message.includes('required') ||
        name.includes('validationerror')) {
      return 'validation';
    }

    // Default to system error
    return 'system';
  }

  /**
   * Check if error type is recoverable
   */
  private isRecoverable(errorType: ErrorType): boolean {
    return errorType !== 'validation';
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
      system: 0
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