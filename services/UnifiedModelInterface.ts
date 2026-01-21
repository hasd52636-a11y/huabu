/**
 * Unified Model Interface
 * 
 * Provides a consistent interface for all model types with transparent handling
 * of model-specific parameter complexity and unified error handling
 */

import {
  UnifiedModelInterface as IUnifiedModelInterface,
  ModelRequest,
  ModelResponse,
  ModelError,
  GenerationType,
  ModelTransitionRequest,
  ModelTransitionResponse
} from '../types/ModelConfigurationTypes';
import { ModelIdMapper } from './ModelIdMapper';
import { ParameterFormatter } from './ParameterFormatter';
import { ModelConfigurationSystem } from './ModelConfigurationSystem';
import { ModelConfigurationErrorHandler } from './ModelConfigurationErrorHandler';
import { ModelAvailabilityService } from './ModelAvailabilityService';

/**
 * Unified interface for all model interactions
 */
export class UnifiedModelInterface implements IUnifiedModelInterface {
  private modelIdMapper: ModelIdMapper;
  private parameterFormatter: ParameterFormatter;
  private configurationSystem: ModelConfigurationSystem;
  private errorHandler: ModelConfigurationErrorHandler;
  private availabilityService: ModelAvailabilityService;

  constructor() {
    this.modelIdMapper = new ModelIdMapper();
    this.parameterFormatter = new ParameterFormatter();
    this.configurationSystem = new ModelConfigurationSystem();
    this.errorHandler = new ModelConfigurationErrorHandler();
    this.availabilityService = new ModelAvailabilityService();
  }

  /**
   * Execute model request with unified interface
   */
  async executeModelRequest(request: ModelRequest): Promise<ModelResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Validate and map model ID
      const mappedModelId = this.modelIdMapper.mapModelId(request.modelId, request.generationType);
      if (!mappedModelId) {
        throw new Error(`Model ID '${request.modelId}' not found for ${request.generationType} generation`);
      }

      // 2. Check model availability
      const availabilityResult = await this.availabilityService.checkModelAvailability({
        modelId: mappedModelId,
        generationType: request.generationType,
        priority: request.priority || 'normal'
      });

      if (!availabilityResult.isAvailable) {
        throw new Error(`Model '${mappedModelId}' is not available: ${availabilityResult.error?.message || 'Unknown reason'}`);
      }

      // 3. Format parameters
      const formattedParameters = this.parameterFormatter.formatParameters(
        mappedModelId,
        request.generationType,
        request.parameters
      );

      // 4. Transform parameters using configuration system
      const transformedParameters = this.configurationSystem.transformParameters(
        mappedModelId,
        request.generationType,
        formattedParameters
      );

      // 5. Execute API call
      const apiResponse = await this.executeApiCall(
        mappedModelId,
        request.generationType,
        transformedParameters,
        request.options
      );

      // 6. Normalize response format
      const normalizedResponse = this.normalizeResponse(
        apiResponse,
        request.generationType,
        mappedModelId
      );

