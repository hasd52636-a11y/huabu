/**
 * ModelConfigService - 模型配置服务
 * 
 * 功能：
 * - 检测不同模型支持的参数
 * - 获取模型特定的限制和约束
 * - 提供参数验证逻辑
 * - 管理模型复杂度分级
 */

import { 
  ModelParameter, 
  ModelRestrictions, 
  ParameterValidationResult,
  ParameterValidationError,
  ParameterValidationWarning,
  GenerationParameters,
  ModelComplexity,
  getModelComplexity,
  IMAGE_MODELS,
  VIDEO_MODELS,
  MODEL_PLATFORM_INFO
} from '../types';

export class ModelConfigService {
  private static instance: ModelConfigService;
  
  // 缓存模型参数配置以提高性能
  private parameterCache = new Map<string, ModelParameter[]>();
  private restrictionCache = new Map<string, ModelRestrictions>();

  private constructor() {}

  public static getInstance(): ModelConfigService {
    if (!ModelConfigService.instance) {
      ModelConfigService.instance = new ModelConfigService();
    }
    return ModelConfigService.instance;
  }

  /**
   * 获取模型支持的参数列表
   * Get supported parameters for a model
   */
  public getModelParameters(modelId: string, generationType: 'image' | 'video'): ModelParameter[] {
    const cacheKey = `${modelId}-${generationType}`;
    
    if (this.parameterCache.has(cacheKey)) {
      return this.parameterCache.get(cacheKey)!;
    }

    const parameters = this.buildModelParameters(modelId, generationType);
    this.parameterCache.set(cacheKey, parameters);
    
    return parameters;
  }

  /**
   * 获取模型特定的限制
   * Get model-specific restrictions
   */
  public getModelRestrictions(modelId: string): ModelRestrictions {
    if (this.restrictionCache.has(modelId)) {
      return this.restrictionCache.get(modelId)!;
    }

    const restrictions = this.buildModelRestrictions(modelId);
    this.restrictionCache.set(modelId, restrictions);
    
    return restrictions;
  }

