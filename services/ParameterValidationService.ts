/**
 * ParameterValidationService - 参数验证服务
 * 
 * 功能：
 * - 全面的参数集验证
 * - 文件验证（大小、格式、尺寸）
 * - 宽高比和分辨率验证
 * - 批量验证和错误聚合
 * - 实时验证状态管理
 */

import { 
  GenerationParameters,
  ParameterValidationResult,
  ParameterValidationError,
  ParameterValidationWarning,
  ModelRestrictions
} from '../types';
import { ModelConfigService } from './ModelConfigService';

export class ParameterValidationService {
  private static instance: ParameterValidationService;
  private modelConfigService: ModelConfigService;

  private constructor() {
    this.modelConfigService = ModelConfigService.getInstance();
  }

  public static getInstance(): ParameterValidationService {
    if (!ParameterValidationService.instance) {
      ParameterValidationService.instance = new ParameterValidationService();
    }
    return ParameterValidationService.instance;
  }

  /**
   * 验证完整的参数集
   * Validate complete parameter set
   */
  public validateParameters(modelId: string, parameters: GenerationParameters): ParameterValidationResult[] {
    const results: ParameterValidationResult[] = [];
    const restrictions = this.modelConfigService.getModelRestrictions(modelId);

    // 验证每个参数
    Object.entries(parameters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        const result = this.modelConfigService.validateParameter(modelId, key, value);
        if (!result.isValid || result.warnings.length > 0) {
          results.push({
            ...result,
            parameterKey: key
          } as ParameterValidationResult & { parameterKey: string });
        }
      }
    });

    // 验证必需参数
    const requiredValidation = this.validateRequiredParameters(modelId, parameters);
    if (!requiredValidation.isValid) {
      results.push(requiredValidation);
    }

    // 验证参数组合
    const combinationValidation = this.validateParameterCombinations(modelId, parameters, restrictions);
    if (!combinationValidation.isValid || combinationValidation.warnings.length > 0) {
      results.push(combinationValidation);
    }

    return results;
  }

  /**
   * 验证必需参数
   * Validate required parameters
   */
  private validateRequiredParameters(modelId: string, parameters: GenerationParameters): ParameterValidationResult {
    const errors: ParameterValidationError[] = [];
    const warnings: ParameterValidationWarning[] = [];

    // 提示词是必需的
    if (!parameters.prompt || parameters.prompt.trim().length === 0) {
      errors.push({
        parameterKey: 'prompt',
        message: '提示词是必需的',
        code: 'REQUIRED_PARAMETER_MISSING',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证参数组合
   * Validate parameter combinations
   */
  private validateParameterCombinations(
    modelId: string, 
    parameters: GenerationParameters, 
    restrictions: ModelRestrictions
  ): ParameterValidationResult {
    const errors: ParameterValidationError[] = [];
    const warnings: ParameterValidationWarning[] = [];

    // 验证宽高比和图像尺寸组合
    if (parameters.aspectRatio && parameters.imageSize) {
      const combinationWarning = this.validateAspectRatioImageSizeCombination(
        parameters.aspectRatio, 
        parameters.imageSize
      );
      if (combinationWarning) {
        warnings.push(combinationWarning);
      }
    }

    // 验证视频时长和帧率组合
    if (parameters.duration && parameters.fps) {
      const durationWarning = this.validateDurationFpsCombination(
        parameters.duration, 
        parameters.fps,
        restrictions
      );
      if (durationWarning) {
        warnings.push(durationWarning);
      }
    }

    // 验证引导强度和步数组合
    if (parameters.guidanceScale && parameters.steps) {
      const guidanceWarning = this.validateGuidanceStepsCombination(
        parameters.guidanceScale,
        parameters.steps
      );
      if (guidanceWarning) {
        warnings.push(guidanceWarning);
      }
    }

    // 验证参考文件和其他参数的兼容性
    if (parameters.referenceImage || parameters.referenceVideo) {
      const referenceValidation = this.validateReferenceFileCompatibility(parameters);
      errors.push(...referenceValidation.errors);
      warnings.push(...referenceValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证宽高比和图像尺寸组合
   * Validate aspect ratio and image size combination
   */
  private validateAspectRatioImageSizeCombination(
    aspectRatio: string, 
    imageSize: string
  ): ParameterValidationWarning | null {
    // 某些宽高比在高分辨率下可能导致性能问题
    const problematicCombinations = [
      { ratio: '21:9', size: '4K' },
      { ratio: '2:3', size: '4K' },
      { ratio: '3:2', size: '4K' }
    ];

    const isProblematic = problematicCombinations.some(
      combo => combo.ratio === aspectRatio && combo.size === imageSize
    );

    if (isProblematic) {
      return {
        parameterKey: 'aspectRatio',
        message: `${aspectRatio} 宽高比配合 ${imageSize} 分辨率可能导致生成时间较长`,
        suggestion: '考虑使用 2K 分辨率或选择更常见的宽高比'
      };
    }

    return null;
  }

  /**
   * 验证视频时长和帧率组合
   * Validate duration and fps combination
   */
  private validateDurationFpsCombination(
    duration: string, 
    fps: number,
    restrictions: ModelRestrictions
  ): ParameterValidationWarning | null {
    const durationNum = parseInt(duration);
    const totalFrames = durationNum * fps;

    // 检查总帧数是否过高
    if (totalFrames > 1500) { // 25秒 * 60fps = 1500帧
      return {
        parameterKey: 'fps',
        message: `${duration}秒 + ${fps}fps 组合将产生 ${totalFrames} 帧，可能导致处理时间过长`,
        suggestion: '建议降低帧率或缩短时长'
      };
    }

    // 检查是否超出模型限制
    if (restrictions.maxDuration && durationNum > restrictions.maxDuration) {
      return {
        parameterKey: 'duration',
        message: `时长 ${duration}秒 超出模型限制 ${restrictions.maxDuration}秒`,
        suggestion: `请选择不超过 ${restrictions.maxDuration}秒 的时长`
      };
    }

    return null;
  }

  /**
   * 验证引导强度和步数组合
   * Validate guidance scale and steps combination
   */
  private validateGuidanceStepsCombination(
    guidanceScale: number,
    steps: number
  ): ParameterValidationWarning | null {
    // 高引导强度配合低步数可能效果不佳
    if (guidanceScale > 15 && steps < 20) {
      return {
        parameterKey: 'guidanceScale',
        message: `高引导强度 (${guidanceScale}) 配合低步数 (${steps}) 可能影响生成质量`,
        suggestion: '建议增加步数到 20 以上，或降低引导强度'
      };
    }

    // 低引导强度配合高步数可能浪费计算资源
    if (guidanceScale < 5 && steps > 30) {
      return {
        parameterKey: 'steps',
        message: `低引导强度 (${guidanceScale}) 配合高步数 (${steps}) 可能不会显著改善质量`,
        suggestion: '建议降低步数到 20-25，或提高引导强度'
      };
    }

    return null;
  }

  /**
   * 验证参考文件兼容性
   * Validate reference file compatibility
   */
  private validateReferenceFileCompatibility(parameters: GenerationParameters): ParameterValidationResult {
    const errors: ParameterValidationError[] = [];
    const warnings: ParameterValidationWarning[] = [];

    // 检查是否同时提供了图像和视频参考
    if (parameters.referenceImage && parameters.referenceVideo) {
      errors.push({
        parameterKey: 'referenceVideo',
        message: '不能同时使用图像和视频作为参考',
        code: 'CONFLICTING_REFERENCE_FILES',
        severity: 'error'
      });
    }

    // 检查参考图像与视频生成的兼容性
    if (parameters.referenceImage && parameters.duration) {
      warnings.push({
        parameterKey: 'referenceImage',
        message: '使用静态图像作为视频生成的参考可能限制动态效果',
        suggestion: '考虑使用视频参考或调整运动强度参数'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证文件大小
   * Validate file size
   */
  public validateFileSize(file: File, maxSize: number): boolean {
    return file.size <= maxSize;
  }

  /**
   * 验证文件格式
   * Validate file format
   */
  public validateFileFormat(file: File, supportedFormats: string[]): boolean {
    return supportedFormats.includes(file.type);
  }

  /**
   * 验证图像尺寸
   * Validate image dimensions
   */
  public async validateImageDimensions(
    file: File, 
    maxWidth: number, 
    maxHeight: number
  ): Promise<ParameterValidationResult> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        
        const errors: ParameterValidationError[] = [];
        const warnings: ParameterValidationWarning[] = [];

        if (img.width > maxWidth || img.height > maxHeight) {
          errors.push({
            parameterKey: 'referenceImage',
            message: `图像尺寸 ${img.width}x${img.height} 超出限制 ${maxWidth}x${maxHeight}`,
            code: 'IMAGE_DIMENSIONS_EXCEEDED',
            severity: 'error'
          });
        }

        // 检查宽高比是否合理
        const aspectRatio = img.width / img.height;
        if (aspectRatio > 4 || aspectRatio < 0.25) {
          warnings.push({
            parameterKey: 'referenceImage',
            message: `图像宽高比 ${aspectRatio.toFixed(2)} 可能不适合大多数生成场景`,
            suggestion: '建议使用宽高比在 0.25-4 之间的图像'
          });
        }

        resolve({
          isValid: errors.length === 0,
          errors,
          warnings
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          isValid: false,
          errors: [{
            parameterKey: 'referenceImage',
            message: '无法读取图像文件',
            code: 'IMAGE_READ_ERROR',
            severity: 'error'
          }],
          warnings: []
        });
      };

      img.src = url;
    });
  }

  /**
   * 验证宽高比
   * Validate aspect ratio
   */
  public validateAspectRatio(ratio: string, supportedRatios: string[]): boolean {
    return supportedRatios.includes(ratio);
  }

  /**
   * 验证分辨率
   * Validate resolution
   */
  public validateResolution(
    width: number, 
    height: number, 
    maxWidth: number, 
    maxHeight: number
  ): ParameterValidationResult {
    const errors: ParameterValidationError[] = [];
    const warnings: ParameterValidationWarning[] = [];

    if (width > maxWidth || height > maxHeight) {
      errors.push({
        parameterKey: 'resolution',
        message: `分辨率 ${width}x${height} 超出限制 ${maxWidth}x${maxHeight}`,
        code: 'RESOLUTION_EXCEEDED',
        severity: 'error'
      });
    }

    // 检查是否为常见分辨率
    const commonResolutions = [
      { w: 1024, h: 1024 }, { w: 1024, h: 768 }, { w: 1920, h: 1080 },
      { w: 1080, h: 1920 }, { w: 2048, h: 2048 }, { w: 4096, h: 4096 }
    ];

    const isCommon = commonResolutions.some(res => res.w === width && res.h === height);
    if (!isCommon && (width * height > 1024 * 1024)) {
      warnings.push({
        parameterKey: 'resolution',
        message: `非标准分辨率 ${width}x${height} 可能影响生成效果`,
        suggestion: '建议使用常见的标准分辨率'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 批量验证参数
   * Batch validate parameters
   */
  public async validateParametersBatch(
    modelId: string,
    parametersList: GenerationParameters[]
  ): Promise<ParameterValidationResult[][]> {
    const results: ParameterValidationResult[][] = [];

    for (const parameters of parametersList) {
      const validationResults = this.validateParameters(modelId, parameters);
      results.push(validationResults);
    }

    return results;
  }

  /**
   * 获取验证摘要
   * Get validation summary
   */
  public getValidationSummary(results: ParameterValidationResult[]): {
    totalErrors: number;
    totalWarnings: number;
    isValid: boolean;
    criticalErrors: ParameterValidationError[];
    suggestions: string[];
  } {
    let totalErrors = 0;
    let totalWarnings = 0;
    const criticalErrors: ParameterValidationError[] = [];
    const suggestions: string[] = [];

    results.forEach(result => {
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;

      // 收集关键错误
      result.errors.forEach(error => {
        if (error.severity === 'error') {
          criticalErrors.push(error);
        }
      });

      // 收集建议
      result.warnings.forEach(warning => {
        if (warning.suggestion) {
          suggestions.push(warning.suggestion);
        }
      });
    });

    return {
      totalErrors,
      totalWarnings,
      isValid: totalErrors === 0,
      criticalErrors,
      suggestions: [...new Set(suggestions)] // 去重
    };
  }

  /**
   * 清理资源
   * Clean up resources
   */
  public cleanup(): void {
    // 清理可能的内存引用
    this.modelConfigService.clearCache();
  }
}

// 导出单例实例
export const parameterValidationService = ParameterValidationService.getInstance();