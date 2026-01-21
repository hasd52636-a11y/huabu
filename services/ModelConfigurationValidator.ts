/**
 * Model Configuration Validator
 * 
 * Validates model configurations against Shenma API requirements
 */

import {
  ModelConfigurationValidator as IModelConfigurationValidator,
  ValidationRequest,
  ValidationResult,
  ValidationError,
  ModelValidationReport,
  GenerationType
} from '../types/ModelConfigurationTypes';
import { ModelIdMapper } from './ModelIdMapper';
import { ParameterFormatter } from './ParameterFormatter';

/**
 * Configuration validation system
 */
export class ModelConfigurationValidator implements IModelConfigurationValidator {
  private modelIdMapper: ModelIdMapper;
  private parameterFormatter: ParameterFormatter;

  constructor() {
    this.modelIdMapper = new ModelIdMapper();
    this.parameterFormatter = new ParameterFormatter();
  }

  /**
   * Validate single model configuration
   */
  async validateModelConfiguration(request: ValidationRequest): Promise<ValidationResult> {
    const { modelId, generationType, parameters } = request;
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      // 1. Validate model ID mapping
      const modelIdValidation = this.validateModelId(modelId, generationType);
      if (!modelIdValidation.isValid) {
        errors.push({
          type: 'model_id_invalid',
          message: `Invalid model ID: ${modelId}`,
          field: 'modelId',
          details: modelIdValidation.error
        });
      }

      // 2. Validate parameter format
      if (parameters) {
        const parameterValidation = this.validateParameters(modelId, generationType, parameters);
        if (!parameterValidation.isValid) {
          errors.push({
            type: 'parameter_format_invalid',
            message: 'Invalid parameter format',
            field: 'parameters',
            details: parameterValidation.errors
          });
        }
        warnings.push(...parameterValidation.warnings);
      }

      // 3. Validate API endpoint compatibility
      const endpointValidation = this.validateEndpointCompatibility(modelId, generationType);
      if (!endpointValidation.isValid) {
        errors.push({
          type: 'endpoint_incompatible',
          message: 'Model not compatible with API endpoint',
          field: 'endpoint',
          details: endpointValidation.error
        });
      }

      // 4. Generate remediation steps
      const remediationSteps = this.generateRemediationSteps(errors, modelId, generationType);

      return {
        isValid: errors.length === 0,
        modelId,
        generationType,
        errors,
        warnings,
        remediationSteps,
        validatedAt: Date.now()
      };

    } catch (error) {
      return {
        isValid: false,
        modelId,
        generationType,
        errors: [{
          type: 'validation_error',
          message: 'Validation process failed',
          field: 'system',
          details: error instanceof Error ? error.message : 'Unknown error'
        }],
        warnings: [],
        remediationSteps: ['Check system configuration and try again'],
        validatedAt: Date.now()
      };
    }
  }

  /**
   * Validate multiple model configurations
   */
  async validateBatchConfigurations(requests: ValidationRequest[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const request of requests) {
      const result = await this.validateModelConfiguration(request);
      results.push(result);
    }

    return results;
  }

  /**
   * Generate validation report
   */
  generateValidationReport(results: ValidationResult[]): ModelValidationReport {
    const totalModels = results.length;
    const validModels = results.filter(r => r.isValid).length;
    const invalidModels = totalModels - validModels;

    // Group errors by type
    const errorsByType: Record<string, number> = {};
    const commonIssues: string[] = [];

    results.forEach(result => {
      result.errors.forEach(error => {
        errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      });
    });

    // Identify common issues
    Object.entries(errorsByType).forEach(([type, count]) => {
      if (count > 1) {
        commonIssues.push(`${type}: ${count} models affected`);
      }
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(results);

    return {
      summary: {
        totalModels,
        validModels,
        invalidModels,
        validationRate: totalModels > 0 ? (validModels / totalModels) * 100 : 0
      },
      errorsByType,
      commonIssues,
      recommendations,
      detailedResults: results,
      generatedAt: Date.now()
    };
  }

  /**
   * Validate model ID
   */
  private validateModelId(modelId: string, generationType: GenerationType): {
    isValid: boolean;
    error?: string;
  } {
    try {
      // Check if model ID exists in our mapping
      const mappedId = this.modelIdMapper.mapModelId(modelId, generationType);
      
      if (!mappedId) {
        return {
          isValid: false,
          error: `Model ID '${modelId}' not found in ${generationType} model mappings`
        };
      }

      // Validate model ID format based on generation type
      if (generationType === 'text') {
        // Text models should follow known patterns
        const validTextPatterns = [
          /^gemini-/,
          /^gpt-/,
          /^claude-/,
          /^qwen/,
          /^deepseek/
        ];
        
        const isValidPattern = validTextPatterns.some(pattern => pattern.test(modelId));
        if (!isValidPattern) {
          return {
            isValid: false,
            error: `Text model ID '${modelId}' doesn't match expected patterns`
          };
        }
      } else if (generationType === 'image') {
        // Image models should follow known patterns
        const validImagePatterns = [
          /^nano-banana/,
          /^flux/,
          /^dall-e/,
          /^recraftv3/,
          /^byteedit/
        ];
        
        const isValidPattern = validImagePatterns.some(pattern => pattern.test(modelId));
        if (!isValidPattern) {
          return {
            isValid: false,
            error: `Image model ID '${modelId}' doesn't match expected patterns`
          };
        }
      } else if (generationType === 'video') {
        // Video models should follow known patterns
        const validVideoPatterns = [
          /^sora/,
          /^veo/,
          /^wan/
        ];
        
        const isValidPattern = validVideoPatterns.some(pattern => pattern.test(modelId));
        if (!isValidPattern) {
          return {
            isValid: false,
            error: `Video model ID '${modelId}' doesn't match expected patterns`
          };
        }
      }

      return { isValid: true };

    } catch (error) {
      return {
        isValid: false,
        error: `Model ID validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate parameters
   */
  private validateParameters(
    modelId: string, 
    generationType: GenerationType, 
    parameters: Record<string, any>
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Format parameters using our formatter
      const formattedParams = this.parameterFormatter.formatParameters(modelId, generationType, parameters);
      
      // Validate based on generation type
      if (generationType === 'text') {
        this.validateTextParameters(modelId, formattedParams, errors, warnings);
      } else if (generationType === 'image') {
        this.validateImageParameters(modelId, formattedParams, errors, warnings);
      } else if (generationType === 'video') {
        this.validateVideoParameters(modelId, formattedParams, errors, warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Parameter validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  /**
   * Validate text model parameters
   */
  private validateTextParameters(
    modelId: string,
    parameters: Record<string, any>,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for Gemini-specific parameters
    if (modelId.startsWith('gemini-')) {
      if (parameters.generationConfig) {
        // Validate Gemini generation config
        const config = parameters.generationConfig;
        
        if (config.thinkingConfig) {
          if (typeof config.thinkingConfig.thinkingBudget !== 'number') {
            errors.push('Gemini thinkingBudget must be a number');
          }
          if (typeof config.thinkingConfig.includeThoughts !== 'boolean') {
            errors.push('Gemini includeThoughts must be a boolean');
          }
        }
      }
    }

    // Common parameter validation
    if (parameters.temperature !== undefined) {
      if (typeof parameters.temperature !== 'number' || parameters.temperature < 0 || parameters.temperature > 2) {
        errors.push('Temperature must be a number between 0 and 2');
      }
    }

    if (parameters.max_tokens !== undefined) {
      if (typeof parameters.max_tokens !== 'number' || parameters.max_tokens < 1) {
        errors.push('max_tokens must be a positive number');
      }
    }

    if (parameters.top_p !== undefined) {
      if (typeof parameters.top_p !== 'number' || parameters.top_p < 0 || parameters.top_p > 1) {
        errors.push('top_p must be a number between 0 and 1');
      }
    }
  }

  /**
   * Validate image model parameters
   */
  private validateImageParameters(
    modelId: string,
    parameters: Record<string, any>,
    errors: string[],
    warnings: string[]
  ): void {
    // Check required message format for image generation
    if (!parameters.messages || !Array.isArray(parameters.messages)) {
      errors.push('Image generation requires messages array');
      return;
    }

    const userMessage = parameters.messages.find((msg: any) => msg.role === 'user');
    if (!userMessage) {
      errors.push('Image generation requires user message');
      return;
    }

    // Validate content format
    if (typeof userMessage.content === 'string') {
      // Text-to-image is valid
    } else if (Array.isArray(userMessage.content)) {
      // Check for image_url content for image editing
      const hasImageUrl = userMessage.content.some((item: any) => item.type === 'image_url');
      const hasText = userMessage.content.some((item: any) => item.type === 'text');
      
      if (hasImageUrl && !hasText) {
        warnings.push('Image editing without text prompt may produce unexpected results');
      }
    } else {
      errors.push('Invalid message content format for image generation');
    }

    // Validate model-specific parameters
    if (modelId.includes('flux')) {
      // Flux models may have specific requirements
      warnings.push('Flux models may have specific parameter requirements');
    }
  }

  /**
   * Validate video model parameters
   */
  private validateVideoParameters(
    modelId: string,
    parameters: Record<string, any>,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for Sora video parameters
    if (modelId.includes('sora')) {
      if (parameters.aspect_ratio) {
        const validRatios = ['16:9', '9:16'];
        if (!validRatios.includes(parameters.aspect_ratio)) {
          errors.push(`Invalid aspect_ratio for Sora. Must be one of: ${validRatios.join(', ')}`);
        }
      }

      if (parameters.duration) {
        const validDurations = ['10', '15', '25'];
        if (!validDurations.includes(parameters.duration)) {
          errors.push(`Invalid duration for Sora. Must be one of: ${validDurations.join(', ')}`);
        }
        
        // Check if duration is compatible with model
        if (parameters.duration === '25' && !modelId.includes('pro')) {
          errors.push('25s duration is only supported by sora-2-pro model');
        }
      }

      if (parameters.hd && !modelId.includes('pro')) {
        errors.push('HD generation is only supported by sora-2-pro model');
      }

      // Portrait-specific validation
      if (modelId.includes('portrait')) {
        if (parameters.aspect_ratio && parameters.aspect_ratio !== '9:16') {
          warnings.push('Portrait models work best with 9:16 aspect ratio');
        }
      }
    }

    // Check for Veo video parameters
    if (modelId.includes('veo')) {
      if (parameters.enhance_prompt !== undefined && typeof parameters.enhance_prompt !== 'boolean') {
        errors.push('enhance_prompt must be a boolean for Veo models');
      }

      if (parameters.enable_upsample !== undefined && typeof parameters.enable_upsample !== 'boolean') {
        errors.push('enable_upsample must be a boolean for Veo models');
      }
    }

    // Validate message format for video generation
    if (parameters.messages) {
      const userMessage = parameters.messages.find((msg: any) => msg.role === 'user');
      if (userMessage && Array.isArray(userMessage.content)) {
        const hasImageUrl = userMessage.content.some((item: any) => item.type === 'image_url');
        if (hasImageUrl) {
          // Image-to-video validation
          warnings.push('Image-to-video generation may take longer to process');
        }
      }
    }
  }

  /**
   * Validate endpoint compatibility
   */
  private validateEndpointCompatibility(modelId: string, generationType: GenerationType): {
    isValid: boolean;
    error?: string;
  } {
    // Check if model is compatible with Shenma API endpoints
    const endpointMap = {
      text: '/v1/chat/completions',
      image: '/v1/chat/completions',
      video: ['/v1/chat/completions', '/v2/videos/generations']
    };

    const supportedEndpoints = endpointMap[generationType];
    
    if (!supportedEndpoints) {
      return {
        isValid: false,
        error: `No supported endpoints for generation type: ${generationType}`
      };
    }

    // Special cases for specific models
    if (generationType === 'video') {
      if (modelId.includes('sora') && modelId.includes('portrait')) {
        // Portrait models should use chat completions endpoint
        return { isValid: true };
      }
      
      if (modelId.includes('veo')) {
        // Veo models should use v2 endpoint
        return { isValid: true };
      }
    }

    return { isValid: true };
  }

  /**
   * Generate remediation steps
   */
  private generateRemediationSteps(
    errors: ValidationError[],
    modelId: string,
    generationType: GenerationType
  ): string[] {
    const steps: string[] = [];

    errors.forEach(error => {
      switch (error.type) {
        case 'model_id_invalid':
          steps.push(`Update model ID mapping for '${modelId}' in ${generationType} configuration`);
          steps.push('Verify model ID exists in Shenma API documentation');
          break;

        case 'parameter_format_invalid':
          steps.push(`Fix parameter format for model '${modelId}'`);
          steps.push('Check parameter requirements in API documentation');
          break;

        case 'endpoint_incompatible':
          steps.push(`Update endpoint configuration for model '${modelId}'`);
          steps.push('Verify model supports the configured API endpoint');
          break;

        default:
          steps.push(`Review configuration for model '${modelId}'`);
          break;
      }
    });

    // Add general remediation steps
    if (steps.length === 0) {
      steps.push('Configuration appears valid - no remediation needed');
    } else {
      steps.push('Test model configuration with a simple API call');
      steps.push('Update model configuration documentation');
    }

    return [...new Set(steps)]; // Remove duplicates
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    const errorCounts: Record<string, number> = {};

    // Count error types
    results.forEach(result => {
      result.errors.forEach(error => {
        errorCounts[error.type] = (errorCounts[error.type] || 0) + 1;
      });
    });

    // Generate recommendations based on common issues
    Object.entries(errorCounts).forEach(([errorType, count]) => {
      if (count > 1) {
        switch (errorType) {
          case 'model_id_invalid':
            recommendations.push(`Review and update model ID mappings (${count} models affected)`);
            break;
          case 'parameter_format_invalid':
            recommendations.push(`Standardize parameter formats across models (${count} models affected)`);
            break;
          case 'endpoint_incompatible':
            recommendations.push(`Update endpoint configurations (${count} models affected)`);
            break;
        }
      }
    });

    // General recommendations
    const validationRate = results.length > 0 ? 
      (results.filter(r => r.isValid).length / results.length) * 100 : 0;

    if (validationRate < 50) {
      recommendations.push('Consider comprehensive review of model configuration system');
    } else if (validationRate < 80) {
      recommendations.push('Focus on fixing the most common configuration issues');
    } else {
      recommendations.push('Configuration system is mostly healthy - address remaining edge cases');
    }

    return recommendations;
  }
}

/**
 * Global model configuration validator instance
 */
export const modelConfigurationValidator = new ModelConfigurationValidator();