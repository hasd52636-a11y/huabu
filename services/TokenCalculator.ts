// TokenCalculator.ts
// 用于计算不同类型内容的token消耗

import type { ProviderType } from '../types';

// Token计算选项接口
export interface TokenCalculationOptions {
  provider?: ProviderType;
  model?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
  };
}

// TokenCalculator类
export class TokenCalculator {
  /**
   * 计算文本的token消耗
   * @param text 要计算的文本
   * @param options 计算选项
   * @returns token消耗数量
   */
  static calculateTextTokens(text: string, options: TokenCalculationOptions = {}): number {
    if (!text) return 0;

    const { provider = 'openai-compatible', model } = options;
    let tokenCount = 0;

    // 移除多余空白字符
    const trimmedText = text.trim().replace(/\s+/g, ' ');
    
    // 基于不同提供商的计算规则
    switch (provider) {
      case 'openai-compatible':
        // OpenAI风格的token计算：1 token ≈ 4字符 (中文约1 token ≈ 2字符)
        // 这里使用简单的估算方法
        const chineseChars = (trimmedText.match(/[\u4e00-\u9fa5]/g) || []).length;
        const otherChars = trimmedText.length - chineseChars;
        tokenCount = Math.ceil(chineseChars / 2 + otherChars / 4);
        break;

      case 'google':
      case 'zhipu':
      case 'shenma':
        // 其他提供商使用类似的估算方法
        tokenCount = Math.ceil(trimmedText.length / 2);
        break;

      default:
        tokenCount = Math.ceil(trimmedText.length / 3);
    }

    // 考虑模型差异（示例）
    if (model?.includes('gpt-4')) {
      // GPT-4可能有不同的token计算
      tokenCount = Math.ceil(tokenCount * 1.1);
    }

    return Math.max(1, tokenCount);
  }

  /**
   * 计算图片的token消耗
   * @param imageData 图片数据或URL
   * @param options 计算选项
   * @returns token消耗数量
   */
  static calculateImageTokens(imageData: string | File, options: TokenCalculationOptions = {}): number {
    const { provider = 'openai-compatible', metadata } = options;
    let tokenCount = 0;

    // 基于不同提供商的图片token计算规则
    switch (provider) {
      case 'openai-compatible':
        // OpenAI风格的图片token计算
        // 基础token消耗 + 基于尺寸的额外消耗
        const baseImageTokens = 850;
        let sizeMultiplier = 1;

        if (metadata?.width && metadata?.height) {
          const resolution = metadata.width * metadata.height;
          if (resolution > 2000 * 2000) {
            sizeMultiplier = 2;
          } else if (resolution > 4000 * 4000) {
            sizeMultiplier = 4;
          }
        }

        tokenCount = baseImageTokens * sizeMultiplier;
        break;

      case 'google':
      case 'zhipu':
      case 'shenma':
        // 其他提供商的图片token计算
        // 这里使用简化的计算方式，基于图片尺寸
        if (metadata?.width && metadata?.height) {
          const resolution = metadata.width * metadata.height;
          tokenCount = Math.ceil(resolution / 100000); // 每10万像素约1 token
        } else {
          tokenCount = 100; // 默认值
        }
        break;

      default:
        tokenCount = 500; // 默认值
    }

    return Math.max(1, tokenCount);
  }

  /**
   * 计算视频的token消耗
   * @param videoData 视频数据或URL
   * @param options 计算选项
   * @returns token消耗数量
   */
  static calculateVideoTokens(videoData: string | File, options: TokenCalculationOptions = {}): number {
    const { provider = 'openai-compatible', metadata } = options;
    let tokenCount = 0;

    // 基于不同提供商的视频token计算规则
    switch (provider) {
      case 'openai-compatible':
        // OpenAI风格的视频token计算
        // 基础token消耗 + 基于时长和分辨率的额外消耗
        const baseVideoTokens = 1000;
        let durationMultiplier = 1;
        let resolutionMultiplier = 1;

        // 基于时长的乘数
        if (metadata?.duration) {
          if (metadata.duration > 30) {
            durationMultiplier = 2;
          } else if (metadata.duration > 60) {
            durationMultiplier = 4;
          } else if (metadata.duration > 120) {
            durationMultiplier = 8;
          }
        }

        // 基于分辨率的乘数
        if (metadata?.width && metadata?.height) {
          const resolution = metadata.width * metadata.height;
          if (resolution > 1920 * 1080) {
            resolutionMultiplier = 2;
          } else if (resolution > 3840 * 2160) {
            resolutionMultiplier = 4;
          }
        }

        tokenCount = baseVideoTokens * durationMultiplier * resolutionMultiplier;
        break;

      case 'google':
      case 'zhipu':
      case 'shenma':
        // 其他提供商的视频token计算
        // 基于时长和分辨率的简化计算
        let baseTokens = 500;
        if (metadata?.duration) {
          baseTokens += Math.ceil(metadata.duration * 10); // 每秒钟10 token
        }
        if (metadata?.width && metadata?.height) {
          const resolution = metadata.width * metadata.height;
          baseTokens += Math.ceil(resolution / 1000000); // 每百万像素100 token
        }
        tokenCount = baseTokens;
        break;

      default:
        tokenCount = 1000; // 默认值
    }

    return Math.max(1, tokenCount);
  }

  /**
   * 计算多模态请求的token消耗
   * @param text 文本内容
   * @param images 图片数量
   * @param videos 视频数量
   * @param options 计算选项
   * @returns 总token消耗数量
   */
  static calculateMultiModalTokens(
    text: string,
    images: number = 0,
    videos: number = 0,
    options: TokenCalculationOptions = {}
  ): number {
    let totalTokens = this.calculateTextTokens(text, options);

    // 添加图片token消耗
    if (images > 0) {
      const imageToken = this.calculateImageTokens('', options);
      totalTokens += imageToken * images;
    }

    // 添加视频token消耗
    if (videos > 0) {
      const videoToken = this.calculateVideoTokens('', options);
      totalTokens += videoToken * videos;
    }

    return totalTokens;
  }
}

// 导出默认实例
export default new TokenCalculator();
