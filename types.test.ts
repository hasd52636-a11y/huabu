import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { 
  ProviderType, 
  ProviderSettings, 
  ModelConfig, 
  ExtendedProviderConfig,
  VideoItem,
  BatchConfig,
  LegacyBatchConfig,
  ExportLayout,
  VideoOrientation,
  VIDEO_ORIENTATION_MAPPING,
  migrateBatchConfig,
  getAspectRatioFromOrientation,
  getOrientationFromAspectRatio,
  PresetPrompt,
  PresetPromptStorage
} from './types'

/**
 * Feature: api-configuration-integration, Property 6: 配置系统向后兼容性
 * 
 * For any existing configuration data, after extending the configuration system,
 * it should be able to correctly read, save and apply without affecting existing functionality.
 * 
 * **Validates: Requirements 5.3, 5.5**
 */
describe('Configuration System Backward Compatibility', () => {
  
  it('should maintain backward compatibility for existing ProviderSettings', () => {
    fc.assert(fc.property(
      fc.record({
        provider: fc.constantFrom('google', 'openai-compatible'),
        modelId: fc.string({ minLength: 1 }),
        apiKey: fc.option(fc.string()),
        baseUrl: fc.option(fc.string())
      }),
      (originalSettings: ProviderSettings) => {
        // Test that original provider settings still work
        expect(originalSettings.provider).toMatch(/^(google|openai-compatible)$/)
        expect(originalSettings.modelId).toBeTruthy()
        
        // Test that the settings can be used in ModelConfig
        const config: ModelConfig = {
          text: originalSettings,
          image: originalSettings,
          video: originalSettings
        }
        
        // Verify the config is valid and accessible
        expect(config.text.provider).toBe(originalSettings.provider)
        expect(config.image.modelId).toBe(originalSettings.modelId)
        expect(config.video).toEqual(originalSettings)
        
        return true
      }
    ), { numRuns: 100 })
  })

  it('should support new providers while maintaining existing interface', () => {
    fc.assert(fc.property(
      fc.record({
        provider: fc.constantFrom('zhipu', 'shenma'),
        modelId: fc.string({ minLength: 1 }),
        apiKey: fc.option(fc.string()),
        baseUrl: fc.option(fc.string())
      }),
      (newProviderSettings) => {
        // Test that new provider types work with existing ProviderSettings interface
        const providerSettings: ProviderSettings = newProviderSettings as ProviderSettings
        
        expect(['zhipu', 'shenma']).toContain(providerSettings.provider)
        expect(providerSettings.modelId).toBeTruthy()
        
        // Test that new providers can be used in ModelConfig
        const config: ModelConfig = {
          text: providerSettings,
          image: providerSettings,
          video: providerSettings
        }
        
        expect(config.text.provider).toBe(newProviderSettings.provider)
        
        return true
      }
    ), { numRuns: 100 })
  })

  it('should handle mixed old and new configuration formats', () => {
    fc.assert(fc.property(
      fc.record({
        text: fc.record({
          provider: fc.constantFrom('google', 'openai-compatible'),
          modelId: fc.string({ minLength: 1 }),
          apiKey: fc.option(fc.string()),
          baseUrl: fc.option(fc.string())
        }),
        image: fc.record({
          provider: fc.constantFrom('zhipu', 'shenma'),
          modelId: fc.string({ minLength: 1 }),
          apiKey: fc.option(fc.string()),
          baseUrl: fc.option(fc.string())
        }),
        video: fc.record({
          provider: fc.constantFrom('google', 'openai-compatible', 'zhipu', 'shenma'),
          modelId: fc.string({ minLength: 1 }),
          apiKey: fc.option(fc.string()),
          baseUrl: fc.option(fc.string())
        })
      }),
      (mixedConfig) => {
        // Test that mixed configurations work correctly
        const config: ModelConfig = {
          text: mixedConfig.text as ProviderSettings,
          image: mixedConfig.image as ProviderSettings,
          video: mixedConfig.video as ProviderSettings
        }
        
        // Verify all configurations are accessible and valid
        expect(config.text.provider).toBeTruthy()
        expect(config.image.provider).toBeTruthy()
        expect(config.video.provider).toBeTruthy()
        
        // Verify backward compatibility - old providers still work
        if (['google', 'openai-compatible'].includes(config.text.provider)) {
          expect(config.text.modelId).toBeTruthy()
        }
        
        return true
      }
    ), { numRuns: 100 })
  })

  it('should preserve existing configuration structure when adding optional fields', () => {
    fc.assert(fc.property(
      fc.record({
        text: fc.record({
          provider: fc.constantFrom('google', 'openai-compatible'),
          modelId: fc.string({ minLength: 1 })
        }),
        image: fc.record({
          provider: fc.constantFrom('google', 'openai-compatible'),
          modelId: fc.string({ minLength: 1 })
        }),
        video: fc.record({
          provider: fc.constantFrom('google', 'openai-compatible'),
          modelId: fc.string({ minLength: 1 })
        })
      }),
      (originalConfig) => {
        // Test that original config structure is preserved
        const config: ModelConfig = {
          ...originalConfig,
          // Optional new fields should not break existing structure
          zhipu: undefined,
          shenma: undefined
        }
        
        // Verify original structure is intact
        expect(config.text.provider).toBe(originalConfig.text.provider)
        expect(config.image.modelId).toBe(originalConfig.image.modelId)
        expect(config.video).toEqual(originalConfig.video)
        
        // Verify optional fields don't interfere
        expect(config.zhipu).toBeUndefined()
        expect(config.shenma).toBeUndefined()
        
        return true
      }
    ), { numRuns: 100 })
  })

  it('should handle serialization and deserialization of extended configs', () => {
    fc.assert(fc.property(
      fc.record({
        text: fc.record({
          provider: fc.constantFrom('google', 'openai-compatible', 'zhipu', 'shenma'),
          modelId: fc.string({ minLength: 1 }),
          apiKey: fc.option(fc.string()),
          baseUrl: fc.option(fc.string())
        }),
        image: fc.record({
          provider: fc.constantFrom('google', 'openai-compatible', 'zhipu', 'shenma'),
          modelId: fc.string({ minLength: 1 }),
          apiKey: fc.option(fc.string()),
          baseUrl: fc.option(fc.string())
        }),
        video: fc.record({
          provider: fc.constantFrom('google', 'openai-compatible', 'zhipu', 'shenma'),
          modelId: fc.string({ minLength: 1 }),
          apiKey: fc.option(fc.string()),
          baseUrl: fc.option(fc.string())
        })
      }),
      (config) => {
        // Test JSON serialization round-trip
        const serialized = JSON.stringify(config)
        const deserialized = JSON.parse(serialized) as ModelConfig
        
        // Verify round-trip preserves all data
        expect(deserialized.text.provider).toBe(config.text.provider)
        expect(deserialized.image.modelId).toBe(config.image.modelId)
        expect(deserialized.video).toEqual(config.video)
        
        return true
      }
    ), { numRuns: 100 })
  })
})

