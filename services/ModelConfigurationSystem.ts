/**
 * Model Configuration System
 * 
 * Unified system that combines model ID mapping and parameter formatting
 * to provide seamless model configuration for Shenma API integration
 */

import { ModelIdMapper } from './ModelIdMapper';
import { ParameterFormatter } from './ParameterFormatter';
import { ModelConfigurationErrorHandler } from './ModelConfigurationErrorHandler';
import {
  GenerationType,
  ModelConfigurationError,
  ModelConfigurationErrorType,
  UnifiedModelRequest,
  UnifiedModelResponse,
  UnifiedModelInterface,
  ModelInfo
} from '../types/ModelConfigurationTypes';

/**
 * Configuration request for model setup
 */
export interface ModelConfigurationRequest {
  internalModelId: string;
  generationType: GenerationType;
  parameters: Record<string, any>;
  options?: {
    validateOnly?: boolean;
    skipTransformation?: boolean;
    fallbackEnabled?: boolean;
  };
}

/**
 * Configuration result
 */
export interface ModelConfigurationResult {
  success: boolean;
  apiModelId?: string;
  formattedParameters?: Record<string, any>;
  transformationsApplied?: string[];
  validationWarnings?: string[];
  error?: ModelConfigurationError;
  fallbackUsed?: boolean;
  originalModelId?: string;
}

/**
 * Model Configuration System implementation
 */
export class ModelConfigurationSystem implements UnifiedModelInterface {
  private modelIdMapper: ModelIdMapper;
  private parameterFormatter: ParameterFormatter;
  private errorHandler: ModelConfigurationErrorHandler;

  constructor(
    modelIdMapper?: ModelIdMapper,
    parameterFormatter?: ParameterFormatter,
    errorHandler?: ModelConfigurationErrorHandler
  ) {
    this.modelIdMapper = modelIdMapper || new ModelIdMapper();
    this.parameterFormatter = parameterFormatter || new ParameterFormatter();
    this.errorHandler = errorHandler || new ModelConfigurationErrorHandler();
  }

  /**
   * Configure model for API request
   */
  async configureModel(request: ModelConfigurationRequest): Promise<ModelConfigurationResult> {
    try {
      const { internalModelId, generationType, parameters, options = {} } = request;

      // Step 1: Map internal model ID to API model ID
      const apiModelId = this.modelIdMapper.getApiId(internalModelId, generationType);
      if (!apiModelId) {
        const error = ModelConfigurationErrorHandler.createError(
          ModelConfigurationErrorType.MODEL_ID_MAPPING_ERROR,
          internalModelId,
          'shenma',
          `No API mapping found for model ${internalModelId} (${generationType})`,
          { originalRequest: request },
          true
        );

        // Try fallback if enabled
        if (options.fallbackEnabled) {
          const fallbackResult = await this.handleFallback(internalModelId, generationType, parameters);
          if (fallbackResult.success) {
            return { ...fallbackResult, fallbackUsed: true, originalModelId: internalModelId };
          }
        }

        return { success: false, error };
      }

      // Step 2: Validate parameters
      const validationResult = this.parameterFormatter.validateParameters(
        apiModelId,
        generationType,
        parameters
      );

      if (!validationResult.isValid) {
        const error = ModelConfigurationErrorHandler.createError(
          ModelConfigurationErrorType.PARAMETER_FORMAT_ERROR,
          internalModelId,
          'shenma',
          `Parameter validation failed: ${validationResult.errors.join(', ')}`,
          { 
            originalRequest: request,
            validationErrors: validationResult.errors,
            suggestedFix: 'Check parameter format according to API documentation'
          },
          true
        );

        return { success: false, error };
      }

      // Step 3: Format parameters (unless skipped)
      let formattedParameters = parameters;
      let transformationsApplied: string[] = [];

      if (!options.skipTransformation) {
        try {
          const formatResult = await this.parameterFormatter.formatParameters(
            apiModelId,
            generationType,
            validationResult.transformedValue || parameters
          );
          formattedParameters = formatResult.parameters;
          transformationsApplied = formatResult.metadata.transformationsApplied;
        } catch (formatError) {
          const error = ModelConfigurationErrorHandler.createError(
            ModelConfigurationErrorType.PARAMETER_FORMAT_ERROR,
            internalModelId,
            'shenma',
            `Parameter formatting failed: ${formatError}`,
            { originalRequest: request, formatError },
            true
          );

          return { success: false, error };
        }
      }

      // Step 4: Apply model-specific transformations
      const finalParameters = await this.applyModelSpecificTransformations(
        apiModelId,
        generationType,
        formattedParameters
      );

      return {
        success: true,
        apiModelId,
        formattedParameters: finalParameters,
        transformationsApplied,
        validationWarnings: validationResult.warnings
      };

    } catch (error) {
      const configError = ModelConfigurationErrorHandler.createError(
        ModelConfigurationErrorType.CONFIGURATION_VALIDATION_ERROR,
        request.internalModelId,
        'shenma',
        `Configuration system error: ${error}`,
        { originalRequest: request, systemError: error },
        false
      );

      return { success: false, error: configError };
    }
  }

