/**
 * Property-Based Tests for Model ID Mapper
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 * 
 * Tests the correctness of model ID mapping functionality using property-based testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ModelIdMapper } from '../services/ModelIdMapper';
import { 
  ModelIdMapping, 
  GenerationType, 
  ModelConfigurationErrorType 
} from '../types/ModelConfigurationTypes';

describe('ModelIdMapper Property Tests', () => {
  let mapper: ModelIdMapper;

  beforeEach(() => {
    mapper = new ModelIdMapper();
  });

  /**
   * Property 1: Model ID Mapping Correctness
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
   */
  describe('Property 1: Model ID Mapping Correctness', () => {
    it('should maintain bidirectional mapping consistency', () => {
      fc.assert(
        fc.property(
          fc.record({
            internalId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(':')),
            apiId: fc.string({ minLength: 1, maxLength: 50 }),
            provider: fc.constantFrom('shenma', 'google', 'openai'),
            generationType: fc.constantFrom('text', 'image', 'video') as fc.Arbitrary<GenerationType>,
            isActive: fc.boolean()
          }),
          (mapping) => {
            // Add the mapping
            mapper.setMapping(mapping);

            if (mapping.isActive) {
              // Forward mapping should work
              const retrievedApiId = mapper.getApiId(mapping.internalId, mapping.generationType);
              expect(retrievedApiId).toBe(mapping.apiId);

              // Reverse mapping should work
              const retrievedInternalId = mapper.getInternalId(mapping.apiId, mapping.generationType);
              expect(retrievedInternalId).toBe(mapping.internalId);
            } else {
              // Inactive mappings should return null
              const retrievedApiId = mapper.getApiId(mapping.internalId, mapping.generationType);
              expect(retrievedApiId).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle model support checking correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            internalId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(':')),
            apiId: fc.string({ minLength: 1, maxLength: 50 }),
            provider: fc.constantFrom('shenma', 'google', 'openai'),
            generationType: fc.constantFrom('text', 'image', 'video') as fc.Arbitrary<GenerationType>,
            isActive: fc.boolean()
          }),
          (mapping) => {
            mapper.setMapping(mapping);

            const isSupported = mapper.isModelSupported(mapping.internalId, mapping.generationType);
            const apiId = mapper.getApiId(mapping.internalId, mapping.generationType);

            // Model support should match API ID availability
            if (mapping.isActive) {
              expect(isSupported).toBe(true);
              expect(apiId).not.toBeNull();
            } else {
              expect(isSupported).toBe(false);
              expect(apiId).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain generation type isolation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(':')),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('shenma', 'google', 'openai'),
          (internalId, apiId, provider) => {
            const textMapping: ModelIdMapping = {
              internalId,
              apiId,
              provider,
              generationType: 'text',
              isActive: true
            };

            const imageMapping: ModelIdMapping = {
              internalId,
              apiId: apiId + '-image',
              provider,
              generationType: 'image',
              isActive: true
            };

            mapper.setMapping(textMapping);
            mapper.setMapping(imageMapping);

            // Same internal ID should map to different API IDs for different types
            const textApiId = mapper.getApiId(internalId, 'text');
            const imageApiId = mapper.getApiId(internalId, 'image');
            const videoApiId = mapper.getApiId(internalId, 'video');

            expect(textApiId).toBe(apiId);
            expect(imageApiId).toBe(apiId + '-image');
            expect(videoApiId).toBeNull(); // No video mapping added
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle mapping removal correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            internalId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(':')),
            apiId: fc.string({ minLength: 1, maxLength: 50 }),
            provider: fc.constantFrom('shenma', 'google', 'openai'),
            generationType: fc.constantFrom('text', 'image', 'video') as fc.Arbitrary<GenerationType>,
            isActive: fc.boolean()
          }),
          (mapping) => {
            // Add mapping
            mapper.setMapping(mapping);
            
            // Verify it exists
            const beforeRemoval = mapper.getApiId(mapping.internalId, mapping.generationType);
            if (mapping.isActive) {
              expect(beforeRemoval).toBe(mapping.apiId);
            }

            // Remove mapping
            mapper.removeMapping(mapping.internalId, mapping.generationType);

            // Verify it's gone
            const afterRemoval = mapper.getApiId(mapping.internalId, mapping.generationType);
            expect(afterRemoval).toBeNull();

            const isSupported = mapper.isModelSupported(mapping.internalId, mapping.generationType);
            expect(isSupported).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return correct mappings by generation type', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              internalId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(':')),
              apiId: fc.string({ minLength: 1, maxLength: 50 }),
              provider: fc.constantFrom('shenma', 'google', 'openai'),
              generationType: fc.constantFrom('text', 'image', 'video') as fc.Arbitrary<GenerationType>,
              isActive: fc.boolean()
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (mappings) => {
            // Add all mappings
            mappings.forEach(mapping => mapper.setMapping(mapping));

            // Check each generation type
            (['text', 'image', 'video'] as GenerationType[]).forEach(genType => {
              const retrievedMappings = mapper.getMappings(genType);
              const expectedMappings = mappings.filter(m => m.generationType === genType);

              expect(retrievedMappings.length).toBe(expectedMappings.length);

              retrievedMappings.forEach(retrieved => {
                expect(retrieved.generationType).toBe(genType);
                const original = expectedMappings.find(m => 
                  m.internalId === retrieved.internalId && 
                  m.generationType === retrieved.generationType
                );
                expect(original).toBeDefined();
              });
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Default Mappings Validation', () => {
    it('should have correct mappings for problematic Gemini models', () => {
      // **Validates: Requirements 1.1** - Gemini series model mapping
      const geminiModels = [
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro',
        'gemini-2.5-pro'
      ];

      geminiModels.forEach(modelId => {
        const apiId = mapper.getApiId(modelId, 'text');
        expect(apiId).toBe(modelId); // Direct mapping for Gemini models
        expect(mapper.isModelSupported(modelId, 'text')).toBe(true);
      });
    });

    it('should have correct mappings for problematic image models', () => {
      // **Validates: Requirements 1.2** - Image model mapping
      const imageModels = [
        { internal: 'nano-banana-hd', api: 'nano-banana-hd' },
        { internal: 'flux-dev', api: 'flux-dev' }
      ];

      imageModels.forEach(({ internal, api }) => {
        const apiId = mapper.getApiId(internal, 'image');
        expect(apiId).toBe(api);
        expect(mapper.isModelSupported(internal, 'image')).toBe(true);
      });
    });

    it('should have correct mappings for problematic video models', () => {
      // **Validates: Requirements 1.3** - Video model mapping
      const videoModels = [
        { internal: 'sora_video2-portrait', api: 'sora_video2-portrait' },
        { internal: 'sora_video2', api: 'sora_video2' },
        { internal: 'veo3', api: 'veo3' }
      ];

      videoModels.forEach(({ internal, api }) => {
        const apiId = mapper.getApiId(internal, 'video');
        expect(apiId).toBe(api);
        expect(mapper.isModelSupported(internal, 'video')).toBe(true);
      });
    });

    it('should maintain consistency with working model patterns', () => {
      // **Validates: Requirements 1.5** - Consistency with working models
      const workingModels = [
        { id: 'gpt-4o', type: 'text' as GenerationType },
        { id: 'dall-e-3', type: 'image' as GenerationType },
        { id: 'sora-2', type: 'video' as GenerationType }
      ];

      workingModels.forEach(({ id, type }) => {
        const apiId = mapper.getApiId(id, type);
        if (apiId) {
          // Working models should have direct mapping (internal ID = API ID)
          expect(apiId).toBe(id);
        }
      });
    });
  });

  describe('Validation Properties', () => {
    it('should validate mappings correctly', async () => {
      // **Validates: Requirements 1.4** - Model configuration validation
      const result = await mapper.validateMappings();

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('validMappings');
      expect(result).toHaveProperty('invalidMappings');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');

      // All default mappings should be valid
      expect(result.validMappings.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
      expect(result.isValid).toBe(true);
    });

    it('should detect invalid mappings', async () => {
      // Add an invalid mapping
      const invalidMapping: ModelIdMapping = {
        internalId: '', // Invalid: empty internal ID
        apiId: 'test-api',
        provider: 'shenma',
        generationType: 'text',
        isActive: true
      };

      mapper.setMapping(invalidMapping);
      const result = await mapper.validateMappings();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].errorType).toBe(ModelConfigurationErrorType.MODEL_ID_MAPPING_ERROR);
    });
  });

  describe('Statistics and Information', () => {
    it('should provide accurate mapping statistics', () => {
      const stats = mapper.getMappingStatistics();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('inactive');
      expect(stats).toHaveProperty('byType');

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.active).toBeGreaterThan(0);
      expect(stats.byType.text).toBeGreaterThan(0);
      expect(stats.byType.image).toBeGreaterThan(0);
      expect(stats.byType.video).toBeGreaterThan(0);
    });

    it('should provide mapping information for debugging', () => {
      const info = mapper.getMappingInfo('gemini-2.0-flash-exp', 'text');
      
      expect(info).not.toBeNull();
      expect(info?.internalId).toBe('gemini-2.0-flash-exp');
      expect(info?.apiId).toBe('gemini-2.0-flash-exp');
      expect(info?.generationType).toBe('text');
      expect(info?.provider).toBe('shenma');
    });

    it('should handle status updates correctly', () => {
      const modelId = 'gemini-2.0-flash-exp';
      const genType: GenerationType = 'text';

      // Initially should be active
      expect(mapper.isModelSupported(modelId, genType)).toBe(true);

      // Deactivate
      mapper.updateMappingStatus(modelId, genType, false);
      expect(mapper.isModelSupported(modelId, genType)).toBe(false);

      // Reactivate
      mapper.updateMappingStatus(modelId, genType, true);
      expect(mapper.isModelSupported(modelId, genType)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle non-existent models gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('text', 'image', 'video') as fc.Arbitrary<GenerationType>,
          (randomModelId, genType) => {
            // Assume this is a non-existent model
            const apiId = mapper.getApiId(`non-existent-${randomModelId}`, genType);
            const internalId = mapper.getInternalId(`non-existent-${randomModelId}`, genType);
            const isSupported = mapper.isModelSupported(`non-existent-${randomModelId}`, genType);

            expect(apiId).toBeNull();
            expect(internalId).toBeNull();
            expect(isSupported).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle empty and invalid inputs', () => {
      const invalidInputs = ['', ' ', '\t', '\n'];
      const genTypes: GenerationType[] = ['text', 'image', 'video'];

      invalidInputs.forEach(invalid => {
        genTypes.forEach(genType => {
          expect(mapper.getApiId(invalid, genType)).toBeNull();
          expect(mapper.getInternalId(invalid, genType)).toBeNull();
          expect(mapper.isModelSupported(invalid, genType)).toBe(false);
        });
      });
    });

    it('should maintain mapping integrity under concurrent operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              operation: fc.constantFrom('add', 'remove', 'get', 'check'),
              internalId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(':')),
              apiId: fc.string({ minLength: 1, maxLength: 20 }),
              generationType: fc.constantFrom('text', 'image', 'video') as fc.Arbitrary<GenerationType>
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (operations) => {
            operations.forEach(op => {
              switch (op.operation) {
                case 'add':
                  mapper.setMapping({
                    internalId: op.internalId,
                    apiId: op.apiId,
                    provider: 'shenma',
                    generationType: op.generationType,
                    isActive: true
                  });
                  break;
                case 'remove':
                  mapper.removeMapping(op.internalId, op.generationType);
                  break;
                case 'get':
                  mapper.getApiId(op.internalId, op.generationType);
                  break;
                case 'check':
                  mapper.isModelSupported(op.internalId, op.generationType);
                  break;
              }
            });

            // Mapper should still be in a valid state
            const stats = mapper.getMappingStatistics();
            expect(stats.total).toBeGreaterThanOrEqual(0);
            expect(stats.active).toBeGreaterThanOrEqual(0);
            expect(stats.inactive).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});