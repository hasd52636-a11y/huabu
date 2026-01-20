/**
 * AI Service Adapter - 多提供商API调度适配器
 * 
 * 功能：
 * - 扩展现有aiService接口支持神马和智谱
 * - 保持现有API调用完全不变
 * - 实现多提供商统一调度逻辑
 * - 提供向后兼容的接口适配
 * - 智能路由：主用Gemini，GPT-4o备份
 * - 增强错误处理：分类、重试、用户友好消息
 */

import { ShenmaService } from '../services/shenmaService.js';
import ZhipuService from '../services/zhipuService.js';
import { smartRoutingService } from '../services/SmartRoutingService.js';
import { ErrorHandler } from '../services/ErrorHandler.js';
import { ProviderSettings, ModelConfig } from '../types.js';
import { TokenCalculator } from '../services/TokenCalculator.js';
import { useTokenContext } from '../contexts/TokenContext.js';

export interface AIServiceAdapter {
  generateText(contents: any, settings: ProviderSettings): Promise<string>;
  generateImage(contents: any, settings: ProviderSettings): Promise<string>;
  generateVideo(contents: any, settings: ProviderSettings): Promise<string>;
  analyzeVideo(videoUrl: string, prompt: string, settings: ProviderSettings): Promise<string>;
  createCharacter(contents: any, settings: ProviderSettings): Promise<any>;
  testConnection(settings: ProviderSettings): Promise<boolean>;
  // 第一阶段新功能
  editImage?(imageFile: File | string, prompt: string, settings: ProviderSettings): Promise<string>;
  generateStructuredOutput?(prompt: string, schema: any, settings: ProviderSettings): Promise<any>;
  generateMultipleImages?(prompt: string, count: number, settings: ProviderSettings): Promise<string>;
  // Task 7: Enhanced AI Service Adapter - 新增功能
  generateVideoWithVeo?(params: VeoGenerationParams, settings: ProviderSettings): Promise<string>;
  generateVideoWithQwen?(params: QwenVideoParams, settings: ProviderSettings): Promise<string>;
  generateMultiImageVideo?(params: MultiImageVideoParams, settings: ProviderSettings): Promise<string>;
  animateCharacter?(params: CharacterAnimationParams, settings: ProviderSettings): Promise<string>;
  transformVideoStyle?(params: VideoStyleParams, settings: ProviderSettings): Promise<string>;
  editImageAdvanced?(params: AdvancedImageEditParams, settings: ProviderSettings): Promise<string>;
  // 设置token消耗更新回调
  setTokenUpdateCallback?(callback: (amount: number, type: 'text' | 'image' | 'video') => void): void;
  // ShenmaAPI专用优化方法
  analyzeMultipleImages?(imageUrls: string[], prompt?: string, settings?: ProviderSettings): Promise<string>;
  generateVideoFromMultipleImages?(imageUrls: string[], prompt: string, settings?: ProviderSettings): Promise<string>;
  replaceVideoCharacter?(videoUrl: string, characterImageUrl: string, prompt: string, settings?: ProviderSettings): Promise<string>;
  transferVideoStyle?(videoUrl: string, style: string, prompt: string, settings?: ProviderSettings): Promise<string>;
}

// Task 7: Enhanced AI Service Adapter - 新增参数接口
export interface VeoGenerationParams {
  prompt: string;
  model: 'veo3' | 'veo3-fast' | 'veo3-pro' | 'veo3-pro-frames' | 'veo3.1' | 'veo3.1-pro' | 'veo2' | 'veo2-fast';
  aspectRatio?: '16:9' | '9:16';
  enhancePrompt?: boolean;
  enableUpsample?: boolean;
  images?: string[]; // For image-to-video generation
}

export interface QwenVideoParams {
  model: 'wanx2.1-vace-plus' | 'wan2.2-animate-move' | 'wan2.2-animate-mix' | 'video-style-transform';
  prompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  refImages?: string[];
  mode?: 'wan-std' | 'wan-pro';
  function?: 'image_reference' | 'video_repainting' | 'video_edit' | 'video_extension' | 'video_outpainting';
}

export interface MultiImageVideoParams {
  prompt: string;
  images: string[];
  model?: string;
  aspectRatio?: '16:9' | '9:16';
  duration?: number;
}

export interface CharacterAnimationParams {
  imageUrl: string;
  videoUrl: string;
  model: 'wan2.2-animate-move' | 'wan2.2-animate-mix';
  mode?: 'wan-std' | 'wan-pro';
}

export interface VideoStyleParams {
  videoUrl: string;
  style: number; // 0-7 for different styles
  videoFps?: number;
  animateEmotion?: boolean;
  minLen?: number;
  useSR?: boolean;
}

export interface AdvancedImageEditParams {
  imageFile: File | string;
  prompt?: string;
  operation: 'inpainting' | 'outpainting' | 'style_transfer' | 'multi_edit';
  maskImage?: string;
  referenceImage?: string;
  strength?: number;
  guidance?: number;
}

export class MultiProviderAIService implements AIServiceAdapter {
  private shenmaService: ShenmaService | null = null;
  private zhipuService: ZhipuService | null = null;
  private originalService: any = null;
  private tokenUpdateCallback: ((amount: number, type: 'text' | 'image' | 'video') => void) | null = null;
  private errorHandler: ErrorHandler;

  constructor(originalService?: any) {
    this.originalService = originalService;
    this.errorHandler = new ErrorHandler();
  }

  // 设置token消耗更新回调
  setTokenUpdateCallback(callback: (amount: number, type: 'text' | 'image' | 'video') => void): void {
    this.tokenUpdateCallback = callback;
  }

  /**
   * 获取或创建 ShenmaService 实例（用于角色管理等功能）
   */
  getShenmaService(settings?: ProviderSettings): ShenmaService {
    if (!this.shenmaService) {
      // 如果没有提供 settings，使用默认配置
      const defaultSettings: ProviderSettings = settings || {
        provider: 'shenma',
        baseUrl: 'https://hk-api.gptbest.vip',
        apiKey: '',
        modelId: 'gpt-4o'
      };
      this.initializeProviders(defaultSettings);
    }
    return this.shenmaService!;
  }

