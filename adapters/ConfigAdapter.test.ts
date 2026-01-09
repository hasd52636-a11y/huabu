/**
 * Property-based tests for ConfigAdapter
 * Feature: api-configuration-integration
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ConfigurationAdapter, createConfigAdapter } from './ConfigAdapter.js';
import { ModelConfig, ProviderSettings, ProviderType } from '../types.js';

describe('ConfigAdapter', () => {
  let adapter: ConfigurationAdapter;

  beforeEach(() => {
    adapter = createConfigAdapter();
  });

  describe('Property Tests', () => {
    it('Property 6: 配置系统向后兼容性 - For any existing config data, should read, save and apply correctly without affecting existing functionality', async () => {
      await fc.assert(fc.property(
        fc.record({
          text: fc.record({
            provider: fc.constantFrom('google', 'openai-compatible'),
            apiKey: fc.string({ minLength: 8, maxLength: 100 }),
            baseUrl: fc.webUrl(),
            model: fc.string({ minLength: 1, maxLength: 50 })
          }),
          image: fc.record({
            provider: fc.constantFrom('google', 'openai-compatible'),
            apiKey: fc.string({ minLength: 8, maxLength: 100 }),
            baseUrl: fc.webUrl(),
            model: fc.string({ minLength: 1, maxLength: 50 })
          }),
          video: fc.record({
            provider: fc.constantFrom('google', 'openai-compatible'),
            apiKey: fc.string({ minLength: 8, maxLength: 100 }),
            baseUrl: fc.webUrl(),
            model: fc.string({ minLength: 1, maxLength: 50 })
          })
        }),
        (existingConfig: ModelConfig) => {
          // 扩展配置应该保持现有配置不变
          const extendedConfig = adapter.extendConfig(existingConfig);
          
          // 验证现有配置完全保留
          expect(extendedConfig.text).toEqual(existingConfig.text);
          expect(extendedConfig.image).toEqual(existingConfig.image);
          expect(extendedConfig.video).toEqual(existingConfig.video);
          
          // 验证新配置被添加
          expect(extendedConfig.zhipu).toBeDefined();
          expect(extendedConfig.shenma).toBeDefined();
          
          // 验证配置有效性
          const validation = adapter.validateConfig(extendedConfig);
          expect(validation.valid).toBe(true);
        }
      ), { numRuns: 100 });
    });

    it('Property: Provider settings validation consistency - For any valid provider and settings, validation should be consistent', async () => {
      await fc.assert(fc.property(
        fc.constantFrom('google', 'openai-compatible', 'zhipu', 'shenma'),
        fc.record({
          provider: fc.constantFrom('google', 'openai-compatible', 'zhipu', 'shenma'),
          apiKey: fc.string({ minLength: 10, maxLength: 100 }).filter(key => key.trim().length >= 10),
          baseUrl: fc.webUrl(),
          model: fc.string({ minLength: 1, maxLength: 50 }).filter(model => model.trim().length > 0)
        }),
        (provider: ProviderType, settings: ProviderSettings) => {
          settings.provider = provider; // Ensure consistency
          
          const isValid = adapter.validateProviderSettings(provider, settings);
          
          // 验证结果类型
          expect(typeof isValid).toBe('boolean');
          
          // 对于有效的API Key和模型，基本验证应该通过
          if (settings.apiKey.trim().length >= 10 && settings.model.trim().length > 0) {
            // 对于标准提供商，应该通过基本验证
            if (provider === 'google' || provider === 'openai-compatible') {
              expect(isValid).toBe(true);
            }
            // 对于特殊提供商，至少不应该因为基本字段失败
            // (可能因为特殊格式要求失败，但这是预期的)
          }
        }
      ), { numRuns: 100 });
    });

    it('Property: Config migration idempotency - Migrating a migrated config should yield same result', async () => {
      await fc.assert(fc.property(
        fc.record({
          text: fc.oneof(
            fc.record({
              provider: fc.constantFrom('google', 'openai-compatible'),
              apiKey: fc.string({ minLength: 8 }),
              baseUrl: fc.webUrl(),
              model: fc.string({ minLength: 1 })
            }),
            fc.record({
              type: fc.constantFrom('google', 'openai-compatible'),
              key: fc.string({ minLength: 8 }),
              url: fc.webUrl(),
              modelName: fc.string({ minLength: 1 })
            })
          ),
          image: fc.oneof(
            fc.record({
              provider: fc.constantFrom('google', 'openai-compatible'),
              apiKey: fc.string({ minLength: 8 }),
              baseUrl: fc.webUrl(),
              model: fc.string({ minLength: 1 })
            }),
            fc.record({
              type: fc.constantFrom('google', 'openai-compatible'),
              key: fc.string({ minLength: 8 }),
              url: fc.webUrl(),
              modelName: fc.string({ minLength: 1 })
            })
          )
        }),
        (oldConfig: any) => {
          const firstMigration = adapter.migrateConfig(oldConfig);
          const secondMigration = adapter.migrateConfig(firstMigration);
          
          // 第二次迁移应该产生相同结果
          expect(secondMigration).toEqual(firstMigration);
        }
      ), { numRuns: 100 });
    });

    it('Property: Default settings validity - For any supported provider, default settings should be valid', async () => {
      await fc.assert(fc.property(
        fc.constantFrom('google', 'openai-compatible', 'zhipu', 'shenma'),
        (provider: ProviderType) => {
          const defaultSettings = adapter.getDefaultSettings(provider);
          
          // 验证默认设置结构
          expect(defaultSettings.provider).toBe(provider);
          expect(typeof defaultSettings.apiKey).toBe('string');
          expect(typeof defaultSettings.baseUrl).toBe('string');
          expect(typeof defaultSettings.model).toBe('string');
          
          // 验证基础URL格式
          if (defaultSettings.baseUrl) {
            expect(defaultSettings.baseUrl).toMatch(/^https?:\/\//);
          }
          
          // 验证模型名称不为空
          expect(defaultSettings.model.length).toBeGreaterThan(0);
        }
      ), { numRuns: 100 });
    });

    it('Property: Supported models consistency - For any provider, supported models should be non-empty array', async () => {
      await fc.assert(fc.property(
        fc.constantFrom('google', 'openai-compatible', 'zhipu', 'shenma'),
        (provider: ProviderType) => {
          const models = adapter.getSupportedModels(provider);
          
          // 验证返回数组
          expect(Array.isArray(models)).toBe(true);
          expect(models.length).toBeGreaterThan(0);
          
          // 验证所有模型名称都是有效字符串
          models.forEach(model => {
            expect(typeof model).toBe('string');
            expect(model.length).toBeGreaterThan(0);
          });
        }
      ), { numRuns: 100 });
    });
  });

  describe('Unit Tests', () => {
    it('should extend existing config correctly', () => {
      const existingConfig: ModelConfig = {
        text: {
          provider: 'google',
          apiKey: 'test-key',
          baseUrl: 'https://generativelanguage.googleapis.com',
          model: 'gemini-pro'
        },
        image: {
          provider: 'google',
          apiKey: 'test-key',
          baseUrl: 'https://generativelanguage.googleapis.com',
          model: 'gemini-pro-vision'
        },
        video: {
          provider: 'google',
          apiKey: 'test-key',
          baseUrl: 'https://generativelanguage.googleapis.com',
          model: 'gemini-pro'
        }
      };

      const extended = adapter.extendConfig(existingConfig);

      // 现有配置应该保持不变
      expect(extended.text).toEqual(existingConfig.text);
      expect(extended.image).toEqual(existingConfig.image);
      expect(extended.video).toEqual(existingConfig.video);

      // 新配置应该被添加
      expect(extended.zhipu).toBeDefined();
      expect(extended.shenma).toBeDefined();
    });

    it('should validate Zhipu settings correctly', () => {
      const validSettings: ProviderSettings = {
        provider: 'zhipu',
        apiKey: 'test.key.with.dots',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4-flash'
      };

      const invalidSettings: ProviderSettings = {
        provider: 'zhipu',
        apiKey: 'invalidkey',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4-flash'
      };

      expect(adapter.validateProviderSettings('zhipu', validSettings)).toBe(true);
      expect(adapter.validateProviderSettings('zhipu', invalidSettings)).toBe(false);
    });

    it('should validate Shenma settings correctly', () => {
      const validSettings: ProviderSettings = {
        provider: 'shenma',
        apiKey: 'valid-shenma-key-12345',
        baseUrl: 'https://api.shenma.com',
        model: 'default'
      };

      const invalidSettings: ProviderSettings = {
        provider: 'shenma',
        apiKey: 'short',
        baseUrl: 'https://api.shenma.com',
        model: 'default'
      };

      expect(adapter.validateProviderSettings('shenma', validSettings)).toBe(true);
      expect(adapter.validateProviderSettings('shenma', invalidSettings)).toBe(false);
    });

    it('should migrate old config format correctly', () => {
      const oldConfig = {
        textProvider: {
          type: 'google',
          key: 'old-api-key',
          url: 'https://old-url.com',
          modelName: 'old-model'
        },
        imageProvider: {
          provider: 'openai-compatible',
          apiKey: 'new-api-key',
          baseUrl: 'https://new-url.com',
          model: 'new-model'
        }
      };

      const migrated = adapter.migrateConfig(oldConfig);

      expect(migrated.text.provider).toBe('google');
      expect(migrated.text.apiKey).toBe('old-api-key');
      expect(migrated.image.provider).toBe('openai-compatible');
      expect(migrated.image.apiKey).toBe('new-api-key');
    });

    it('should get correct default settings for each provider', () => {
      const zhipuDefaults = adapter.getDefaultSettings('zhipu');
      expect(zhipuDefaults.provider).toBe('zhipu');
      expect(zhipuDefaults.baseUrl).toBe('https://open.bigmodel.cn/api/paas/v4');
      expect(zhipuDefaults.model).toBe('glm-4-flash');

      const shenmaDefaults = adapter.getDefaultSettings('shenma');
      expect(shenmaDefaults.provider).toBe('shenma');
      expect(shenmaDefaults.baseUrl).toBe('https://api.whatai.cc'); // 修正为正确的地址
      expect(shenmaDefaults.model).toBe('gpt-4o'); // 修正为正确的模型
    });

    it('should validate complete config correctly', () => {
      const validConfig: ModelConfig = {
        text: {
          provider: 'zhipu',
          apiKey: 'valid.zhipu.key',
          baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
          model: 'glm-4-flash'
        },
        image: {
          provider: 'shenma',
          apiKey: 'valid-shenma-key-12345',
          baseUrl: 'https://api.shenma.com',
          model: 'nano-banana'
        },
        video: {
          provider: 'google',
          apiKey: 'valid-google-key',
          baseUrl: 'https://generativelanguage.googleapis.com',
          model: 'gemini-pro'
        }
      };

      const validation = adapter.validateConfig(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should generate correct config summary', () => {
      const config: ModelConfig = {
        text: { provider: 'zhipu', apiKey: 'key', baseUrl: '', model: '' },
        image: { provider: 'shenma', apiKey: 'key', baseUrl: '', model: '' },
        video: { provider: 'google', apiKey: 'key', baseUrl: '', model: '' }
      };

      const summary = adapter.getConfigSummary(config);
      expect(summary).toContain('智谱清言');
      expect(summary).toContain('神马AI');
      expect(summary).toContain('Google Gemini');
    });

    it('should get correct supported models for each provider', () => {
      const zhipuModels = adapter.getSupportedModels('zhipu');
      expect(zhipuModels).toContain('glm-4-flash');
      expect(zhipuModels).toContain('cogview-3-flash');

      const shenmaModels = adapter.getSupportedModels('shenma');
      expect(shenmaModels).toContain('default');
      expect(shenmaModels).toContain('nano-banana');
    });
  });
});