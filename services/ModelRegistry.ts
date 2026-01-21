/**
 * Model Registry
 * 
 * Manages model registration, lookup, and metadata
 */

import {
  ModelRegistry as IModelRegistry,
  ModelRegistration,
  ModelMetadata,
  ModelLookupResult,
  GenerationType,
  ProviderType
} from '../types/ModelConfigurationTypes';

/**
 * Model registry for managing model configurations
 */
export class ModelRegistry implements IModelRegistry {
  private models: Map<string, ModelRegistration> = new Map();
  private typeIndex: Map<GenerationType, Set<string>> = new Map();
  private providerIndex: Map<ProviderType, Set<string>> = new Map();

  constructor() {
    this.initializeDefaultModels();
  }

  /**
   * Register a model
   */
  registerModel(registration: ModelRegistration): void {
    const key = this.getModelKey(registration.modelId, registration.generationType);
    
    // Store the registration
    this.models.set(key, {
      ...registration,
      registeredAt: Date.now(),
      lastUpdated: Date.now()
    });

    // Update indexes
    this.updateTypeIndex(registration.generationType, key);
    this.updateProviderIndex(registration.provider, key);
  }

  /**
   * Unregister a model
   */
  unregisterModel(modelId: string, generationType: GenerationType): boolean {
    const key = this.getModelKey(modelId, generationType);
    const registration = this.models.get(key);
    
    if (!registration) {
      return false;
    }

    // Remove from main registry
    this.models.delete(key);

    // Remove from indexes
    this.removeFromTypeIndex(generationType, key);
    this.removeFromProviderIndex(registration.provider, key);

    return true;
  }

  /**
   * Lookup model by ID and type
   */
  lookupModel(modelId: string, generationType: GenerationType): ModelLookupResult | null {
    const key = this.getModelKey(modelId, generationType);
    const registration = this.models.get(key);

    if (!registration) {
      return null;
    }

    return {
      found: true,
      registration,
      metadata: registration.metadata,
      isAvailable: registration.isEnabled && !registration.isDeprecated
    };
  }

