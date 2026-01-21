/**
 * Model ID Mapper Service
 * 
 * Maps internal model IDs to correct API IDs for Shenma API integration
 */

import {
  ModelIdMapping,
  ModelIdMapper as IModelIdMapper,
  ModelMappingValidationResult,
  ModelMappingError,
  ModelMappingWarning,
  GenerationType,
  ModelConfigurationErrorType
} from '../types/ModelConfigurationTypes';

/**
 * Model ID Mapper implementation for Shenma API
 */
export class ModelIdMapper implements IModelIdMapper {
  private mappings: Map<string, ModelIdMapping> = new Map();

  constructor() {
    this.initializeDefaultMappings();
  }

  /**
   * Get API ID for internal model ID
   */
  getApiId(internalId: string, generationType: GenerationType): string | null {
    const key = this.getMappingKey(internalId, generationType);
    const mapping = this.mappings.get(key);
    return mapping?.isActive ? mapping.apiId : null;
  }

  /**
   * Get internal ID for API ID
   */
  getInternalId(apiId: string, generationType: GenerationType): string | null {
    for (const mapping of this.mappings.values()) {
      if (mapping.apiId === apiId && 
          mapping.generationType === generationType && 
          mapping.isActive) {
        return mapping.internalId;
      }
    }
    return null;
  }

  /**
   * Add or update mapping
   */
  setMapping(mapping: ModelIdMapping): void {
    const key = this.getMappingKey(mapping.internalId, mapping.generationType);
    this.mappings.set(key, {
      ...mapping,
      lastValidated: Date.now()
    });
  }

  /**
   * Remove mapping
   */
  removeMapping(internalId: string, generationType: GenerationType): void {
    const key = this.getMappingKey(internalId, generationType);
    this.mappings.delete(key);
  }

  /**
   * Get all mappings for a generation type
   */
  getMappings(generationType: GenerationType): ModelIdMapping[] {
    return Array.from(this.mappings.values())
      .filter(mapping => mapping.generationType === generationType);
  }