  /**
   * 初始化服务提供商
   * Task 6.1: 添加初始化日志，确保API密钥正确传递
   */
  private initializeProviders(settings: ProviderSettings): void {
    console.log('[AIServiceAdapter] Initializing providers with settings:', {
      provider: settings.provider,
      hasApiKey: !!settings.apiKey,
      apiKeyLength: settings.apiKey?.length || 0,
      baseUrl: settings.baseUrl,
      modelId: settings.modelId
    });

    // 总是创建新实例以确保使用最新配置（解决API密钥更新问题）
    if (settings.provider === 'shenma') {
      console.log('[AIServiceAdapter] Creating/updating ShenmaService instance');
      this.shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: settings.baseUrl || 'https://hk-api.gptbest.vip',
        apiKey: settings.apiKey || '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora_video2'
      });
      console.log('[AIServiceAdapter] ✓ ShenmaService initialized/updated');
    }

    if (settings.provider === 'zhipu') {
      console.log('[AIServiceAdapter] Creating/updating ZhipuService instance');
      this.zhipuService = new ZhipuService({
        provider: 'zhipu',
        baseUrl: settings.baseUrl || 'https://open.bigmodel.cn/api/paas/v4',
        apiKey: settings.apiKey || '',
        llmModel: 'glm-4-flash',
        imageModel: 'cogview-3-flash',
        videoModel: 'cogvideox-flash',
        visionModel: 'glm-4v-flash'
      });
      console.log('[AIServiceAdapter] ✓ ZhipuService initialized/updated');
    }
  }

  /**
   * 转换内容格式以适配不同提供商
   */
  private convertContents(contents: any): string {
    if (typeof contents === 'string') {
      return contents;
    }
    
    // 处理包含parts数组的格式（来自App.tsx的调用）
    if (contents && typeof contents === 'object' && contents.parts && Array.isArray(contents.parts)) {
      console.log('[AIServiceAdapter] convertContents - Processing parts array:', contents.parts.length);
      // 合并所有文本parts，忽略inlineData（图片数据），因为图片数据不应该作为文字输入
      const textParts = contents.parts
        .filter((part: any) => part.text && !part.inlineData)
        .map((part: any) => part.text);
      
      if (textParts.length > 0) {
        return textParts.join(' ').trim();
      }
      // 如果没有文本parts，检查是否有其他内容
      if (contents.prompt) return contents.prompt;
      if (contents.content) return contents.content;
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
      // 避免将简单对象转换为JSON字符串，尝试提取有用内容
      return String(contents);
    }

    return String(contents);
  }

  /**
   * 智能文本生成 - 主用Gemini，GPT-4o作为备份
   * Task 6.1: 修改初始化逻辑，确保API密钥正确传递
   * Task 6.2: 改进错误处理
   * Enhanced: 使用ErrorHandler进行错误分类和重试逻辑
   */
  async generateText(contents: any, settings: ProviderSettings): Promise<string> {
    console.log('[AIServiceAdapter] generateText called with settings:', {
      provider: settings.provider,
      hasApiKey: !!settings.apiKey,
      apiKeyLength: settings.apiKey?.length || 0,
      baseUrl: settings.baseUrl,
      modelId: settings.modelId
    });
    
    // 调试对话历史
    console.log('[AIServiceAdapter] generateText contents:', {
      hasConversationHistory: !!(contents?.conversationHistory),
      historyLength: contents?.conversationHistory?.length || 0,
      hasParts: !!(contents?.parts),
      partsLength: contents?.parts?.length || 0
    });

    const executionId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const blockId = 'text_generation'; // In real usage, this would come from the block

    return await this.errorHandler.executeWithRetry(
      async () => {
        // Task 6.2: 验证配置
        if (!settings.apiKey || settings.apiKey.trim() === '' || settings.apiKey === 'PLACEHOLDER_API_KEY') {
          const errorMsg = `❌ API密钥未配置！

请按以下步骤配置Gemini API密钥：

🔑 获取API密钥：
1. 访问 https://aistudio.google.com/app/apikey
2. 登录Google账号并创建API密钥
3. 复制生成的API密钥

⚙️ 配置方法（选择其中一种）：

方法1 - 在应用中配置：
1. 点击右侧边栏的"设置"按钮
2. 在"API提供商配置"中粘贴API密钥
3. 点击"保存配置"

方法2 - 修改.env.local文件：
1. 在项目根目录找到.env.local文件
2. 将 PLACEHOLDER_API_KEY 替换为你的真实API密钥
3. 保存文件并刷新页面

当前配置状态：
- Provider: ${settings.provider}
- API Key: ${settings.apiKey === 'PLACEHOLDER_API_KEY' ? '❌ 占位符密钥（需要替换）' : '❌ 空密钥'}
- Base URL: ${settings.baseUrl}

💡 提示：配置完成后，语音控制将能正常识别和执行指令！`;
          
          console.error('[AIServiceAdapter]', errorMsg);
          throw new Error(errorMsg);
        }

        if (!settings.baseUrl || settings.baseUrl.trim() === '') {
          const errorMsg = `API地址未配置，请在设置中配置 ${settings.provider} 的Base URL`;
          console.error('[AIServiceAdapter]', errorMsg);
          throw new Error(errorMsg);
        }

        this.initializeProviders(settings);

        // 使用智能路由选择最佳模型
        const smartSettings = smartRoutingService.getSmartProvider(contents, settings);

        // 计算输入内容的token消耗
        const prompt = this.convertContents(contents);
        const tokenAmount = TokenCalculator.calculateTextTokens(prompt, {
          provider: smartSettings.provider
        });

        // 尊重用户选择的提供商，而不是硬编码使用神马提供商
        const selectedProvider = smartSettings.provider;
        
        if (selectedProvider === 'shenma' && this.shenmaService) {
          // 准备主提供商和备用提供商的配置
          const primarySettings: ProviderSettings = {
            provider: selectedProvider,
            apiKey: settings.apiKey,
            baseUrl: settings.baseUrl,
            modelId: smartSettings.modelId
          };

          const fallbackSettings: ProviderSettings = {
            provider: selectedProvider,
            apiKey: settings.apiKey,
            baseUrl: settings.baseUrl,
            modelId: 'gpt-4o'
          };

          const result = await smartRoutingService.executeWithFallback(
            // 主模型：Gemini
            async () => {
              console.log('[AIServiceAdapter] Trying primary model: Gemini');
              // 直接传递原始内容，不进行字符串转换，以支持多模态内容
              // 检查是否需要工具调用（当前实现：仅在明确请求工具时才传递工具参数）
              // 未来可以扩展为基于内容自动判断是否需要工具
              const textContent = typeof contents === 'string' ? contents : 
                                 contents.parts?.[0]?.text || 
                                 contents.content || 
                                 JSON.stringify(contents);
              
              // 工具调用触发机制：检查是否包含工具调用指令
              const shouldUseTools = textContent.includes('使用工具') || 
                                     textContent.includes('调用函数') ||
                                     textContent.includes('execute tool') ||
                                     textContent.includes('call function') ||
                                     // 支持@符号前缀的工具调用，如 @weather、@calculator
                                     /@[a-zA-Z0-9_]+/.test(textContent);
              
              const generationOptions: any = {
                temperature: 0.7,
                maxTokens: 2000
              };
              
              // 只有在需要工具调用时才传递工具参数
              if (shouldUseTools) {
                console.log('[AIServiceAdapter] Tool call requested, enabling tool support');
                // 这里可以添加具体的工具定义
                generationOptions.tools = []; // 暂时为空，等待具体工具实现
                generationOptions.toolChoice = 'auto';
              }
              
              return await this.shenmaService!.generateText(contents, generationOptions);
            },
            // 备用模型：GPT-4o
            async () => {
              console.log('[AIServiceAdapter] Trying fallback model: GPT-4o');
              // 创建一个临时的ShenmaService实例用于GPT-4o
              const fallbackService = new ShenmaService({
                ...this.shenmaService!.config,
                llmModel: 'gpt-4o'
              });
              
              // 直接传递原始内容，不进行字符串转换
              // 同样应用工具调用触发机制
              const textContent = typeof contents === 'string' ? contents : 
                                 contents.parts?.[0]?.text || 
                                 contents.content || 
                                 JSON.stringify(contents);
              
              const shouldUseTools = textContent.includes('使用工具') || 
                                     textContent.includes('调用函数') ||
                                     textContent.includes('execute tool') ||
                                     textContent.includes('call function') ||
                                     // 支持@符号前缀的工具调用，如 @weather、@calculator
                                     /@[a-zA-Z0-9_]+/.test(textContent);
              
              const generationOptions: any = {
                temperature: 0.7,
                maxTokens: 2000
              };
              
              if (shouldUseTools) {
                console.log('[AIServiceAdapter] Tool call requested for fallback model');
                generationOptions.tools = []; // 暂时为空，等待具体工具实现
                generationOptions.toolChoice = 'auto';
              }
              
              return await fallbackService.generateText(contents, generationOptions);
            },
            'text generation',
            primarySettings,  // Task 6.1: 传递主提供商配置
            fallbackSettings  // Task 6.1: 传递备用提供商配置
          );

          // 更新token消耗
          if (this.tokenUpdateCallback) {
            this.tokenUpdateCallback(tokenAmount, 'text');
          }

          return result;
        }

        if (settings.provider === 'zhipu' && this.zhipuService) {
          console.log('[AIServiceAdapter] Using Zhipu provider');
          // 对于智谱，仍然需要转换为字符串（如果它不支持多模态）
          const prompt = this.convertContents(contents);
          
          // 同样应用工具调用触发机制
          const shouldUseTools = prompt.includes('使用工具') || 
                                 prompt.includes('调用函数') ||
                                 prompt.includes('execute tool') ||
                                 prompt.includes('call function') ||
                                 // 支持@符号前缀的工具调用，如 @weather、@calculator
                                 /@[a-zA-Z0-9_]+/.test(prompt);
          
          const generationOptions: any = {
            temperature: 0.7,
            maxTokens: 2000
          };
          
          if (shouldUseTools) {
            console.log('[AIServiceAdapter] Tool call requested for Zhipu provider');
            generationOptions.tools = []; // 暂时为空，等待具体工具实现
            generationOptions.toolChoice = 'auto';
          }
          
          const result = await this.zhipuService.generateText(prompt, generationOptions);

          // 更新token消耗
          if (this.tokenUpdateCallback) {
            this.tokenUpdateCallback(tokenAmount, 'text');
          }

          return result;
        }

        // 保持现有逻辑完全不变
        if (this.originalService && this.originalService.generateText) {
          console.log('[AIServiceAdapter] Using original service');
          const result = await this.originalService.generateText(contents, settings);

          // 更新token消耗
          if (this.tokenUpdateCallback) {
            this.tokenUpdateCallback(tokenAmount, 'text');
          }

          return result;
        }

        throw new Error(`Unsupported provider: ${settings.provider}`);
      },
      {
        blockId,
        executionId,
        operation: 'generateText'
      }
    );
  }

  /**
   * 扩展图像生成 - 支持多张图片、多分辨率和高级模型
   * Enhanced: 使用ErrorHandler进行错误分类和重试逻辑
   */
  async generateImage(contents: any, settings: ProviderSettings): Promise<string> {
    const executionId = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const blockId = 'image_generation'; // In real usage, this would come from the block

    return await this.errorHandler.executeWithRetry(
      async () => {
        this.initializeProviders(settings);

        // 计算图像生成的token消耗
        const tokenAmount = TokenCalculator.calculateImageTokens('', {
          provider: settings.provider,
          metadata: {
            width: 1024,
            height: 1024
          }
        });

        if (settings.provider === 'shenma' && this.shenmaService) {
          const prompt = this.convertContents(contents);
          
          // 检查是否有特殊选项
          let options: any = {
            size: '1024x1024',
            quality: 'standard'
          };
          
          // 从contents中提取选项
          if (contents && typeof contents === 'object') {
            if (contents.aspectRatio) options.aspectRatio = contents.aspectRatio;
            if (contents.imageSize) options.imageSize = contents.imageSize;
            if (contents.count) options.count = contents.count;
            if (contents.model) options.model = contents.model;
            if (contents.style) options.style = contents.style;
            // 新增：支持Volc API选项
            if (contents.isVolcAPI) options.isVolcAPI = contents.isVolcAPI;
            if (contents.req_key) options.req_key = contents.req_key;
            if (contents.image_urls) options.image_urls = contents.image_urls;
            if (contents.binary_data_base64) options.binary_data_base64 = contents.binary_data_base64;
            if (contents.return_url !== undefined) options.return_url = contents.return_url;
          }
          
          // 检查是否使用高级模型
          if (options.model === 'high-quality') {
            // 使用高质量图像生成
            options.req_key = 'high_aes_general_v14_ip_keep';
            options.isVolcAPI = true;
          }
          
          const result = await this.shenmaService.generateImage(prompt, options);

          // 检查是否是多张图片的JSON响应
          let finalResult = result;
          try {
            const parsedResult = JSON.parse(result);
            if (parsedResult.type === 'multiple_images' && parsedResult.images && parsedResult.images.length > 0) {
              // 如果是多张图片，只使用第一张图片的URL
              console.log(`[AIServiceAdapter] Multiple images returned, using first image`);
              // 将第一张图片URL转换为base64格式
              const firstImageUrl = parsedResult.images[0];
              const base64 = await this.shenmaService.urlToBase64(firstImageUrl);
              finalResult = base64 || firstImageUrl;
              console.log(`[AIServiceAdapter] Multiple image URL converted to base64: ${!!base64}`);
            } else if (parsedResult.type === 'async_task') {
              // 异步任务结果，直接返回
              console.log(`[AIServiceAdapter] Async task submitted, task_id: ${parsedResult.task_id}`);
              finalResult = result;
            }
          } catch (e) {
            // 如果不是JSON格式，直接使用结果（单张图片URL）
            console.log(`[AIServiceAdapter] Single image returned or invalid JSON, converting URL to base64`);
            // 将单张图片URL转换为base64格式
            const base64 = await this.shenmaService.urlToBase64(result);
            finalResult = base64 || result;
            console.log(`[AIServiceAdapter] Single image URL converted to base64: ${!!base64}`);
          }

          // 更新token消耗
          if (this.tokenUpdateCallback) {
            this.tokenUpdateCallback(tokenAmount, 'image');
          }

          return finalResult;
        }

        if (settings.provider === 'zhipu' && this.zhipuService) {
          const prompt = this.convertContents(contents);
          const result = await this.zhipuService.generateImage(prompt, {
            size: '1024x1024'
          });

          // 更新token消耗
          if (this.tokenUpdateCallback) {
            this.tokenUpdateCallback(tokenAmount, 'image');
          }

          return result;
        }

        // 保持现有逻辑完全不变
        if (this.originalService && this.originalService.generateImage) {
          const result = await this.originalService.generateImage(contents, settings);

          // 更新token消耗
          if (this.tokenUpdateCallback) {
            this.tokenUpdateCallback(tokenAmount, 'image');
          }

          return result;
        }

        throw new Error(`Unsupported provider: ${settings.provider}`);
      },
      {
        blockId,
        executionId,
        operation: 'generateImage'
      }
    );
  }

  /**
   * 第一阶段新功能：图像编辑 - 支持高级编辑和多模型
   */
  async editImage(imageFile: File | string, prompt: string, settings: ProviderSettings, options?: any): Promise<string> {
    this.initializeProviders(settings);

    if (settings.provider === 'shenma' && this.shenmaService) {
      // 构建编辑选项
      const editOptions = {
        aspectRatio: '16:9',
        responseFormat: 'url',
        ...options // 传递额外选项，包括async和webhook
      };
      
      // 检查是否使用高级编辑模型
      if (options?.model === 'byteedit-v2.0' || options?.req_key === 'byteedit_v2.0') {
        // 使用高级图像编辑
        editOptions.req_key = 'byteedit_v2.0';
        editOptions.isVolcAPI = true;
      }
      
      // 调用shenmaService的editImage方法，注意参数顺序：prompt, imageFile, options
      return await this.shenmaService.editImage(prompt, imageFile, editOptions);
    }

    throw new Error(`Image editing not supported by provider: ${settings.provider}`);
  }

  /**
   * 第一阶段新功能：结构化输出生成
   */
  async generateStructuredOutput(prompt: string, schema: any, settings: ProviderSettings): Promise<any> {
    this.initializeProviders(settings);

    if (settings.provider === 'shenma' && this.shenmaService) {
      const options: any = {
        temperature: 0.1,
        maxTokens: 2048
      };
      
      if (schema) {
        if (typeof schema === 'object' && schema.type === 'json_schema') {
          options.responseFormat = schema;
        } else {
          options.responseFormat = {
            type: 'json_object'
          };
        }
      } else {
        options.responseFormat = {
          type: 'json_object'
        };
      }
      
      return await this.shenmaService.generateStructuredOutput(prompt, options);
    }

    throw new Error(`Structured output not supported by provider: ${settings.provider}`);
  }

  /**
   * 第一阶段新功能：多张图片生成
   */
  async generateMultipleImages(prompt: string, count: number, settings: ProviderSettings): Promise<string> {
    this.initializeProviders(settings);

    if (settings.provider === 'shenma' && this.shenmaService) {
      return await this.shenmaService.generateImage(prompt, {
        count: Math.min(count, 10), // API限制
        aspectRatio: '16:9'
      });
    }

    throw new Error(`Multiple image generation not supported by provider: ${settings.provider}`);
  }

  /**
   * 扩展视频生成
   * Enhanced: 使用ErrorHandler进行错误分类和重试逻辑
   * Enhanced: 智能视频模型选择策略
   */
  async generateVideo(contents: any, settings: ProviderSettings): Promise<string> {
    const executionId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const blockId = 'video_generation'; // In real usage, this would come from the block

    return await this.errorHandler.executeWithRetry(
      async () => {
        this.initializeProviders(settings);
        
        // 计算视频生成的token消耗
        const tokenAmount = TokenCalculator.calculateVideoTokens('', {
          provider: settings.provider,
          metadata: {
            duration: 10, // 默认10秒，实际可能根据options变化
            width: 1280,
            height: 720
          }
        });
        
        // 从contents中提取文字提示、指令、图片和角色客串参数
        let userInstruction = '';
        const referenceImages: string[] = [];
        let characterUrl: string | undefined;
        let characterTimestamps: string | undefined;
        let aspectRatio: '16:9' | '9:16' = '16:9';
        let duration: number = 10;
        let quality: 'standard' | 'hd' = 'standard';
        
        if (contents && contents.parts) {
          contents.parts.forEach((part: any) => {
            if (part.text) {
              // 只提取用户指令部分，忽略其他辅助信息
              if (part.text.includes('User Instruction:') || part.text.includes('指令:')) {
                userInstruction = part.text;
              }
            } else if (part.inlineData) {
              // 从inlineData中获取图片数据
              const imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              referenceImages.push(imageData);
            }
          });
        } else if (contents && typeof contents === 'object') {
          // 兼容旧的调用方式和新的参数格式
          userInstruction = contents.text || contents.content || contents.prompt || '';
          
          // 提取角色客串参数
          characterUrl = contents.characterUrl;
          characterTimestamps = contents.characterTimestamps;
          
          // 检查提示词中是否包含角色引用 (@{username} 语法)
          const characterReferences = userInstruction.match(/@\{[^}]+\}/g);
          if (characterReferences) {
            console.log('[AIServiceAdapter] Found character references in prompt:', characterReferences);
            // 角色引用将直接传递给 Sora2 API，无需额外处理
          }
          
          // 提取视频参数
          aspectRatio = contents.aspectRatio || '16:9';
          duration = contents.duration || 10;
          
          // 检测质量需求
          if (userInstruction.includes('高清') || userInstruction.includes('HD') || userInstruction.includes('高质量')) {
            quality = 'hd';
          }
          
          // 提取参考图像
          if (contents.referenceImage) {
            if (Array.isArray(contents.referenceImage)) {
              referenceImages.push(...contents.referenceImage);
            } else {
              referenceImages.push(contents.referenceImage);
            }
          }
        } else {
          // 兼容最旧的调用方式
          userInstruction = contents;
        }

        // 字符数检查已在App.tsx中完成，这里只记录日志
        const MAX_PROMPT_LENGTH = 1000;
        if (userInstruction && userInstruction.length > MAX_PROMPT_LENGTH) {
          console.warn(`[AIServiceAdapter] Video prompt too long: ${userInstruction.length} characters. Limit: ${MAX_PROMPT_LENGTH}.`);
        }

        // 按照视频端口要求组织信息：只包含指令和图片引用
        let formattedPrompt = '';
        if (userInstruction && userInstruction.trim()) {
          formattedPrompt = userInstruction.trim();
        }
        
        // 如果没有有效的prompt，使用默认提示
        if (!formattedPrompt) {
          formattedPrompt = '生成一个创意视频';
        }
        
        console.log('[AIServiceAdapter] Final video prompt:', formattedPrompt);
        // 图片将单独传递，不合并到prompt中

        if (settings.provider === 'shenma' && this.shenmaService) {
          // 使用智能视频模型选择策略
          const videoStrategy = this.getVideoModelStrategy({
            duration,
            aspectRatio,
            quality,
            priority: 'quality' // 默认优先质量
          });

          console.log(`[AIServiceAdapter] Video generation strategy:`, videoStrategy);

          const videoOptions: any = {
            aspectRatio,
            duration,
            model: videoStrategy.primary // 使用主选模型
          };
          
          // 传递参考图像数组
          if (referenceImages.length > 0) {
            videoOptions.referenceImage = referenceImages;
          }
          
          // 传递角色客串参数
          if (characterUrl) {
            videoOptions.characterUrl = characterUrl;
          }
          
          if (characterTimestamps) {
            videoOptions.characterTimestamps = characterTimestamps;
          }

          try {
            // 尝试主选模型
            const result = await this.shenmaService.generateVideo(formattedPrompt, videoOptions);
            
            if (!result) {
              throw new Error('Video generation returned null result');
            }
            
            // 如果返回的是任务信息，需要轮询等待完成
            if (typeof result === 'object' && result && 'taskId' in result) {
              return await this.handleAsyncVideo((result as any).taskId, this.shenmaService);
            }
            
            // 如果直接返回URL字符串
            const videoResult = typeof result === 'string' ? result : (result as any)?.url || '';

            // 更新token消耗
            if (this.tokenUpdateCallback) {
              this.tokenUpdateCallback(tokenAmount, 'video');
            }

            return videoResult;
          } catch (primaryError) {
            console.warn(`[AIServiceAdapter] Primary video model ${videoStrategy.primary} failed, trying fallback:`, primaryError);
            
            // 尝试备选模型
            try {
              const fallbackOptions = {
                ...videoOptions,
                model: videoStrategy.fallback
              };
              
              const result = await this.shenmaService.generateVideo(formattedPrompt, fallbackOptions);
              
              if (!result) {
                throw new Error('Video generation returned null result');
              }
              
              // 如果返回的是任务信息，需要轮询等待完成
              if (typeof result === 'object' && result && 'taskId' in result) {
                return await this.handleAsyncVideo((result as any).taskId, this.shenmaService);
              }
              
              // 如果直接返回URL字符串
              const videoResult = typeof result === 'string' ? result : (result as any)?.url || '';

              // 更新token消耗
              if (this.tokenUpdateCallback) {
                this.tokenUpdateCallback(tokenAmount, 'video');
              }

              return videoResult;
            } catch (fallbackError) {
              console.error(`[AIServiceAdapter] Both primary and fallback video models failed:`, {
                primary: videoStrategy.primary,
                fallback: videoStrategy.fallback,
                primaryError: (primaryError as Error).message,
                fallbackError: (fallbackError as Error).message
              });
              
              // 如果有扩展选项，尝试最后一次
              if (videoStrategy.extended) {
                try {
                  const extendedOptions = {
                    ...videoOptions,
                    model: videoStrategy.extended
                  };
                  
                  const result = await this.shenmaService.generateVideo(formattedPrompt, extendedOptions);
                  
                  if (!result) {
                    throw new Error('Video generation returned null result');
                  }
                  
                  // 如果返回的是任务信息，需要轮询等待完成
                  if (typeof result === 'object' && result && 'taskId' in result) {
                    return await this.handleAsyncVideo((result as any).taskId, this.shenmaService);
                  }
                  
                  // 如果直接返回URL字符串
                  const videoResult = typeof result === 'string' ? result : (result as any)?.url || '';

                  // 更新token消耗
                  if (this.tokenUpdateCallback) {
                    this.tokenUpdateCallback(tokenAmount, 'video');
                  }

                  return videoResult;
                } catch (extendedError) {
                  console.error(`[AIServiceAdapter] All video models failed, throwing original error`);
                  throw primaryError; // 抛出原始错误
                }
              } else {
                throw primaryError; // 抛出原始错误
              }
            }
          }
        }

        if (settings.provider === 'zhipu' && this.zhipuService) {
          const result = await this.zhipuService.generateVideo(formattedPrompt, {
            duration: 10,
            imageUrl: referenceImages[0]
          });
          
          if (!result) {
            throw new Error('Video generation returned null result');
          }
          
          // 处理异步视频生成
          if (typeof result === 'object' && result && 'taskId' in result) {
            return await this.handleAsyncVideo((result as any).taskId);
          }
          
          const videoResult = typeof result === 'string' ? result : (result as any)?.url || '';

          // 更新token消耗
          if (this.tokenUpdateCallback) {
            this.tokenUpdateCallback(tokenAmount, 'video');
          }

          return videoResult;
        }

        // 保持现有逻辑完全不变
        if (this.originalService && this.originalService.generateVideo) {
          const result = await this.originalService.generateVideo(formattedPrompt, settings);

          // 更新token消耗
          if (this.tokenUpdateCallback) {
            this.tokenUpdateCallback(tokenAmount, 'video');
          }

          return result;
        }

        throw new Error(`Unsupported provider: ${settings.provider}`);
      },
      {
        blockId,
        executionId,
        operation: 'generateVideo'
      }
    );
  }

  /**
   * 获取视频模型选择策略
   */
  private getVideoModelStrategy(requirements?: {
    duration?: number;
    aspectRatio?: '16:9' | '9:16';
    quality?: 'standard' | 'hd';
    priority?: 'speed' | 'quality' | 'compatibility';
  }): { primary: string; fallback: string; extended?: string } {
    const { duration = 10, aspectRatio = '16:9', quality = 'standard', priority = 'quality' } = requirements || {};

    // 基于需求选择最佳策略
    if (priority === 'speed') {
      // 优先速度：使用标准模型
      return {
        primary: 'sora_video2',
        fallback: 'sora_video2-portrait'
      };
    } else if (priority === 'compatibility') {
      // 优先兼容性：使用最稳定的模型
      return {
        primary: 'sora_video2',
        fallback: 'sora_video2-landscape'
      };
    } else {
      // 优先质量（默认）
      if (aspectRatio === '9:16') {
        // 竖屏内容
        if (duration > 10 && quality === 'hd') {
          return {
            primary: 'sora_video2-portrait-hd-15s',
            fallback: 'sora_video2-portrait-hd',
            extended: 'sora_video2-portrait'
          };
        } else if (quality === 'hd') {
          return {
            primary: 'sora_video2-portrait-hd',
            fallback: 'sora_video2-portrait'
          };
        } else {
          return {
            primary: 'sora_video2-portrait',
            fallback: 'sora_video2'
          };
        }
      } else {
        // 横屏内容
        if (quality === 'hd') {
          return {
            primary: 'sora_video2-landscape',
            fallback: 'sora_video2'
          };
        } else {
          return {
            primary: 'sora_video2',
            fallback: 'sora_video2-landscape'
          };
        }
      }
    }
  }

  /**
   * 处理异步视频生成
   */
  private async handleAsyncVideo(taskId: string, shenmaService?: ShenmaService): Promise<string> {
    if (shenmaService) {
      // 使用神马服务的轮询机制
      return new Promise((resolve, reject) => {
        shenmaService.startPolling(
          taskId,
          (status) => {
            console.log(`Video generation progress: ${status.progress}`);
          },
          (videoUrl: string) => {
            resolve(videoUrl);
          },
          (error: Error) => {
            reject(new Error(`Video generation failed: ${error.message}`));
          },
          30 * 60 * 1000 // 30分钟超时
        );
      });
    }
    
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
   * 视频分析功能 - 使用Gemini多模态能力
   */
  async analyzeVideo(videoUrl: string, prompt: string, settings: ProviderSettings): Promise<string> {
    this.initializeProviders(settings);

    if (settings.provider === 'shenma' && this.shenmaService) {
      return await this.shenmaService.analyzeVideo(videoUrl, prompt, {
        temperature: 0.1,
        maxTokens: 4000
      });
    }

    // 保持现有逻辑完全不变
    if (this.originalService && this.originalService.analyzeVideo) {
      return await this.originalService.analyzeVideo(videoUrl, prompt, settings);
    }

    throw new Error(`Video analysis not supported by provider: ${settings.provider}`);
  }
  /**
   * 角色创建功能 - 增强版本，支持重试逻辑和错误处理
   */
  async createCharacter(contents: any, settings: ProviderSettings): Promise<any> {
    console.log('[AIServiceAdapter] Creating character with Sora2 API');
    this.initializeProviders(settings);
    
    // 从contents中提取角色创建所需的参数
    let videoUrl: string | undefined;
    let timestamps: string = '';
    let fromTask: string | undefined;
    
    if (contents && typeof contents === 'object') {
      videoUrl = contents.url || contents.videoUrl;
      timestamps = contents.timestamps || '';
      fromTask = contents.from_task || contents.fromTask;
    }
    
    // 验证参数
    if (!videoUrl && !fromTask) {
      throw new Error('Either url or from_task must be provided for character creation');
    }
    
    // 验证时间戳格式 - Sora2 API uses "start,end" format
    if (!timestamps) {
      throw new Error('Timestamps are required for character creation');
    }
    
    const timestampParts = timestamps.split(',');
    if (timestampParts.length !== 2) {
      throw new Error('Timestamps must be in format "start,end" (e.g., "1,3")');
    }
    
    const start = parseFloat(timestampParts[0]);
    const end = parseFloat(timestampParts[1]);
    
    if (isNaN(start) || isNaN(end) || start >= end) {
      throw new Error('Invalid timestamp range');
    }
    
    if ((end - start) > 3 || (end - start) < 1) {
      throw new Error('Timestamp range must be between 1-3 seconds');
    }
    
    if (settings.provider === 'shenma' && this.shenmaService) {
      // Use the new Sora2 character creation API
      const params = {
        timestamps,
        ...(videoUrl ? { url: videoUrl } : {}),
        ...(fromTask ? { from_task: fromTask } : {})
      };
      
      try {
        const result = await this.shenmaService.createCharacter(params);
        console.log('[AIServiceAdapter] ✓ Character created successfully:', result.username);
        return result;
      } catch (error) {
        console.error('[AIServiceAdapter] Character creation failed:', error);
        throw error;
      }
    }
    
    if (settings.provider === 'zhipu' && this.zhipuService) {
      // 智谱服务暂时不支持角色创建
      throw new Error('Character creation is not supported by Zhipu provider');
    }
    
    // 保持现有逻辑完全不变
    if (this.originalService && this.originalService.createCharacter) {
      return await this.originalService.createCharacter(contents, settings);
    }
    
    throw new Error(`Character creation is not supported by ${settings.provider}`);
  }

  /**
   * 带重试逻辑的角色创建
   */
  private async createCharacterWithRetry(
    options: any,
    settings: ProviderSettings,
    maxRetries: number = 3
  ): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[AIServiceAdapter] Character creation attempt ${attempt + 1}/${maxRetries + 1}`, {
          url: options.url,
          from_task: options.from_task,
          timestamps: options.timestamps
        });
        
        const result = await this.shenmaService!.createCharacter(options);
        
        // 验证API响应
        if (!this.validateCharacterResponse(result)) {
          throw new Error('Invalid character creation response from API');
        }
        
        console.log('[AIServiceAdapter] ✓ Character created successfully:', result);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // 检查是否应该重试
        if (attempt < maxRetries && this.shouldRetryCharacterCreation(lastError)) {
          console.warn(`[AIServiceAdapter] Character creation attempt ${attempt + 1} failed, retrying...`, {
            error: lastError.message,
            nextAttemptIn: `${(attempt + 1) * 2}s`
          });
          
          // 指数退避
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
        } else {
          console.error('[AIServiceAdapter] Character creation failed after all retries:', lastError.message);
          break;
        }
      }
    }
    
    throw lastError || new Error('Character creation failed after all retries');
  }

  /**
   * 验证时间戳格式
   */
  private validateTimestamps(timestamps: string): boolean {
    const timestampPattern = /^(\d+)-(\d+)(,\d+-\d+)*$/;
    return timestampPattern.test(timestamps);
  }

  /**
   * 验证角色创建API响应
   */
  private validateCharacterResponse(response: any): boolean {
    if (!response || typeof response !== 'object') {
      return false;
    }
    
    // 检查必需字段
    const requiredFields = ['id', 'username'];
    for (const field of requiredFields) {
      if (!response[field]) {
        console.warn(`[AIServiceAdapter] Missing required field in character response: ${field}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * 判断是否应该重试角色创建
   */
  private shouldRetryCharacterCreation(error: Error): boolean {
    const retryableErrors = [
      'timeout',
      'network',
      'connection',
      'temporary',
      'rate limit',
      'server error',
      '500',
      '502',
      '503',
      '504'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(keyword => errorMessage.includes(keyword));
  }

  /**
   * 处理角色参数到视频生成的传递
   */
  async generateVideoWithCharacter(
    contents: any,
    characterId: string,
    characterUrl: string,
    characterTimestamps: string,
    settings: ProviderSettings
  ): Promise<string> {
    // 增强contents以包含角色参数
    const enhancedContents = {
      ...contents,
      characterId,
      characterUrl,
      characterTimestamps
    };
    
    console.log('[AIServiceAdapter] Generating video with character:', {
      characterId,
      characterUrl,
      characterTimestamps
    });
    
    return await this.generateVideo(enhancedContents, settings);
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
            baseUrl: 'https://hk-api.gptbest.vip',
            llmModel: 'gpt-4o',
            imageModel: 'nano-banana',
            videoModel: 'sora_video2'
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

  /**
   * ShenmaAPI专用：多图分析
   */
  async analyzeMultipleImages(imageUrls: string[], prompt?: string, settings?: ProviderSettings): Promise<string> {
    if (!settings) {
      throw new Error('Settings required for analyzeMultipleImages');
    }
    
    this.initializeProviders(settings);

    if (settings.provider === 'shenma' && this.shenmaService) {
      console.log('[AIServiceAdapter] ShenmaAPI multi-image analysis');
      return await this.shenmaService.analyzeMultipleImages(imageUrls, prompt);
    }

    throw new Error(`Multi-image analysis not supported by provider: ${settings.provider}`);
  }

  /**
   * ShenmaAPI专用：多图生视频
   */
  async generateVideoFromMultipleImages(imageUrls: string[], prompt: string, settings?: ProviderSettings): Promise<string> {
    if (!settings) {
      throw new Error('Settings required for generateVideoFromMultipleImages');
    }
    
    this.initializeProviders(settings);

    if (settings.provider === 'shenma' && this.shenmaService) {
      console.log('[AIServiceAdapter] ShenmaAPI multi-image to video generation');
      return await this.shenmaService.generateVideoFromMultipleImages(imageUrls, prompt);
    }

    throw new Error(`Multi-image video generation not supported by provider: ${settings.provider}`);
  }

  /**
   * ShenmaAPI专用：视频角色替换
   */
  async replaceVideoCharacter(videoUrl: string, characterImageUrl: string, prompt: string, settings?: ProviderSettings): Promise<string> {
    if (!settings) {
      throw new Error('Settings required for replaceVideoCharacter');
    }
    
    this.initializeProviders(settings);

    if (settings.provider === 'shenma' && this.shenmaService) {
      console.log('[AIServiceAdapter] ShenmaAPI video character replacement');
      return await this.shenmaService.replaceVideoCharacter(videoUrl, characterImageUrl, prompt);
    }

    throw new Error(`Video character replacement not supported by provider: ${settings.provider}`);
  }

  /**
   * ShenmaAPI专用：视频风格迁移
   */
  async transferVideoStyle(videoUrl: string, style: string, prompt: string, settings?: ProviderSettings): Promise<string> {
    if (!settings) {
      throw new Error('Settings required for transferVideoStyle');
    }
    
    this.initializeProviders(settings);

    if (settings.provider === 'shenma' && this.shenmaService) {
      console.log('[AIServiceAdapter] ShenmaAPI video style transfer');
      return await this.shenmaService.transferVideoStyle(videoUrl, style, prompt);
    }

    throw new Error(`Video style transfer not supported by provider: ${settings.provider}`);
  }

  /**
   * 获取错误统计信息
   */
  getErrorStats() {
    return this.errorHandler.getErrorStats();
  }

  /**
   * 获取用户友好的错误信息
   */
  getUserFriendlyErrorMessage(error: Error, context?: string): string {
    return this.errorHandler.createUserFriendlyErrorMessage(error, context);
  }

  /**
   * Task 7: Enhanced AI Service Adapter - Veo视频生成增强版
   * 支持所有Veo模型变体和参数验证
   * Requirements: 2.1
   */
  async generateVideoWithVeo(params: VeoGenerationParams, settings: ProviderSettings): Promise<string> {
    const executionId = `veo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const blockId = 'veo_video_generation';

    return await this.errorHandler.executeWithRetry(
      async () => {
        this.initializeProviders(settings);

        // 验证Veo模型参数
        this.validateVeoParams(params);

        if (settings.provider === 'shenma' && this.shenmaService) {
          // 构建Veo API请求
          const veoRequest: any = {
            prompt: params.prompt,
            model: params.model,
            aspect_ratio: params.aspectRatio || '16:9'
          };

          // 可选参数
          if (params.enhancePrompt !== undefined) {
            veoRequest.enhance_prompt = params.enhancePrompt;
          }
          if (params.enableUpsample !== undefined) {
            veoRequest.enable_upsample = params.enableUpsample;
          }
          if (params.images && params.images.length > 0) {
            veoRequest.images = params.images;
          }

          console.log('[AIServiceAdapter] Generating video with Veo:', {
            model: params.model,
            aspectRatio: params.aspectRatio,
            hasImages: !!params.images?.length
          });

          // 使用统一格式接口 /v2/videos/generations
          const result = await this.shenmaService.generateVideoWithVeo(veoRequest);
          
          // 计算token消耗
          const tokenAmount = TokenCalculator.calculateVideoTokens(params.prompt, {
            provider: settings.provider,
            metadata: {
              duration: 10,
              width: params.aspectRatio === '9:16' ? 720 : 1280,
              height: params.aspectRatio === '9:16' ? 1280 : 720
            }
          });

          if (this.tokenUpdateCallback) {
            this.tokenUpdateCallback(tokenAmount, 'video');
          }

          return result;
        }

        throw new Error(`Veo video generation not supported by provider: ${settings.provider}`);
      },
      {
        blockId,
        executionId,
        operation: 'generateVideoWithVeo'
      }
    );
  }

  /**
   * Task 7: Enhanced AI Service Adapter - Qwen视频生成增强版
   * 支持多图视频生成、角色动画和视频编辑
   * Requirements: 2.2
   */
  async generateVideoWithQwen(params: QwenVideoParams, settings: ProviderSettings): Promise<string> {
    const executionId = `qwen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const blockId = 'qwen_video_generation';

    return await this.errorHandler.executeWithRetry(
      async () => {
        this.initializeProviders(settings);

        // 验证Qwen模型参数
        this.validateQwenParams(params);

        if (settings.provider === 'shenma' && this.shenmaService) {
          console.log('[AIServiceAdapter] Generating video with Qwen:', {
            model: params.model,
            function: params.function,
            hasImages: !!params.refImages?.length
          });

          // 根据不同的Qwen模型使用不同的API端点
          let result: string;
          
          if (params.model === 'wanx2.1-vace-plus') {
            // 多图生视频或视频编辑
            result = await this.shenmaService.generateQwenVideo(params);
          } else if (params.model === 'wan2.2-animate-move' || params.model === 'wan2.2-animate-mix') {
            // 角色动画
            result = await this.shenmaService.generateQwenCharacterAnimation(params);
          } else if (params.model === 'video-style-transform') {
            // 视频风格转换
            result = await this.shenmaService.generateQwenStyleTransform(params);
          } else {
            throw new Error(`Unsupported Qwen model: ${params.model}`);
          }

          // 计算token消耗
          const tokenAmount = TokenCalculator.calculateVideoTokens(params.prompt || '', {
            provider: settings.provider,
            metadata: {
              duration: 5,
              width: 1280,
              height: 720
            }
          });

          if (this.tokenUpdateCallback) {
            this.tokenUpdateCallback(tokenAmount, 'video');
          }

          return result;
        }

        throw new Error(`Qwen video generation not supported by provider: ${settings.provider}`);
      },
      {
        blockId,
        executionId,
        operation: 'generateVideoWithQwen'
      }
    );
  }

  /**
   * Task 7: Enhanced AI Service Adapter - 多图视频生成
   * Requirements: 2.2
   */
  async generateMultiImageVideo(params: MultiImageVideoParams, settings: ProviderSettings): Promise<string> {
    const qwenParams: QwenVideoParams = {
      model: 'wanx2.1-vace-plus',
      prompt: params.prompt,
      refImages: params.images,
      function: 'image_reference'
    };

    return await this.generateVideoWithQwen(qwenParams, settings);
  }

  /**
   * Task 7: Enhanced AI Service Adapter - 角色动画生成
   * Requirements: 2.2
   */
  async animateCharacter(params: CharacterAnimationParams, settings: ProviderSettings): Promise<string> {
    const qwenParams: QwenVideoParams = {
      model: params.model,
      imageUrl: params.imageUrl,
      videoUrl: params.videoUrl,
      mode: params.mode || 'wan-std'
    };

    return await this.generateVideoWithQwen(qwenParams, settings);
  }

  /**
   * Task 7: Enhanced AI Service Adapter - 视频风格转换
   * Requirements: 2.2
   */
  async transformVideoStyle(params: VideoStyleParams, settings: ProviderSettings): Promise<string> {
    const qwenParams: QwenVideoParams = {
      model: 'video-style-transform',
      videoUrl: params.videoUrl
    };

    return await this.generateVideoWithQwen(qwenParams, settings);
  }

  /**
   * Task 7: Enhanced AI Service Adapter - 高级图像编辑
   * 支持inpainting、outpainting、风格转换和多图编辑
   * Requirements: 2.3
   */
  async editImageAdvanced(params: AdvancedImageEditParams, settings: ProviderSettings): Promise<string> {
    const executionId = `img_edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const blockId = 'advanced_image_edit';

    return await this.errorHandler.executeWithRetry(
      async () => {
        this.initializeProviders(settings);

        // 验证图像编辑参数
        this.validateImageEditParams(params);

        if (settings.provider === 'shenma' && this.shenmaService) {
          console.log('[AIServiceAdapter] Advanced image editing:', {
            operation: params.operation,
            hasPrompt: !!params.prompt,
            hasMask: !!params.maskImage
          });

          let result: string;

          switch (params.operation) {
            case 'inpainting':
              result = await this.shenmaService.editImageInpainting({
                imageFile: params.imageFile,
                prompt: params.prompt,
                maskImage: params.maskImage,
                strength: params.strength || 0.8
              });
              break;

            case 'outpainting':
              result = await this.shenmaService.editImageOutpainting({
                imageFile: params.imageFile,
                prompt: params.prompt,
                guidance: params.guidance || 7.5
              });
              break;

            case 'style_transfer':
              result = await this.shenmaService.editImageStyleTransfer({
                imageFile: params.imageFile,
                referenceImage: params.referenceImage,
                strength: params.strength || 0.7
              });
              break;

            case 'multi_edit':
              result = await this.shenmaService.editImageMulti({
                imageFile: params.imageFile,
                prompt: params.prompt,
                maskImage: params.maskImage,
                referenceImage: params.referenceImage,
                strength: params.strength || 0.8,
                guidance: params.guidance || 7.5
              });
              break;

            default:
              throw new Error(`Unsupported image edit operation: ${params.operation}`);
          }

          // 计算token消耗
          const tokenAmount = TokenCalculator.calculateImageTokens(params.prompt || '', {
            provider: settings.provider,
            metadata: {
              width: 1024,
              height: 1024
            }
          });

          if (this.tokenUpdateCallback) {
            this.tokenUpdateCallback(tokenAmount, 'image');
          }

          return result;
        }

        throw new Error(`Advanced image editing not supported by provider: ${settings.provider}`);
      },
      {
        blockId,
        executionId,
        operation: 'editImageAdvanced'
      }
    );
  }

  /**
   * Task 7: 验证Veo参数
   */
  private validateVeoParams(params: VeoGenerationParams): void {
    if (!params.prompt || params.prompt.trim() === '') {
      throw new Error('Veo generation requires a prompt');
    }

    const validModels = ['veo3', 'veo3-fast', 'veo3-pro', 'veo3-pro-frames', 'veo3.1', 'veo3.1-pro', 'veo2', 'veo2-fast'];
    if (!validModels.includes(params.model)) {
      throw new Error(`Invalid Veo model: ${params.model}. Valid models: ${validModels.join(', ')}`);
    }

    if (params.aspectRatio && !['16:9', '9:16'].includes(params.aspectRatio)) {
      throw new Error('Invalid aspect ratio. Must be "16:9" or "9:16"');
    }

    // 验证图像数量限制
    if (params.images) {
      let maxImages = 0;
      
      if (params.model.includes('frames')) {
        maxImages = params.model === 'veo3-pro-frames' ? 1 : 2;
      } else if (params.model.includes('components')) {
        maxImages = 3;
      }
      
      if (maxImages > 0 && params.images.length > maxImages) {
        throw new Error(`Model ${params.model} supports maximum ${maxImages} images`);
      }
    }
  }

  /**
   * Task 7: 验证Qwen参数
   */
  private validateQwenParams(params: QwenVideoParams): void {
    const validModels = ['wanx2.1-vace-plus', 'wan2.2-animate-move', 'wan2.2-animate-mix', 'video-style-transform'];
    if (!validModels.includes(params.model)) {
      throw new Error(`Invalid Qwen model: ${params.model}. Valid models: ${validModels.join(', ')}`);
    }

    if (params.mode && !['wan-std', 'wan-pro'].includes(params.mode)) {
      throw new Error('Invalid mode. Must be "wan-std" or "wan-pro"');
    }

    // 根据模型验证必需参数
    if (params.model === 'wan2.2-animate-move' || params.model === 'wan2.2-animate-mix') {
      if (!params.imageUrl || !params.videoUrl) {
        throw new Error('Character animation requires both imageUrl and videoUrl');
      }
    }

    if (params.model === 'video-style-transform') {
      if (!params.videoUrl) {
        throw new Error('Video style transform requires videoUrl');
      }
    }
  }

  /**
   * Task 7: 验证图像编辑参数
   */
  private validateImageEditParams(params: AdvancedImageEditParams): void {
    if (!params.imageFile) {
      throw new Error('Image editing requires an image file');
    }

    const validOperations = ['inpainting', 'outpainting', 'style_transfer', 'multi_edit'];
    if (!validOperations.includes(params.operation)) {
      throw new Error(`Invalid operation: ${params.operation}. Valid operations: ${validOperations.join(', ')}`);
    }

    if (params.operation === 'inpainting' && !params.maskImage) {
      throw new Error('Inpainting requires a mask image');
    }

    if (params.operation === 'style_transfer' && !params.referenceImage) {
      throw new Error('Style transfer requires a reference image');
    }

    if (params.strength && (params.strength < 0 || params.strength > 1)) {
      throw new Error('Strength must be between 0 and 1');
    }

    if (params.guidance && (params.guidance < 1 || params.guidance > 20)) {
      throw new Error('Guidance must be between 1 and 20');
    }
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