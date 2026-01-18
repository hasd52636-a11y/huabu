/**
 * Priority Feature Error Handler
 * 
 * Handles error management for priority features including:
 * - Voice-specific error handling and recovery
 * - Editing-specific error handling and suggestions
 * - Video processing error handling and retry logic
 * - Provider compatibility validation
 * 
 * Requirements: 6.1, 6.2, 7.1 (Error handling and provider validation)
 */

export interface ErrorContext {
  feature: 'voice' | 'smear-edit' | 'smear-removal' | 'video-character';
  operation: string;
  provider?: string;
  sessionId?: string;
  blockId?: string;
  timestamp: number;
  userAgent?: string;
  additionalData?: any;
}

export interface ErrorResponse {
  message: string;
  suggestion: string;
  recoverable: boolean;
  action?: 'retry' | 'switch-provider' | 'clear-session' | 'reload-page' | 'contact-support';
  retryDelay?: number;
  maxRetries?: number;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByFeature: Record<string, number>;
  errorsByType: Record<string, number>;
  recentErrors: Array<{
    timestamp: number;
    feature: string;
    type: string;
    message: string;
  }>;
}

export class PriorityFeatureErrorHandler {
  private errorHistory: Array<ErrorContext & { error: Error }> = [];
  private maxHistorySize = 100;
  private retryAttempts: Map<string, number> = new Map();
  private maxRetryAttempts = 3;

  /**
   * Handle voice-specific errors
   * Requirements: 6.1
   */
  static handleVoiceError(error: Error, context: ErrorContext): ErrorResponse {
    const errorMessage = error.message.toLowerCase();

    // Provider compatibility errors
    if (errorMessage.includes('provider') || errorMessage.includes('shenmaapi')) {
      return {
        message: 'Voice features are only available with ShenmaAPI provider',
        suggestion: 'Please switch to ShenmaAPI to use voice functionality',
        recoverable: true,
        action: 'switch-provider'
      };
    }

    // Connection errors
    if (errorMessage.includes('connection') || errorMessage.includes('websocket') || errorMessage.includes('network')) {
      return {
        message: 'Voice connection failed',
        suggestion: 'Check your internet connection and try again',
        recoverable: true,
        action: 'retry',
        retryDelay: 3000,
        maxRetries: 3
      };
    }

    // Session errors
    if (errorMessage.includes('session') || errorMessage.includes('expired') || errorMessage.includes('invalid')) {
      return {
        message: 'Voice session error',
        suggestion: 'Please start a new voice session',
        recoverable: true,
        action: 'clear-session'
      };
    }

    // Microphone permission errors
    if (errorMessage.includes('microphone') || errorMessage.includes('permission') || errorMessage.includes('media')) {
      return {
        message: 'Microphone access denied',
        suggestion: 'Please grant microphone permission and try again',
        recoverable: true,
        action: 'retry'
      };
    }

    // Audio processing errors
    if (errorMessage.includes('audio') || errorMessage.includes('codec') || errorMessage.includes('format')) {
      return {
        message: 'Audio processing error',
        suggestion: 'Try refreshing the page or using a different browser',
        recoverable: true,
        action: 'reload-page'
      };
    }

    // Rate limit errors
    if (errorMessage.includes('rate limit') || errorMessage.includes('quota') || errorMessage.includes('429')) {
      return {
        message: 'Voice service rate limit exceeded',
        suggestion: 'Please wait a moment before trying again',
        recoverable: true,
        action: 'retry',
        retryDelay: 60000, // 1 minute
        maxRetries: 1
      };
    }

    // Generic voice error
    return {
      message: 'Voice feature error occurred',
      suggestion: 'Please try again or contact support if the problem persists',
      recoverable: true,
      action: 'retry',
      retryDelay: 5000,
      maxRetries: 2
    };
  }