  /**
   * Lookup models by type
   */
  lookupByType(generationType: GenerationType): ModelLookupResult[] {
    const modelKeys = this.typeIndex.get(generationType) || new Set();
    const results: ModelLookupResult[] = [];

    modelKeys.forEach(key => {
      const registration = this.models.get(key);
      if (registration) {
        results.push({
          found: true,
          registration,
          metadata: registration.metadata,
          isAvailable: registration.isEnabled && !registration.isDeprecated
        });
      }
    });

    return results.sort((a, b) => {
      // Sort by priority (higher first), then by name
      const priorityDiff = (b.registration?.priority || 0) - (a.registration?.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      return (a.registration?.modelId || '').localeCompare(b.registration?.modelId || '');
    });
  }

  /**
   * Lookup models by provider
   */
  lookupByProvider(provider: ProviderType): ModelLookupResult[] {
    const modelKeys = this.providerIndex.get(provider) || new Set();
    const results: ModelLookupResult[] = [];

    modelKeys.forEach(key => {
      const registration = this.models.get(key);
      if (registration) {
        results.push({
          found: true,
          registration,
          metadata: registration.metadata,
          isAvailable: registration.isEnabled && !registration.isDeprecated
        });
      }
    });

    return results.sort((a, b) => 
      (a.registration?.modelId || '').localeCompare(b.registration?.modelId || '')
    );
  }

  /**
   * Update model metadata
   */
  updateModelMetadata(
    modelId: string, 
    generationType: GenerationType, 
    metadata: Partial<ModelMetadata>
  ): boolean {
    const key = this.getModelKey(modelId, generationType);
    const registration = this.models.get(key);

    if (!registration) {
      return false;
    }

    // Update metadata
    registration.metadata = {
      ...registration.metadata,
      ...metadata
    };
    registration.lastUpdated = Date.now();

    this.models.set(key, registration);
    return true;
  }

  /**
   * Get all registered models
   */
  getAllModels(): ModelRegistration[] {
    return Array.from(this.models.values()).sort((a, b) => {
      // Sort by generation type, then by model ID
      const typeDiff = a.generationType.localeCompare(b.generationType);
      if (typeDiff !== 0) return typeDiff;
      
      return a.modelId.localeCompare(b.modelId);
    });
  }

  /**
   * Get registry statistics
   */
  getRegistryStatistics(): {
    totalModels: number;
    modelsByType: Record<GenerationType, number>;
    modelsByProvider: Record<ProviderType, number>;
    enabledModels: number;
    deprecatedModels: number;
  } {
    const allModels = Array.from(this.models.values());
    
    const modelsByType: Record<GenerationType, number> = {
      text: 0,
      image: 0,
      video: 0
    };

    const modelsByProvider: Record<ProviderType, number> = {
      shenma: 0,
      openai: 0,
      google: 0,
      anthropic: 0
    };

    let enabledModels = 0;
    let deprecatedModels = 0;

    allModels.forEach(model => {
      modelsByType[model.generationType]++;
      modelsByProvider[model.provider]++;
      
      if (model.isEnabled) enabledModels++;
      if (model.isDeprecated) deprecatedModels++;
    });

    return {
      totalModels: allModels.length,
      modelsByType,
      modelsByProvider,
      enabledModels,
      deprecatedModels
    };
  }

  /**
   * Search models by criteria
   */
  searchModels(criteria: {
    query?: string;
    generationType?: GenerationType;
    provider?: ProviderType;
    isEnabled?: boolean;
    isDeprecated?: boolean;
    capabilities?: string[];
  }): ModelLookupResult[] {
    const allModels = Array.from(this.models.values());
    
    const filtered = allModels.filter(model => {
      // Filter by generation type
      if (criteria.generationType && model.generationType !== criteria.generationType) {
        return false;
      }

      // Filter by provider
      if (criteria.provider && model.provider !== criteria.provider) {
        return false;
      }

      // Filter by enabled status
      if (criteria.isEnabled !== undefined && model.isEnabled !== criteria.isEnabled) {
        return false;
      }

      // Filter by deprecated status
      if (criteria.isDeprecated !== undefined && model.isDeprecated !== criteria.isDeprecated) {
        return false;
      }

      // Filter by query (search in model ID and description)
      if (criteria.query) {
        const query = criteria.query.toLowerCase();
        const modelIdMatch = model.modelId.toLowerCase().includes(query);
        const descriptionMatch = model.metadata.description?.toLowerCase().includes(query);
        
        if (!modelIdMatch && !descriptionMatch) {
          return false;
        }
      }

      // Filter by capabilities
      if (criteria.capabilities && criteria.capabilities.length > 0) {
        const modelCapabilities = model.metadata.capabilities || [];
        const hasAllCapabilities = criteria.capabilities.every(cap => 
          modelCapabilities.includes(cap)
        );
        
        if (!hasAllCapabilities) {
          return false;
        }
      }

      return true;
    });

    return filtered.map(registration => ({
      found: true,
      registration,
      metadata: registration.metadata,
      isAvailable: registration.isEnabled && !registration.isDeprecated
    }));
  }

  /**
   * Initialize default models based on Shenma API documentation
   */
  private initializeDefaultModels(): void {
    // Text models (Gemini series)
    this.registerModel({
      modelId: 'gemini-2.0-flash-exp',
      generationType: 'text',
      provider: 'shenma',
      isEnabled: true,
      isDeprecated: false,
      priority: 90,
      metadata: {
        displayName: 'Gemini 2.0 Flash Experimental',
        description: 'Latest Gemini model with experimental features',
        capabilities: ['thinking', 'multimodal', 'large-context'],
        parameters: {
          generationConfig: {
            thinkingConfig: {
              thinkingBudget: 128,
              includeThoughts: true
            }
          }
        },
        apiEndpoint: '/v1/chat/completions',
        apiFormat: 'openai'
      }
    });

    this.registerModel({
      modelId: 'gemini-1.5-pro',
      generationType: 'text',
      provider: 'shenma',
      isEnabled: true,
      isDeprecated: false,
      priority: 85,
      metadata: {
        displayName: 'Gemini 1.5 Pro',
        description: 'Advanced Gemini model for complex tasks',
        capabilities: ['multimodal', 'large-context', 'reasoning'],
        parameters: {
          generationConfig: {
            thinkingConfig: {
              thinkingBudget: 64,
              includeThoughts: false
            }
          }
        },
        apiEndpoint: '/v1/chat/completions',
        apiFormat: 'openai'
      }
    });

    // Image models
    this.registerModel({
      modelId: 'nano-banana-hd',
      generationType: 'image',
      provider: 'shenma',
      isEnabled: true,
      isDeprecated: false,
      priority: 95,
      metadata: {
        displayName: 'Nano Banana HD',
        description: 'High-definition image generation model',
        capabilities: ['high-quality', 'fast-generation'],
        parameters: {},
        apiEndpoint: '/v1/chat/completions',
        apiFormat: 'openai'
      }
    });

    this.registerModel({
      modelId: 'flux-dev',
      generationType: 'image',
      provider: 'shenma',
      isEnabled: true,
      isDeprecated: false,
      priority: 90,
      metadata: {
        displayName: 'Flux Dev',
        description: 'Advanced Flux image generation model',
        capabilities: ['artistic', 'high-quality', 'flexible'],
        parameters: {},
        apiEndpoint: '/v1/chat/completions',
        apiFormat: 'openai'
      }
    });

    // Video models
    this.registerModel({
      modelId: 'sora_video2-portrait',
      generationType: 'video',
      provider: 'shenma',
      isEnabled: true,
      isDeprecated: false,
      priority: 95,
      metadata: {
        displayName: 'Sora Video 2 Portrait',
        description: 'Portrait-oriented video generation',
        capabilities: ['portrait', 'high-quality', 'animation'],
        parameters: {
          aspect_ratio: '9:16',
          duration: '10'
        },
        apiEndpoint: '/v1/chat/completions',
        apiFormat: 'openai'
      }
    });

    this.registerModel({
      modelId: 'sora-2',
      generationType: 'video',
      provider: 'shenma',
      isEnabled: true,
      isDeprecated: false,
      priority: 90,
      metadata: {
        displayName: 'Sora 2',
        description: 'Advanced video generation model',
        capabilities: ['high-quality', 'animation', 'flexible'],
        parameters: {
          aspect_ratio: '16:9',
          duration: '10'
        },
        apiEndpoint: '/v2/videos/generations',
        apiFormat: 'shenma'
      }
    });

    this.registerModel({
      modelId: 'sora-2-pro',
      generationType: 'video',
      provider: 'shenma',
      isEnabled: true,
      isDeprecated: false,
      priority: 85,
      metadata: {
        displayName: 'Sora 2 Pro',
        description: 'Professional video generation with HD and extended duration',
        capabilities: ['hd', 'extended-duration', 'high-quality'],
        parameters: {
          aspect_ratio: '16:9',
          duration: '15',
          hd: true
        },
        apiEndpoint: '/v2/videos/generations',
        apiFormat: 'shenma'
      }
    });

    this.registerModel({
      modelId: 'veo3',
      generationType: 'video',
      provider: 'shenma',
      isEnabled: true,
      isDeprecated: false,
      priority: 80,
      metadata: {
        displayName: 'Veo 3',
        description: 'Google Veo 3 video generation model',
        capabilities: ['fast-generation', 'multiple-ratios'],
        parameters: {
          aspect_ratio: '16:9',
          enhance_prompt: false,
          enable_upsample: false
        },
        apiEndpoint: '/v2/videos/generations',
        apiFormat: 'shenma'
      }
    });
  }

  /**
   * Generate model key
   */
  private getModelKey(modelId: string, generationType: GenerationType): string {
    return `${generationType}:${modelId}`;
  }

  /**
   * Update type index
   */
  private updateTypeIndex(generationType: GenerationType, key: string): void {
    if (!this.typeIndex.has(generationType)) {
      this.typeIndex.set(generationType, new Set());
    }
    this.typeIndex.get(generationType)!.add(key);
  }

  /**
   * Update provider index
   */
  private updateProviderIndex(provider: ProviderType, key: string): void {
    if (!this.providerIndex.has(provider)) {
      this.providerIndex.set(provider, new Set());
    }
    this.providerIndex.get(provider)!.add(key);
  }

  /**
   * Remove from type index
   */
  private removeFromTypeIndex(generationType: GenerationType, key: string): void {
    const typeSet = this.typeIndex.get(generationType);
    if (typeSet) {
      typeSet.delete(key);
      if (typeSet.size === 0) {
        this.typeIndex.delete(generationType);
      }
    }
  }

  /**
   * Remove from provider index
   */
  private removeFromProviderIndex(provider: ProviderType, key: string): void {
    const providerSet = this.providerIndex.get(provider);
    if (providerSet) {
      providerSet.delete(key);
      if (providerSet.size === 0) {
        this.providerIndex.delete(provider);
      }
    }
  }
}

/**
 * Global model registry instance
 */
export const modelRegistry = new ModelRegistry();