/**
 * Video API Integration - 视频生成API服务
 * 
 * 功能：
 * - 提供视频生成API调用接口
 * - 支持多提供商适配（shenma、zhipu等）
 * - 处理异步视频生成和任务管理
 * - 与现有AI服务适配器集成
 */

import { ProviderSettings } from '../../types';
import { MultiProviderAIService } from '../../adapters/AIServiceAdapter';
import { LimitValidator } from '../../services/LimitValidator';

/**
 * 视频生成参数接口
 */
export interface VideoGenerationParams {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:2' | '2:3';
  duration?: number; // 视频时长（秒）
  quality?: 'standard' | 'hd' | 'fullhd';
  size?: string; // 自定义尺寸，如 '1080x1920'
  model?: string; // 特定模型名称
}

/**
 * 视频生成结果接口
 */
export interface VideoGenerationResult {
  taskId?: string; // 异步任务ID
  videoUrl?: string; // 视频URL
  status?: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
}

/**
 * 视频API服务类
 */
export class VideoAPI {
  private aiService: MultiProviderAIService;
  private limitValidator: LimitValidator;

  constructor(originalService?: any) {
    this.aiService = new MultiProviderAIService(originalService);
    this.limitValidator = new LimitValidator();
  }

  /**
   * 生成视频
   * @param params 视频生成参数
   * @param settings 提供商设置
   * @returns 视频生成结果
   */
  async generateVideo(
    params: VideoGenerationParams,
    settings: ProviderSettings
  ): Promise<VideoGenerationResult> {
    try {
      // 验证API调用次数限制
      const limitResult = this.limitValidator.validate('apiCalls');
      if (!limitResult.isValid) {
        return {
          status: 'failed',
          error: limitResult.message || 'API调用次数已达限制'
        };
      }

      // 验证视频生成限制
      const videoLimitResult = this.limitValidator.validate('videoGeneration');
      if (!videoLimitResult.isValid) {
        return {
          status: 'failed',
          error: videoLimitResult.message || '视频生成次数已达限制'
        };
      }

      // 准备视频生成提示词
      let finalPrompt = params.prompt;

      // 根据参数增强提示词
      if (params.aspectRatio) {
        finalPrompt += `, aspect ratio: ${params.aspectRatio}`;
      }

      if (params.duration) {
        finalPrompt += `, duration: ${params.duration} seconds`;
      }

      if (params.quality) {
        finalPrompt += `, quality: ${params.quality}`;
      }

      // 调用AI服务生成视频
      const result = await this.aiService.generateVideo(finalPrompt, settings);

      // 增加API调用次数
      this.limitValidator.incrementUsage('apiCalls');
      // 增加视频生成次数
      this.limitValidator.incrementUsage('videoGeneration');

      // 处理结果
      if (result.startsWith('http')) {
        // 直接返回视频URL（同步生成）
        return {
          videoUrl: result,
          status: 'completed'
        };
      } else if (result.includes('taskId') || result.includes('task_id')) {
        // 异步生成，返回任务ID
        try {
          const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
          const taskId = parsedResult.taskId || parsedResult.task_id || result;
          return {
            taskId,
            status: 'pending'
          };
        } catch (e) {
          // 如果解析失败，将result作为taskId
          return {
            taskId: result,
            status: 'pending'
          };
        }
      } else {
        // 其他情况
        return {
          status: 'failed',
          error: '视频生成失败：未知结果格式'
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : '视频生成过程中发生错误'
      };
    }
  }

  /**
   * 批量生成视频（支持多个提示词）
   * @param prompts 提示词数组
   * @param settings 提供商设置
   * @returns 视频生成结果数组
   */
  async generateVideos(
    prompts: string[],
    settings: ProviderSettings
  ): Promise<VideoGenerationResult[]> {
    const results: VideoGenerationResult[] = [];

    // 验证批量生成限制
    const batchResult = this.limitValidator.validate('batchGeneration', prompts.length);
    if (!batchResult.isValid) {
      return prompts.map(() => ({
        status: 'failed',
        error: batchResult.message || '批量生成限制已达上限'
      }));
    }

    for (const prompt of prompts) {
      const result = await this.generateVideo({ prompt }, settings);
      results.push(result);
    }

    return results;
  }

  /**
   * 获取支持的视频生成参数
   * @param provider 提供商名称
   * @returns 支持的参数列表
   */
  getSupportedParams(provider: string): string[] {
    const paramsMap: Record<string, string[]> = {
      shenma: ['prompt', 'aspectRatio', 'quality'],
      zhipu: ['prompt', 'aspectRatio', 'duration', 'size', 'model'],
      default: ['prompt', 'aspectRatio']
    };

    return paramsMap[provider] || paramsMap.default;
  }

  /**
   * 检查视频生成权限
   * @param settings 提供商设置
   * @returns 是否有权限生成视频
   */
  checkVideoPermission(settings: ProviderSettings): boolean {
    try {
      // 检查提供商支持
      const supportedProviders = ['shenma', 'zhipu'];
      if (!supportedProviders.includes(settings.provider)) {
        return false;
      }

      // 检查API密钥
      if (!settings.apiKey || settings.apiKey.trim() === '') {
        return false;
      }

      // 检查限制
      const limitResult = this.limitValidator.validate('videoGeneration');
      return limitResult.isValid;
    } catch {
      return false;
    }
  }
}

// 创建默认实例
export const videoAPI = new VideoAPI();

/**
 * 便捷函数：生成视频
 */
export const generateVideo = async (
  params: VideoGenerationParams,
  settings: ProviderSettings
): Promise<VideoGenerationResult> => {
  return await videoAPI.generateVideo(params, settings);
};

/**
 * 便捷函数：批量生成视频
 */
export const generateVideos = async (
  prompts: string[],
  settings: ProviderSettings
): Promise<VideoGenerationResult[]> => {
  return await videoAPI.generateVideos(prompts, settings);
};

/**
 * 便捷函数：检查视频生成权限
 */
export const checkVideoPermission = (
  settings: ProviderSettings
): boolean => {
  return videoAPI.checkVideoPermission(settings);
};