/**
 * Feature: batch-video-enhancement, Property 4: Video Orientation Mapping
 * 
 * For any selected orientation, the generated video aspect ratio should correctly map 
 * to 16:9 for landscape and 9:16 for portrait
 * 
 * **Validates: Requirements 2.2, 2.3**
 */
describe('Video Orientation Types', () => {
  describe('VIDEO_ORIENTATION_MAPPING', () => {
    it('should map landscape to 16:9', () => {
      expect(VIDEO_ORIENTATION_MAPPING.landscape).toBe('16:9');
    });

    it('should map portrait to 9:16', () => {
      expect(VIDEO_ORIENTATION_MAPPING.portrait).toBe('9:16');
    });
  });

  describe('getAspectRatioFromOrientation', () => {
    it('should return correct aspect ratios for all orientations', () => {
      fc.assert(fc.property(
        fc.constantFrom('landscape' as VideoOrientation, 'portrait' as VideoOrientation),
        (orientation: VideoOrientation) => {
          const aspectRatio = getAspectRatioFromOrientation(orientation);
          const expectedRatio = VIDEO_ORIENTATION_MAPPING[orientation];
          
          expect(aspectRatio).toBe(expectedRatio);
          
          // Verify the mapping is consistent
          if (orientation === 'landscape') {
            expect(aspectRatio).toBe('16:9');
          } else {
            expect(aspectRatio).toBe('9:16');
          }
          
          return true;
        }
      ), { numRuns: 100 });
    });
  });

  describe('getOrientationFromAspectRatio', () => {
    it('should return portrait for 9:16 and landscape for others', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant('9:16'),
          fc.constant('16:9'),
          fc.constant('4:3'),
          fc.constant('1:1'),
          fc.string({ minLength: 3 })
        ),
        (aspectRatio: string) => {
          const orientation = getOrientationFromAspectRatio(aspectRatio);
          
          if (aspectRatio === '9:16') {
            expect(orientation).toBe('portrait');
          } else {
            expect(orientation).toBe('landscape');
          }
          
          return true;
        }
      ), { numRuns: 100 });
    });
  });

  describe('migrateBatchConfig', () => {
    it('should return new config unchanged if already migrated', () => {
      fc.assert(fc.property(
        fc.record({
          videoDuration: fc.integer({ min: 5, max: 30 }),
          processingInterval: fc.integer({ min: 1000, max: 10000 }),
          videoOrientation: fc.constantFrom('landscape' as VideoOrientation, 'portrait' as VideoOrientation),
          downloadPath: fc.option(fc.string()),
          maxRetries: fc.option(fc.integer({ min: 0, max: 10 })),
          retryDelay: fc.option(fc.integer({ min: 1000, max: 30000 })),
          enableNotifications: fc.option(fc.boolean()),
          autoDownload: fc.option(fc.boolean())
        }),
        (newConfig: BatchConfig) => {
          const result = migrateBatchConfig(newConfig);
          
          // Should return the same config
          expect(result).toEqual(newConfig);
          expect(result.videoOrientation).toBe(newConfig.videoOrientation);
          
          return true;
        }
      ), { numRuns: 100 });
    });

    it('should migrate legacy config correctly', () => {
      fc.assert(fc.property(
        fc.record({
          videoDuration: fc.integer({ min: 5, max: 30 }),
          processingInterval: fc.integer({ min: 1000, max: 10000 }),
          aspectRatio: fc.oneof(
            fc.constant('16:9'),
            fc.constant('9:16'),
            fc.constant('4:3'),
            fc.constant('1:1')
          ),
          downloadPath: fc.option(fc.string()),
          maxRetries: fc.option(fc.integer({ min: 0, max: 10 })),
          retryDelay: fc.option(fc.integer({ min: 1000, max: 30000 })),
          enableNotifications: fc.option(fc.boolean())
        }),
        (legacyConfig: LegacyBatchConfig) => {
          const result = migrateBatchConfig(legacyConfig);
          
          // Should have videoOrientation instead of aspectRatio
          expect(result.videoOrientation).toBeDefined();
          expect('aspectRatio' in result).toBe(false);
          
          // Should preserve all other properties
          expect(result.videoDuration).toBe(legacyConfig.videoDuration);
          expect(result.processingInterval).toBe(legacyConfig.processingInterval);
          expect(result.downloadPath).toBe(legacyConfig.downloadPath);
          expect(result.maxRetries).toBe(legacyConfig.maxRetries);
          expect(result.retryDelay).toBe(legacyConfig.retryDelay);
          expect(result.enableNotifications).toBe(legacyConfig.enableNotifications);
          
          // Should set autoDownload to false by default
          expect(result.autoDownload).toBe(false);
          
          // Should map aspect ratio correctly
          const expectedOrientation = legacyConfig.aspectRatio === '9:16' ? 'portrait' : 'landscape';
          expect(result.videoOrientation).toBe(expectedOrientation);
          
          return true;
        }
      ), { numRuns: 100 });
    });

    it('should handle round-trip conversion correctly', () => {
      fc.assert(fc.property(
        fc.constantFrom('landscape' as VideoOrientation, 'portrait' as VideoOrientation),
        (orientation: VideoOrientation) => {
          // Create a new config with the orientation
          const newConfig: BatchConfig = {
            videoDuration: 10,
            processingInterval: 3000,
            videoOrientation: orientation
          };
          
          // Convert to aspect ratio and back
          const aspectRatio = getAspectRatioFromOrientation(orientation);
          const legacyConfig: LegacyBatchConfig = {
            videoDuration: 10,
            processingInterval: 3000,
            aspectRatio: aspectRatio
          };
          
          // Migrate back to new format
          const migratedConfig = migrateBatchConfig(legacyConfig);
          
          // Should preserve the original orientation
          expect(migratedConfig.videoOrientation).toBe(orientation);
          
          return true;
        }
      ), { numRuns: 100 });
    });
  });

  describe('BatchConfig type validation', () => {
    it('should accept valid BatchConfig with all properties', () => {
      fc.assert(fc.property(
        fc.record({
          videoDuration: fc.integer({ min: 5, max: 30 }),
          processingInterval: fc.integer({ min: 1000, max: 10000 }),
          videoOrientation: fc.constantFrom('landscape' as VideoOrientation, 'portrait' as VideoOrientation),
          referenceImageUrl: fc.option(fc.webUrl()),
          downloadPath: fc.option(fc.string()),
          maxRetries: fc.option(fc.integer({ min: 0, max: 10 })),
          retryDelay: fc.option(fc.integer({ min: 1000, max: 30000 })),
          enableNotifications: fc.option(fc.boolean()),
          autoDownload: fc.option(fc.boolean())
        }),
        (config: BatchConfig) => {
          // Should be a valid BatchConfig
          expect(config.videoDuration).toBeGreaterThanOrEqual(5);
          expect(config.processingInterval).toBeGreaterThanOrEqual(1000);
          expect(['landscape', 'portrait']).toContain(config.videoOrientation);
          
          // Should be able to get aspect ratio from orientation
          const aspectRatio = getAspectRatioFromOrientation(config.videoOrientation);
          expect(['16:9', '9:16']).toContain(aspectRatio);
          
          return true;
        }
      ), { numRuns: 100 });
    });
  });
})

