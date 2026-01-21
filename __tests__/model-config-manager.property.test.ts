/**
 * 模型配置管理器属性测试
 * Property-Based Tests for ModelConfigManager
 * 
 * 验证需求: 4.1, 4.2, 4.3, 8.1, 8.2
 * **属性4: 配置驱动的模型可用性**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { ModelConfigManager } from '../services/ModelConfigManager';
import { 
  NewModelConfig, 
  ModelInfo, 
  ModelType, 
  ProviderType,
  SHENMA_TEXT_MODELS,
  DEFAULT_USER_PREFERENCES 
} from '../types';

describe('ModelConfigManager Property Tests', () => {
  let manager: ModelConfigManager;
  let baseConfig: NewModelConfig;

  beforeEach(() => {
    baseConfig = {
      providers: {
        shenma: {
          apiKey: 'test-api-key',
          baseUrl: 'https://api.whatai.cc/v1/chat/completions',
          enabled: true
        }
      },
      text: { provider: 'shenma', modelId: 'gemini-3-flash-preview-nothinking' },
      image: { provider: 'shenma', modelId: 'nano-banana-hd' },
      video: { provider: 'shenma', modelId: 'sora_video2' },
      userPreferences: DEFAULT_USER_PREFERENCES,
      _meta: {
        version: '2.0',
        lastSaved: Date.now()
      }
    };
    manager = new ModelConfigManager(baseConfig);
  });

  /**
   * **属性4: 配置驱动的模型可用性**
   * **验证: 需求 4.1, 4.2, 4.3, 8.1, 8.2**
   * 
   * 属性：模型的可用性完全由配置决定
   * - 如果提供商已配置且启用，模型应该可用
   * - 如果提供商未配置或禁用，模型应该不可用
   * - 模型信息应该与预定义的模型列表一致
   */
  it('Property 4: Model availability is configuration-driven', () => {
    fc.assert(fc.property(
      // 生成随机的提供商配置
      fc.record({
        enabled: fc.boolean(),
        apiKey: fc.string({ minLength: 1, maxLength: 50 }),
        baseUrl: fc.webUrl()
      }),
      fc.constantFrom(...SHENMA_TEXT_MODELS.map(m => m.id)), // 选择一个有效的模型ID
      (providerConfig, modelId) => {
        // 创建测试配置
        const testConfig: NewModelConfig = {
          ...baseConfig,
          providers: {
            shenma: providerConfig
          }
        };

        const testManager = new ModelConfigManager(testConfig);
        const isAvailable = testManager.isModelAvailable(modelId);
        const modelInfo = testManager.getModelInfo(modelId);

        // 验证模型可用性逻辑
        if (providerConfig.enabled && providerConfig.apiKey) {
          // 提供商已启用且有API密钥，模型应该可用
          expect(isAvailable).toBe(true);
          expect(modelInfo).toBeTruthy();
          expect(modelInfo?.isAvailable).toBe(true);
        } else {
          // 提供商未启用或无API密钥，模型应该不可用
          expect(isAvailable).toBe(false);
        }

        // 验证模型信息的一致性
        if (modelInfo) {
          expect(modelInfo.id).toBe(modelId);
          expect(modelInfo.provider).toBe('shenma');
          
          // 验证模型信息与预定义列表一致
          const predefinedModel = SHENMA_TEXT_MODELS.find(m => m.id === modelId);
          expect(predefinedModel).toBeTruthy();
          expect(modelInfo.name).toBe(predefinedModel!.name);
          expect(modelInfo.type).toBe(predefinedModel!.type);
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * 属性：getAvailableTextModels 返回的模型列表应该是有序且唯一的
   */
  it('Property: Available models list is ordered and unique', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        enabled: fc.boolean(),
        apiKey: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        baseUrl: fc.webUrl()
      }), { minLength: 1, maxLength: 4 }),
      (providerConfigs) => {
        // 创建多个提供商配置
        const providers: any = {};
        const providerTypes: ProviderType[] = ['shenma', 'google', 'zhipu', 'openai-compatible'];
        
        providerConfigs.forEach((config, index) => {
          if (index < providerTypes.length) {
            providers[providerTypes[index]] = config;
          }
        });

        const testConfig: NewModelConfig = {
          ...baseConfig,
          providers
        };

        const testManager = new ModelConfigManager(testConfig);
        const availableModels = testManager.getAvailableTextModels();

        // 验证列表唯一性
        const modelIds = availableModels.map(m => m.id);
        const uniqueIds = [...new Set(modelIds)];
        expect(modelIds).toEqual(uniqueIds);

        // 验证排序逻辑：推荐模型在前
        let foundNonRecommended = false;
        for (const model of availableModels) {
          if (!model.capabilities.isRecommended) {
            foundNonRecommended = true;
          } else if (foundNonRecommended) {
            // 如果已经遇到非推荐模型，后面不应该再有推荐模型
            expect(false).toBe(true); // 排序错误
          }
        }

        // 验证所有返回的模型都是可用的（只有在有可用模型时才验证）
        if (availableModels.length > 0) {
          availableModels.forEach(model => {
            expect(testManager.isModelAvailable(model.id)).toBe(true);
          });
        }
      }
    ), { numRuns: 50 });
  });

  /**
   * 属性：智能推荐功能应该总是返回可用的模型
   */
  it('Property: Smart recommendations always return available models', () => {
    fc.assert(fc.property(
      fc.constantFrom('quickResponse', 'complexAnalysis', 'reasoning', 'multimodal', 'internetSearch'),
      fc.string({ minLength: 1, maxLength: 200 }),
      fc.boolean(),
      fc.boolean(),
      (scenario, content, hasImages, hasVideo) => {
        const recommendedModelId = manager.getRecommendedModel(scenario as any);
        const contentBasedModelId = manager.recommendModelForContent(content, hasImages, hasVideo);

        // 验证推荐的模型都是可用的
        expect(manager.isModelAvailable(recommendedModelId)).toBe(true);
        expect(manager.isModelAvailable(contentBasedModelId)).toBe(true);

        // 验证推荐的模型存在于可用模型列表中
        const availableModels = manager.getAvailableTextModels();
        const availableIds = availableModels.map(m => m.id);
        expect(availableIds).toContain(recommendedModelId);
        expect(availableIds).toContain(contentBasedModelId);

        // 验证多模态内容推荐逻辑
        if (hasImages || hasVideo) {
          const modelInfo = manager.getModelInfo(contentBasedModelId);
          expect(modelInfo?.capabilities.supportsImages || modelInfo?.capabilities.supportsVideo).toBe(true);
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * 属性：模型类型分组功能应该正确分类
   */
  it('Property: Model type grouping is consistent', () => {
    fc.assert(fc.property(
      fc.constantFrom(...(['fast-lightweight', 'deep-analysis', 'reasoning-focused', 'network-enabled', 'multimodal', 'standard'] as ModelType[])),
      (modelType) => {
        const modelsByType = manager.getModelsByType(modelType);

        // 验证所有返回的模型都是指定类型
        modelsByType.forEach(model => {
          expect(model.type).toBe(modelType);
          expect(manager.isModelAvailable(model.id)).toBe(true);
        });

        // 验证排序：推荐模型在前
        let foundNonRecommended = false;
        for (const model of modelsByType) {
          if (!model.capabilities.isRecommended) {
            foundNonRecommended = true;
          } else if (foundNonRecommended) {
            expect(false).toBe(true); // 排序错误
          }
        }
      }
    ), { numRuns: 50 });
  });

  /**
   * 属性：配置验证功能应该正确识别问题
   */
  it('Property: Configuration validation correctly identifies issues', () => {
    fc.assert(fc.property(
      fc.record({
        hasValidProvider: fc.boolean(),
        hasApiKey: fc.boolean(),
        isEnabled: fc.boolean(),
        hasValidDefaultModel: fc.boolean()
      }),
      (testCase) => {
        // 构造测试配置
        const testConfig: NewModelConfig = {
          providers: {
            shenma: {
              apiKey: testCase.hasApiKey ? 'valid-key' : '',
              baseUrl: 'https://api.whatai.cc/v1/chat/completions',
              enabled: testCase.isEnabled
            }
          },
          text: { 
            provider: 'shenma', 
            modelId: testCase.hasValidDefaultModel ? 'gemini-3-flash-preview-nothinking' : 'invalid-model'
          },
          image: { provider: 'shenma', modelId: 'nano-banana-hd' },
          video: { provider: 'shenma', modelId: 'sora_video2' },
          userPreferences: DEFAULT_USER_PREFERENCES,
          _meta: {
            version: '2.0',
            lastSaved: Date.now()
          }
        };

        const testManager = new ModelConfigManager(testConfig);
        const validation = testManager.validateModelConfig();

        // 验证验证逻辑
        if (!testCase.hasApiKey || !testCase.isEnabled) {
          // 如果没有API密钥或未启用，应该有警告或错误
          expect(validation.warnings.length + validation.errors.length).toBeGreaterThan(0);
        }

        if (!testCase.hasValidDefaultModel) {
          // 如果默认模型无效，应该有警告
          expect(validation.warnings.some(w => w.includes('默认模型'))).toBe(true);
        }

        // 如果有可用模型，验证应该通过；否则应该失败
        const availableModels = testManager.getAvailableTextModels();
        if (availableModels.length > 0) {
          expect(validation.isValid).toBe(true);
        } else {
          // 没有可用模型时，应该有相应的错误
          expect(validation.isValid).toBe(false);
          expect(validation.errors.some(e => e.includes('没有可用的文本模型'))).toBe(true);
        }
      }
    ), { numRuns: 50 });
  });

  /**
   * 属性：用户偏好设置更新应该保持一致性
   */
  it('Property: User preferences updates maintain consistency', () => {
    fc.assert(fc.property(
      fc.record({
        defaultTextModel: fc.option(fc.constantFrom(...SHENMA_TEXT_MODELS.map(m => m.id))),
        showModelCapabilities: fc.option(fc.boolean()),
        showPricing: fc.option(fc.boolean()),
        autoSaveConversations: fc.option(fc.boolean()),
        preferredLanguage: fc.option(fc.constantFrom('zh', 'en'))
      }),
      (updates) => {
        const originalPreferences = manager.getUserPreferences();
        
        // 更新偏好设置
        manager.updateUserPreferences(updates);
        const updatedPreferences = manager.getUserPreferences();

        // 验证更新的字段
        Object.keys(updates).forEach(key => {
          if (updates[key as keyof typeof updates] !== undefined) {
            expect(updatedPreferences[key as keyof typeof updatedPreferences])
              .toBe(updates[key as keyof typeof updates]);
          }
        });

        // 验证未更新的字段保持不变
        Object.keys(originalPreferences).forEach(key => {
          if (!(key in updates) || updates[key as keyof typeof updates] === undefined) {
            expect(updatedPreferences[key as keyof typeof updatedPreferences])
              .toEqual(originalPreferences[key as keyof typeof originalPreferences]);
          }
        });
      }
    ), { numRuns: 50 });
  });

  /**
   * 属性：模型能力标识应该与模型信息一致
   */
  it('Property: Model capability badges match model info', () => {
    fc.assert(fc.property(
      fc.constantFrom(...SHENMA_TEXT_MODELS.map(m => m.id)),
      fc.constantFrom('zh', 'en'),
      (modelId, lang) => {
        const modelInfo = manager.getModelInfo(modelId);
        const badges = manager.getModelCapabilityBadges(modelId, lang);

        if (!modelInfo) {
          expect(badges).toEqual([]);
          return;
        }

        // 验证推荐标识
        const hasRecommendedBadge = badges.some(b => b.icon === '⭐');
        expect(hasRecommendedBadge).toBe(modelInfo.capabilities.isRecommended);

        // 验证联网标识
        const hasInternetBadge = badges.some(b => b.icon === '🌐');
        expect(hasInternetBadge).toBe(modelInfo.capabilities.supportsInternet);

        // 验证多模态标识
        const hasMultimodalBadge = badges.some(b => b.icon === '🎭');
        expect(hasMultimodalBadge).toBe(
          modelInfo.capabilities.supportsImages || modelInfo.capabilities.supportsVideo
        );

        // 验证思维链标识
        const hasThinkingBadge = badges.some(b => b.icon === '🤔');
        expect(hasThinkingBadge).toBe(modelInfo.capabilities.supportsThinking);

        // 验证实验标识
        const hasExperimentalBadge = badges.some(b => b.icon === '🧪');
        expect(hasExperimentalBadge).toBe(modelInfo.capabilities.isExperimental);

        // 验证语言本地化
        badges.forEach(badge => {
          expect(badge.text).toBeTruthy();
          expect(badge.color).toBeTruthy();
          expect(badge.icon).toBeTruthy();
        });
      }
    ), { numRuns: 100 });
  });
});