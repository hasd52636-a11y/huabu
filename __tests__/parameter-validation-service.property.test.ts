/**
 * Property-Based Tests for ParameterValidationService
 * 
 * Tests Property 9: Real-Time Parameter Validation
 * Validates: Requirements 5.1, 5.2, 5.3, 7.1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { ParameterValidationService } from '../services/ParameterValidationService';
import { 
  GenerationParameters, 
  ParameterValidationResult,
  IMAGE_MODELS,
  VIDEO_MODELS
} from '../types';

describe('ParameterValidationService Property Tests', () => {
  let service: ParameterValidationService;

  beforeEach(() => {
    service = ParameterValidationService.getInstance();
  });

  afterEach(() => {
    service.cleanup();
  });

  /**
   * Property 9: Real-Time Parameter Validation
   * **Validates: Requirements 5.1, 5.2, 5.3, 7.1**
   * 
   * 验证实时参数验证的正确性和一致性
   */
  describe('Property 9: Real-Time Parameter Validation', () => {
    
    it('should validate parameters consistently across multiple calls', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constantFrom(...IMAGE_MODELS.basic, ...IMAGE_MODELS.advanced),
          fc.constantFrom(...VIDEO_MODELS.sora, ...VIDEO_MODELS.veo)
        ),
        fc.record({
          prompt: fc.string({ minLength: 1, maxLength: 2000 }),
          negativePrompt: fc.option(fc.string({ maxLength: 1000 })),
          aspectRatio: fc.constantFrom('1:1', '4:3', '16:9', '9:16', '4:5', '5:4'),
          imageSize: fc.option(fc.constantFrom('1K', '2K', '4K')),
          duration: fc.option(fc.constantFrom('10', '15', '25')),
          guidanceScale: fc.option(fc.float({ min: 1, max: 20 })),
          steps: fc.option(fc.integer({ min: 10, max: 50 })),
          seed: fc.option(fc.integer({ min: -1, max: 2147483647 }))
        }),
        (modelId, parameters) => {
          // Property: 多次验证同一参数集应返回相同结果
          const result1 = service.validateParameters(modelId, parameters);
          const result2 = service.validateParameters(modelId, parameters);
          
          expect(result1).toEqual(result2);
          
          // Property: 验证结果应包含正确的结构
          result1.forEach(result => {
            expect(result).toHaveProperty('isValid');
            expect(result).toHaveProperty('errors');
            expect(result).toHaveProperty('warnings');
            expect(Array.isArray(result.errors)).toBe(true);
            expect(Array.isArray(result.warnings)).toBe(true);
          });
        }
      ), { numRuns: 50 });
    });

    it('should validate required parameters correctly', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constantFrom(...IMAGE_MODELS.basic, ...IMAGE_MODELS.advanced),
          fc.constantFrom(...VIDEO_MODELS.sora, ...VIDEO_MODELS.veo)
        ),
        fc.record({
          prompt: fc.option(fc.string()),
          aspectRatio: fc.option(fc.constantFrom('1:1', '4:3', '16:9', '9:16')),
          imageSize: fc.option(fc.constantFrom('1K', '2K', '4K'))
        }),
        (modelId, parameters) => {
          const results = service.validateParameters(modelId, parameters);
          
          // Property: 空提示词应该产生错误
          if (!parameters.prompt || parameters.prompt.trim().length === 0) {
            const hasPromptError = results.some(result => 
              result.errors.some(error => 
                error.parameterKey === 'prompt' && 
                error.code === 'REQUIRED_PARAMETER_MISSING'
              )
            );
            expect(hasPromptError).toBe(true);
          }
          
          // Property: 有效提示词不应产生必需参数错误
          if (parameters.prompt && parameters.prompt.trim().length > 0) {
            const hasPromptError = results.some(result => 
              result.errors.some(error => 
                error.parameterKey === 'prompt' && 
                error.code === 'REQUIRED_PARAMETER_MISSING'
              )
            );
            expect(hasPromptError).toBe(false);
          }
        }
      ), { numRuns: 30 });
    });

    it('should validate parameter ranges correctly', () => {
      fc.assert(fc.property(
        fc.constantFrom(...IMAGE_MODELS.advanced),
        fc.record({
          prompt: fc.string({ minLength: 1, maxLength: 100 }),
          guidanceScale: fc.float({ min: -5, max: 25 }),
          steps: fc.integer({ min: -10, max: 100 })
        }),
        (modelId, parameters) => {
          const results = service.validateParameters(modelId, parameters);
          
          // Property: 超出范围的guidanceScale应产生错误
          if (parameters.guidanceScale < 1 || parameters.guidanceScale > 20) {
            const hasRangeError = results.some(result => 
              result.errors.some(error => 
                error.parameterKey === 'guidanceScale' && 
                (error.code === 'MIN_VALUE_ERROR' || error.code === 'MAX_VALUE_ERROR')
              )
            );
            expect(hasRangeError).toBe(true);
          }
          
          // Property: 超出范围的steps应产生错误
          if (parameters.steps < 10 || parameters.steps > 50) {
            const hasRangeError = results.some(result => 
              result.errors.some(error => 
                error.parameterKey === 'steps' && 
                (error.code === 'MIN_VALUE_ERROR' || error.code === 'MAX_VALUE_ERROR')
              )
            );
            expect(hasRangeError).toBe(true);
          }
        }
      ), { numRuns: 40 });
    });

    it('should validate text length constraints', () => {
      fc.assert(fc.property(
        fc.constantFrom(...IMAGE_MODELS.basic),
        fc.record({
          prompt: fc.string({ maxLength: 3000 }),
          negativePrompt: fc.option(fc.string({ maxLength: 1500 }))
        }),
        (modelId, parameters) => {
          const results = service.validateParameters(modelId, parameters);
          
          // Property: 过长的提示词应产生错误
          if (parameters.prompt.length > 2000) {
            const hasLengthError = results.some(result => 
              result.errors.some(error => 
                error.parameterKey === 'prompt' && 
                error.code === 'TEXT_TOO_LONG'
              )
            );
            expect(hasLengthError).toBe(true);
          }
          
          // Property: 过长的负面提示词应产生错误
          if (parameters.negativePrompt && parameters.negativePrompt.length > 1000) {
            const hasLengthError = results.some(result => 
              result.errors.some(error => 
                error.parameterKey === 'negativePrompt' && 
                error.code === 'TEXT_TOO_LONG'
              )
            );
            expect(hasLengthError).toBe(true);
          }
        }
      ), { numRuns: 30 });
    });

    it('should validate parameter combinations correctly', () => {
      fc.assert(fc.property(
        fc.constantFrom(...IMAGE_MODELS.advanced),
        fc.record({
          prompt: fc.string({ minLength: 1, maxLength: 100 }),
          guidanceScale: fc.float({ min: 1, max: 20 }),
          steps: fc.integer({ min: 10, max: 50 }),
          aspectRatio: fc.constantFrom('21:9', '2:3', '3:2'),
          imageSize: fc.constantFrom('2K', '4K')
        }),
        (modelId, parameters) => {
          const results = service.validateParameters(modelId, parameters);
          
          // Property: 某些宽高比和高分辨率组合应产生警告
          if (parameters.aspectRatio === '21:9' && parameters.imageSize === '4K') {
            const hasWarning = results.some(result => 
              result.warnings.some(warning => 
                warning.parameterKey === 'aspectRatio'
              )
            );
            expect(hasWarning).toBe(true);
          }
          
          // Property: 高引导强度配合低步数应产生警告
          if (parameters.guidanceScale > 15 && parameters.steps < 20) {
            const hasWarning = results.some(result => 
              result.warnings.some(warning => 
                warning.parameterKey === 'guidanceScale'
              )
            );
            expect(hasWarning).toBe(true);
          }
        }
      ), { numRuns: 25 });
    });

    it('should validate aspect ratio constraints', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constantFrom(...IMAGE_MODELS.basic),
          fc.constantFrom(...VIDEO_MODELS.sora)
        ),
        fc.constantFrom('1:2', '5:1', '10:1', '1:10', 'invalid'),
        (modelId, aspectRatio) => {
          // 获取支持的宽高比
          const supportedRatios = ['1:1', '4:3', '16:9', '9:16', '4:5', '5:4', '2:3', '3:2', '21:9'];
          
          const isValid = service.validateAspectRatio(aspectRatio, supportedRatios);
          
          // Property: 只有支持的宽高比应该通过验证
          if (supportedRatios.includes(aspectRatio)) {
            expect(isValid).toBe(true);
          } else {
            expect(isValid).toBe(false);
          }
        }
      ), { numRuns: 20 });
    });

    it('should validate resolution constraints correctly', () => {
      fc.assert(fc.property(
        fc.integer({ min: 100, max: 8192 }),
        fc.integer({ min: 100, max: 8192 }),
        fc.integer({ min: 1024, max: 4096 }),
        fc.integer({ min: 1024, max: 4096 }),
        (width, height, maxWidth, maxHeight) => {
          const result = service.validateResolution(width, height, maxWidth, maxHeight);
          
          // Property: 超出限制的分辨率应产生错误
          if (width > maxWidth || height > maxHeight) {
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].code).toBe('RESOLUTION_EXCEEDED');
          } else {
            // Property: 在限制内的分辨率不应产生错误
            const hasResolutionError = result.errors.some(error => 
              error.code === 'RESOLUTION_EXCEEDED'
            );
            expect(hasResolutionError).toBe(false);
          }
        }
      ), { numRuns: 30 });
    });

    it('should provide consistent validation summaries', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            isValid: fc.boolean(),
            errors: fc.array(fc.record({
              parameterKey: fc.string(),
              message: fc.string(),
              code: fc.string(),
              severity: fc.constantFrom('error', 'warning')
            })),
            warnings: fc.array(fc.record({
              parameterKey: fc.string(),
              message: fc.string(),
              suggestion: fc.option(fc.string())
            }))
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (results) => {
          const summary = service.getValidationSummary(results);
          
          // Property: 摘要应正确计算错误和警告数量
          const expectedErrors = results.reduce((sum, result) => sum + result.errors.length, 0);
          const expectedWarnings = results.reduce((sum, result) => sum + result.warnings.length, 0);
          
          expect(summary.totalErrors).toBe(expectedErrors);
          expect(summary.totalWarnings).toBe(expectedWarnings);
          
          // Property: 有错误时isValid应为false
          expect(summary.isValid).toBe(expectedErrors === 0);
          
          // Property: 关键错误应只包含severity为'error'的错误
          summary.criticalErrors.forEach(error => {
            expect(error.severity).toBe('error');
          });
        }
      ), { numRuns: 20 });
    });
  });

  /**
   * File Validation Tests
   */
  describe('File Validation Properties', () => {
    
    it('should validate file sizes correctly', () => {
      fc.assert(fc.property(
        fc.integer({ min: 0, max: 100 * 1024 * 1024 }), // 0 to 100MB
        fc.integer({ min: 1024, max: 50 * 1024 * 1024 }), // 1KB to 50MB
        (fileSize, maxSize) => {
          // 创建模拟文件对象
          const mockFile = { size: fileSize } as File;
          
          const isValid = service.validateFileSize(mockFile, maxSize);
          
          // Property: 文件大小不超过限制时应该有效
          if (fileSize <= maxSize) {
            expect(isValid).toBe(true);
          } else {
            expect(isValid).toBe(false);
          }
        }
      ), { numRuns: 30 });
    });

    it('should validate file formats correctly', () => {
      const supportedFormatsOptions = [
        ['image/jpeg', 'image/png', 'image/webp'],
        ['video/mp4', 'video/webm', 'video/mov'],
        ['image/jpeg', 'image/png']
      ];
      
      const fileTypeOptions = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/mov', 'text/plain'
      ];

      fc.assert(fc.property(
        fc.constantFrom(...fileTypeOptions),
        fc.constantFrom(...supportedFormatsOptions),
        (fileType, supportedFormats) => {
          // 创建模拟文件对象
          const mockFile = { type: fileType } as File;
          
          const isValid = service.validateFileFormat(mockFile, supportedFormats);
          
          // Property: 支持的格式应该有效
          if (supportedFormats.includes(fileType)) {
            expect(isValid).toBe(true);
          } else {
            expect(isValid).toBe(false);
          }
        }
      ), { numRuns: 25 });
    });
  });

  /**
   * Batch Validation Tests
   */
  describe('Batch Validation Properties', () => {
    
    it('should handle batch validation consistently', async () => {
      await fc.assert(fc.asyncProperty(
        fc.constantFrom(...IMAGE_MODELS.basic),
        fc.array(
          fc.record({
            prompt: fc.string({ minLength: 1, maxLength: 100 }),
            aspectRatio: fc.constantFrom('1:1', '4:3', '16:9'),
            imageSize: fc.constantFrom('1K', '2K')
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (modelId, parametersList) => {
          const batchResults = await service.validateParametersBatch(modelId, parametersList);
          
          // Property: 批量验证结果数量应与输入数量一致
          expect(batchResults.length).toBe(parametersList.length);
          
          // Property: 每个结果都应该是有效的验证结果数组
          batchResults.forEach(results => {
            expect(Array.isArray(results)).toBe(true);
            results.forEach(result => {
              expect(result).toHaveProperty('isValid');
              expect(result).toHaveProperty('errors');
              expect(result).toHaveProperty('warnings');
            });
          });
          
          // Property: 单独验证应与批量验证产生相同结果
          for (let i = 0; i < parametersList.length; i++) {
            const individualResult = service.validateParameters(modelId, parametersList[i]);
            expect(batchResults[i]).toEqual(individualResult);
          }
        }
      ), { numRuns: 15 });
    });
  });
});