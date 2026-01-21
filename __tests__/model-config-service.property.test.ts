/**
 * Property-Based Tests for ModelConfigService
 * 
 * 测试智能参数面板系统中模型配置服务的正确性属性
 * Tests correctness properties of the model configuration service in the intelligent parameter panel system
 */

import { describe, test, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { ModelConfigService } from '../services/ModelConfigService';
import { 
  ModelParameter, 
  ModelRestrictions, 
  GenerationParameters,
  IMAGE_MODELS,
  VIDEO_MODELS,
  getModelComplexity
} from '../types';

describe('ModelConfigService Property Tests', () => {
  let service: ModelConfigService;

  beforeEach(() => {
    service = ModelConfigService.getInstance();
    service.clearCache(); // 确保每个测试都是干净的状态
  });

  /**
   * Property 7: Model-Specific Parameter Loading
   * 
   * For any model selection, the Parameter_Panel should display only the parameters 
   * supported by that model and update immediately when the model changes
   * 
   * **Validates: Requirements 4.1, 4.2, 4.5**
   */
  test('Property 7: Model-Specific Parameter Loading', () => {
    fc.assert(
      fc.property(
        // 生成测试数据：模型ID和生成类型
        fc.oneof(
          fc.constantFrom(...IMAGE_MODELS.basic, ...IMAGE_MODELS.advanced, ...IMAGE_MODELS.editing),
          fc.constantFrom(...VIDEO_MODELS.sora, ...VIDEO_MODELS.veo, ...VIDEO_MODELS.wanx, ...VIDEO_MODELS.special)
        ),
        fc.constantFrom('image', 'video'),
        (modelId: string, generationType: 'image' | 'video') => {
          // 确保模型和生成类型匹配
          const isImageModel = [...IMAGE_MODELS.basic, ...IMAGE_MODELS.advanced, ...IMAGE_MODELS.editing].includes(modelId as any);
          const isVideoModel = [...VIDEO_MODELS.sora, ...VIDEO_MODELS.veo, ...VIDEO_MODELS.wanx, ...VIDEO_MODELS.special].includes(modelId as any);
          
          if ((generationType === 'image' && !isImageModel) || (generationType === 'video' && !isVideoModel)) {
            return true; // 跳过不匹配的组合
          }

          // 获取模型参数
          const parameters = service.getModelParameters(modelId, generationType);
          
          // Property: 参数列表不应为空
          expect(parameters).toBeDefined();
          expect(Array.isArray(parameters)).toBe(true);
          expect(parameters.length).toBeGreaterThan(0);
          
          // Property: 所有参数都应有必需的字段
          parameters.forEach(param => {
            expect(param).toHaveProperty('key');
            expect(param).toHaveProperty('label');
            expect(param).toHaveProperty('type');
            expect(param).toHaveProperty('defaultValue');
            expect(param).toHaveProperty('required');
            expect(param).toHaveProperty('validation');
            
            // Property: 参数键应该是非空字符串
            expect(typeof param.key).toBe('string');
            expect(param.key.length).toBeGreaterThan(0);
            
            // Property: 参数类型应该是有效的
            expect(['text', 'number', 'select', 'boolean', 'file', 'range']).toContain(param.type);
          });
          
          // Property: 应该包含基础的prompt参数
          const promptParam = parameters.find(p => p.key === 'prompt');
          expect(promptParam).toBeDefined();
          expect(promptParam?.required).toBe(true);
          
          // Property: 根据生成类型应该包含相应的参数
          if (generationType === 'image') {
            const aspectRatioParam = parameters.find(p => p.key === 'aspectRatio');
            expect(aspectRatioParam).toBeDefined();
            
            const imageSizeParam = parameters.find(p => p.key === 'imageSize');
            expect(imageSizeParam).toBeDefined();
          } else if (generationType === 'video') {
            const aspectRatioParam = parameters.find(p => p.key === 'aspectRatio');
            expect(aspectRatioParam).toBeDefined();
            
            const durationParam = parameters.find(p => p.key === 'duration');
            expect(durationParam).toBeDefined();
          }
          
          // Property: 复杂模型应该有更多参数
          const complexity = getModelComplexity(modelId);
          if (complexity === 'complex') {
            expect(parameters.length).toBeGreaterThan(5);
          } else if (complexity === 'medium') {
            expect(parameters.length).toBeGreaterThan(3);
          }
          
          // Property: 参数键应该是唯一的
          const paramKeys = parameters.map(p => p.key);
          const uniqueKeys = new Set(paramKeys);
          expect(uniqueKeys.size).toBe(paramKeys.length);
          
          return true;
        }
      ),
      { numRuns: 100, verbose: true }
    );
  });

  /**
   * Property: Model Restrictions Consistency
   * 
   * For any model, the restrictions should be consistent and valid
   */
  test('Property: Model Restrictions Consistency', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom(...IMAGE_MODELS.basic, ...IMAGE_MODELS.advanced, ...IMAGE_MODELS.editing),
          fc.constantFrom(...VIDEO_MODELS.sora, ...VIDEO_MODELS.veo, ...VIDEO_MODELS.wanx, ...VIDEO_MODELS.special)
        ),
        (modelId: string) => {
          const restrictions = service.getModelRestrictions(modelId);
          
          // Property: 限制对象应该有必需的字段
          expect(restrictions).toHaveProperty('maxFileSize');
          expect(restrictions).toHaveProperty('supportedFormats');
          expect(restrictions).toHaveProperty('supportedAspectRatios');
          expect(restrictions).toHaveProperty('parameterLimits');
          
          // Property: 文件大小限制应该是正数
          expect(restrictions.maxFileSize).toBeGreaterThan(0);
          
          // Property: 支持的格式应该是非空数组
          expect(Array.isArray(restrictions.supportedFormats)).toBe(true);
          expect(restrictions.supportedFormats.length).toBeGreaterThan(0);
          
          // Property: 支持的宽高比应该是非空数组
          expect(Array.isArray(restrictions.supportedAspectRatios)).toBe(true);
          expect(restrictions.supportedAspectRatios.length).toBeGreaterThan(0);
          
          // Property: 宽高比格式应该正确
          restrictions.supportedAspectRatios.forEach(ratio => {
            expect(ratio).toMatch(/^\d+:\d+$/);
          });
          
          // Property: 参数限制应该是对象
          expect(typeof restrictions.parameterLimits).toBe('object');
          
          // Property: 如果有最大分辨率，应该是正数
          if (restrictions.maxResolution) {
            expect(restrictions.maxResolution.width).toBeGreaterThan(0);
            expect(restrictions.maxResolution.height).toBeGreaterThan(0);
          }
          
          // Property: 如果有最大时长，应该是正数
          if (restrictions.maxDuration) {
            expect(restrictions.maxDuration).toBeGreaterThan(0);
          }
          
          return true;
        }
      ),
      { numRuns: 50, verbose: true }
    );
  });

  /**
   * Property: Parameter Validation Correctness
   * 
   * For any parameter validation, the result should be consistent and meaningful
   */
  test('Property: Parameter Validation Correctness', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('nano-banana', 'sora-2', 'byteedit-v2.0'),
        fc.constantFrom('aspectRatio', 'guidanceScale', 'steps', 'duration'),
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.float(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        (modelId: string, parameterKey: string, value: any) => {
          const result = service.validateParameter(modelId, parameterKey, value);
          
          // Property: 验证结果应该有必需的字段
          expect(result).toHaveProperty('isValid');
          expect(result).toHaveProperty('errors');
          expect(result).toHaveProperty('warnings');
          
          // Property: isValid应该与errors数组一致
          expect(result.isValid).toBe(result.errors.length === 0);
          
          // Property: errors应该是数组
          expect(Array.isArray(result.errors)).toBe(true);
          expect(Array.isArray(result.warnings)).toBe(true);
          
          // Property: 每个错误都应该有必需的字段
          result.errors.forEach(error => {
            expect(error).toHaveProperty('parameterKey');
            expect(error).toHaveProperty('message');
            expect(error).toHaveProperty('code');
            expect(error).toHaveProperty('severity');
            
            expect(error.parameterKey).toBe(parameterKey);
            expect(typeof error.message).toBe('string');
            expect(error.message.length).toBeGreaterThan(0);
            expect(['error', 'warning']).toContain(error.severity);
          });
          
          return true;
        }
      ),
      { numRuns: 100, verbose: true }
    );
  });

  /**
   * Property: Recommended Parameters Validity
   * 
   * For any model, the recommended parameters should be valid according to the model's restrictions
   */
  test('Property: Recommended Parameters Validity', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom(...IMAGE_MODELS.basic, ...IMAGE_MODELS.advanced),
          fc.constantFrom(...VIDEO_MODELS.sora, ...VIDEO_MODELS.veo)
        ),
        fc.constantFrom('image', 'video'),
        (modelId: string, generationType: 'image' | 'video') => {
          // 确保模型和生成类型匹配
          const isImageModel = [...IMAGE_MODELS.basic, ...IMAGE_MODELS.advanced, ...IMAGE_MODELS.editing].includes(modelId as any);
          const isVideoModel = [...VIDEO_MODELS.sora, ...VIDEO_MODELS.veo, ...VIDEO_MODELS.wanx, ...VIDEO_MODELS.special].includes(modelId as any);
          
          if ((generationType === 'image' && !isImageModel) || (generationType === 'video' && !isVideoModel)) {
            return true; // 跳过不匹配的组合
          }

          const recommendedParams = service.getRecommendedParameters(modelId, generationType);
          const restrictions = service.getModelRestrictions(modelId);
          
          // Property: 推荐参数应该包含prompt
          expect(recommendedParams).toHaveProperty('prompt');
          expect(typeof recommendedParams.prompt).toBe('string');
          
          // Property: 推荐的宽高比应该在支持列表中
          if (recommendedParams.aspectRatio) {
            expect(restrictions.supportedAspectRatios).toContain(recommendedParams.aspectRatio);
          }
          
          // Property: 推荐参数应该通过验证
          Object.entries(recommendedParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              const validationResult = service.validateParameter(modelId, key, value);
              expect(validationResult.isValid).toBe(true);
            }
          });
          
          return true;
        }
      ),
      { numRuns: 50, verbose: true }
    );
  });

  /**
   * Property: Cache Consistency
   * 
   * Multiple calls to the same method with same parameters should return identical results
   */
  test('Property: Cache Consistency', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('nano-banana', 'sora-2', 'flux-kontext-pro'),
        fc.constantFrom('image', 'video'),
        (modelId: string, generationType: 'image' | 'video') => {
          // 确保模型和生成类型匹配
          const isImageModel = [...IMAGE_MODELS.basic, ...IMAGE_MODELS.advanced, ...IMAGE_MODELS.editing].includes(modelId as any);
          const isVideoModel = [...VIDEO_MODELS.sora, ...VIDEO_MODELS.veo, ...VIDEO_MODELS.wanx, ...VIDEO_MODELS.special].includes(modelId as any);
          
          if ((generationType === 'image' && !isImageModel) || (generationType === 'video' && !isVideoModel)) {
            return true; // 跳过不匹配的组合
          }

          // 多次调用应该返回相同结果
          const params1 = service.getModelParameters(modelId, generationType);
          const params2 = service.getModelParameters(modelId, generationType);
          const restrictions1 = service.getModelRestrictions(modelId);
          const restrictions2 = service.getModelRestrictions(modelId);
          
          // Property: 参数应该完全相同
          expect(params1).toEqual(params2);
          expect(restrictions1).toEqual(restrictions2);
          
          // Property: 应该是同一个对象引用（缓存）
          expect(params1).toBe(params2);
          expect(restrictions1).toBe(restrictions2);
          
          return true;
        }
      ),
      { numRuns: 30, verbose: true }
    );
  });

  /**
   * Property: Supported Generation Types Accuracy
   * 
   * The supported generation types should accurately reflect the model's capabilities
   */
  test('Property: Supported Generation Types Accuracy', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom(...IMAGE_MODELS.basic, ...IMAGE_MODELS.advanced, ...IMAGE_MODELS.editing),
          fc.constantFrom(...VIDEO_MODELS.sora, ...VIDEO_MODELS.veo, ...VIDEO_MODELS.wanx, ...VIDEO_MODELS.special)
        ),
        (modelId: string) => {
          const supportedTypes = service.getSupportedGenerationTypes(modelId);
          
          // Property: 应该返回非空数组
          expect(Array.isArray(supportedTypes)).toBe(true);
          expect(supportedTypes.length).toBeGreaterThan(0);
          
          // Property: 只应该包含有效的生成类型
          supportedTypes.forEach(type => {
            expect(['image', 'video']).toContain(type);
          });
          
          // Property: 图像模型应该支持图像生成
          const isImageModel = [...IMAGE_MODELS.basic, ...IMAGE_MODELS.advanced, ...IMAGE_MODELS.editing].includes(modelId as any);
          if (isImageModel) {
            expect(supportedTypes).toContain('image');
          }
          
          // Property: 视频模型应该支持视频生成
          const isVideoModel = [...VIDEO_MODELS.sora, ...VIDEO_MODELS.veo, ...VIDEO_MODELS.wanx, ...VIDEO_MODELS.special].includes(modelId as any);
          if (isVideoModel) {
            expect(supportedTypes).toContain('video');
          }
          
          return true;
        }
      ),
      { numRuns: 50, verbose: true }
    );
  });
});

// 标记测试特征和属性
console.log('Feature: intelligent-parameter-panel, Property 7: Model-Specific Parameter Loading');