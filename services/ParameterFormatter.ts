/**
 * Parameter Formatter Service
 * 
 * Formats parameters for different model types according to Shenma API requirements
 */

import {
  ParameterFormatter as IParameterFormatter,
  ParameterFormatConfig,
  ParameterValidator,
  ParameterTransformer,
  ParameterValidationResult,
  FormattedParameters,
  GenerationType
} from '../types/ModelConfigurationTypes';

/**
 * Parameter Formatter implementation for Shenma API
 */
export class ParameterFormatter implements IParameterFormatter {
  private configs: Map<string, ParameterFormatConfig> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Format parameters for specific model
   */
  async formatParameters(
    modelId: string, 
    generationType: GenerationType, 
    parameters: Record<string, any>
  ): Promise<FormattedParameters> {
    const config = this.getParameterConfig(modelId, generationType);
    if (!config) {
      throw new Error(`No parameter configuration found for model ${modelId} (${generationType})`);
    }

    const transformationsApplied: string[] = [];
    const formattedParams: Record<string, any> = {};

    // Apply transformations
    for (const [key, value] of Object.entries(parameters)) {
      const transformer = config.transformers[key];
      if (transformer) {
        formattedParams[key] = transformer(value);
        transformationsApplied.push(`${key}: transformed`);
      } else {
        formattedParams[key] = value;
      }
    }

    // Add required fields with defaults if missing
    for (const requiredField of config.requiredFields) {
      if (!(requiredField in formattedParams)) {
        const defaultValue = this.getDefaultValue(requiredField, modelId, generationType);
        if (defaultValue !== undefined) {
          formattedParams[requiredField] = defaultValue;
          transformationsApplied.push(`${requiredField}: added default`);
        }
      }
    }

    return {
      parameters: formattedParams,
      metadata: {
        modelId,
        generationType,
        formattedAt: Date.now(),
        transformationsApplied
      }
    };
  }

