// services/shenmaService.ts
// 神马API服务 - 支持对话模型、nano-banana图像模型、sora2视频模型

import { 
  ExtendedProviderConfig, 
  VideoItem, 
  VideoStatus, 
  CreateVideoOptions,
  VideoServiceConfig,
  TokenQuota 
} from '../types';

export interface ShenmaTextOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface ShenmaImageOptions {
  size?: '1024x1024' | '1920x1080' | '1080x1920';
  quality?: 'standard' | 'hd';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  style?: string;
}

export interface ShenmaVideoOptions {
  model?: 'sora_video2' | 'sora_video2-portrait' | 'sora_video2-landscape' | 'sora_video2-portrait-hd' | 'sora_video2-portrait-15s' | 'sora_video2-portrait-hd-15s';
  aspectRatio?: '16:9' | '9:16';
  duration?: 10 | 15 | 25;
  hd?: boolean;
  referenceImage?: string;
  watermark?: boolean;
  private?: boolean;
}

/**
 * 神马API服务类
 * 提供对话模型、nano-banana图像生成、sora2视频生成功能
 */
export class ShenmaService {
  private config: ExtendedProviderConfig;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: ExtendedProviderConfig) {
    this.config = config;
  }

  /**
   * 构建安全的请求头，确保只包含ASCII字符
   */
  private buildSafeHeaders(contentType: string = 'application/json'): Record<string, string> {
    const apiKey = this.config.apiKey || '';
    
    // 验证API Key是否包含非ASCII字符
    if (!/^[\x00-\x7F]*$/.test(apiKey)) {
      console.warn('[ShenmaService] API Key contains non-ASCII characters, filtering...');
      const cleanApiKey = apiKey.replace(/[^\x00-\x7F]/g, '');
      if (!cleanApiKey) {
        throw new Error('API Key contains only non-ASCII characters');
      }
      return {
        'Authorization': `Bearer ${cleanApiKey}`,
        'Content-Type': contentType
      };
    }

    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': contentType
    };
  }

  /**
   * 对话模型调用 - 使用神马的对话模型
   */
  async generateText(prompt: string, options?: ShenmaTextOptions): Promise<string> {
    console.log('[ShenmaService] Starting text generation');
    console.log('[ShenmaService] Prompt length:', prompt.length);
    
    const endpoint = `${this.config.baseUrl}/v1/chat/completions`;
    
    // 处理文件附件
    let processedPrompt = prompt;
    
    // 检测是否包含Word或PDF文件引用
    if (prompt.includes('[Word文件内容将通过AI服务解析]') || prompt.includes('[PDF文件内容将通过AI服务解析]')) {
      // 提取文件名
      const fileNameMatch = prompt.match(/Generate from attachment:\s*([^\n]+)/i) || prompt.match(/\[(Word|PDF)文件内容将通过AI服务解析\]/);
      if (fileNameMatch) {
        const fileName = fileNameMatch[1] || '文件';
        // 修改提示，让AI知道这是文件内容请求
        processedPrompt = `请告诉我如何解析这个${prompt.includes('Word') ? 'Word' : 'PDF'}文件: ${fileName}\n\n用户想要：${prompt.replace(/\[.*?\]/g, '').replace('Generate from attachment', '').trim()}`;
      }
    }
    
    const requestBody = {
      model: this.config.llmModel || 'gpt-4o', // 神马AI的标准对话模型
      messages: [
        {
          role: 'user',
          content: processedPrompt
        }
      ],
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 2048,
      top_p: options?.topP || 0.9
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.buildSafeHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ShenmaService] Text generation error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const result = data.choices?.[0]?.message?.content || '';
      
      console.log('[ShenmaService] ✓ Text generation successful');
      return result;
    } catch (error) {
      console.error('[ShenmaService] Text generation failed:', error);
      throw error;
    }
  }

  /**
   * nano-banana图像生成模型
   */
  async generateImage(prompt: string, options?: ShenmaImageOptions): Promise<string> {
    console.log('[ShenmaService] Starting image generation with nano-banana');
    console.log('[ShenmaService] Prompt:', prompt.substring(0, 100) + '...');
    
    const endpoint = `${this.config.baseUrl}/v1/images/generations`;
    
    // 构建样式前缀
    let stylePrefix = '';
    if (options?.style) {
      stylePrefix = `${options.style} style. `;
    }
    
    const fullPrompt = `${stylePrefix}${prompt}`;
    
    const requestBody = {
      model: 'nano-banana', // 神马的图像生成模型
      prompt: fullPrompt,
      aspect_ratio: options?.aspectRatio || '16:9',
      response_format: 'url'
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.buildSafeHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ShenmaService] Image generation error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;
      
      if (!imageUrl) {
        console.error('[ShenmaService] No image URL in response');
        throw new Error('No image URL returned from API');
      }

      console.log('[ShenmaService] ✓ Image generation successful');
      
      // 将URL转换为base64以避免CORS问题
      const base64Image = await this.urlToBase64(imageUrl);
      return base64Image || imageUrl;
    } catch (error) {
      console.error('[ShenmaService] Image generation failed:', error);
      throw error;
    }
  }

  /**
   * sora2视频生成模型
   */
  async generateVideo(prompt: string, options?: ShenmaVideoOptions): Promise<{ taskId: string; status: string }> {
    console.log('[ShenmaService] Starting video generation with sora_video2'); // 修正日志信息
    console.log('[ShenmaService] Prompt:', prompt.substring(0, 100) + '...');
    
    const endpoint = `${this.config.baseUrl}/v2/videos/generations`;
    
    const requestBody: any = {
      model: options?.model || 'sora_video2', // 修正为正确的默认模型
      prompt: prompt,
      aspect_ratio: options?.aspectRatio || '16:9',
      duration: options?.duration || 10,
      hd: options?.hd || false,
      watermark: options?.watermark ?? false,
      private: options?.private ?? false
    };

    // 处理参考图像
    if (options?.referenceImage) {
      requestBody.images = [options.referenceImage];
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.buildSafeHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ShenmaService] Video generation error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      console.log('[ShenmaService] ✓ Video generation request submitted');
      
      return {
        taskId: data.task_id,
        status: data.status || 'SUBMITTED'
      };
    } catch (error) {
      console.error('[ShenmaService] Video generation failed:', error);
      throw error;
    }
  }

  /**
   * 查询视频生成状态
   */
  async getVideoStatus(taskId: string): Promise<VideoStatus> {
    console.log('[ShenmaService] Checking video status for task:', taskId);
    
    const endpoint = `${this.config.baseUrl}/v2/videos/generations/${taskId}`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.buildSafeHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ShenmaService] Status check error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      return {
        task_id: data.task_id,
        status: data.status || 'IN_PROGRESS',
        progress: data.progress || '0%',
        submit_time: data.submit_time,
        start_time: data.start_time,
        finish_time: data.finish_time,
        fail_reason: data.fail_reason,
        video_url: data.data?.output || data.video_url,
        error: data.error
      };
    } catch (error) {
      console.error('[ShenmaService] Status check failed:', error);
      throw error;
    }
  }

  /**
   * 图像分析功能 - 使用nano-banana模型进行图像分析
   */
  async analyzeImage(imageUrl: string, prompt: string, options?: ShenmaTextOptions): Promise<string> {
    console.log('[ShenmaService] Starting image analysis with nano-banana');
    
    const endpoint = `${this.config.baseUrl}/v1/chat/completions`;
    
    const requestBody = {
      model: 'nano-banana', // 使用nano-banana模型进行图像分析
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ],
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 1024,
      top_p: options?.topP || 0.9
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.buildSafeHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ShenmaService] Image analysis error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const result = data.choices?.[0]?.message?.content || '';
      
      console.log('[ShenmaService] ✓ Image analysis successful');
      return result;
    } catch (error) {
      console.error('[ShenmaService] Image analysis failed:', error);
      throw error;
    }
  }

  /**
   * 获取配额信息
   */
  async getTokenQuota(): Promise<TokenQuota> {
    const endpoint = `${this.config.baseUrl}/v1/token/quota`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.buildSafeHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ShenmaService] Quota check error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      return {
        total_quota: data.total_quota || 0,
        used_quota: data.used_quota || 0,
        remaining_quota: data.remaining_quota || 0
      };
    } catch (error) {
      console.error('[ShenmaService] Quota check failed:', error);
      throw error;
    }
  }

  /**
   * 连接测试
   */
  async testConnection(): Promise<boolean> {
    console.log('[ShenmaService] Testing connection...');
    
    try {
      // 测试文本生成接口
      const result = await this.generateText('test', { maxTokens: 10 });
      console.log('[ShenmaService] ✓ Connection test successful');
      return !!result;
    } catch (error) {
      console.error('[ShenmaService] ❌ Connection test failed:', error);
      return false;
    }
  }

  /**
   * 开始轮询视频状态
   */
  startPolling(
    taskId: string,
    onProgress: (status: VideoStatus) => void,
    onComplete: (videoUrl: string) => void,
    onError: (error: Error) => void,
    timeoutMs: number = 60 * 60 * 1000  // 60分钟超时
  ): void {
    let pollInterval = 3000;  // 初始3秒
    const maxInterval = 15000;  // 最大15秒
    const backoffMultiplier = 1.2;
    const startTime = Date.now();
    let pollCount = 0;

    const poll = async () => {
      pollCount++;
      try {
        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        if (Date.now() - startTime > timeoutMs) {
          console.error(`[ShenmaService] Polling timeout after ${elapsedSeconds}s`);
          onError(new Error(`Video generation timeout (exceeded ${timeoutMs / 60 / 1000} minutes)`));
          this.stopPolling(taskId);
          return;
        }

        const status = await this.getVideoStatus(taskId);
        
        console.log(`[ShenmaService] Poll #${pollCount} - Status: ${status.status}, Progress: ${status.progress}`);
        
        onProgress(status);

        if (status.status === 'SUCCESS') {
          console.log(`[ShenmaService] ✅ Video generation completed after ${elapsedSeconds}s`);
          if (status.video_url) {
            onComplete(status.video_url);
          } else {
            onError(new Error('Video generated but URL not found'));
          }
          this.stopPolling(taskId);
        } else if (status.status === 'FAILURE') {
          console.error(`[ShenmaService] ❌ Video generation failed after ${elapsedSeconds}s`);
          const errorMessage = status.fail_reason || status.error?.message || 'Video generation failed';
          onError(new Error(errorMessage));
          this.stopPolling(taskId);
        } else {
          // 增加轮询间隔
          pollInterval = Math.min(pollInterval * backoffMultiplier, maxInterval);
        }
      } catch (error) {
        console.error('[ShenmaService] Polling error:', error);
        onError(error as Error);
        this.stopPolling(taskId);
      }
    };

    // 立即执行第一次轮询
    poll();
    // 设置定时轮询
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
      console.log(`[ShenmaService] Stopped polling for task: ${taskId}`);
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
    console.log('[ShenmaService] All polling intervals cleared');
  }

  /**
   * 将URL转换为base64以避免CORS问题
   */
  private async urlToBase64(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/png');
          resolve(base64);
        } catch (err) {
          console.error("[ShenmaService] Canvas conversion failed", err);
          resolve(null);
        }
      };
      
      img.onerror = () => {
        console.error("[ShenmaService] Image load failed for URL:", url);
        resolve(null);
      };
      
      img.src = url;
    });
  }
}

export default ShenmaService;