  /**
   * Handle editing-specific errors (smear editing and removal)
   * Requirements: 6.2
   */
  static handleEditingError(error: Error, context: ErrorContext): ErrorResponse {
    const errorMessage = error.message.toLowerCase();

    // Invalid mask errors
    if (errorMessage.includes('mask') || errorMessage.includes('invalid area') || errorMessage.includes('selection')) {
      return {
        message: 'Invalid editing area selected',
        suggestion: 'Please select a valid area to edit using the brush tool',
        recoverable: true,
        action: 'retry'
      };
    }

    // Image processing errors
    if (errorMessage.includes('processing') || errorMessage.includes('ai') || errorMessage.includes('model')) {
      return {
        message: 'Image processing failed',
        suggestion: 'Try with a smaller area or different instructions',
        recoverable: true,
        action: 'retry',
        retryDelay: 2000,
        maxRetries: 2
      };
    }

    // Image format errors
    if (errorMessage.includes('format') || errorMessage.includes('unsupported') || errorMessage.includes('decode')) {
      return {
        message: 'Unsupported image format',
        suggestion: 'Please use JPG, PNG, or WebP format images',
        recoverable: false,
        action: 'contact-support'
      };
    }

    // Image size errors
    if (errorMessage.includes('size') || errorMessage.includes('resolution') || errorMessage.includes('dimensions')) {
      return {
        message: 'Image size not supported',
        suggestion: 'Please use images smaller than 2048x2048 pixels',
        recoverable: false,
        action: 'contact-support'
      };
    }

    // Memory errors
    if (errorMessage.includes('memory') || errorMessage.includes('out of') || errorMessage.includes('allocation')) {
      return {
        message: 'Insufficient memory for image processing',
        suggestion: 'Try with a smaller image or close other browser tabs',
        recoverable: true,
        action: 'retry'
      };
    }

    // API errors
    if (errorMessage.includes('api') || errorMessage.includes('server') || errorMessage.includes('500')) {
      return {
        message: 'Image editing service temporarily unavailable',
        suggestion: 'Please try again in a few moments',
        recoverable: true,
        action: 'retry',
        retryDelay: 10000,
        maxRetries: 2
      };
    }

    // Generic editing error
    return {
      message: 'Image editing failed',
      suggestion: 'Please try again with different settings or contact support',
      recoverable: true,
      action: 'retry',
      retryDelay: 3000,
      maxRetries: 2
    };
  }

  /**
   * Handle video processing errors
   * Requirements: 6.2
   */
  static handleVideoError(error: Error, context: ErrorContext): ErrorResponse {
    const errorMessage = error.message.toLowerCase();

    // Video format errors
    if (errorMessage.includes('format') || errorMessage.includes('codec') || errorMessage.includes('unsupported')) {
      return {
        message: 'Unsupported video format',
        suggestion: 'Please use MP4, WebM, or MOV format videos',
        recoverable: false,
        action: 'contact-support'
      };
    }

    // Video size/duration errors
    if (errorMessage.includes('size') || errorMessage.includes('duration') || errorMessage.includes('length')) {
      return {
        message: 'Video size or duration not supported',
        suggestion: 'Please use videos shorter than 30 seconds and smaller than 100MB',
        recoverable: false,
        action: 'contact-support'
      };
    }

    // Character detection errors
    if (errorMessage.includes('character') || errorMessage.includes('detection') || errorMessage.includes('no characters')) {
      return {
        message: 'No characters detected in video',
        suggestion: 'Please use a video with clearly visible people or characters',
        recoverable: true,
        action: 'retry'
      };
    }

    // Processing timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('processing time')) {
      return {
        message: 'Video processing timed out',
        suggestion: 'Try with a shorter video or try again later',
        recoverable: true,
        action: 'retry',
        retryDelay: 30000,
        maxRetries: 1
      };
    }

    // Qwen API errors
    if (errorMessage.includes('qwen') || errorMessage.includes('animate-mix')) {
      return {
        message: 'Video character replacement service error',
        suggestion: 'The service may be temporarily unavailable, please try again later',
        recoverable: true,
        action: 'retry',
        retryDelay: 60000,
        maxRetries: 2
      };
    }

