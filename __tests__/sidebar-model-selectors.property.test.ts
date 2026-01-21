/**
 * Sidebar Model Selectors Property-Based Tests
 * 使用 fast-check 进行属性测试，验证系统的通用行为
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { 
  getAllImageModels, 
  getAllVideoModels, 
  UserModelPreferences,
  DEFAULT_MODEL_PREFERENCES 
} from '../types';
import { FeatureModelManager } from '../services/FeatureModelManager';
import { ModelPreferencesStorage } from '../utils/ModelPreferencesStorage';
import { SmartRoutingService } from '../services/SmartRoutingService';

describe('Feature: sidebar-model-selectors', () => {
  let featureManager: FeatureModelManager;

  beforeEach(() => {
    featureManager = new FeatureModelManager();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // 自定义生成器
  const imageModelGen = fc.constantFrom(...getAllImageModels());
  const videoModelGen = fc.constantFrom(...getAllVideoModels());
  const generationTypeGen = fc.constantFrom('image', 'video', 'text');
  const featureIdGen = fc.constantFrom(
    'smear-removal', 'style-transfer', 'background-removal', 
    'image-enhance', 'character-cameo', 'video-style-transfer', 
    'character-animation'
  );

  const userPreferencesGen = fc.record({
    defaultImageModel: imageModelGen,
    defaultVideoModel: videoModelGen,
    defaultTextModel: fc.constantFrom('gemini-3-flash-preview-nothinking', 'gemini-3-pro-preview'),
    lastUpdated: fc.date()
  });

  describe('Property 1: 侧边栏模型选择持久化', () => {
    it('Property 1: Model Preference Persistence', () => {
      fc.assert(fc.property(
        fc.record({
          generationType: generationTypeGen,
          modelId: fc.oneof(imageModelGen, videoModelGen),
          isValid: fc.boolean()
        }),
        (testCase) => {
          // 对于任何有效的模型选择，设置为全局偏好应该能够存储和检索
          if (testCase.isValid) {
            let success = false;
            let retrieved = '';
            
            if (testCase.generationType === 'image' && getAllImageModels().includes(testCase.modelId)) {
              success = ModelPreferencesStorage.setImageModelPreference(testCase.modelId);
              retrieved = ModelPreferencesStorage.getImageModelPreference();
            } else if (testCase.generationType === 'video' && getAllVideoModels().includes(testCase.modelId)) {
              success = ModelPreferencesStorage.setVideoModelPreference(testCase.modelId);
              retrieved = ModelPreferencesStorage.getVideoModelPreference();
            } else {
              // 跳过无效组合
              return true;
            }
            
            expect(success).toBe(true);
            expect(retrieved).toBe(testCase.modelId);
          }
          
          return true;
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 2: 功能智能匹配', () => {
    it('Property 2: Feature Smart Matching', () => {
      fc.assert(fc.property(
        fc.record({
          featureId: featureIdGen,
          userPreference: fc.oneof(imageModelGen, videoModelGen),
          hasRequirement: fc.boolean()
        }),
        (testCase) => {
          // 对于任何需要特定模型的画布功能，系统应该使用正确的模型
          const result = featureManager.getModelForFeature(testCase.featureId, testCase.userPreference);
          
          // 如果功能有模型要求，应该返回锁定状态
          const requiredModel = featureManager.getRequiredModel(testCase.featureId);
          if (requiredModel) {
            expect(result.selectedModel).toBe(requiredModel);
            if (testCase.userPreference !== requiredModel) {
              expect(result.isLocked).toBe(true);
              expect(result.conflictWithPreference).toBe(true);
              expect(result.lockReason).toBeTruthy();
            }
          }
          
          return true;
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 3: 基础生成偏好尊重', () => {
    it('Property 3: Basic Generation Preference Respect', () => {
      fc.assert(fc.property(
        fc.record({
          generationType: generationTypeGen,
          userPreference: fc.oneof(imageModelGen, videoModelGen),
          content: fc.string({ minLength: 1, maxLength: 100 })
        }),
        (testCase) => {
          // 对于任何基础生成操作，系统应该使用用户选择的全局偏好
          const mockConfig = {
            providers: {},
            text: { provider: 'shenma' as const, modelId: 'gemini-3-flash-preview-nothinking' },
            image: { provider: 'shenma' as const, modelId: testCase.userPreference },
            video: { provider: 'shenma' as const, modelId: testCase.userPreference },
            _meta: { version: '2.0', lastSaved: Date.now() }
          };
          
          const smartRouting = new SmartRoutingService(mockConfig);
          
          // 测试智能路由推荐
          if (testCase.generationType === 'image' && getAllImageModels().includes(testCase.userPreference)) {
            const recommended = smartRouting.recommendImageModel(testCase.content, undefined, testCase.userPreference);
            // 如果没有特殊要求，应该尊重用户偏好
            if (!testCase.content.includes('编辑') && !testCase.content.includes('去除')) {
              expect(recommended).toBe(testCase.userPreference);
            }
          }
          
          return true;
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 4: 友好提醒显示', () => {
    it('Property 4: Friendly Lock Indication', () => {
      fc.assert(fc.property(
        fc.record({
          featureId: featureIdGen,
          userPreference: fc.oneof(imageModelGen, videoModelGen)
        }),
        (testCase) => {
          // 对于任何模型锁定情况，UI应该显示清晰的说明
          const result = featureManager.getModelForFeature(testCase.featureId, testCase.userPreference);
          
          if (result.isLocked) {
            // 锁定时必须有原因说明
            expect(result.lockReason).toBeTruthy();
            expect(typeof result.lockReason).toBe('string');
            expect(result.lockReason.length).toBeGreaterThan(0);
            
            // 锁定的模型必须是有效的
            expect(result.selectedModel).toBeTruthy();
            expect(typeof result.selectedModel).toBe('string');
          }
          
          return true;
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 5: 向后兼容性', () => {
    it('Property 5: Backward Compatibility', () => {
      fc.assert(fc.property(
        userPreferencesGen,
        (preferences) => {
          // 对于任何现有功能，添加新模型选择器后应该继续正常工作
          
          // 测试偏好存储的向后兼容性
          const success = ModelPreferencesStorage.savePreferences(preferences);
          expect(success).toBe(true);
          
          const retrieved = ModelPreferencesStorage.getPreferences();
          expect(retrieved.defaultImageModel).toBe(preferences.defaultImageModel);
          expect(retrieved.defaultVideoModel).toBe(preferences.defaultVideoModel);
          expect(retrieved.defaultTextModel).toBe(preferences.defaultTextModel);
          
          // 测试默认值的完整性
          expect(retrieved).toHaveProperty('defaultImageModel');
          expect(retrieved).toHaveProperty('defaultVideoModel');
          expect(retrieved).toHaveProperty('defaultTextModel');
          expect(retrieved).toHaveProperty('lastUpdated');
          
          return true;
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 6: 模型列表完整性', () => {
    it('Property 6: Model List Integrity', () => {
      fc.assert(fc.property(
        fc.constantFrom('image', 'video'),
        (modelType) => {
          // 对于任何模型类型，列表应该是完整和一致的
          const models = modelType === 'image' ? getAllImageModels() : getAllVideoModels();
          
          // 模型列表不应为空
          expect(models.length).toBeGreaterThan(0);
          
          // 所有模型ID应该是有效字符串
          models.forEach(modelId => {
            expect(typeof modelId).toBe('string');
            expect(modelId.length).toBeGreaterThan(0);
            expect(modelId.trim()).toBe(modelId); // 不应有前后空格
          });
          
          // 不应有重复的模型
          const uniqueModels = [...new Set(models)];
          expect(uniqueModels.length).toBe(models.length);
          
          return true;
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 7: 功能绑定一致性', () => {
    it('Property 7: Feature Binding Consistency', () => {
      fc.assert(fc.property(
        featureIdGen,
        (featureId) => {
          // 对于任何有效的功能ID，绑定信息应该是一致的
          const requiredModel = featureManager.getRequiredModel(featureId);
          const lockReason = featureManager.getLockReason(featureId);
          const isValid = featureManager.isValidFeature(featureId);
          
          expect(isValid).toBe(true); // 生成器只生成有效的功能ID
          expect(requiredModel).toBeTruthy();
          expect(typeof requiredModel).toBe('string');
          expect(lockReason).toBeTruthy();
          expect(typeof lockReason).toBe('string');
          
          // 显示名称应该存在
          const displayNameZh = featureManager.getFeatureDisplayName(featureId, 'zh');
          const displayNameEn = featureManager.getFeatureDisplayName(featureId, 'en');
          
          expect(displayNameZh).toBeTruthy();
          expect(displayNameEn).toBeTruthy();
          expect(displayNameZh).not.toBe(displayNameEn); // 应该有不同的语言版本
          
          return true;
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 8: 存储错误处理', () => {
    it('Property 8: Storage Error Handling', () => {
      fc.assert(fc.property(
        userPreferencesGen,
        (preferences) => {
          // 对于任何存储操作，系统应该优雅地处理错误
          
          // 模拟存储错误
          const originalSetItem = localStorage.setItem;
          const originalGetItem = localStorage.getItem;
          let errorThrown = false;
          
          localStorage.setItem = () => {
            errorThrown = true;
            throw new Error('Storage error');
          };
          localStorage.getItem = () => {
            throw new Error('Storage error');
          };
          
          // 尝试保存偏好
          const success = ModelPreferencesStorage.savePreferences(preferences);
          expect(success).toBe(false); // 应该返回失败状态而不是抛出异常
          expect(errorThrown).toBe(true);
          
          // 恢复原始方法
          localStorage.setItem = originalSetItem;
          localStorage.getItem = originalGetItem;
          
          // 系统应该仍然能够返回默认值
          const retrieved = ModelPreferencesStorage.getPreferences();
          expect(retrieved).toBeDefined();
          expect(retrieved.defaultImageModel).toBeTruthy();
          expect(retrieved.defaultVideoModel).toBeTruthy();
          expect(retrieved.defaultTextModel).toBeTruthy();
          
          return true;
        }
      ), { numRuns: 10 }); // 减少运行次数避免过多的 localStorage 操作
    });
  });

  describe('Property 9: 智能路由一致性', () => {
    it('Property 9: Smart Routing Consistency', () => {
      fc.assert(fc.property(
        fc.record({
          content: fc.string({ minLength: 1, maxLength: 200 }),
          generationType: fc.constantFrom('image', 'video'),
          userPreference: fc.oneof(imageModelGen, videoModelGen)
        }),
        (testCase) => {
          // 对于任何内容和用户偏好，智能路由应该返回一致的结果
          const mockConfig = {
            providers: {},
            text: { provider: 'shenma' as const, modelId: 'gemini-3-flash-preview-nothinking' },
            image: { provider: 'shenma' as const, modelId: testCase.userPreference },
            video: { provider: 'shenma' as const, modelId: testCase.userPreference },
            _meta: { version: '2.0', lastSaved: Date.now() }
          };
          
          const smartRouting = new SmartRoutingService(mockConfig);
          
          // 多次调用应该返回相同结果
          let firstResult: string;
          let secondResult: string;
          
          if (testCase.generationType === 'image' && getAllImageModels().includes(testCase.userPreference)) {
            firstResult = smartRouting.recommendImageModel(testCase.content, undefined, testCase.userPreference);
            secondResult = smartRouting.recommendImageModel(testCase.content, undefined, testCase.userPreference);
          } else if (testCase.generationType === 'video' && getAllVideoModels().includes(testCase.userPreference)) {
            firstResult = smartRouting.recommendVideoModel(testCase.content, undefined, testCase.userPreference);
            secondResult = smartRouting.recommendVideoModel(testCase.content, undefined, testCase.userPreference);
          } else {
            return true; // 跳过无效组合
          }
          
          expect(firstResult).toBe(secondResult);
          expect(firstResult).toBeTruthy();
          expect(typeof firstResult).toBe('string');
          
          return true;
        }
      ), { numRuns: 100 });
    });
  });
});