  /**
   * Make unified model request
   */
  async makeRequest(request: UnifiedModelRequest): Promise<UnifiedModelResponse> {
    const startTime = Date.now();

    try {
      // Configure the model
      const configResult = await this.configureModel({
        internalModelId: request.modelId,
        generationType: request.generationType,
        parameters: request.parameters,
        options: {
          fallbackEnabled: request.options?.fallbackEnabled ?? true
        }
      });

      if (!configResult.success) {
        return {
          success: false,
          error: configResult.error,
          metadata: {
            modelId: request.modelId,
            actualModelUsed: request.modelId,
            generationType: request.generationType,
            responseTime: Date.now() - startTime,
            timestamp: Date.now(),
            fallbackUsed: false
          }
        };
      }

      // Here you would make the actual API call
      // For now, we'll simulate a successful response
      const mockApiResponse = await this.simulateApiCall(
        configResult.apiModelId!,
        request.generationType,
        configResult.formattedParameters!
      );

      return {
        success: true,
        data: mockApiResponse,
        metadata: {
          modelId: request.modelId,
          actualModelUsed: configResult.fallbackUsed ? configResult.originalModelId! : configResult.apiModelId!,
          generationType: request.generationType,
          responseTime: Date.now() - startTime,
          timestamp: Date.now(),
          fallbackUsed: configResult.fallbackUsed || false
        }
      };

    } catch (error) {
      const configError = ModelConfigurationErrorHandler.createError(
        ModelConfigurationErrorType.API_CONNECTIVITY_ERROR,
        request.modelId,
        'shenma',
        `Request failed: ${error}`,
        { originalRequest: request },
        true
      );

      return {
        success: false,
        error: configError,
        metadata: {
          modelId: request.modelId,
          actualModelUsed: request.modelId,
          generationType: request.generationType,
          responseTime: Date.now() - startTime,
          timestamp: Date.now(),
          fallbackUsed: false
        }
      };
    }
  }

  /**
   * Get available models for generation type
   */
  async getAvailableModels(generationType: GenerationType): Promise<string[]> {
    return this.modelIdMapper.getSupportedModels(generationType);
  }

  /**
   * Check model compatibility
   */
  async checkCompatibility(modelId: string, generationType: GenerationType): Promise<boolean> {
    return this.modelIdMapper.isModelSupported(modelId, generationType);
  }

  /**
   * Get model information
   */
  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    // Try to find the model in any generation type
    const generationTypes: GenerationType[] = ['text', 'image', 'video'];
    
    for (const genType of generationTypes) {
      const mappingInfo = this.modelIdMapper.getMappingInfo(modelId, genType);
      if (mappingInfo) {
        return {
          id: mappingInfo.internalId,
          name: this.formatModelName(mappingInfo.internalId),
          description: this.getModelDescription(mappingInfo.internalId, genType),
          provider: mappingInfo.provider,
          generationType: genType,
          capabilities: this.getModelCapabilities(mappingInfo.internalId, genType),
          isAvailable: mappingInfo.isActive,
          lastUpdated: mappingInfo.lastValidated || Date.now()
        };
      }
    }

