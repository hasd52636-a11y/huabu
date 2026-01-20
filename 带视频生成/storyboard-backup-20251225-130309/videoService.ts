// videoService.ts
import {
  VideoServiceConfig,
  VideoStatus,
  CreateVideoOptions,
  TokenQuota,
  StoryboardShot,
  StoryboardOptions,
  Character,
  CreateCharacterOptions
} from './types';

class VideoService {
  private config: VideoServiceConfig;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: VideoServiceConfig) {
    this.config = config;
  }

  private buildHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async createVideo(
    prompt: string,
    options: CreateVideoOptions
  ): Promise<{ task_id: string; status: string; progress: string }> {
    try {
      const endpoint = `${this.config.baseUrl}/v2/videos/generations`;

      const body: any = {
        model: options.model,
        prompt: prompt,
        aspect_ratio: options.aspect_ratio || '16:9',
        duration: options.duration || 10,
        hd: options.hd || false,
        watermark: options.watermark ?? false,
        private: options.private ?? false
      };

      if (options.images && options.images.length > 0) {
        body.images = options.images;
      }

      if (options.notify_hook) {
        body.notify_hook = options.notify_hook;
      }

      if (options.character_url) {
        body.character_url = options.character_url;
      }

      if (options.character_timestamps) {
        body.character_timestamps = options.character_timestamps;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);

      return {
        task_id: data.task_id,
        status: data.status || 'SUBMITTED',
        progress: data.progress || '0%'
      };
    } catch (error) {
      console.error('Video creation error:', error);
      throw error;
    }
  }

  async getVideoStatus(taskId: string): Promise<VideoStatus> {
    try {
      const endpoint = `${this.config.baseUrl}/v2/videos/generations/${taskId}`;

      const myHeaders = new Headers();
      myHeaders.append('Authorization', `Bearer ${this.config.apiKey}`);

      const requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow' as RequestRedirect
      };

      const response = await fetch(endpoint, requestOptions);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);

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
      console.error('Get video status error:', error);
      throw error;
    }
  }

  async getTokenQuota(): Promise<TokenQuota> {
    try {
      const endpoint = `${this.config.baseUrl}/v1/token/quota`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.buildHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);

      return {
        total_quota: data.total_quota || 0,
        used_quota: data.used_quota || 0,
        remaining_quota: data.remaining_quota || 0
      };
    } catch (error) {
      console.error('Get token quota error:', error);
      throw error;
    }
  }

  // 获取配额百分比
  async getQuotaPercentage(): Promise<number> {
    try {
      const quota = await this.getTokenQuota();
      if (quota.total_quota === 0) return 0;
      return Math.round((quota.used_quota / quota.total_quota) * 100);
    } catch (error) {
      console.error('Get quota percentage error:', error);
      return 0;
    }
  }

  // 检查配额是否充足
  async hasEnoughQuota(requiredQuota: number = 1): Promise<boolean> {
    try {
      const quota = await this.getTokenQuota();
      return quota.remaining_quota >= requiredQuota;
    } catch (error) {
      console.error('Check quota error:', error);
      return false;
    }
  }

  // 创建角色
  async createCharacter(options: CreateCharacterOptions): Promise<Character> {
    try {
      if (!options.url && !options.from_task) {
        throw new Error('Either url or from_task must be provided');
      }

      const endpoint = `${this.config.baseUrl}/sora/v1/characters`;

      const body: any = {
        timestamps: options.timestamps
      };

      if (options.url) {
        body.url = options.url;
      }

      if (options.from_task) {
        body.from_task = options.from_task;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);

      return {
        id: data.id,
        username: data.username,
        permalink: data.permalink,
        profile_picture_url: data.profile_picture_url
      };
    } catch (error) {
      console.error('Create character error:', error);
      throw error;
    }
  }

  // 创建故事板视频
  async createStoryboardVideo(
    options: StoryboardOptions
  ): Promise<{ task_id: string; status: string; progress: string }> {
    try {
      // 构建故事板提示词格式
      let storyboardPrompt = '';
      options.shots.forEach((shot, index) => {
        storyboardPrompt += `Shot ${index + 1}:\nduration: ${shot.duration}sec\nScene: ${shot.scene}`;
        if (index < options.shots.length - 1) {
          storyboardPrompt += '\n\n';
        }
      });

      // 使用故事板提示词调用创建视频
      return this.createVideo(storyboardPrompt, {
        model: options.model,
        aspect_ratio: options.aspect_ratio,
        duration: options.duration,
        hd: options.hd,
        images: options.images,
        notify_hook: options.notify_hook,
        watermark: options.watermark,
        private: options.private
      });
    } catch (error) {
      console.error('Create storyboard video error:', error);
      throw error;
    }
  }

  // 格式化故事板提示词
  static formatStoryboardPrompt(shots: StoryboardShot[]): string {
    let prompt = '';
    shots.forEach((shot, index) => {
      prompt += `Shot ${index + 1}:\nduration: ${shot.duration}sec\nScene: ${shot.scene}`;
      if (index < shots.length - 1) {
        prompt += '\n\n';
      }
    });
    return prompt;
  }

  startPolling(
    taskId: string,
    onProgress: (status: VideoStatus) => void,
    onComplete: (videoUrl: string) => void,
    onError: (error: Error) => void,
    timeoutMs: number = 30 * 60 * 1000
  ): void {
    let pollInterval = 2000;
    const maxInterval = 8000;
    const backoffMultiplier = 2;
    const startTime = Date.now();
    let retryCount = 0;

    const poll = async () => {
      try {
        // 检查超时
        if (Date.now() - startTime > timeoutMs) {
          onError(new Error('Video generation timeout (exceeded 30 minutes)'));
          this.stopPolling(taskId);
          return;
        }

        const status = await this.getVideoStatus(taskId);
        onProgress(status);

        if (status.status === 'SUCCESS') {
          if (status.video_url) {
            onComplete(status.video_url);
          } else {
            onError(new Error('Video generated but URL not found'));
          }
          this.stopPolling(taskId);
        } else if (status.status === 'FAILURE') {
          // 区分不同的失败原因
          let errorMessage = status.fail_reason || status.error?.message || 'Video generation failed';
          
          // 根据失败原因提供更详细的提示
          if (errorMessage.includes('真人') || errorMessage.includes('face')) {
            errorMessage = '❌ 审查失败: 图片中检测到真人或类似真人的内容，请使用非真人图片';
          } else if (errorMessage.includes('违规') || errorMessage.includes('暴力') || errorMessage.includes('色情')) {
            errorMessage = '❌ 审查失败: 提示词或内容违规，请修改后重试';
          } else if (errorMessage.includes('版权') || errorMessage.includes('名人')) {
            errorMessage = '❌ 审查失败: 涉及版权或活着的名人，请修改提示词';
          }
          
          onError(new Error(errorMessage));
          this.stopPolling(taskId);
        } else {
          // 增加轮询间隔（指数退避）
          pollInterval = Math.min(pollInterval * backoffMultiplier, maxInterval);
          retryCount++;
        }
      } catch (error) {
        console.error('Polling error:', error);
        onError(error as Error);
        this.stopPolling(taskId);
      }
    };

    poll();
    const intervalId = setInterval(poll, pollInterval);
    this.pollingIntervals.set(taskId, intervalId);
  }

  stopPolling(taskId: string): void {
    const intervalId = this.pollingIntervals.get(taskId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(taskId);
    }
  }

  cleanup(): void {
    this.pollingIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.pollingIntervals.clear();
  }
}

export default VideoService;
export type { VideoStatus, CreateVideoOptions, VideoServiceConfig, TokenQuota, StoryboardShot, StoryboardOptions, Character, CreateCharacterOptions };
