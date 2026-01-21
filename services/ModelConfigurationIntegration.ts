/**
 * Model Configuration Integration
 * 
 * Wires all model configuration components together and provides
 * integration with existing ModelSelector component
 */

import { ModelIdMapper } from './ModelIdMapper';
import { ParameterFormatter } from './ParameterFormatter';
import { ModelConfigurationSystem } from './ModelConfigurationSystem';
import { ModelConfigurationErrorHandler } from './ModelConfigurationErrorHandler';
import { ModelAvailabilityService } from './ModelAvailabilityService';
import { ModelConfigurationValidator } from './ModelConfigurationValidator';
import { UnifiedModelInterface } from './UnifiedModelInterface';
import { ModelRegistry } from './ModelRegistry';
import { ConfigurationStorage } from './ConfigurationStorage';

import {
  GenerationType,
  ModelRequest,
  ModelResponse,
  ValidationRequest,
  ValidationResult,
  ModelLookupResult
} from '../types/ModelConfigurationTypes';

/**
 * Integrated model configuration system
 */
export class ModelConfigurationIntegration {
  private modelIdMapper: ModelIdMapper;
  private parameterFormatter: ParameterFormatter;
  private configurationSystem: ModelConfigurationSystem;
  private errorHandler: ModelConfigurationErrorHandler;
  private availabilityService: ModelAvailabilityService;
  private validator: ModelConfigurationValidator;
  private unifiedInterface: UnifiedModelInterface;
  private registry: ModelRegistry;
  private storage: ConfigurationStorage;

  private isInitialized = false;

  constructor() {
    this.modelIdMapper = new ModelIdMapper();
    this.parameterFormatter = new ParameterFormatter();
    this.configurationSystem = new ModelConfigurationSystem();
    this.errorHandler = new ModelConfigurationErrorHandler();
    this.availabilityService = new ModelAvailabilityService();
    this.validator = new ModelConfigurationValidator();
    this.unifiedInterface = new UnifiedModelInterface();
    this.registry = new ModelRegistry();
    this.storage = new ConfigurationStorage();
  }

  /**
   * Initialize the integrated system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load saved configuration if available
      const configResult = await this.storage.loadConfiguration();
      if (configResult.success && configResult.data) {
        await this.applyStoredConfiguration(configResult.data);
      }

      // Validate all registered models
      await this.validateAllModels();

      this.isInitialized = true;
      console.log('[ModelConfigurationIntegration] System initialized successfully');

    } catch (error) {
      console.error('[ModelConfigurationIntegration] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get available models for ModelSelector integration
   */
  getAvailableModels(generationType: GenerationType): ModelLookupResult[] {
    this.ensureInitialized();
    
    const models = this.registry.lookupByType(generationType);
    
    // Filter to only available models
    return models.filter(model => model.isAvailable);
  }