  /**
   * Validate all mappings
   */
  async validateMappings(): Promise<ModelMappingValidationResult> {
    const validMappings: ModelIdMapping[] = [];
    const invalidMappings: ModelIdMapping[] = [];
    const errors: ModelMappingError[] = [];
    const warnings: ModelMappingWarning[] = [];

    for (const mapping of this.mappings.values()) {
      try {
        // Basic validation - check if mapping has required fields
        if (!mapping.internalId || !mapping.apiId || !mapping.provider) {
          invalidMappings.push(mapping);
          errors.push({
            mappingId: mapping.internalId,
            errorType: ModelConfigurationErrorType.MODEL_ID_MAPPING_ERROR,
            message: `Invalid mapping: missing required fields for ${mapping.internalId}`,
            suggestedFix: 'Ensure internalId, apiId, and provider are all specified'
          });
          continue;
        }

        // Check for deprecated models
        if (this.isDeprecatedModel(mapping.internalId)) {
          warnings.push({
            mappingId: mapping.internalId,
            warningType: 'deprecated',
            message: `Model ${mapping.internalId} is deprecated`,
            recommendation: 'Consider migrating to a newer model version'
          });
        }

        validMappings.push(mapping);
      } catch (error) {
        invalidMappings.push(mapping);
        errors.push({
          mappingId: mapping.internalId,
          errorType: ModelConfigurationErrorType.CONFIGURATION_VALIDATION_ERROR,
          message: `Validation error for ${mapping.internalId}: ${error}`,
          suggestedFix: 'Check mapping configuration and API documentation'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      validMappings,
      invalidMappings,
      errors,
      warnings
    };
  }

  /**
   * Initialize default mappings based on Shenma API documentation
   */
  private initializeDefaultMappings(): void {
    const now = Date.now();

    // Text models (Gemini series)
    const textMappings: Omit<ModelIdMapping, 'lastValidated'>[] = [
      // Gemini models - based on API documentation
      {
        internalId: 'gemini-2.0-flash-exp',
        apiId: 'gemini-2.0-flash-exp', // Direct mapping as shown in API docs
        provider: 'shenma',
        generationType: 'text',
        isActive: true
      },
      {
        internalId: 'gemini-1.5-pro',
        apiId: 'gemini-1.5-pro', // Direct mapping as shown in API docs
        provider: 'shenma',
        generationType: 'text',
        isActive: true
      },
      // Additional Gemini models from documentation
      {
        internalId: 'gemini-2.5-pro',
        apiId: 'gemini-2.5-pro',
        provider: 'shenma',
        generationType: 'text',
        isActive: true
      },
      {
        internalId: 'gemini-2.5-pro-preview-05-06',
        apiId: 'gemini-2.5-pro-preview-05-06',
        provider: 'shenma',
        generationType: 'text',
        isActive: true
      },
      {
        internalId: 'gemini-3-pro-preview-thinking',
        apiId: 'gemini-3-pro-preview-thinking',
        provider: 'shenma',
        generationType: 'text',
        isActive: true
      },
      {
        internalId: 'gemini-3-flash-preview-nothinking',
        apiId: 'gemini-3-flash-preview-nothinking',
        provider: 'shenma',
        generationType: 'text',
        isActive: true
      },
      {
        internalId: 'gemini-3-flash-preview',
        apiId: 'gemini-3-flash-preview',
        provider: 'shenma',
        generationType: 'text',
        isActive: true
      }
    ];

    // Image models - based on API documentation
    const imageMappings: Omit<ModelIdMapping, 'lastValidated'>[] = [
      {
        internalId: 'nano-banana-hd',
        apiId: 'nano-banana-hd', // Direct mapping from API docs
        provider: 'shenma',
        generationType: 'image',
        isActive: true
      },
      {
        internalId: 'nano-banana',
        apiId: 'nano-banana',
        provider: 'shenma',
        generationType: 'image',
        isActive: true
      },
      {
        internalId: 'flux-dev',
        apiId: 'flux-dev', // Direct mapping from API docs
        provider: 'shenma',
        generationType: 'image',
        isActive: true
      },
      {
        internalId: 'flux-pro',
        apiId: 'flux-pro',
        provider: 'shenma',
        generationType: 'image',
        isActive: true
      },
      {
        internalId: 'dall-e-3',
        apiId: 'dall-e-3',
        provider: 'shenma',
        generationType: 'image',
        isActive: true
      },
      {
        internalId: 'dall-e-2',
        apiId: 'dall-e-2',
        provider: 'shenma',
        generationType: 'image',
        isActive: true
      },
      {
        internalId: 'recraftv3',
        apiId: 'recraftv3',
        provider: 'shenma',
        generationType: 'image',
        isActive: true
      },
      // Gemini image generation models
      {
        internalId: 'gemini-2.5-flash-image-preview',
        apiId: 'gemini-2.5-flash-image-preview',
        provider: 'shenma',
        generationType: 'image',
        isActive: true
      }
    ];

    // Video models - based on API documentation
    const videoMappings: Omit<ModelIdMapping, 'lastValidated'>[] = [
      // Sora models with specific variants
      {
        internalId: 'sora_video2-portrait',
        apiId: 'sora_video2-portrait', // Direct mapping from API docs
        provider: 'shenma',
        generationType: 'video',
        isActive: true
      },
      {
        internalId: 'sora_video2',
        apiId: 'sora_video2',
        provider: 'shenma',
        generationType: 'video',
        isActive: true
      },
      {
        internalId: 'sora_video2-landscape',
        apiId: 'sora_video2-landscape',
        provider: 'shenma',
        generationType: 'video',
        isActive: true
      },
      {
        internalId: 'sora_video2-portrait-hd',
        apiId: 'sora_video2-portrait-hd',
        provider: 'shenma',
        generationType: 'video',
        isActive: true
      },
      {
        internalId: 'sora_video2-portrait-15s',
        apiId: 'sora_video2-portrait-15s',
        provider: 'shenma',
        generationType: 'video',
        isActive: true
      },
      {
        internalId: 'sora_video2-portrait-hd-15s',
        apiId: 'sora_video2-portrait-hd-15s',
        provider: 'shenma',
        generationType: 'video',
        isActive: true
      },
      // Sora 2 models
      {
        internalId: 'sora-2',
        apiId: 'sora-2',
        provider: 'shenma',
        generationType: 'video',
        isActive: true
      },
      {
        internalId: 'sora-2-pro',
        apiId: 'sora-2-pro',
        provider: 'shenma',
        generationType: 'video',
        isActive: true
      },
      // Veo models
      {
        internalId: 'veo3',
        apiId: 'veo3',
        provider: 'shenma',
        generationType: 'video',
        isActive: true
      },
      {
        internalId: 'veo3-fast',
        apiId: 'veo3-fast',
        provider: 'shenma',
        generationType: 'video',
        isActive: true
      },
      {
        internalId: 'veo3-pro',
        apiId: 'veo3-pro',
        provider: 'shenma',
        generationType: 'video',
        isActive: true
      },
      {
        internalId: 'veo3-pro-frames',
        apiId: 'veo3-pro-frames',
        provider: 'shenma',
        generationType: 'video',
        isActive: true
      },
      {
        internalId: 'veo3.1',
        apiId: 'veo3.1',
        provider: 'shenma',
        generationType: 'video',
        isActive: true
      },
      {
        internalId: 'veo3.1-pro',
        apiId: 'veo3.1-pro',
        provider: 'shenma',
        generationType: 'video',
        isActive: true
      }
    ];

    // Add all mappings
    [...textMappings, ...imageMappings, ...videoMappings].forEach(mapping => {
      const key = this.getMappingKey(mapping.internalId, mapping.generationType);
      this.mappings.set(key, {
        ...mapping,
        lastValidated: now
      });
    });
  }

  /**
   * Generate mapping key
   */
  private getMappingKey(internalId: string, generationType: GenerationType): string {
    return `${generationType}:${internalId}`;
  }

  /**
   * Check if model is deprecated
   */
  private isDeprecatedModel(internalId: string): boolean {
    const deprecatedModels = [
      'gemini-1.0-pro', // Older Gemini versions
      'dall-e-1', // Older DALL-E versions
      'sora-1' // Older Sora versions
    ];
    return deprecatedModels.includes(internalId);
  }

  /**
   * Get all supported models for a generation type
   */
  getSupportedModels(generationType: GenerationType): string[] {
    return this.getMappings(generationType)
      .filter(mapping => mapping.isActive)
      .map(mapping => mapping.internalId);
  }

  /**
   * Check if model is supported
   */
  isModelSupported(internalId: string, generationType: GenerationType): boolean {
    const apiId = this.getApiId(internalId, generationType);
    return apiId !== null;
  }

  /**
   * Get mapping information for debugging
   */
  getMappingInfo(internalId: string, generationType: GenerationType): ModelIdMapping | null {
    const key = this.getMappingKey(internalId, generationType);
    return this.mappings.get(key) || null;
  }

  /**
   * Update mapping status
   */
  updateMappingStatus(internalId: string, generationType: GenerationType, isActive: boolean): void {
    const key = this.getMappingKey(internalId, generationType);
    const mapping = this.mappings.get(key);
    if (mapping) {
      mapping.isActive = isActive;
      mapping.lastValidated = Date.now();
    }
  }

  /**
   * Get statistics about mappings
   */
  getMappingStatistics(): {
    total: number;
    active: number;
    inactive: number;
    byType: Record<GenerationType, number>;
  } {
    const mappings = Array.from(this.mappings.values());
    const active = mappings.filter(m => m.isActive).length;
    const byType: Record<GenerationType, number> = {
      text: 0,
      image: 0,
      video: 0
    };

    mappings.forEach(mapping => {
      byType[mapping.generationType]++;
    });

    return {
      total: mappings.length,
      active,
      inactive: mappings.length - active,
      byType
    };
  }
}

/**
 * Global model ID mapper instance
 */
export const modelIdMapper = new ModelIdMapper();