  /**
   * 验证单个参数
   * Validate individual parameter
   */
  public validateParameter(modelId: string, parameterKey: string, value: any): ParameterValidationResult {
    const restrictions = this.getModelRestrictions(modelId);
    const errors: ParameterValidationError[] = [];
    const warnings: ParameterValidationWarning[] = [];
    
    // 获取参数限制
    const paramLimit = restrictions.parameterLimits[parameterKey];
    
    if (paramLimit) {
      // 数值范围验证
      if (typeof value === 'number') {
        if (paramLimit.min !== undefined && value < paramLimit.min) {
          errors.push({
            parameterKey,
            message: `值不能小于 ${paramLimit.min}`,
            code: 'MIN_VALUE_ERROR',
            severity: 'error'
          });
        }
        
        if (paramLimit.max !== undefined && value > paramLimit.max) {
          errors.push({
            parameterKey,
            message: `值不能大于 ${paramLimit.max}`,
            code: 'MAX_VALUE_ERROR',
            severity: 'error'
          });
        }
      }
      
      // 选项验证
      if (paramLimit.options && !paramLimit.options.includes(value)) {
        errors.push({
          parameterKey,
          message: `无效的选项值，支持的选项: ${paramLimit.options.join(', ')}`,
          code: 'INVALID_OPTION_ERROR',
          severity: 'error'
        });
      }
    }

    // 特殊参数验证
    if (parameterKey === 'aspectRatio') {
      if (!restrictions.supportedAspectRatios.includes(value)) {
        errors.push({
          parameterKey,
          message: `不支持的宽高比，支持的比例: ${restrictions.supportedAspectRatios.join(', ')}`,
          code: 'UNSUPPORTED_ASPECT_RATIO',
          severity: 'error'
        });
      }
    }

    // 文件验证
    if (parameterKey === 'referenceImage' || parameterKey === 'referenceVideo') {
      const fileValidation = this.validateFile(value, restrictions);
      errors.push(...fileValidation.errors);
      warnings.push(...fileValidation.warnings);
    }

    // 提示词长度验证
    if (parameterKey === 'prompt' || parameterKey === 'negativePrompt') {
      const textValidation = this.validateTextParameter(parameterKey, value, modelId);
      errors.push(...textValidation.errors);
      warnings.push(...textValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证文件参数
   * Validate file parameter
   */
  private validateFile(file: File | string | null, restrictions: ModelRestrictions): ParameterValidationResult {
    const errors: ParameterValidationError[] = [];
    const warnings: ParameterValidationWarning[] = [];

    if (!file) {
      return { isValid: true, errors, warnings };
    }

    // 如果是字符串URL，跳过文件验证
    if (typeof file === 'string') {
      return { isValid: true, errors, warnings };
    }

    // 文件大小验证
    if (file.size > restrictions.maxFileSize) {
      errors.push({
        parameterKey: 'file',
        message: `文件大小超过限制 ${this.formatFileSize(restrictions.maxFileSize)}`,
        code: 'FILE_SIZE_EXCEEDED',
        severity: 'error'
      });
    }

    // 文件格式验证
    if (!restrictions.supportedFormats.includes(file.type)) {
      errors.push({
        parameterKey: 'file',
        message: `不支持的文件格式，支持的格式: ${restrictions.supportedFormats.join(', ')}`,
        code: 'UNSUPPORTED_FILE_FORMAT',
        severity: 'error'
      });
    }

    // 文件大小警告（接近限制）
    if (file.size > restrictions.maxFileSize * 0.8) {
      warnings.push({
        parameterKey: 'file',
        message: `文件大小较大，建议压缩以提高处理速度`,
        suggestion: `建议文件大小不超过 ${this.formatFileSize(restrictions.maxFileSize * 0.8)}`
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证文本参数
   * Validate text parameter
   */
  private validateTextParameter(parameterKey: string, value: string, modelId: string): ParameterValidationResult {
    const errors: ParameterValidationError[] = [];
    const warnings: ParameterValidationWarning[] = [];

    if (!value || typeof value !== 'string') {
      if (parameterKey === 'prompt') {
        errors.push({
          parameterKey,
          message: '提示词不能为空',
          code: 'REQUIRED_FIELD_EMPTY',
          severity: 'error'
        });
      }
      return { isValid: errors.length === 0, errors, warnings };
    }

    // 长度验证
    const maxLength = parameterKey === 'prompt' ? 2000 : 1000;
    const minLength = parameterKey === 'prompt' ? 1 : 0;

    if (value.length < minLength) {
      errors.push({
        parameterKey,
        message: `${parameterKey === 'prompt' ? '提示词' : '负面提示词'}长度不能少于 ${minLength} 个字符`,
        code: 'TEXT_TOO_SHORT',
        severity: 'error'
      });
    }

    if (value.length > maxLength) {
      errors.push({
        parameterKey,
        message: `${parameterKey === 'prompt' ? '提示词' : '负面提示词'}长度不能超过 ${maxLength} 个字符`,
        code: 'TEXT_TOO_LONG',
        severity: 'error'
      });
    }

    // 长度警告
    if (value.length > maxLength * 0.8) {
      warnings.push({
        parameterKey,
        message: `${parameterKey === 'prompt' ? '提示词' : '负面提示词'}较长，可能影响生成效果`,
        suggestion: `建议控制在 ${Math.floor(maxLength * 0.8)} 个字符以内`
      });
    }

    // 内容质量检查
    if (parameterKey === 'prompt') {
      const qualityCheck = this.checkPromptQuality(value);
      warnings.push(...qualityCheck);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 检查提示词质量
   * Check prompt quality
   */
  private checkPromptQuality(prompt: string): ParameterValidationWarning[] {
    const warnings: ParameterValidationWarning[] = [];

    // 检查是否过于简单
    if (prompt.length < 10) {
      warnings.push({
        parameterKey: 'prompt',
        message: '提示词过于简单，建议添加更多描述细节',
        suggestion: '尝试添加风格、颜色、构图等描述'
      });
    }

    // 检查是否包含特殊字符过多
    const specialCharCount = (prompt.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
    if (specialCharCount > prompt.length * 0.1) {
      warnings.push({
        parameterKey: 'prompt',
        message: '提示词包含过多特殊字符，可能影响理解',
        suggestion: '建议使用自然语言描述'
      });
    }

    return warnings;
  }

  /**
   * 验证宽高比
   * Validate aspect ratio
   */
  public validateAspectRatio(ratio: string, supportedRatios: string[]): boolean {
    return supportedRatios.includes(ratio);
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
   * 实时验证参数（带防抖）
   * Real-time parameter validation with debouncing
   */
  private validationTimeouts = new Map<string, NodeJS.Timeout>();

  public validateParameterWithDebounce(
    modelId: string, 
    parameterKey: string, 
    value: any, 
    callback: (result: ParameterValidationResult) => void,
    delay: number = 300
  ): void {
    const timeoutKey = `${modelId}-${parameterKey}`;
    
    // 清除之前的定时器
    if (this.validationTimeouts.has(timeoutKey)) {
      clearTimeout(this.validationTimeouts.get(timeoutKey)!);
    }

    // 设置新的定时器
    const timeout = setTimeout(() => {
      const result = this.validateParameter(modelId, parameterKey, value);
      callback(result);
      this.validationTimeouts.delete(timeoutKey);
    }, delay);

    this.validationTimeouts.set(timeoutKey, timeout);
  }

  /**
   * 格式化文件大小
   * Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 构建模型参数配置
   * Build model parameter configuration
   * 
   * 修改：所有模型显示相同的参数集合，通过禁用状态区分支持程度
   */
  private buildModelParameters(modelId: string, generationType: 'image' | 'video'): ModelParameter[] {
    // 获取所有可能的参数（基础+高级+专家级）
    const allParameters = this.getAllPossibleParameters(generationType, modelId);
    
    // 添加所有高级参数（所有模型都显示，但可能被禁用）
    allParameters.push(...this.getAdvancedParameters(generationType, modelId));
    
    // 添加所有专家级参数（所有模型都显示，但可能被禁用）
    allParameters.push(...this.getExpertParameters(modelId, generationType));

    return allParameters;
  }

  /**
   * 获取所有可能的参数（显示全部，但标记禁用状态）
   * Get all possible parameters (show all, but mark disabled state)
   */
  private getAllPossibleParameters(generationType: 'image' | 'video', modelId: string): ModelParameter[] {
    const commonParams: ModelParameter[] = [
      {
        key: 'prompt',
        label: '提示词',
        type: 'text',
        defaultValue: '',
        required: true,
        validation: {
          required: true,
          min: 1,
          max: 2000
        },
        description: '描述你想要生成的内容',
        category: 'basic'
      }
    ];

    if (generationType === 'image') {
      return [
        ...commonParams,
        {
          key: 'aspectRatio',
          label: '宽高比',
          type: 'select',
          defaultValue: '1:1',
          required: false,
          validation: {
            // 显示所有可能的宽高比选项
            options: ['1:1', '4:3', '16:9', '9:16', '4:5', '5:4', '2:3', '3:2', '21:9'],
            // 添加禁用选项信息
            disabledOptions: this.getDisabledOptions(modelId, 'aspectRatio')
          },
          description: '图像的宽高比例',
          category: 'basic'
        },
        {
          key: 'imageSize',
          label: '图像尺寸',
          type: 'select',
          defaultValue: '2K',
          required: false,
          validation: {
            options: ['1K', '2K', '4K'],
            disabledOptions: this.getDisabledOptions(modelId, 'imageSize')
          },
          description: '生成图像的分辨率',
          category: 'basic'
        }
      ];
    } else {
      return [
        ...commonParams,
        {
          key: 'aspectRatio',
          label: '宽高比',
          type: 'select',
          defaultValue: '16:9',
          required: false,
          validation: {
            // 显示所有可能的视频宽高比
            options: ['16:9', '9:16', '1:1', '4:3', '21:9'],
            disabledOptions: this.getDisabledOptions(modelId, 'aspectRatio')
          },
          description: '视频的宽高比例',
          category: 'basic'
        },
        {
          key: 'duration',
          label: '视频时长',
          type: 'select',
          defaultValue: '10',
          required: false,
          validation: {
            // 显示所有可能的时长选项
            options: ['5', '10', '15', '25', '30', '60'],
            disabledOptions: this.getDisabledOptions(modelId, 'duration')
          },
          description: '视频时长（秒）',
          category: 'basic'
        }
      ];
    }
  }

  /**
   * 获取指定模型和参数的禁用选项
   * Get disabled options for specific model and parameter
   * 
   * 修复：基于API测试结果，只有gpt-4o、nano-banana、sora_video2可用
   * 使用香港API地址后，部分模型可能恢复可用
   */
  private getDisabledOptions(modelId: string, parameterKey: string): string[] {
    const restrictions = this.getModelRestrictions(modelId);
    
    // 已验证可用的模型（使用香港API地址）
    const verifiedModels = ['gpt-4o', 'nano-banana', 'sora_video2'];
    // 可能修复的模型（需要进一步测试）
    const potentiallyFixedModels = ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'nano-banana-hd'];
    
    const isVerifiedModel = verifiedModels.includes(modelId);
    const isPotentiallyFixed = potentiallyFixedModels.includes(modelId);
    
    switch (parameterKey) {
      case 'aspectRatio':
        const allRatios = ['1:1', '4:3', '16:9', '9:16', '4:5', '5:4', '2:3', '3:2', '21:9'];
        if (!isVerifiedModel && !isPotentiallyFixed) {
          // 未验证模型只支持基础宽高比
          return allRatios.filter(ratio => !['1:1', '16:9', '9:16'].includes(ratio));
        }
        return allRatios.filter(ratio => !restrictions.supportedAspectRatios.includes(ratio));
        
      case 'duration':
        const allDurations = ['5', '10', '15', '25', '30', '60'];
        if (!isVerifiedModel && !isPotentiallyFixed) {
          // 未验证模型只支持基础时长
          return allDurations.filter(duration => !['10', '15'].includes(duration));
        }
        const supportedDurations = restrictions.parameterLimits.duration?.options || ['10', '15', '25'];
        return allDurations.filter(duration => !supportedDurations.includes(duration));
        
      case 'imageSize':
        if (!isVerifiedModel && !isPotentiallyFixed) {
          // 未验证模型只支持基础尺寸
          return ['4K'];
        }
        // 基础模型不支持4K
        if (IMAGE_MODELS.basic.includes(modelId as any)) {
          return ['4K'];
        }
        return [];
        
      case 'fps':
        const allFps = ['24', '30', '60'];
        if (!isVerifiedModel && !isPotentiallyFixed) {
          // 未验证模型只支持基础帧率
          return allFps.filter(fps => !['24', '30'].includes(fps));
        }
        const supportedFps = restrictions.parameterLimits.fps?.options || ['24', '30'];
        return allFps.filter(fps => !supportedFps.includes(fps));
        
      default:
        return [];
    }
  }

  /**
   * 获取高级参数
   * Get advanced parameters
   * 
   * 修改：所有模型都显示相同的高级参数，通过禁用状态区分
   */
  private getAdvancedParameters(generationType: 'image' | 'video', modelId: string): ModelParameter[] {
    const complexity = getModelComplexity(modelId);
    const isAdvancedSupported = complexity === 'medium' || complexity === 'complex';
    
    const commonAdvanced: ModelParameter[] = [
      {
        key: 'negativePrompt',
        label: '负面提示词',
        type: 'text',
        defaultValue: '',
        required: false,
        validation: {
          max: 1000,
          // 简单模型不支持负面提示词
          disabledOptions: !isAdvancedSupported ? ['*'] : []
        },
        description: '描述你不想要的内容',
        category: 'advanced'
      },
      {
        key: 'seed',
        label: '随机种子',
        type: 'number',
        defaultValue: -1,
        required: false,
        validation: {
          min: -1,
          max: 2147483647,
          // 简单模型不支持种子控制
          disabledOptions: !isAdvancedSupported ? ['*'] : []
        },
        description: '控制生成的随机性，-1为随机',
        category: 'advanced'
      }
    ];

    if (generationType === 'image') {
      return [
        ...commonAdvanced,
        {
          key: 'guidanceScale',
          label: '引导强度',
          type: 'range',
          defaultValue: 7.5,
          required: false,
          validation: {
            min: 1,
            max: 20,
            step: 0.5,
            // 简单模型不支持引导强度调节
            disabledOptions: !isAdvancedSupported ? ['*'] : []
          },
          description: '控制AI对提示词的遵循程度',
          category: 'advanced'
        },
        {
          key: 'steps',
          label: '生成步数',
          type: 'range',
          defaultValue: 20,
          required: false,
          validation: {
            min: 10,
            max: 50,
            step: 1,
            // 简单模型不支持步数调节
            disabledOptions: !isAdvancedSupported ? ['*'] : []
          },
          description: '生成过程的迭代次数，更多步数通常质量更好',
          category: 'advanced'
        }
      ];
    } else {
      return [
        ...commonAdvanced,
        {
          key: 'fps',
          label: '帧率',
          type: 'select',
          defaultValue: 24,
          required: false,
          validation: {
            options: ['24', '30', '60'],
            disabledOptions: this.getDisabledOptions(modelId, 'fps')
          },
          description: '视频帧率（每秒帧数）',
          category: 'advanced'
        },
        {
          key: 'motionStrength',
          label: '运动强度',
          type: 'range',
          defaultValue: 0.5,
          required: false,
          validation: {
            min: 0,
            max: 1,
            step: 0.1,
            // 简单模型不支持运动强度调节
            disabledOptions: !isAdvancedSupported ? ['*'] : []
          },
          description: '控制视频中的运动幅度',
          category: 'advanced'
        }
      ];
    }
  }

  /**
   * 获取专家级参数
   * Get expert parameters
   */
  private getExpertParameters(modelId: string, generationType: 'image' | 'video'): ModelParameter[] {
    const expertParams: ModelParameter[] = [];

    // ByteEdit 专用参数
    if (modelId === 'byteedit-v2.0') {
      expertParams.push(
        {
          key: 'referenceImage',
          label: '参考图片',
          type: 'file',
          defaultValue: null,
          required: false,
          validation: {
            fileTypes: ['image/jpeg', 'image/png', 'image/webp'],
            maxFileSize: 10 * 1024 * 1024 // 10MB
          },
          description: '用于编辑的参考图片',
          category: 'expert'
        }
      );
    }

    // Sora 高级模型参数
    if (modelId.includes('sora-2-pro') || modelId.includes('animate-anyone')) {
      if (generationType === 'video') {
        expertParams.push(
          {
            key: 'referenceVideo',
            label: '参考视频',
            type: 'file',
            defaultValue: null,
            required: false,
            validation: {
              fileTypes: ['video/mp4', 'video/webm', 'video/mov'],
              maxFileSize: 100 * 1024 * 1024 // 100MB
            },
            description: '用于风格参考的视频',
            category: 'expert'
          },
          {
            key: 'cameraMovement',
            label: '镜头运动',
            type: 'select',
            defaultValue: 'static',
            required: false,
            validation: {
              options: ['static', 'pan', 'zoom', 'rotate']
            },
            description: '控制镜头运动方式',
            category: 'expert'
          }
        );
      }
    }

    return expertParams;
  }

  /**
   * 构建模型限制配置
   * Build model restriction configuration
   */
  private buildModelRestrictions(modelId: string): ModelRestrictions {
    const baseRestrictions: ModelRestrictions = {
      maxFileSize: 10 * 1024 * 1024, // 10MB default
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      supportedAspectRatios: ['1:1', '4:3', '16:9', '9:16'],
      parameterLimits: {}
    };

    // 根据模型类型设置特定限制
    if (this.isImageModel(modelId)) {
      return this.getImageModelRestrictions(modelId, baseRestrictions);
    } else if (this.isVideoModel(modelId)) {
      return this.getVideoModelRestrictions(modelId, baseRestrictions);
    }

    return baseRestrictions;
  }

  /**
   * 获取图像模型限制
   * Get image model restrictions
   */
  private getImageModelRestrictions(modelId: string, base: ModelRestrictions): ModelRestrictions {
    const restrictions = { ...base };

    // 基础模型限制
    if (IMAGE_MODELS.basic.includes(modelId as any)) {
      restrictions.supportedAspectRatios = ['1:1', '4:3', '16:9', '9:16'];
      restrictions.maxResolution = { width: 2048, height: 2048 };
      restrictions.parameterLimits = {
        guidanceScale: { min: 1, max: 15 },
        steps: { min: 10, max: 30 }
      };
    }

    // 高级模型限制
    if (IMAGE_MODELS.advanced.includes(modelId as any)) {
      restrictions.supportedAspectRatios = ['1:1', '4:3', '16:9', '9:16', '4:5', '5:4', '2:3', '3:2', '21:9'];
      restrictions.maxResolution = { width: 4096, height: 4096 };
      restrictions.parameterLimits = {
        guidanceScale: { min: 1, max: 20 },
        steps: { min: 10, max: 50 }
      };
    }

    // 编辑模型限制
    if (IMAGE_MODELS.editing.includes(modelId as any)) {
      restrictions.maxFileSize = 20 * 1024 * 1024; // 20MB for editing
      restrictions.supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
      restrictions.parameterLimits = {
        guidanceScale: { min: 0.5, max: 15 },
        steps: { min: 5, max: 40 }
      };
    }

    return restrictions;
  }

  /**
   * 获取视频模型限制
   * Get video model restrictions
   */
  private getVideoModelRestrictions(modelId: string, base: ModelRestrictions): ModelRestrictions {
    const restrictions = { ...base };
    
    restrictions.supportedFormats = ['video/mp4', 'video/webm', 'video/mov'];
    restrictions.supportedAspectRatios = ['16:9', '9:16'];
    restrictions.maxFileSize = 100 * 1024 * 1024; // 100MB for video

    // Sora 系列限制
    if (VIDEO_MODELS.sora.includes(modelId as any)) {
      restrictions.maxDuration = 25; // 25 seconds max
      restrictions.parameterLimits = {
        duration: { options: ['10', '15', '25'] },
        fps: { options: ['24', '30'] },
        motionStrength: { min: 0, max: 1 }
      };
    }

    // Veo 系列限制
    if (VIDEO_MODELS.veo.includes(modelId as any)) {
      restrictions.maxDuration = 30; // 30 seconds max
      restrictions.parameterLimits = {
        duration: { options: ['10', '15', '25', '30'] },
        fps: { options: ['24', '30', '60'] },
        motionStrength: { min: 0, max: 1 }
      };
    }

    // 特殊功能模型限制
    if (VIDEO_MODELS.special.includes(modelId as any)) {
      restrictions.maxFileSize = 200 * 1024 * 1024; // 200MB for special features
      restrictions.parameterLimits = {
        duration: { options: ['5', '10', '15'] },
        fps: { options: ['24', '30'] }
      };
    }

    return restrictions;
  }

  /**
   * 检查是否为图像模型
   * Check if it's an image model
   */
  private isImageModel(modelId: string): boolean {
    return [
      ...IMAGE_MODELS.basic,
      ...IMAGE_MODELS.advanced,
      ...IMAGE_MODELS.editing
    ].includes(modelId as any);
  }

  /**
   * 检查是否为视频模型
   * Check if it's a video model
   */
  private isVideoModel(modelId: string): boolean {
    return [
      ...VIDEO_MODELS.sora,
      ...VIDEO_MODELS.veo,
      ...VIDEO_MODELS.wanx,
      ...VIDEO_MODELS.special
    ].includes(modelId as any);
  }

  /**
   * 清除缓存
   * Clear cache
   */
  public clearCache(): void {
    this.parameterCache.clear();
    this.restrictionCache.clear();
    
    // 清除所有验证定时器
    this.validationTimeouts.forEach(timeout => clearTimeout(timeout));
    this.validationTimeouts.clear();
  }

  /**
   * 获取模型支持的生成类型
   * Get supported generation types for a model
   */
  public getSupportedGenerationTypes(modelId: string): ('image' | 'video')[] {
    const types: ('image' | 'video')[] = [];
    
    if (this.isImageModel(modelId)) {
      types.push('image');
    }
    
    if (this.isVideoModel(modelId)) {
      types.push('video');
    }
    
    return types;
  }

  /**
   * 获取模型的推荐配置
   * Get recommended configuration for a model
   */
  public getRecommendedParameters(modelId: string, generationType: 'image' | 'video'): GenerationParameters {
    const complexity = getModelComplexity(modelId);
    
    const baseConfig: GenerationParameters = {
      prompt: ''
    };

    if (generationType === 'image') {
      baseConfig.aspectRatio = '1:1';
      baseConfig.imageSize = complexity === 'simple' ? '1K' : complexity === 'medium' ? '2K' : '4K';
      
      if (complexity !== 'simple') {
        baseConfig.guidanceScale = 7.5;
        baseConfig.steps = complexity === 'medium' ? 20 : 30;
      }
    } else {
      baseConfig.aspectRatio = '16:9';
      baseConfig.duration = '10';
      
      if (complexity !== 'simple') {
        baseConfig.fps = 24;
        baseConfig.motionStrength = 0.5;
      }
    }

    return baseConfig;
  }
}

// 导出单例实例
export const modelConfigService = ModelConfigService.getInstance();