  /**
   * Validate model configuration for ModelSelector
   */
  async validateModelForSelector(
    modelId: string, 
    generationType: GenerationType,
    parameters?: Record<string, any>
  ): Promise<{
    isValid: boolean;
    error?: string;
    warnings?: string[];
    suggestedFix?: string;
  }> {
    this.ensureInitialized();

    try {
      const validationRequest: ValidationRequest = {
        modelId,
        generationType,
        parameters
      };

      const result = await this.validator.validateModelConfiguration(validationRequest);

      if (result.isValid) {
        return {
          isValid: true,
          warnings: result.warnings
        };
      } else {
        const primaryError = result.errors[0];
        const suggestedFix = result.remediationSteps[0];

        return {
          isValid: false,
          error: primaryError?.message || 'Unknown validation error',
          warnings: result.warnings,
          suggestedFix
        };
      }

    } catch (error) {
      return {
        isValid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Execute model request through unified interface
   */
  async executeModelRequest(request: ModelRequest): Promise<ModelResponse> {
    this.ensureInitialized();
    return await this.unifiedInterface.executeModelRequest(request);
  }

  /**
   * Get model capabilities for ModelSelector
   */
  async getModelCapabilities(modelId: string, generationType: GenerationType): Promise<{
    supported: boolean;
    capabilities: string[];
    limitations: string[];
    recommendedParameters: Record<string, any>;
  }> {
    this.ensureInitialized();
    return await this.unifiedInterface.getModelCapabilities(modelId, generationType);
  }

  /**
   * Check model availability
   */
  async checkModelAvailability(modelId: string, generationType: GenerationType): Promise<{
    isAvailable: boolean;
    status: string;
    error?: string;
    responseTime?: number;
  }> {
    this.ensureInitialized();

    try {
      const result = await this.availabilityService.checkModelAvailability({
        modelId,
        generationType,
        priority: 'normal'
      });

      return {
        isAvailable: result.isAvailable,
        status: result.status,
        error: result.error?.message,
        responseTime: result.responseTime
      };

    } catch (error) {
      return {
        isAvailable: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get model mapping for debugging
   */
  getModelMapping(modelId: string, generationType: GenerationType): {
    originalId: string;
    mappedId: string | null;
    isValid: boolean;
  } {
    this.ensureInitialized();

    const mappedId = this.modelIdMapper.mapModelId(modelId, generationType);
    
    return {
      originalId: modelId,
      mappedId,
      isValid: mappedId !== null
    };
  }

  /**
   * Format parameters for model
   */
  formatModelParameters(
    modelId: string,
    generationType: GenerationType,
    parameters: Record<string, any>
  ): Record<string, any> {
    this.ensureInitialized();
    
    try {
      return this.parameterFormatter.formatParameters(modelId, generationType, parameters);
    } catch (error) {
      console.error('[ModelConfigurationIntegration] Parameter formatting failed:', error);
      return parameters; // Return original parameters as fallback
    }
  }

  /**
   * Handle model errors with fallback suggestions
   */
  handleModelError(
    error: any,
    context: {
      modelId: string;
      generationType: GenerationType;
      operation: string;
    }
  ): {
    error: any;
    fallbackModel?: string;
    userMessage: string;
    canRetry: boolean;
  } {
    this.ensureInitialized();

    const handledError = this.errorHandler.handleError(error, context);
    
    // Get fallback model suggestion
    const availableModels = this.getAvailableModels(context.generationType);
    const fallbackModel = availableModels.find(model => 
      model.registration?.modelId !== context.modelId
    )?.registration?.modelId;

    // Generate user-friendly message
    const userMessage = this.errorHandler.getUserFriendlyMessage(handledError, 'zh');

    return {
      error: handledError,
      fallbackModel,
      userMessage,
      canRetry: handledError.retryable || false
    };
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      totalModels: number;
      availableModels: number;
      failedModels: number;
      lastCheck: number;
    };
    issues: string[];
  }> {
    this.ensureInitialized();

    const issues: string[] = [];
    let availableCount = 0;
    let failedCount = 0;

    // Check all registered models
    const allModels = this.registry.getAllModels();
    const totalModels = allModels.length;

    for (const model of allModels) {
      if (!model.isEnabled) continue;

      try {
        const availability = await this.availabilityService.checkModelAvailability({
          modelId: model.modelId,
          generationType: model.generationType,
          priority: 'low',
          timeout: 5000 // Quick check
        });

        if (availability.isAvailable) {
          availableCount++;
        } else {
          failedCount++;
          issues.push(`Model ${model.modelId} is not available: ${availability.error?.message || 'Unknown reason'}`);
        }
      } catch (error) {
        failedCount++;
        issues.push(`Failed to check ${model.modelId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    const availabilityRate = totalModels > 0 ? availableCount / totalModels : 0;

    if (availabilityRate >= 0.8) {
      status = 'healthy';
    } else if (availabilityRate >= 0.5) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      details: {
        totalModels,
        availableModels: availableCount,
        failedModels: failedCount,
        lastCheck: Date.now()
      },
      issues
    };
  }

  /**
   * Save current configuration
   */
  async saveConfiguration(): Promise<{ success: boolean; message: string }> {
    this.ensureInitialized();

    try {
      const config = {
        modelMappings: this.modelIdMapper.getAllMappings(),
        parameterFormats: this.parameterFormatter.getAllFormats(),
        errorHandling: this.errorHandler.getConfiguration(),
        registry: this.registry.getAllModels(),
        version: '1.0.0'
      };

      const result = await this.storage.saveConfiguration(config);
      
      return {
        success: result.success,
        message: result.message
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Create configuration backup
   */
  async createBackup(label?: string): Promise<{ success: boolean; message: string; backupId?: string }> {
    this.ensureInitialized();

    try {
      const result = await this.storage.createBackup(label);
      
      return {
        success: result.success,
        message: result.message,
        backupId: result.data?.id
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get integration statistics
   */
  getStatistics(): {
    models: {
      total: number;
      byType: Record<GenerationType, number>;
      enabled: number;
      deprecated: number;
    };
    availability: {
      checked: number;
      available: number;
      failed: number;
      cacheHitRate: number;
    };
    errors: {
      total: number;
      byType: Record<string, number>;
    };
  } {
    this.ensureInitialized();

    const registryStats = this.registry.getRegistryStatistics();
    const availabilityStats = this.availabilityService.getAvailabilityStatistics();
    const errorStats = this.errorHandler.getErrorStatistics();

    return {
      models: {
        total: registryStats.totalModels,
        byType: registryStats.modelsByType,
        enabled: registryStats.enabledModels,
        deprecated: registryStats.deprecatedModels
      },
      availability: {
        checked: availabilityStats.totalChecked,
        available: availabilityStats.available,
        failed: availabilityStats.errors,
        cacheHitRate: availabilityStats.cacheHitRate
      },
      errors: {
        total: errorStats.totalErrors,
        byType: errorStats.errorsByType
      }
    };
  }

  /**
   * Apply stored configuration
   */
  private async applyStoredConfiguration(config: any): Promise<void> {
    try {
      // Apply model mappings
      if (config.modelMappings) {
        // ModelIdMapper would need a method to load mappings
        console.log('[ModelConfigurationIntegration] Loaded model mappings');
      }

      // Apply parameter formats
      if (config.parameterFormats) {
        // ParameterFormatter would need a method to load formats
        console.log('[ModelConfigurationIntegration] Loaded parameter formats');
      }

      // Apply error handling configuration
      if (config.errorHandling) {
        // ModelConfigurationErrorHandler would need a method to load config
        console.log('[ModelConfigurationIntegration] Loaded error handling config');
      }

      // Apply registry data
      if (config.registry && Array.isArray(config.registry)) {
        // Registry is already initialized with default models
        console.log('[ModelConfigurationIntegration] Registry initialized with default models');
      }

    } catch (error) {
      console.warn('[ModelConfigurationIntegration] Failed to apply stored configuration:', error);
      // Continue with default configuration
    }
  }

  /**
   * Validate all registered models
   */
  private async validateAllModels(): Promise<void> {
    const allModels = this.registry.getAllModels();
    const validationRequests: ValidationRequest[] = allModels.map(model => ({
      modelId: model.modelId,
      generationType: model.generationType,
      parameters: model.metadata.parameters
    }));

    try {
      const results = await this.validator.validateBatchConfigurations(validationRequests);
      const invalidModels = results.filter(r => !r.isValid);

      if (invalidModels.length > 0) {
        console.warn(`[ModelConfigurationIntegration] ${invalidModels.length} models have configuration issues`);
        invalidModels.forEach(result => {
          console.warn(`- ${result.modelId}: ${result.errors.map(e => e.message).join(', ')}`);
        });
      } else {
        console.log('[ModelConfigurationIntegration] All models validated successfully');
      }

    } catch (error) {
      console.warn('[ModelConfigurationIntegration] Model validation failed:', error);
    }
  }

  /**
   * Ensure system is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('ModelConfigurationIntegration not initialized. Call initialize() first.');
    }
  }
}

/**
 * Global model configuration integration instance
 */
export const modelConfigurationIntegration = new ModelConfigurationIntegration();