    // Generic video error
    return {
      message: 'Video processing failed',
      suggestion: 'Please try again or contact support if the problem persists',
      recoverable: true,
      action: 'retry',
      retryDelay: 10000,
      maxRetries: 2
    };
  }

  /**
   * Validate provider compatibility
   * Requirements: 7.1
   */
  static validateProviderCompatibility(feature: string, provider: string): ErrorResponse | null {
    const compatibilityMatrix = {
      'voice': ['shenma'],
      'smear-edit': ['shenma'],
      'smear-removal': ['shenma'],
      'video-character': ['shenma']
    };

    const supportedProviders = compatibilityMatrix[feature as keyof typeof compatibilityMatrix];
    
    if (!supportedProviders || !supportedProviders.includes(provider.toLowerCase())) {
      return {
        message: `${feature} features are not supported by ${provider} provider`,
        suggestion: `Please switch to one of the supported providers: ${supportedProviders?.join(', ') || 'ShenmaAPI'}`,
        recoverable: true,
        action: 'switch-provider'
      };
    }

    return null; // No compatibility issues
  }

  /**
   * Handle generic priority feature errors
   */
  handleError(error: Error, context: ErrorContext): ErrorResponse {
    // Log error for analytics
    this.logError(error, context);

    // Check retry attempts
    const retryKey = `${context.feature}_${context.operation}_${context.sessionId || context.blockId}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;

    // Provider compatibility check
    if (context.provider) {
      const compatibilityError = PriorityFeatureErrorHandler.validateProviderCompatibility(
        context.feature,
        context.provider
      );
      if (compatibilityError) {
        return compatibilityError;
      }
    }

    // Feature-specific error handling
    let response: ErrorResponse;
    
    switch (context.feature) {
      case 'voice':
        response = PriorityFeatureErrorHandler.handleVoiceError(error, context);
        break;
      case 'smear-edit':
      case 'smear-removal':
        response = PriorityFeatureErrorHandler.handleEditingError(error, context);
        break;
      case 'video-character':
        response = PriorityFeatureErrorHandler.handleVideoError(error, context);
        break;
      default:
        response = this.handleGenericError(error, context);
    }

    // Check if max retries exceeded
    if (response.action === 'retry' && currentAttempts >= (response.maxRetries || this.maxRetryAttempts)) {
      response = {
        ...response,
        message: `${response.message} (Max retries exceeded)`,
        suggestion: 'Please contact support or try again later',
        recoverable: false,
        action: 'contact-support'
      };
    } else if (response.action === 'retry') {
      // Increment retry count
      this.retryAttempts.set(retryKey, currentAttempts + 1);
    }

    return response;
  }

  /**
   * Handle generic errors
   */
  private handleGenericError(error: Error, context: ErrorContext): ErrorResponse {
    const errorMessage = error.message.toLowerCase();

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
      return {
        message: 'Network connection error',
        suggestion: 'Please check your internet connection and try again',
        recoverable: true,
        action: 'retry',
        retryDelay: 5000,
        maxRetries: 3
      };
    }

    // Authentication errors
    if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
      return {
        message: 'Authentication failed',
        suggestion: 'Please check your API key configuration',
        recoverable: true,
        action: 'switch-provider'
      };
    }

    // Rate limit errors
    if (errorMessage.includes('rate') || errorMessage.includes('limit') || errorMessage.includes('429')) {
      return {
        message: 'Service rate limit exceeded',
        suggestion: 'Please wait a moment before trying again',
        recoverable: true,
        action: 'retry',
        retryDelay: 30000,
        maxRetries: 1
      };
    }

    // Server errors
    if (errorMessage.includes('500') || errorMessage.includes('server') || errorMessage.includes('internal')) {
      return {
        message: 'Service temporarily unavailable',
        suggestion: 'Please try again in a few moments',
        recoverable: true,
        action: 'retry',
        retryDelay: 10000,
        maxRetries: 2
      };
    }

    // Default error response
    return {
      message: 'An unexpected error occurred',
      suggestion: 'Please try again or contact support if the problem persists',
      recoverable: true,
      action: 'retry',
      retryDelay: 5000,
      maxRetries: 2
    };
  }

  /**
   * Log error for analytics and debugging
   */
  private logError(error: Error, context: ErrorContext): void {
    const errorEntry = {
      ...context,
      error,
      timestamp: Date.now()
    };

    this.errorHistory.push(errorEntry);

    // Limit history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Log to console for debugging
    console.error(`[PriorityFeatureErrorHandler] ${context.feature} error:`, {
      operation: context.operation,
      message: error.message,
      context
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    const now = Date.now();
    const recentThreshold = 24 * 60 * 60 * 1000; // 24 hours

    const recentErrors = this.errorHistory
      .filter(entry => now - entry.timestamp < recentThreshold)
      .map(entry => ({
        timestamp: entry.timestamp,
        feature: entry.feature,
        type: entry.operation,
        message: entry.error.message
      }));

    const errorsByFeature: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};

    recentErrors.forEach(error => {
      errorsByFeature[error.feature] = (errorsByFeature[error.feature] || 0) + 1;
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    });

    return {
      totalErrors: recentErrors.length,
      errorsByFeature,
      errorsByType,
      recentErrors: recentErrors.slice(-10) // Last 10 errors
    };
  }

  /**
   * Clear retry attempts for a specific operation
   */
  clearRetryAttempts(feature: string, operation: string, sessionId?: string, blockId?: string): void {
    const retryKey = `${feature}_${operation}_${sessionId || blockId}`;
    this.retryAttempts.delete(retryKey);
  }

  /**
   * Clear all retry attempts
   */
  clearAllRetryAttempts(): void {
    this.retryAttempts.clear();
  }

  /**
   * Get retry count for a specific operation
   */
  getRetryCount(feature: string, operation: string, sessionId?: string, blockId?: string): number {
    const retryKey = `${feature}_${operation}_${sessionId || blockId}`;
    return this.retryAttempts.get(retryKey) || 0;
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }
}

export default PriorityFeatureErrorHandler;