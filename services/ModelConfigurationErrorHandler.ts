/**
 * Model Configuration Error Handler
 * 
 * Handles errors and provides recovery mechanisms for model configuration issues
 */

import {
  ModelConfigurationError,
  ModelConfigurationErrorType,
  ErrorRecoveryStrategy,
  ErrorHandlingResult,
  ErrorStatistics,
  EnhancedErrorHandler
} from '../types/ModelConfigurationTypes';

/**
 * Enhanced error handler for model configuration issues
 */
export class ModelConfigurationErrorHandler implements EnhancedErrorHandler {
  private errorHandlers: Map<ModelConfigurationErrorType, (error: ModelConfigurationError) => Promise<ErrorHandlingResult>> = new Map();
  private errorStats: Map<ModelConfigurationErrorType, number> = new Map();
  private modelErrorCounts: Map<string, number> = new Map();
  private recoveryAttempts: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultHandlers();
  }

  /**
   * Handle a model configuration error
   */
  async handleError(error: ModelConfigurationError): Promise<ErrorHandlingResult> {
    // Update statistics
    this.updateErrorStatistics(error);

    // Get appropriate handler
    const handler = this.errorHandlers.get(error.type);
    if (!handler) {
      return this.handleUnknownError(error);
    }

    try {
      const result = await handler(error);
      
      // Log the error and result
      console.error(`[ModelConfigurationErrorHandler] ${error.type}:`, {
        modelId: error.modelId,
        provider: error.provider,
        message: error.message,
        result: result.action
      });

      return result;
    } catch (handlerError) {
      console.error('[ModelConfigurationErrorHandler] Handler failed:', handlerError);
      return this.handleUnknownError(error);
    }
  }

  /**
   * Get recovery strategy for an error
   */
  getRecoveryStrategy(error: ModelConfigurationError): ErrorRecoveryStrategy {
    const retryCount = this.recoveryAttempts.get(error.modelId) || 0;

    switch (error.type) {
      case ModelConfigurationErrorType.MODEL_ID_MAPPING_ERROR:
        return {
          type: 'fallback',
          fallbackModels: error.details.fallbackModels || [],
          userNotification: true
        };

      case ModelConfigurationErrorType.PARAMETER_FORMAT_ERROR:
        return {
          type: retryCount < 2 ? 'retry' : 'manual',
          maxRetries: 2,
          retryDelay: 1000,
          userNotification: true
        };

      case ModelConfigurationErrorType.API_CONNECTIVITY_ERROR:
        return {
          type: retryCount < 3 ? 'retry' : 'fallback',
          maxRetries: 3,
          retryDelay: Math.min(1000 * Math.pow(2, retryCount), 10000), // Exponential backoff
          fallbackModels: this.getWorkingModels(error.modelId),
          userNotification: retryCount >= 2
        };

      case ModelConfigurationErrorType.AUTHENTICATION_ERROR:
        return {
          type: 'manual',
          userNotification: true
        };

      case ModelConfigurationErrorType.QUOTA_EXCEEDED_ERROR:
        return {
          type: 'fallback',
          fallbackModels: this.getWorkingModels(error.modelId),
          userNotification: true
        };

      case ModelConfigurationErrorType.MODEL_NOT_SUPPORTED_ERROR:
        return {
          type: 'fallback',
          fallbackModels: this.getWorkingModels(error.modelId),
          userNotification: true
        };

      default:
        return {
          type: 'manual',
          userNotification: true
        };
    }
  }

  /**
   * Register a custom error handler
   */
  registerErrorHandler(
    errorType: ModelConfigurationErrorType,
    handler: (error: ModelConfigurationError) => Promise<ErrorHandlingResult>
  ): void {
    this.errorHandlers.set(errorType, handler);
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): ErrorStatistics {
    const totalErrors = Array.from(this.errorStats.values()).reduce((sum, count) => sum + count, 0);
    const errorsByType: Record<ModelConfigurationErrorType, number> = {} as any;
    
    // Initialize all error types
    Object.values(ModelConfigurationErrorType).forEach(type => {
      errorsByType[type] = this.errorStats.get(type) || 0;
    });

    const errorsByModel: Record<string, number> = {};
    this.modelErrorCounts.forEach((count, modelId) => {
      errorsByModel[modelId] = count;
    });

    return {
      totalErrors,
      errorsByType,
      errorsByModel,
      recoverySuccessRate: this.calculateRecoverySuccessRate(),
      averageRecoveryTime: this.calculateAverageRecoveryTime(),
      lastUpdated: Date.now()
    };
  }

  /**
   * Initialize default error handlers
   */
  private initializeDefaultHandlers(): void {
    // Model ID mapping error handler
    this.errorHandlers.set(
      ModelConfigurationErrorType.MODEL_ID_MAPPING_ERROR,
      async (error) => {
        const fallbackModels = error.details.fallbackModels || this.getWorkingModels(error.modelId);
        
        if (fallbackModels.length > 0) {
          return {
            success: true,
            action: 'fallback',
            fallbackModel: fallbackModels[0],
            userMessage: `Model ${error.modelId} is not available. Using ${fallbackModels[0]} instead.`
          };
        }

        return {
          success: false,
          action: 'manual_intervention',
          userMessage: `Model ${error.modelId} configuration error. Please check model ID mapping.`
        };
      }
    );

    // Parameter format error handler
    this.errorHandlers.set(
      ModelConfigurationErrorType.PARAMETER_FORMAT_ERROR,
      async (error) => {
        const retryCount = this.recoveryAttempts.get(error.modelId) || 0;
        
        if (retryCount < 2 && error.details.suggestedFix) {
          this.recoveryAttempts.set(error.modelId, retryCount + 1);
          
          return {
            success: true,
            action: 'retry',
            retryAfter: 1000,
            userMessage: `Retrying with corrected parameters for ${error.modelId}...`
          };
        }

        return {
          success: false,
          action: 'manual_intervention',
          userMessage: `Parameter format error for ${error.modelId}. Please check API documentation.`
        };
      }
    );

    // API connectivity error handler
    this.errorHandlers.set(
      ModelConfigurationErrorType.API_CONNECTIVITY_ERROR,
      async (error) => {
        const retryCount = this.recoveryAttempts.get(error.modelId) || 0;
        
        if (retryCount < 3) {
          this.recoveryAttempts.set(error.modelId, retryCount + 1);
          
          return {
            success: true,
            action: 'retry',
            retryAfter: Math.min(1000 * Math.pow(2, retryCount), 10000),
            userMessage: retryCount < 2 ? undefined : `Connection issues with ${error.modelId}. Retrying...`
          };
        }

        const fallbackModels = this.getWorkingModels(error.modelId);
        if (fallbackModels.length > 0) {
          return {
            success: true,
            action: 'fallback',
            fallbackModel: fallbackModels[0],
            userMessage: `Cannot connect to ${error.modelId}. Using ${fallbackModels[0]} instead.`
          };
        }

        return {
          success: false,
          action: 'manual_intervention',
          userMessage: `Cannot connect to ${error.modelId}. Please check network connection and API settings.`
        };
      }
    );

    // Authentication error handler
    this.errorHandlers.set(
      ModelConfigurationErrorType.AUTHENTICATION_ERROR,
      async (error) => {
        return {
          success: false,
          action: 'manual_intervention',
          userMessage: `Authentication failed for ${error.provider}. Please check your API key.`
        };
      }
    );

    // Quota exceeded error handler
    this.errorHandlers.set(
      ModelConfigurationErrorType.QUOTA_EXCEEDED_ERROR,
      async (error) => {
        const fallbackModels = this.getWorkingModels(error.modelId);
        
        if (fallbackModels.length > 0) {
          return {
            success: true,
            action: 'fallback',
            fallbackModel: fallbackModels[0],
            userMessage: `Quota exceeded for ${error.modelId}. Using ${fallbackModels[0]} instead.`
          };
        }

        return {
          success: false,
          action: 'manual_intervention',
          userMessage: `Quota exceeded for ${error.modelId}. Please upgrade your plan or try again later.`
        };
      }
    );

    // Model not supported error handler
    this.errorHandlers.set(
      ModelConfigurationErrorType.MODEL_NOT_SUPPORTED_ERROR,
      async (error) => {
        const fallbackModels = this.getWorkingModels(error.modelId);
        
        if (fallbackModels.length > 0) {
          return {
            success: true,
            action: 'fallback',
            fallbackModel: fallbackModels[0],
            userMessage: `${error.modelId} is not supported. Using ${fallbackModels[0]} instead.`
          };
        }

        return {
          success: false,
          action: 'manual_intervention',
          userMessage: `${error.modelId} is not supported by the current provider.`
        };
      }
    );
  }

  /**
   * Handle unknown errors
   */
  private async handleUnknownError(error: ModelConfigurationError): Promise<ErrorHandlingResult> {
    return {
      success: false,
      action: 'manual_intervention',
      userMessage: `Unknown error occurred with ${error.modelId}: ${error.message}`
    };
  }

  /**
   * Update error statistics
   */
  private updateErrorStatistics(error: ModelConfigurationError): void {
    // Update error type count
    const currentCount = this.errorStats.get(error.type) || 0;
    this.errorStats.set(error.type, currentCount + 1);

    // Update model error count
    const modelCount = this.modelErrorCounts.get(error.modelId) || 0;
    this.modelErrorCounts.set(error.modelId, modelCount + 1);
  }

  /**
   * Get working models as fallback options
   */
  private getWorkingModels(failedModelId: string): string[] {
    // This would be implemented to return known working models
    // For now, return some common fallback models
    const fallbackMap: Record<string, string[]> = {
      // Gemini fallbacks
      'gemini-2.0-flash-exp': ['gemini-1.5-pro', 'gpt-4o'],
      'gemini-1.5-pro': ['gemini-2.0-flash-exp', 'gpt-4o'],
      
      // Image model fallbacks
      'nano-banana-hd': ['nano-banana', 'dall-e-3'],
      'flux-dev': ['nano-banana-hd', 'dall-e-3'],
      
      // Video model fallbacks
      'sora_video2-portrait': ['sora_video2', 'veo3'],
      'sora_video2': ['veo3', 'sora-2']
    };

    return fallbackMap[failedModelId] || [];
  }

  /**
   * Calculate recovery success rate
   */
  private calculateRecoverySuccessRate(): number {
    // This would track successful recoveries vs total attempts
    // For now, return a placeholder
    return 0.85; // 85% success rate
  }

  /**
   * Calculate average recovery time
   */
  private calculateAverageRecoveryTime(): number {
    // This would track actual recovery times
    // For now, return a placeholder
    return 2500; // 2.5 seconds average
  }

  /**
   * Create a model configuration error
   */
  static createError(
    type: ModelConfigurationErrorType,
    modelId: string,
    provider: string,
    message: string,
    details: any = {},
    retryable: boolean = true
  ): ModelConfigurationError {
    const error = new Error(message) as ModelConfigurationError;
    error.type = type;
    error.modelId = modelId;
    error.provider = provider;
    error.details = details;
    error.timestamp = Date.now();
    error.retryable = retryable;
    return error;
  }
}

/**
 * Global error handler instance
 */
export const modelConfigurationErrorHandler = new ModelConfigurationErrorHandler();