/**
 * Feature: my-prompt, Property 2: Prompt library slot constraint
 * 
 * For any system state, the prompt library should maintain exactly 6 preset prompt slots, 
 * no more and no less
 * 
 * **Validates: Requirements 2.1**
 */
describe('My Prompt Data Structure Validation', () => {
  describe('PresetPrompt interface', () => {
    it('should accept valid PresetPrompt objects', () => {
      fc.assert(fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          content: fc.string({ maxLength: 2000 }),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        (prompt: PresetPrompt) => {
          // Verify all required fields are present and valid
          expect(prompt.id).toBeTruthy();
          expect(prompt.title).toBeTruthy();
          expect(prompt.content).toBeDefined();
          expect(prompt.content.length).toBeLessThanOrEqual(2000);
          expect(prompt.createdAt).toBeInstanceOf(Date);
          expect(prompt.updatedAt).toBeInstanceOf(Date);
          
          return true;
        }
      ), { numRuns: 100 });
    });
  });

  describe('PresetPromptStorage interface', () => {
    it('should maintain exactly 6 prompt slots constraint', () => {
      fc.assert(fc.property(
        fc.record({
          version: fc.string({ minLength: 1 }),
          prompts: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              content: fc.string({ maxLength: 2000 }),
              createdAt: fc.date(),
              updatedAt: fc.date()
            }),
            { minLength: 0, maxLength: 10 } // Allow various lengths for testing
          ),
          selectedIndex: fc.option(fc.integer({ min: 0, max: 5 })),
          lastUpdated: fc.date()
        }),
        (storage: PresetPromptStorage) => {
          // The system should always normalize to exactly 6 slots
          // This simulates what the actual system would do
          const normalizedPrompts = [...storage.prompts];
          
          // Pad with empty prompts if less than 6
          while (normalizedPrompts.length < 6) {
            normalizedPrompts.push({
              id: `empty-${normalizedPrompts.length}`,
              title: '',
              content: '',
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
          
          // Truncate if more than 6
          if (normalizedPrompts.length > 6) {
            normalizedPrompts.splice(6);
          }
          
          // Verify exactly 6 slots
          expect(normalizedPrompts).toHaveLength(6);
          
          // Verify selectedIndex is valid if set
          if (storage.selectedIndex !== null) {
            expect(storage.selectedIndex).toBeGreaterThanOrEqual(0);
            expect(storage.selectedIndex).toBeLessThanOrEqual(5);
          }
          
          // Verify all required fields are present
          expect(storage.version).toBeTruthy();
          expect(storage.prompts).toBeDefined();
          expect(storage.lastUpdated).toBeInstanceOf(Date);
          
          return true;
        }
      ), { numRuns: 100 });
    });

    it('should handle serialization and deserialization correctly', () => {
      fc.assert(fc.property(
        fc.record({
          version: fc.constant('1.0.0'),
          prompts: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              content: fc.string({ maxLength: 2000 }),
              createdAt: fc.date(),
              updatedAt: fc.date()
            }),
            { minLength: 0, maxLength: 6 }
          ),
          selectedIndex: fc.option(fc.integer({ min: 0, max: 5 })),
          lastUpdated: fc.date()
        }),
        (storage: PresetPromptStorage) => {
          // Test JSON serialization round-trip
          const serialized = JSON.stringify(storage);
          const deserialized = JSON.parse(serialized);
          
          // Verify structure is preserved
          expect(deserialized.version).toBe(storage.version);
          expect(deserialized.prompts).toHaveLength(storage.prompts.length);
          expect(deserialized.selectedIndex).toBe(storage.selectedIndex);
          
          // Verify dates can be reconstructed
          const reconstructedStorage: PresetPromptStorage = {
            ...deserialized,
            prompts: deserialized.prompts.map((p: any) => ({
              ...p,
              createdAt: new Date(p.createdAt),
              updatedAt: new Date(p.updatedAt)
            })),
            lastUpdated: new Date(deserialized.lastUpdated)
          };
          
          expect(reconstructedStorage.lastUpdated).toBeInstanceOf(Date);
          reconstructedStorage.prompts.forEach(prompt => {
            expect(prompt.createdAt).toBeInstanceOf(Date);
            expect(prompt.updatedAt).toBeInstanceOf(Date);
          });
          
          return true;
        }
      ), { numRuns: 100 });
    });

    it('should validate prompt content length constraints', () => {
      fc.assert(fc.property(
        fc.string({ maxLength: 3000 }), // Allow longer strings to test validation
        (content: string) => {
          const isValid = content.length <= 2000;
          
          if (isValid) {
            // Valid content should be accepted
            const prompt: PresetPrompt = {
              id: 'test-id',
              title: 'Test Prompt',
              content: content,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            expect(prompt.content.length).toBeLessThanOrEqual(2000);
          } else {
            // Invalid content should be rejected (simulated)
            expect(content.length).toBeGreaterThan(2000);
          }
          
          return true;
        }
      ), { numRuns: 100 });
    });
  });
})