// zhipuService.ts - 智谱 API 集成服务
// 支持：
// - 深度思考：GLM-4.5-Flash
// - 视觉理解：GLM-4V-Flash
// - 文本生成：GLM-4-Flash
// - 视频生成：CogVideoX-Flash
// - 图像生成：CogView-3-Flash
// - 高端模型：GLM-4.6V, CogVideoX-3

import { ProviderConfig } from '../types';

export type ZhipuModel = 
  | 'glm-4.5-flash'      // 深度思考（普惠）
  | 'glm-4v-flash'       // 视觉理解（普惠）
  | 'glm-4-flash'        // 文本生成（普惠）
  | 'cogvideox-flash'    // 视频生成（普惠）
  | 'cogview-3-flash'    // 图像生成（普惠）
  | 'glm-4.6v'           // 高端视觉理解
  | 'cogvideox-3'        // 高端视频生成
  | 'cogview-3';         // 高端图像生成

export interface ZhipuVideoGenerationRequest {
  model: string;
  prompt?: string;
  image_url?: string;
  quality?: 'speed' | 'quality';
  with_audio?: boolean;
  watermark_enabled?: boolean;
  size?: '1280x720' | '720x1280' | '1024x1024' | '1920x1080' | '1080x1920' | '2048x1080' | '3840x2160';
  fps?: 30 | 60;
  duration?: 5 | 10;
  request_id?: string;
  user_id?: string;
}

export interface ZhipuVideoGenerationResponse {
  model: string;
  id: string;
  request_id: string;
  task_status: 'PROCESSING' | 'SUCCESS' | 'FAIL';
}

