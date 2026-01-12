/**
 * AI Service Adapter - 多提供商API调度适配器
 * 
 * 功能：
 * - 扩展现有aiService接口支持神马和智谱
 * - 保持现有API调用完全不变
 * - 实现多提供商统一调度逻辑
 * - 提供向后兼容的接口适配
 */

import { ShenmaService } from '../services/shenmaService.js';
import ZhipuService from '../services/zhipuService.js';
import { ProviderSettings, ModelConfig } from '../types.js';

export interface AIServiceAdapter {
  generateText(contents: any, settings: ProviderSettings): Promise<string>;
  generateImage(contents: any, settings: ProviderSettings): Promise<string>;
  generateVideo(contents: any, settings: ProviderSettings): Promise<string>;
  testConnection(settings: ProviderSettings): Promise<boolean>;
}

export class MultiProviderAIService implements AIServiceAdapter {
  private shenmaService: ShenmaService | null = null;
  private zhipuService: ZhipuService | null = null;
  private originalService: any = null;

  constructor(originalService?: any) {
    this.originalService = originalService;
  }

  /**
   * 初始化服务提供商
   */
  private initializeProviders(settings: ProviderSettings): void {
    if (settings.provider === 'shenma' && !this.shenmaService) {
      this.shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: settings.baseUrl || 'https://api.whatai.cc', // 修正为正确的神马API地址
        apiKey: settings.apiKey || '',
        llmModel: 'gpt-4o', // 修正为正确的模型
        imageModel: 'nano-banana',
        videoModel: 'sora_video2' // 修正为正确的视频模型
      });
    }

    if (settings.provider === 'zhipu' && !this.zhipuService) {
      this.zhipuService = new ZhipuService({
        provider: 'zhipu',
        baseUrl: settings.baseUrl || 'https://open.bigmodel.cn/api/paas/v4',
        apiKey: settings.apiKey || '',
        llmModel: 'glm-4-flash',
        imageModel: 'cogview-3-flash',
        videoModel: 'cogvideox-flash',
        visionModel: 'glm-4v-flash'
      });
    }
  }

  /**
   * 转换内容格式以适配不同提供商
   */
  private convertContents(contents: any): string {
    if (typeof contents === 'string') {
      return contents;
    }
    
    if (Array.isArray(contents)) {
      return contents.map(item => {
        if (typeof item === 'string') return item;
        if (item.text) return item.text;
        if (item.content) return item.content;
        return JSON.stringify(item);
      }).join('\n');
    }

    if (contents && typeof contents === 'object') {
      if (contents.text) return contents.text;
      if (contents.content) return contents.content;
      if (contents.prompt) return contents.prompt;
      return JSON.stringify(contents);
    }

    return String(contents);
  }

  /**
   * 扩展文本生成，支持多提供商
   */
  async generateText(contents: any, settings: ProviderSettings): Promise<string> {
    this.initializeProviders(settings);

    if (settings.provider === 'shenma' && this.shenmaService) {
      const prompt = this.convertContents(contents);
      return await this.shenmaService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 2000
      });
    }

    if (settings.provider === 'zhipu' && this.zhipuService) {
      const prompt = this.convertContents(contents);
      return await this.zhipuService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 2000
      });
    }

    // 保持现有逻辑完全不变
    if (this.originalService && this.originalService.generateText) {
      return await this.originalService.generateText(contents, settings);
    }

    throw new Error(`Unsupported provider: ${settings.provider}`);
  }

  /**
   * 扩展图像生成
   */
  async generateImage(contents: any, settings: ProviderSettings): Promise<string> {
    this.initializeProviders(settings);

    if (settings.provider === 'shenma' && this.shenmaService) {
      const prompt = this.convertContents(contents);
      return await this.shenmaService.generateImage(prompt, {
        size: '1024x1024',
        quality: 'standard'
      });
    }

    if (settings.provider === 'zhipu' && this.zhipuService) {
      const prompt = this.convertContents(contents);
      return await this.zhipuService.generateImage(prompt, {
        size: '1024x1024'
      });
    }

    // 保持现有逻辑完全不变
    if (this.originalService && this.originalService.generateImage) {
      return await this.originalService.generateImage(contents, settings);
    }

    throw new Error(`Unsupported provider: ${settings.provider}`);
  }

  /**
   * 扩展视频生成
   */
  async generateVideo(contents: any, settings: ProviderSettings): Promise<string> {
    this.initializeProviders(settings);
    
    // 从contents中提取文字提示和图片
    let prompt = '';
    let referenceImage = '';
    
    if (contents && contents.parts) {
      contents.parts.forEach((part: any) => {
        if (part.text) {
          prompt += part.text;
        } else if (part.inlineData) {
          // 从inlineData中获取图片数据
          referenceImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      });
    } else {
      // 兼容旧的调用方式
      prompt = contents;
    }

    if (settings.provider === 'shenma' && this.shenmaService) {
      return await this.shenmaService.generateVideo(prompt, {
        aspectRatio: '16:9',
        referenceImage: referenceImage
      });
    }

    if (settings.provider === 'zhipu' && this.zhipuService) {
      const result = await this.zhipuService.generateVideo(prompt, {
        duration: 10,
        imageUrl: referenceImage
      });
      
      // 处理异步视频生成
      if (typeof result === 'object' && 'taskId' in result) {
        return await this.handleAsyncVideo(result.taskId);
      }
      
      return typeof result === 'string' ? result : '';
    }

    // 保持现有逻辑完全不变
    if (this.originalService && this.originalService.generateVideo) {
      return await this.originalService.generateVideo(prompt, settings);
    }

    throw new Error(`Unsupported provider: ${settings.provider}`);
  }

  /**
   * 处理异步视频生成
   */
  private async handleAsyncVideo(taskId: string): Promise<string> {
    if (!this.zhipuService) {
      throw new Error('ZhipuService not initialized');
    }

    return new Promise((resolve, reject) => {
      this.zhipuService!.startPolling(
        taskId,
        (status: string, progress: number) => {
          console.log(`Video generation progress: ${progress}%`);
        },
        (videoUrl: string) => {
          resolve(videoUrl);
        },
        (error: Error) => {
          reject(new Error(`Video generation failed: ${error.message}`));
        },
        30000
      );
    });
  }

  /**
   * 测试连接
   */
  async testConnection(settings: ProviderSettings): Promise<boolean> {
    this.initializeProviders(settings);

    try {
      if (settings.provider === 'shenma' && this.shenmaService) {
        return await this.shenmaService.testConnection();
      }

      if (settings.provider === 'zhipu' && this.zhipuService) {
        return await this.zhipuService.testConnection();
      }

      // 保持现有逻辑完全不变
      if (this.originalService && this.originalService.testConnection) {
        return await this.originalService.testConnection(settings);
      }

      return false;
    } catch (error) {
      console.error(`Connection test failed for ${settings.provider}:`, error);
      return false;
    }
  }

  /**
   * 获取提供商配置
   */
  getProviderConfig(provider: string): Partial<ModelConfig> {
    switch (provider) {
      case 'shenma':
        return {
          shenma: {
            provider: 'shenma',
            apiKey: '',
            baseUrl: 'https://api.whatai.cc', // 修正为参考项目的正确地址
            llmModel: 'gpt-4o', // 修正为参考项目的模型
            imageModel: 'nano-banana',
            videoModel: 'sora_video2' // 修正为参考项目的视频模型
          }
        };
      
      case 'zhipu':
        return {
          zhipu: {
            provider: 'zhipu',
            apiKey: '',
            baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
            llmModel: 'glm-4-flash',
            imageModel: 'cogview-3-flash',
            videoModel: 'cogvideox-flash',
            visionModel: 'glm-4v-flash'
          }
        };
      
      default:
        return {};
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.shenmaService = null;
    this.zhipuService = null;
  }
}

/**
 * 创建适配器实例的工厂函数
 */
export function createAIServiceAdapter(originalService?: any): MultiProviderAIService {
  return new MultiProviderAIService(originalService);
}

/**
 * 默认导出适配器类
 */
export default MultiProviderAIService;