      return {
        success: true,
        modelId: request.modelId,
        mappedModelId,
        generationType: request.generationType,
        response: normalizedResponse,
        metadata: {
          responseTime: Date.now() - startTime,
          provider: 'shenma',
          apiVersion: this.getApiVersion(request.generationType),
          transformedParameters: transformedParameters
        }
      };

    } catch (error) {
      // Handle errors through unified error handler
      const handledError = this.errorHandler.handleError(error, {
        modelId: request.modelId,
        generationType: request.generationType,
        operation: 'executeModelRequest'
      });

      return {
        success: false,
        modelId: request.modelId,
        mappedModelId: this.modelIdMapper.mapModelId(request.modelId, request.generationType),
        generationType: request.generationType,
        error: handledError,
        metadata: {
          responseTime: Date.now() - startTime,
          provider: 'shenma',
          apiVersion: this.getApiVersion(request.generationType),
          failureReason: handledError.message
        }
      };
    }
  }

  /**
   * Handle model type transitions transparently
   */
  async handleModelTransition(request: ModelTransitionRequest): Promise<ModelTransitionResponse> {
    try {
      // 1. Validate source and target models
      const sourceModelId = this.modelIdMapper.mapModelId(request.sourceModelId, request.sourceType);
      const targetModelId = this.modelIdMapper.mapModelId(request.targetModelId, request.targetType);

      if (!sourceModelId || !targetModelId) {
        throw new Error('Invalid source or target model ID');
      }

      // 2. Check availability of target model
      const targetAvailability = await this.availabilityService.checkModelAvailability({
        modelId: targetModelId,
        generationType: request.targetType,
        priority: 'high'
      });

      if (!targetAvailability.isAvailable) {
        throw new Error(`Target model '${targetModelId}' is not available`);
      }

      // 3. Transform parameters for target model type
      const transformedParameters = this.transformParametersForTransition(
        request.parameters,
        request.sourceType,
        request.targetType,
        sourceModelId,
        targetModelId
      );

      // 4. Execute request with target model
      const targetRequest: ModelRequest = {
        modelId: request.targetModelId,
        generationType: request.targetType,
        parameters: transformedParameters,
        options: request.options
      };

      const response = await this.executeModelRequest(targetRequest);

      return {
        success: response.success,
        sourceModelId: request.sourceModelId,
        targetModelId: request.targetModelId,
        sourceType: request.sourceType,
        targetType: request.targetType,
        response: response.response,
        transformedParameters,
        transitionMetadata: {
          parameterTransformations: this.getParameterTransformations(
            request.parameters,
            transformedParameters
          ),
          compatibilityScore: this.calculateCompatibilityScore(
            request.sourceType,
            request.targetType
          )
        },
        error: response.error
      };

    } catch (error) {
      const handledError = this.errorHandler.handleError(error, {
        modelId: request.targetModelId,
        generationType: request.targetType,
        operation: 'handleModelTransition'
      });

      return {
        success: false,
        sourceModelId: request.sourceModelId,
        targetModelId: request.targetModelId,
        sourceType: request.sourceType,
        targetType: request.targetType,
        error: handledError,
        transformedParameters: request.parameters,
        transitionMetadata: {
          parameterTransformations: [],
          compatibilityScore: 0
        }
      };
    }
  }

  /**
   * Get unified error handling interface
   */
  getErrorHandler(): ModelConfigurationErrorHandler {
    return this.errorHandler;
  }

  /**
   * Get model capabilities in unified format
   */
  async getModelCapabilities(modelId: string, generationType: GenerationType): Promise<{
    supported: boolean;
    capabilities: string[];
    limitations: string[];
    recommendedParameters: Record<string, any>;
  }> {
    try {
      const mappedModelId = this.modelIdMapper.mapModelId(modelId, generationType);
      if (!mappedModelId) {
        return {
          supported: false,
          capabilities: [],
          limitations: ['Model not found'],
          recommendedParameters: {}
        };
      }

      // Check availability
      const availability = await this.availabilityService.checkModelAvailability({
        modelId: mappedModelId,
        generationType,
        priority: 'low'
      });

      if (!availability.isAvailable) {
        return {
          supported: false,
          capabilities: [],
          limitations: ['Model not available'],
          recommendedParameters: {}
        };
      }

      // Get model-specific capabilities
      const capabilities = this.getModelSpecificCapabilities(mappedModelId, generationType);
      const limitations = this.getModelSpecificLimitations(mappedModelId, generationType);
      const recommendedParameters = this.getRecommendedParameters(mappedModelId, generationType);

      return {
        supported: true,
        capabilities,
        limitations,
        recommendedParameters
      };

    } catch (error) {
      return {
        supported: false,
        capabilities: [],
        limitations: [`Error checking capabilities: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendedParameters: {}
      };
    }
  }

  /**
   * Execute API call based on generation type
   */
  private async executeApiCall(
    modelId: string,
    generationType: GenerationType,
    parameters: Record<string, any>,
    options?: Record<string, any>
  ): Promise<any> {
    const baseUrl = process.env.SHENMA_BASE_URL || 'https://api.shenma.com';
    const apiKey = process.env.SHENMA_API_KEY;

    if (!apiKey) {
      throw new Error('SHENMA_API_KEY environment variable is required');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    };

    let endpoint: string;
    let requestBody: any;

    // Determine endpoint and request format based on generation type
    switch (generationType) {
      case 'text':
        endpoint = '/v1/chat/completions';
        requestBody = {
          model: modelId,
          ...parameters
        };
        break;

      case 'image':
        endpoint = '/v1/chat/completions';
        requestBody = {
          model: modelId,
          ...parameters
        };
        break;

      case 'video':
        // Use v2 endpoint for video models that support it
        if (modelId.includes('veo') || (modelId.includes('sora') && !parameters.messages)) {
          endpoint = '/v2/videos/generations';
          requestBody = {
            model: modelId,
            ...parameters
          };
        } else {
          // Use chat completions for Sora portrait models
          endpoint = '/v1/chat/completions';
          requestBody = {
            model: modelId,
            ...parameters
          };
        }
        break;

      default:
        throw new Error(`Unsupported generation type: ${generationType}`);
    }

    // Make API call
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: options?.timeout ? AbortSignal.timeout(options.timeout) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Normalize response format across different model types
   */
  private normalizeResponse(
    apiResponse: any,
    generationType: GenerationType,
    modelId: string
  ): any {
    // Handle different response formats
    if (generationType === 'video' && apiResponse.task_id) {
      // V2 API response format
      return {
        type: 'async',
        taskId: apiResponse.task_id,
        status: 'submitted',
        model: modelId,
        generationType
      };
    }

    if (apiResponse.choices && Array.isArray(apiResponse.choices)) {
      // Chat completions format
      return {
        type: 'sync',
        id: apiResponse.id,
        model: modelId,
        generationType,
        choices: apiResponse.choices,
        usage: apiResponse.usage,
        created: apiResponse.created
      };
    }

    // Return as-is for other formats
    return {
      type: 'unknown',
      model: modelId,
      generationType,
      raw: apiResponse
    };
  }

  /**
   * Transform parameters for model type transitions
   */
  private transformParametersForTransition(
    parameters: Record<string, any>,
    sourceType: GenerationType,
    targetType: GenerationType,
    sourceModelId: string,
    targetModelId: string
  ): Record<string, any> {
    const transformed = { ...parameters };

    // Handle text to image transition
    if (sourceType === 'text' && targetType === 'image') {
      if (parameters.messages) {
        // Keep messages format for image generation
        return transformed;
      }
    }

    // Handle image to video transition
    if (sourceType === 'image' && targetType === 'video') {
      if (parameters.messages) {
        const userMessage = parameters.messages.find((msg: any) => msg.role === 'user');
        if (userMessage && Array.isArray(userMessage.content)) {
          // Extract image URLs for video generation
          const imageUrls = userMessage.content
            .filter((item: any) => item.type === 'image_url')
            .map((item: any) => item.image_url.url);
          
          if (imageUrls.length > 0) {
            transformed.images = imageUrls;
          }
        }
      }
    }

    // Add default parameters for target model type
    if (targetType === 'video') {
      if (!transformed.aspect_ratio) {
        transformed.aspect_ratio = '16:9';
      }
      if (!transformed.duration) {
        transformed.duration = '10';
      }
    }

    return transformed;
  }

  /**
   * Get parameter transformations for transition metadata
   */
  private getParameterTransformations(
    original: Record<string, any>,
    transformed: Record<string, any>
  ): Array<{ parameter: string; from: any; to: any; reason: string }> {
    const transformations: Array<{ parameter: string; from: any; to: any; reason: string }> = [];

    Object.keys(transformed).forEach(key => {
      if (!(key in original)) {
        transformations.push({
          parameter: key,
          from: undefined,
          to: transformed[key],
          reason: 'Added default parameter for target model type'
        });
      } else if (original[key] !== transformed[key]) {
        transformations.push({
          parameter: key,
          from: original[key],
          to: transformed[key],
          reason: 'Transformed for compatibility with target model'
        });
      }
    });

    return transformations;
  }

  /**
   * Calculate compatibility score between model types
   */
  private calculateCompatibilityScore(
    sourceType: GenerationType,
    targetType: GenerationType
  ): number {
    if (sourceType === targetType) return 1.0;

    const compatibilityMatrix = {
      'text-image': 0.8,
      'text-video': 0.6,
      'image-video': 0.9,
      'image-text': 0.7,
      'video-text': 0.5,
      'video-image': 0.3
    };

    const key = `${sourceType}-${targetType}` as keyof typeof compatibilityMatrix;
    return compatibilityMatrix[key] || 0.1;
  }

  /**
   * Get model-specific capabilities
   */
  private getModelSpecificCapabilities(modelId: string, generationType: GenerationType): string[] {
    const capabilities: string[] = [];

    if (generationType === 'text') {
      capabilities.push('Text generation', 'Conversation');
      
      if (modelId.includes('gemini')) {
        capabilities.push('Thinking mode', 'Multimodal input', 'Large context');
      }
      
      if (modelId.includes('gpt-4')) {
        capabilities.push('Code generation', 'Analysis', 'Reasoning');
      }
    }

    if (generationType === 'image') {
      capabilities.push('Image generation', 'Text-to-image');
      
      if (modelId.includes('flux')) {
        capabilities.push('High quality', 'Artistic style');
      }
      
      if (modelId.includes('dall-e')) {
        capabilities.push('Photorealistic', 'Creative concepts');
      }
    }

    if (generationType === 'video') {
      capabilities.push('Video generation', 'Animation');
      
      if (modelId.includes('sora')) {
        capabilities.push('High quality', 'Long duration', 'Complex scenes');
        
        if (modelId.includes('portrait')) {
          capabilities.push('Portrait orientation', 'Vertical video');
        }
        
        if (modelId.includes('pro')) {
          capabilities.push('HD quality', 'Extended duration');
        }
      }
      
      if (modelId.includes('veo')) {
        capabilities.push('Fast generation', 'Multiple aspect ratios');
      }
    }

    return capabilities;
  }

  /**
   * Get model-specific limitations
   */
  private getModelSpecificLimitations(modelId: string, generationType: GenerationType): string[] {
    const limitations: string[] = [];

    if (generationType === 'video') {
      limitations.push('Content policy restrictions', 'Generation time varies');
      
      if (modelId.includes('sora')) {
        limitations.push('No real people in reference images', 'Content审查 in multiple stages');
        
        if (!modelId.includes('pro')) {
          limitations.push('No HD generation', 'Limited to 10s duration');
        }
      }
    }

    if (generationType === 'image') {
      limitations.push('Content policy restrictions');
    }

    return limitations;
  }

  /**
   * Get recommended parameters for model
   */
  private getRecommendedParameters(modelId: string, generationType: GenerationType): Record<string, any> {
    const recommended: Record<string, any> = {};

    if (generationType === 'text') {
      recommended.temperature = 0.7;
      recommended.max_tokens = 1000;
      
      if (modelId.includes('gemini')) {
        recommended.generationConfig = {
          thinkingConfig: {
            thinkingBudget: 128,
            includeThoughts: false
          }
        };
      }
    }

    if (generationType === 'video') {
      recommended.aspect_ratio = '16:9';
      recommended.duration = '10';
      recommended.watermark = false;
      
      if (modelId.includes('portrait')) {
        recommended.aspect_ratio = '9:16';
      }
    }

    return recommended;
  }

  /**
   * Get API version for generation type
   */
  private getApiVersion(generationType: GenerationType): string {
    switch (generationType) {
      case 'text':
      case 'image':
        return 'v1';
      case 'video':
        return 'v1/v2'; // Supports both
      default:
        return 'v1';
    }
  }
}

/**
 * Global unified model interface instance
 */
export const unifiedModelInterface = new UnifiedModelInterface();