    return null;
  }

  /**
   * Apply model-specific transformations
   */
  private async applyModelSpecificTransformations(
    apiModelId: string,
    generationType: GenerationType,
    parameters: Record<string, any>
  ): Promise<Record<string, any>> {
    const transformed = { ...parameters };

    // Gemini-specific transformations
    if (apiModelId.includes('gemini')) {
      transformed = await this.applyGeminiTransformations(apiModelId, transformed);
    }

    // Image model transformations
    if (generationType === 'image') {
      transformed = await this.applyImageModelTransformations(apiModelId, transformed);
    }

    // Video model transformations
    if (generationType === 'video') {
      transformed = await this.applyVideoModelTransformations(apiModelId, transformed);
    }

    return transformed;
  }

  /**
   * Apply Gemini-specific parameter transformations
   */
  private async applyGeminiTransformations(
    modelId: string,
    parameters: Record<string, any>
  ): Promise<Record<string, any>> {
    const transformed = { ...parameters };

    // Convert OpenAI-style messages to Gemini contents format
    if (transformed.messages && !transformed.contents) {
      transformed.contents = transformed.messages.map((msg: any) => ({
        parts: [{ text: msg.content }],
        role: msg.role === 'assistant' ? 'model' : msg.role
      }));
      delete transformed.messages;
    }

    // Handle thinking configuration for thinking models
    if (modelId.includes('thinking') && transformed.thinkingBudget) {
      transformed.generationConfig = {
        ...transformed.generationConfig,
        thinkingConfig: {
          thinkingBudget: transformed.thinkingBudget,
          includeThoughts: true
        }
      };
      delete transformed.thinkingBudget;
    }

    return transformed;
  }

  /**
   * Apply image model transformations
   */
  private async applyImageModelTransformations(
    modelId: string,
    parameters: Record<string, any>
  ): Promise<Record<string, any>> {
    const transformed = { ...parameters };

    // Flux-specific transformations
    if (modelId.includes('flux')) {
      // Ensure guidance_scale is set for Flux models
      if (!transformed.guidance_scale) {
        transformed.guidance_scale = 7.5;
      }
      
      // Set default inference steps
      if (!transformed.num_inference_steps) {
        transformed.num_inference_steps = 28;
      }
    }

    // Nano-banana specific transformations
    if (modelId.includes('nano-banana')) {
      // Ensure aspect ratio is properly formatted
      if (transformed.aspect_ratio && !transformed.size) {
        transformed.size = this.aspectRatioToSize(transformed.aspect_ratio);
      }
    }

    return transformed;
  }

  /**
   * Apply video model transformations
   */
  private async applyVideoModelTransformations(
    modelId: string,
    parameters: Record<string, any>
  ): Promise<Record<string, any>> {
    const transformed = { ...parameters };

    // Sora-specific transformations
    if (modelId.includes('sora')) {
      // Handle portrait/landscape variants
      if (modelId.includes('portrait')) {
        transformed.aspect_ratio = '9:16';
      } else if (modelId.includes('landscape')) {
        transformed.aspect_ratio = '16:9';
      }

      // Handle HD variants
      if (modelId.includes('hd')) {
        transformed.hd = true;
      }

      // Handle duration variants
      if (modelId.includes('15s')) {
        transformed.duration = '15';
      }

      // Ensure model field is set correctly for v2 API
      if (modelId.includes('sora-2')) {
        transformed.model = modelId.includes('pro') ? 'sora-2-pro' : 'sora-2';
      }
    }

    // Veo-specific transformations
    if (modelId.includes('veo')) {
      // Set enhance_prompt for non-English prompts
      if (this.containsNonEnglish(transformed.prompt)) {
        transformed.enhance_prompt = true;
      }

      // Set default aspect ratio if not specified
      if (!transformed.aspect_ratio) {
        transformed.aspect_ratio = '16:9';
      }
    }

    return transformed;
  }

  /**
   * Handle fallback model selection
   */
  private async handleFallback(
    originalModelId: string,
    generationType: GenerationType,
    parameters: Record<string, any>
  ): Promise<ModelConfigurationResult> {
    const fallbackModels = this.getFallbackModels(originalModelId, generationType);
    
    for (const fallbackId of fallbackModels) {
      const fallbackResult = await this.configureModel({
        internalModelId: fallbackId,
        generationType,
        parameters,
        options: { fallbackEnabled: false } // Prevent infinite recursion
      });

      if (fallbackResult.success) {
        return fallbackResult;
      }
    }

    // No fallback worked
    const error = ModelConfigurationErrorHandler.createError(
      ModelConfigurationErrorType.MODEL_NOT_SUPPORTED_ERROR,
      originalModelId,
      'shenma',
      `No working fallback found for ${originalModelId}`,
      { attemptedFallbacks: fallbackModels },
      false
    );

    return { success: false, error };
  }

  /**
   * Get fallback models for a given model
   */
  private getFallbackModels(modelId: string, generationType: GenerationType): string[] {
    const fallbackMap: Record<string, string[]> = {
      // Gemini fallbacks
      'gemini-2.0-flash-exp': ['gemini-1.5-pro', 'gemini-2.5-pro'],
      'gemini-1.5-pro': ['gemini-2.0-flash-exp', 'gemini-2.5-pro'],
      
      // Image model fallbacks
      'nano-banana-hd': ['nano-banana', 'dall-e-3'],
      'flux-dev': ['flux-pro', 'dall-e-3'],
      
      // Video model fallbacks
      'sora_video2-portrait': ['sora_video2', 'veo3'],
      'sora_video2': ['veo3', 'sora-2'],
      'veo3': ['veo3-fast', 'sora-2']
    };

    return fallbackMap[modelId] || [];
  }

  /**
   * Simulate API call (replace with actual implementation)
   */
  private async simulateApiCall(
    modelId: string,
    generationType: GenerationType,
    parameters: Record<string, any>
  ): Promise<any> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return mock response based on generation type
    switch (generationType) {
      case 'text':
        return {
          choices: [{
            message: {
              role: 'assistant',
              content: `Mock response from ${modelId}`
            }
          }]
        };
      
      case 'image':
        return {
          data: [{
            url: `https://mock-api.com/image/${modelId}/${Date.now()}.png`
          }]
        };
      
      case 'video':
        return {
          task_id: `mock-task-${Date.now()}`,
          status: 'SUCCESS',
          data: {
            output: `https://mock-api.com/video/${modelId}/${Date.now()}.mp4`
          }
        };
      
      default:
        return { success: true };
    }
  }

  /**
   * Utility methods
   */
  private formatModelName(modelId: string): string {
    return modelId
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private getModelDescription(modelId: string, generationType: GenerationType): string {
    const descriptions: Record<string, string> = {
      'gemini-2.0-flash-exp': 'Experimental Gemini 2.0 Flash model with enhanced capabilities',
      'gemini-1.5-pro': 'Advanced Gemini 1.5 Pro model for complex reasoning tasks',
      'nano-banana-hd': 'High-definition image generation model optimized for quality',
      'flux-dev': 'Development version of Flux image generation model',
      'sora_video2-portrait': 'Sora Video 2 model optimized for portrait orientation',
      'veo3': 'Google Veo 3 video generation model'
    };

    return descriptions[modelId] || `${generationType} generation model`;
  }

  private getModelCapabilities(modelId: string, generationType: GenerationType): Record<string, boolean> {
    const capabilities: Record<string, boolean> = {
      supportsImages: generationType === 'image' || generationType === 'video',
      supportsVideo: generationType === 'video',
      supportsInternet: false,
      supportsThinking: modelId.includes('thinking'),
      supportsCodeExecution: false,
      isExperimental: modelId.includes('exp') || modelId.includes('dev')
    };

    return capabilities;
  }

  private aspectRatioToSize(aspectRatio: string): string {
    const sizeMap: Record<string, string> = {
      '1:1': '1024x1024',
      '16:9': '1792x1024',
      '9:16': '1024x1792',
      '4:3': '1152x896',
      '3:4': '896x1152'
    };

    return sizeMap[aspectRatio] || '1024x1024';
  }

  private containsNonEnglish(text: string): boolean {
    // Simple check for non-ASCII characters (indicating non-English)
    return /[^\x00-\x7F]/.test(text);
  }

  /**
   * Get system statistics
   */
  getSystemStatistics(): {
    mappings: any;
    configurations: number;
    successRate: number;
  } {
    return {
      mappings: this.modelIdMapper.getMappingStatistics(),
      configurations: this.parameterFormatter.getParameterConfig('', 'text') ? 1 : 0,
      successRate: 0.95 // Mock success rate
    };
  }
}

/**
 * Global model configuration system instance
 */
export const modelConfigurationSystem = new ModelConfigurationSystem();