  /**
   * Validate parameters
   */
  validateParameters(
    modelId: string, 
    generationType: GenerationType, 
    parameters: Record<string, any>
  ): ParameterValidationResult {
    const config = this.getParameterConfig(modelId, generationType);
    if (!config) {
      return {
        isValid: false,
        errors: [`No parameter configuration found for model ${modelId} (${generationType})`],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let transformedValue: Record<string, any> = { ...parameters };

    // Check required fields
    for (const requiredField of config.requiredFields) {
      if (!(requiredField in parameters)) {
        const defaultValue = this.getDefaultValue(requiredField, modelId, generationType);
        if (defaultValue !== undefined) {
          transformedValue[requiredField] = defaultValue;
          warnings.push(`Missing required field '${requiredField}', using default value`);
        } else {
          errors.push(`Missing required field: ${requiredField}`);
        }
      }
    }

    // Validate field values
    for (const [key, value] of Object.entries(parameters)) {
      const validator = config.fieldValidators[key];
      if (validator) {
        const validationResult = validator(value);
        if (!validationResult.isValid) {
          errors.push(...validationResult.errors);
        }
        warnings.push(...validationResult.warnings);
        
        if (validationResult.transformedValue !== undefined) {
          transformedValue[key] = validationResult.transformedValue;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      transformedValue: errors.length === 0 ? transformedValue : undefined
    };
  }

  /**
   * Get parameter configuration
   */
  getParameterConfig(modelId: string, generationType: GenerationType): ParameterFormatConfig | null {
    const key = this.getConfigKey(modelId, generationType);
    return this.configs.get(key) || this.configs.get(`${generationType}:default`) || null;
  }

  /**
   * Register parameter configuration
   */
  registerParameterConfig(config: ParameterFormatConfig): void {
    const key = this.getConfigKey(config.modelId, config.generationType);
    this.configs.set(key, config);
  }

  /**
   * Initialize default configurations based on API documentation
   */
  private initializeDefaultConfigs(): void {
    // Gemini text models configuration
    this.registerParameterConfig({
      generationType: 'text',
      modelId: 'gemini-default',
      requiredFields: ['contents'],
      optionalFields: ['generationConfig', 'thinkingConfig', 'temperature', 'top_p', 'max_tokens'],
      fieldValidators: {
        contents: this.createContentsValidator(),
        temperature: this.createRangeValidator(0, 2),
        top_p: this.createRangeValidator(0, 1),
        max_tokens: this.createPositiveIntegerValidator()
      },
      transformers: {
        messages: this.createMessagesToContentsTransformer(),
        thinkingBudget: this.createThinkingConfigTransformer()
      }
    });

    // Image models configuration
    this.registerParameterConfig({
      generationType: 'image',
      modelId: 'image-default',
      requiredFields: ['prompt'],
      optionalFields: ['size', 'aspect_ratio', 'quality', 'style', 'n'],
      fieldValidators: {
        prompt: this.createStringValidator(1, 4000),
        size: this.createImageSizeValidator(),
        aspect_ratio: this.createAspectRatioValidator(),
        n: this.createRangeValidator(1, 4, true)
      },
      transformers: {
        dimensions: this.createDimensionsToSizeTransformer(),
        count: this.createCountToNTransformer()
      }
    });

    // Video models configuration  
    this.registerParameterConfig({
      generationType: 'video',
      modelId: 'video-default',
      requiredFields: ['prompt'],
      optionalFields: ['aspect_ratio', 'duration', 'hd', 'images', 'model'],
      fieldValidators: {
        prompt: this.createStringValidator(1, 2000),
        aspect_ratio: this.createVideoAspectRatioValidator(),
        duration: this.createVideoDurationValidator(),
        hd: this.createBooleanValidator(),
        images: this.createImageArrayValidator()
      },
      transformers: {
        reference_images: this.createReferenceImagesToImagesTransformer(),
        high_quality: this.createHighQualityToHdTransformer()
      }
    });

    // Specific model configurations
    this.initializeSpecificModelConfigs();
  }

  /**
   * Initialize configurations for specific models
   */
  private initializeSpecificModelConfigs(): void {
    // Gemini 2.0 Flash Exp specific config
    this.registerParameterConfig({
      generationType: 'text',
      modelId: 'gemini-2.0-flash-exp',
      requiredFields: ['contents'],
      optionalFields: ['generationConfig', 'thinkingConfig', 'temperature', 'top_p', 'max_tokens'],
      fieldValidators: {
        contents: this.createContentsValidator(),
        thinkingConfig: this.createThinkingConfigValidator()
      },
      transformers: {
        messages: this.createMessagesToContentsTransformer()
      }
    });

    // Nano Banana HD specific config
    this.registerParameterConfig({
      generationType: 'image',
      modelId: 'nano-banana-hd',
      requiredFields: ['prompt'],
      optionalFields: ['size', 'aspect_ratio', 'quality'],
      fieldValidators: {
        prompt: this.createStringValidator(1, 4000),
        size: this.createImageSizeValidator(),
        quality: this.createQualityValidator()
      },
      transformers: {}
    });

    // Flux Dev specific config
    this.registerParameterConfig({
      generationType: 'image',
      modelId: 'flux-dev',
      requiredFields: ['prompt'],
      optionalFields: ['size', 'aspect_ratio', 'guidance_scale', 'num_inference_steps'],
      fieldValidators: {
        prompt: this.createStringValidator(1, 4000),
        size: this.createFluxSizeValidator(),
        guidance_scale: this.createRangeValidator(1, 20),
        num_inference_steps: this.createRangeValidator(1, 100, true)
      },
      transformers: {}
    });

    // Sora Video2 Portrait specific config
    this.registerParameterConfig({
      generationType: 'video',
      modelId: 'sora_video2-portrait',
      requiredFields: ['prompt'],
      optionalFields: ['images', 'duration', 'hd'],
      fieldValidators: {
        prompt: this.createStringValidator(1, 2000),
        images: this.createImageArrayValidator(),
        duration: this.createSoraDurationValidator()
      },
      transformers: {
        aspect_ratio: () => '9:16' // Force portrait
      }
    });
  }

  /**
   * Validator creators
   */
  private createContentsValidator(): ParameterValidator {
    return (value: any): ParameterValidationResult => {
      if (!Array.isArray(value)) {
        return {
          isValid: false,
          errors: ['contents must be an array'],
          warnings: []
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      value.forEach((content, index) => {
        if (!content.parts || !Array.isArray(content.parts)) {
          errors.push(`contents[${index}] must have a parts array`);
        }
      });

      return { isValid: errors.length === 0, errors, warnings };
    };
  }

  private createRangeValidator(min: number, max: number, integer = false): ParameterValidator {
    return (value: any): ParameterValidationResult => {
      const num = Number(value);
      if (isNaN(num)) {
        return {
          isValid: false,
          errors: [`Value must be a number`],
          warnings: []
        };
      }

      if (integer && !Number.isInteger(num)) {
        return {
          isValid: false,
          errors: [`Value must be an integer`],
          warnings: []
        };
      }

      if (num < min || num > max) {
        return {
          isValid: false,
          errors: [`Value must be between ${min} and ${max}`],
          warnings: []
        };
      }

      return { isValid: true, errors: [], warnings: [] };
    };
  }

  private createStringValidator(minLength: number, maxLength: number): ParameterValidator {
    return (value: any): ParameterValidationResult => {
      if (typeof value !== 'string') {
        return {
          isValid: false,
          errors: ['Value must be a string'],
          warnings: []
        };
      }

      if (value.length < minLength || value.length > maxLength) {
        return {
          isValid: false,
          errors: [`String length must be between ${minLength} and ${maxLength}`],
          warnings: []
        };
      }

      return { isValid: true, errors: [], warnings: [] };
    };
  }

  private createImageSizeValidator(): ParameterValidator {
    return (value: any): ParameterValidationResult => {
      const validSizes = [
        '256x256', '512x512', '1024x1024', '1792x1024', '1024x1792',
        '512x1024', '1024x512', '768x768', '1536x1536'
      ];

      if (typeof value !== 'string' || !validSizes.includes(value)) {
        return {
          isValid: false,
          errors: [`Invalid size. Must be one of: ${validSizes.join(', ')}`],
          warnings: []
        };
      }

      return { isValid: true, errors: [], warnings: [] };
    };
  }

  private createAspectRatioValidator(): ParameterValidator {
    return (value: any): ParameterValidationResult => {
      const validRatios = ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21'];
      
      if (typeof value !== 'string' || !validRatios.includes(value)) {
        return {
          isValid: false,
          errors: [`Invalid aspect ratio. Must be one of: ${validRatios.join(', ')}`],
          warnings: []
        };
      }

      return { isValid: true, errors: [], warnings: [] };
    };
  }

  private createVideoAspectRatioValidator(): ParameterValidator {
    return (value: any): ParameterValidationResult => {
      const validRatios = ['16:9', '9:16'];
      
      if (typeof value !== 'string' || !validRatios.includes(value)) {
        return {
          isValid: false,
          errors: [`Invalid video aspect ratio. Must be one of: ${validRatios.join(', ')}`],
          warnings: []
        };
      }

      return { isValid: true, errors: [], warnings: [] };
    };
  }

  private createVideoDurationValidator(): ParameterValidator {
    return (value: any): ParameterValidationResult => {
      const validDurations = ['10', '15', '25'];
      const strValue = String(value);
      
      if (!validDurations.includes(strValue)) {
        return {
          isValid: false,
          errors: [`Invalid duration. Must be one of: ${validDurations.join(', ')} seconds`],
          warnings: []
        };
      }

      return { isValid: true, errors: [], warnings: [] };
    };
  }

  private createSoraDurationValidator(): ParameterValidator {
    return (value: any): ParameterValidationResult => {
      // Sora supports different durations based on model variant
      const validDurations = ['5', '10', '15'];
      const strValue = String(value);
      
      if (!validDurations.includes(strValue)) {
        return {
          isValid: true, // Allow but warn
          errors: [],
          warnings: [`Duration ${strValue} may not be supported by all Sora variants`]
        };
      }

      return { isValid: true, errors: [], warnings: [] };
    };
  }

  private createBooleanValidator(): ParameterValidator {
    return (value: any): ParameterValidationResult => {
      if (typeof value !== 'boolean') {
        return {
          isValid: false,
          errors: ['Value must be a boolean'],
          warnings: []
        };
      }

      return { isValid: true, errors: [], warnings: [] };
    };
  }

  private createImageArrayValidator(): ParameterValidator {
    return (value: any): ParameterValidationResult => {
      if (!Array.isArray(value)) {
        return {
          isValid: false,
          errors: ['Images must be an array'],
          warnings: []
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      value.forEach((img, index) => {
        if (typeof img !== 'string') {
          errors.push(`Image at index ${index} must be a string (URL or base64)`);
        } else if (!img.startsWith('http') && !img.startsWith('data:')) {
          warnings.push(`Image at index ${index} should be a valid URL or base64 data`);
        }
      });

      return { isValid: errors.length === 0, errors, warnings };
    };
  }

  private createPositiveIntegerValidator(): ParameterValidator {
    return (value: any): ParameterValidationResult => {
      const num = Number(value);
      if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
        return {
          isValid: false,
          errors: ['Value must be a positive integer'],
          warnings: []
        };
      }

      return { isValid: true, errors: [], warnings: [] };
    };
  }

  private createThinkingConfigValidator(): ParameterValidator {
    return (value: any): ParameterValidationResult => {
      if (typeof value !== 'object' || value === null) {
        return {
          isValid: false,
          errors: ['thinkingConfig must be an object'],
          warnings: []
        };
      }

      const errors: string[] = [];
      
      if ('thinkingBudget' in value && typeof value.thinkingBudget !== 'number') {
        errors.push('thinkingBudget must be a number');
      }

      if ('includeThoughts' in value && typeof value.includeThoughts !== 'boolean') {
        errors.push('includeThoughts must be a boolean');
      }

      return { isValid: errors.length === 0, errors, warnings: [] };
    };
  }

  private createQualityValidator(): ParameterValidator {
    return (value: any): ParameterValidationResult => {
      const validQualities = ['standard', 'hd', 'high', 'low'];
      
      if (typeof value !== 'string' || !validQualities.includes(value)) {
        return {
          isValid: false,
          errors: [`Invalid quality. Must be one of: ${validQualities.join(', ')}`],
          warnings: []
        };
      }

      return { isValid: true, errors: [], warnings: [] };
    };
  }

  private createFluxSizeValidator(): ParameterValidator {
    return (value: any): ParameterValidationResult => {
      // Flux supports more flexible sizing
      const validSizes = [
        '512x512', '768x768', '1024x1024', '1152x896', '896x1152',
        '1216x832', '832x1216', '1344x768', '768x1344', '1536x640', '640x1536'
      ];

      if (typeof value !== 'string' || !validSizes.includes(value)) {
        return {
          isValid: false,
          errors: [`Invalid Flux size. Must be one of: ${validSizes.join(', ')}`],
          warnings: []
        };
      }

      return { isValid: true, errors: [], warnings: [] };
    };
  }

  /**
   * Transformer creators
   */
  private createMessagesToContentsTransformer(): ParameterTransformer {
    return (messages: any[]): any => {
      if (!Array.isArray(messages)) return messages;

      return messages.map(message => ({
        parts: [{ text: message.content }],
        role: message.role === 'assistant' ? 'model' : message.role
      }));
    };
  }

  private createThinkingConfigTransformer(): ParameterTransformer {
    return (thinkingBudget: number): any => ({
      thinkingBudget,
      includeThoughts: true
    });
  }

  private createDimensionsToSizeTransformer(): ParameterTransformer {
    return (dimensions: { width: number; height: number }): string => {
      return `${dimensions.width}x${dimensions.height}`;
    };
  }

  private createCountToNTransformer(): ParameterTransformer {
    return (count: number): number => Math.max(1, Math.min(4, count));
  }

  private createReferenceImagesToImagesTransformer(): ParameterTransformer {
    return (referenceImages: string[]): string[] => referenceImages;
  }

  private createHighQualityToHdTransformer(): ParameterTransformer {
    return (highQuality: boolean): boolean => highQuality;
  }

  /**
   * Get default value for a field
   */
  private getDefaultValue(field: string, modelId: string, generationType: GenerationType): any {
    const defaults: Record<string, any> = {
      // Text defaults
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 2048,
      
      // Image defaults
      size: '1024x1024',
      aspect_ratio: '1:1',
      quality: 'standard',
      n: 1,
      
      // Video defaults
      aspect_ratio: generationType === 'video' ? '16:9' : undefined,
      duration: '10',
      hd: false
    };

    // Model-specific defaults
    if (modelId.includes('portrait')) {
      defaults.aspect_ratio = '9:16';
    }

    return defaults[field];
  }

  /**
   * Generate config key
   */
  private getConfigKey(modelId: string, generationType: GenerationType): string {
    return `${generationType}:${modelId}`;
  }
}

/**
 * Global parameter formatter instance
 */
export const parameterFormatter = new ParameterFormatter();