export interface ZhipuVideoStatusResponse {
  model: string;
  id: string;
  request_id: string;
  task_status: 'PROCESSING' | 'SUCCESS' | 'FAIL';
  video_url?: string;
  cover_image_url?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface ZhipuImageAnalysisRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: {
        url: string;
      };
    }>;
  }>;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ZhipuImageAnalysisResponse {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ZhipuImageGenerationRequest {
  model: string;
  prompt: string;
  negative_prompt?: string;
  size?: '1024x1024' | '1024x1536' | '1536x1024';
  batch_size?: number;
  quality?: 'standard' | 'premium';
  style?: string;
}

export interface ZhipuImageGenerationResponse {
  created: number;
  data: Array<{
    url: string;
    b64_json?: string;
  }>;
}

class ZhipuService {
  private config: ProviderConfig;
  private baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private modelConfig: any;

  constructor(config: ProviderConfig) {
    this.config = config;
    // 从本地存储加载模型配置
    const saved = localStorage.getItem('zhipu_models_config');
    this.modelConfig = saved ? JSON.parse(saved) : {
      text: 'glm-4-flash',
      thinking: 'glm-4.5-flash',
      vision: 'glm-4v-flash',
      video: 'cogvideox-flash',
      image: 'cogview-3-flash'
    };
  }

  // 获取指定类别的模型
  private getModel(category: 'text' | 'thinking' | 'vision' | 'video' | 'image'): string {
    return this.modelConfig[category] || {
      text: 'glm-4-flash',
      thinking: 'glm-4.5-flash',
      vision: 'glm-4v-flash',
      video: 'cogvideox-flash',
      image: 'cogview-3-flash'
    }[category];
  }

  private getAuthHeader(): HeadersInit {
    // 确保 API Key 只包含 ASCII 字符，避免 fetch 请求头编码问题
    const apiKey = this.config.apiKey || '';
    
    // 验证 API Key 是否包含非 ASCII 字符
    if (!/^[\x00-\x7F]*$/.test(apiKey)) {
      console.warn('[ZhipuService] API Key contains non-ASCII characters, filtering...');
      // 过滤掉非 ASCII 字符
      const cleanApiKey = apiKey.replace(/[^\x00-\x7F]/g, '');
      if (!cleanApiKey) {
        throw new Error('API Key contains only non-ASCII characters');
      }
      return {
        'Authorization': `Bearer ${cleanApiKey}`,
        'Content-Type': 'application/json'
      };
    }

    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 生成视频 (异步)
   * 支持文本转视频、图像转视频
   * 使用配置的视频模型（默认 CogVideoX-Flash）
   */
  async generateVideo(
    prompt: string,
    options?: {
      imageUrl?: string;
      quality?: 'speed' | 'quality';
      withAudio?: boolean;
      watermarkEnabled?: boolean;
      size?: '1280x720' | '720x1280' | '1024x1024' | '1920x1080' | '1080x1920' | '2048x1080' | '3840x2160';
      fps?: 30 | 60;
      duration?: 5 | 10;
      userId?: string;
      model?: string;
    }
  ): Promise<{ taskId: string; status: string }> {
    try {
      const model = options?.model || this.getModel('video');
      const requestBody: ZhipuVideoGenerationRequest = {
        model: model,
        quality: options?.quality || 'speed',
        with_audio: options?.withAudio ?? false,
        watermark_enabled: options?.watermarkEnabled ?? true,
        size: options?.size || '1920x1080',
        fps: options?.fps || 30,
        duration: options?.duration || 5,
        request_id: this.generateRequestId(),
        user_id: options?.userId || 'default_user'
      };

      // 二选一：prompt 或 image_url
      if (options?.imageUrl) {
        requestBody.image_url = options.imageUrl;
      } else {
        requestBody.prompt = prompt;
      }

      console.log(`[ZhipuService] Generating video with ${model}:`, requestBody);

      const response = await fetch(`${this.baseUrl}/videos/generations`, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ZhipuService] Video generation error:', response.status, errorText);
        throw new Error(`Video generation failed: ${response.status} - ${errorText}`);
      }

      const data: ZhipuVideoGenerationResponse = await response.json();
      console.log('[ZhipuService] Video generation response:', data);

      return {
        taskId: data.id,
        status: data.task_status
      };
    } catch (error) {
      console.error('[ZhipuService] Generate video error:', error);
      throw error;
    }
  }

  /**
   * 查询视频生成结果
   */
  async getVideoStatus(taskId: string): Promise<{
    status: 'PROCESSING' | 'SUCCESS' | 'FAIL';
    videoUrl?: string;
    coverImageUrl?: string;
    error?: string;
  }> {
    try {
      console.log('[ZhipuService] Querying video status for task:', taskId);

      const response = await fetch(`${this.baseUrl}/async-result/${taskId}`, {
        method: 'GET',
        headers: this.getAuthHeader()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ZhipuService] Status query error:', response.status, errorText);
        throw new Error(`Status query failed: ${response.status}`);
      }

      const data: any = await response.json();
      console.log('[ZhipuService] Video status response:', JSON.stringify(data, null, 2));

      // Extract video URL from different possible locations
      let videoUrl = data.video_url;
      let coverImageUrl = data.cover_image_url;

      // Check if there's a result object with video data
      if (!videoUrl && data.result) {
        videoUrl = data.result.video_url || data.result.url;
        coverImageUrl = data.result.cover_image_url || data.result.cover_url;
        console.log('[ZhipuService] Extracted from result - videoUrl:', videoUrl, 'coverImageUrl:', coverImageUrl);
      }

      // If video_url not found, try to get it from choices array
      if (!videoUrl && data.choices && data.choices.length > 0) {
        const choice = data.choices[0];
        // Try different possible field names for video URL
        videoUrl = choice.video_url || choice.url || choice.data?.url || choice.message?.content;
        coverImageUrl = choice.cover_image_url || choice.cover_url || choice.data?.cover_url;
        console.log('[ZhipuService] Extracted from choices - videoUrl:', videoUrl, 'coverImageUrl:', coverImageUrl);
        console.log('[ZhipuService] Full choice object:', JSON.stringify(choice, null, 2));
      }

      // Clean up video URL by removing unwanted characters
      if (typeof videoUrl === 'string') {
        videoUrl = videoUrl.trim().replace(/[`'" ]/g, '');
      }

      // Clean up cover image URL if present
      if (typeof coverImageUrl === 'string') {
        coverImageUrl = coverImageUrl.trim().replace(/[`'" ]/g, '');
      }

      // If still no URL, log the full response for debugging
      if (!videoUrl && data.task_status === 'SUCCESS') {
        console.warn('[ZhipuService] ⚠️ Video generation completed but URL not found. Full data:', JSON.stringify(data, null, 2));
      }

      return {
        status: data.task_status,
        videoUrl: videoUrl,
        coverImageUrl: coverImageUrl,
        error: data.error?.message
      };
    } catch (error) {
      console.error('[ZhipuService] Get video status error:', error);
      throw error;
    }
  }

  /**
   * 分析图片内容 (GLM-4.6V 或 GLM-4V-Flash 多模态)
   * 支持图片理解、场景分析、内容描述等
   * 使用配置的视觉模型（默认 GLM-4V-Flash）
   */
  async analyzeImage(
    imageUrl: string,
    prompt: string,
    options?: {
      temperature?: number;
      topP?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<string> {
    try {
      const model = options?.model || this.getModel('vision');
      console.log(`[ZhipuService] Analyzing image with ${model}:`, prompt.substring(0, 100) + '...');

      const requestBody: ZhipuImageAnalysisRequest = {
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ],
        temperature: options?.temperature ?? 0.8,
        top_p: options?.topP ?? 0.6,
        max_tokens: options?.maxTokens ?? 1024,
        stream: false
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ZhipuService] Image analysis error:', response.status, errorText);
        throw new Error(`Image analysis failed: ${response.status}`);
      }

      const data: ZhipuImageAnalysisResponse = await response.json();
      console.log('[ZhipuService] Image analysis response received');

      const result = data.choices?.[0]?.message?.content || '';
      return result;
    } catch (error) {
      console.error('[ZhipuService] Analyze image error:', error);
      throw error;
    }
  }

  /**
   * 生成图像 (CogView-3-Flash 或 CogView-3)
   * 支持文本转图像
   * 使用配置的图像模型（默认 CogView-3-Flash）
   */
  async generateImage(
    prompt: string,
    options?: {
      negativePrompt?: string;
      size?: '1024x1024' | '1024x1536' | '1536x1024';
      quality?: 'standard' | 'premium';
      style?: string;
      model?: string;
    }
  ): Promise<string> {
    try {
      const model = options?.model || this.getModel('image');
      console.log(`[ZhipuService] Generating image with ${model}:`, prompt.substring(0, 100) + '...');

      const requestBody: ZhipuImageGenerationRequest = {
        model: model,
        prompt: prompt,
        negative_prompt: options?.negativePrompt,
        size: options?.size || '1024x1024',
        quality: options?.quality || 'standard',
        style: options?.style,
        batch_size: 1
      };

      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ZhipuService] Image generation error:', response.status, errorText);
        throw new Error(`Image generation failed: ${response.status}`);
      }

      const data: ZhipuImageGenerationResponse = await response.json();
      console.log('[ZhipuService] Image generation response received');

      // 只使用图片URL，不使用base64数据
      const imageUrl = data.data?.[0]?.url;
      if (!imageUrl) {
        console.error('[ZhipuService] No image URL in response, raw data:', JSON.stringify(data.data?.[0], null, 2));
        throw new Error('No image URL returned from API');
      }

      return imageUrl;
    } catch (error) {
      console.error('[ZhipuService] Generate image error:', error);
      throw error;
    }
  }

  /**
   * 文本生成 (GLM-4-Flash 或 GLM-4.5-Flash)
   * 支持深度思考和快速文本生成
   * 使用配置的文本模型（默认 GLM-4-Flash）
   */
  async generateText(
    prompt: string,
    options?: {
      temperature?: number;
      topP?: number;
      maxTokens?: number;
      model?: string;
      systemPrompt?: string;
      useThinking?: boolean;
    }
  ): Promise<string> {
    try {
      const model = options?.useThinking ? this.getModel('thinking') : (options?.model || this.getModel('text'));
      console.log(`[ZhipuService] Generating text with ${model}:`, prompt.substring(0, 100) + '...');

      const messages: any[] = [];
      
      if (options?.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt
        });
      }

      messages.push({
        role: 'user',
        content: prompt
      });

      const requestBody = {
        model: model,
        messages: messages,
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP ?? 0.9,
        max_tokens: options?.maxTokens ?? 2048,
        stream: false
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ZhipuService] Text generation error:', response.status, errorText);
        throw new Error(`Text generation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[ZhipuService] Text generation response received');

      const result = data.choices?.[0]?.message?.content || '';
      return result;
    } catch (error) {
      console.error('[ZhipuService] Generate text error:', error);
      throw error;
    }
  }

  /**
   * 启动视频生成轮询
   */
  startPolling(
    taskId: string,
    onProgress: (status: string, progress: number) => void,
    onComplete: (videoUrl: string, coverImageUrl?: string) => void,
    onError: (error: Error) => void,
    timeoutMs: number = 60 * 60 * 1000 // 60 分钟超时
  ): void {
    let pollInterval = 3000; // 初始 3 秒
    const maxInterval = 15000; // 最大 15 秒
    const backoffMultiplier = 1.2;
    const startTime = Date.now();
    let pollCount = 0;

    const poll = async () => {
      pollCount++;
      try {
        // 检查超时
        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        if (Date.now() - startTime > timeoutMs) {
          console.error(`[ZhipuService] Polling timeout after ${elapsedSeconds}s`);
          onError(new Error(`Video generation timeout (exceeded ${timeoutMs / 60 / 1000} minutes)`));
          this.stopPolling(taskId);
          return;
        }

        const result = await this.getVideoStatus(taskId);

        console.log(`[ZhipuService] Poll #${pollCount} - Status: ${result.status}, Elapsed: ${elapsedSeconds}s`);
        onProgress(result.status, pollCount * 5); // 简单的进度估算

        if (result.status === 'SUCCESS') {
          console.log(`[ZhipuService] ✅ Video generation SUCCESS after ${elapsedSeconds}s`);
          if (result.videoUrl) {
            onComplete(result.videoUrl, result.coverImageUrl);
          } else {
            onError(new Error('Video generated but URL not found'));
          }
          this.stopPolling(taskId);
        } else if (result.status === 'FAIL') {
          console.error(`[ZhipuService] ❌ Video generation FAILED`);
          onError(new Error(result.error || 'Video generation failed'));
          this.stopPolling(taskId);
        } else {
          // PROCESSING - 继续轮询
          pollInterval = Math.min(pollInterval * backoffMultiplier, maxInterval);
        }
      } catch (error) {
        console.error('[ZhipuService] Polling error:', error);
        onError(error as Error);
        this.stopPolling(taskId);
      }
    };

    // 立即执行第一次轮询
    poll();
    // 然后设置定时轮询
    const intervalId = setInterval(poll, pollInterval);
    this.pollingIntervals.set(taskId, intervalId);
  }

  /**
   * 停止轮询
   */
  stopPolling(taskId: string): void {
    const intervalId = this.pollingIntervals.get(taskId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(taskId);
    }
  }

  /**
   * 清理所有轮询
   */
  cleanup(): void {
    this.pollingIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.pollingIntervals.clear();
  }

  /**
   * 生成唯一的请求 ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 测试 API 连接
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('[ZhipuService] Testing API connection...');

      // 使用一个简单的文本生成请求来测试连接（比图片分析更可靠）
      const testPrompt = 'Say "test successful" in one word.';

      const result = await this.generateText(testPrompt, {
        maxTokens: 10
      });

      console.log('[ZhipuService] ✅ Connection test successful');
      return !!result;
    } catch (error) {
      console.error('[ZhipuService] ❌ Connection test failed:', error);
      return false;
    }
  }
}

export default ZhipuService;