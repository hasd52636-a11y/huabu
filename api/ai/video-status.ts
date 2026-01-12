/**
 * Video Status API Integration - 视频状态查询和管理
 * 
 * 功能：
 * - 处理异步视频生成的任务状态查询
 * - 提供轮询机制跟踪视频生成进度
 * - 支持任务取消和重试
 * - 与现有AI服务适配器集成
 */

import { ProviderSettings } from '../../types';
import { MultiProviderAIService } from '../../adapters/AIServiceAdapter';
import { ZhipuService } from '../../services/zhipuService';
import { ShenmaService } from '../../services/shenmaService';

/**
 * 视频任务状态接口
 */
export interface VideoTaskStatus {
  taskId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'canceled';
  progress: number; // 0-100
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  estimatedTime?: number; // 估计剩余时间（秒）
}

/**
 * 轮询配置接口
 */
export interface PollingConfig {
  interval?: number; // 轮询间隔（毫秒）
  timeout?: number; // 超时时间（毫秒）
  onProgress?: (status: VideoTaskStatus) => void;
  onComplete?: (status: VideoTaskStatus) => void;
  onError?: (error: string) => void;
}

/**
 * 视频状态API服务类
 */
export class VideoStatusAPI {
  private aiService: MultiProviderAIService;
  private pollingTasks: Map<string, { timer: NodeJS.Timeout; startTime: number }>;
  private zhipuService: ZhipuService | null = null;
  private shenmaService: ShenmaService | null = null;

  constructor(originalService?: any) {
    this.aiService = new MultiProviderAIService(originalService);
    this.pollingTasks = new Map();
  }

  /**
   * 获取视频任务状态
   * @param taskId 任务ID
   * @param settings 提供商设置
   * @returns 视频任务状态
   */
  async getVideoStatus(
    taskId: string,
    settings: ProviderSettings
  ): Promise<VideoTaskStatus> {
    try {
      // 初始化相应的服务提供商
      this.initializeProvider(settings);

      let status: VideoTaskStatus;

      if (settings.provider === 'zhipu' && this.zhipuService) {
        status = await this.zhipuService.getTaskStatus(taskId);
      } else if (settings.provider === 'shenma' && this.shenmaService) {
        status = await this.shenmaService.getTaskStatus(taskId);
      } else {
        // 默认处理
        status = {
          taskId,
          status: 'failed',
          progress: 0,
          error: `不支持的提供商: ${settings.provider}`
        };
      }

      return status;
    } catch (error) {
      return {
        taskId,
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : '获取任务状态失败'
      };
    }
  }

  /**
   * 开始轮询视频任务状态
   * @param taskId 任务ID
   * @param settings 提供商设置
   * @param config 轮询配置
   * @returns 轮询任务ID
   */
  startPolling(
    taskId: string,
    settings: ProviderSettings,
    config: PollingConfig
  ): string {
    const pollingId = `poll-${taskId}-${Date.now()}`;
    const interval = config.interval || 3000; // 默认3秒轮询一次
    const timeout = config.timeout || 600000; // 默认10分钟超时
    const startTime = Date.now();

    // 清除可能存在的旧轮询
    this.stopPolling(taskId);

    const timer = setInterval(async () => {
      try {
        const status = await this.getVideoStatus(taskId, settings);

        // 调用进度回调
        if (config.onProgress) {
          config.onProgress(status);
        }

        // 检查任务是否完成
        if (status.status === 'completed' || status.status === 'failed' || status.status === 'canceled') {
          this.stopPolling(taskId);

          if (status.status === 'completed' && config.onComplete) {
            config.onComplete(status);
          } else if ((status.status === 'failed' || status.status === 'canceled') && config.onError) {
            config.onError(status.error || `任务${status.status}`);
          }
        }

        // 检查超时
        if (Date.now() - startTime > timeout) {
          this.stopPolling(taskId);
          if (config.onError) {
            config.onError('轮询超时');
          }
        }
      } catch (error) {
        if (config.onError) {
          config.onError(error instanceof Error ? error.message : '轮询过程中发生错误');
        }
      }
    }, interval);

    // 保存轮询任务
    this.pollingTasks.set(taskId, { timer, startTime });

    return pollingId;
  }

  /**
   * 停止轮询视频任务状态
   * @param taskId 任务ID
   * @returns 是否成功停止
   */
  stopPolling(taskId: string): boolean {
    const task = this.pollingTasks.get(taskId);
    if (task) {
      clearInterval(task.timer);
      this.pollingTasks.delete(taskId);
      return true;
    }
    return false;
  }

  /**
   * 停止所有轮询任务
   */
  stopAllPolling(): void {
    this.pollingTasks.forEach((task, taskId) => {
      clearInterval(task.timer);
    });
    this.pollingTasks.clear();
  }

  /**
   * 取消视频生成任务
   * @param taskId 任务ID
   * @param settings 提供商设置
   * @returns 是否成功取消
   */
  async cancelVideoTask(
    taskId: string,
    settings: ProviderSettings
  ): Promise<boolean> {
    try {
      // 初始化相应的服务提供商
      this.initializeProvider(settings);

      let success = false;

      if (settings.provider === 'zhipu' && this.zhipuService) {
        success = await this.zhipuService.cancelTask(taskId);
      } else if (settings.provider === 'shenma' && this.shenmaService) {
        success = await this.shenmaService.cancelTask(taskId);
      }

      // 停止轮询
      if (success) {
        this.stopPolling(taskId);
      }

      return success;
    } catch (error) {
      console.error('取消任务失败:', error);
      return false;
    }
  }

  /**
   * 重试视频生成任务
   * @param taskId 原始任务ID
   * @param settings 提供商设置
   * @returns 新任务ID
   */
  async retryVideoTask(
    taskId: string,
    settings: ProviderSettings
  ): Promise<string | null> {
    try {
      // 获取原始任务信息（如果需要）
      const originalStatus = await this.getVideoStatus(taskId, settings);
      
      // 这里可以根据需要从原始任务中提取参数进行重试
      // 实际实现可能需要更复杂的逻辑来保存和恢复任务参数
      
      // 示例：简单返回新任务ID（实际应该重新调用generateVideo）
      return `new-${taskId}-${Date.now()}`;
    } catch (error) {
      console.error('重试任务失败:', error);
      return null;
    }
  }

  /**
   * 获取所有轮询任务
   * @returns 轮询任务列表
   */
  getPollingTasks(): Array<{ taskId: string; startTime: number }> {
    const tasks: Array<{ taskId: string; startTime: number }> = [];
    this.pollingTasks.forEach((value, key) => {
      tasks.push({ taskId: key, startTime: value.startTime });
    });
    return tasks;
  }

  /**
   * 初始化服务提供商
   * @param settings 提供商设置
   */
  private initializeProvider(settings: ProviderSettings): void {
    if (settings.provider === 'zhipu' && !this.zhipuService) {
      this.zhipuService = new ZhipuService({
        provider: 'zhipu',
        baseUrl: settings.baseUrl || 'https://open.bigmodel.cn/api/paas/v4',
        apiKey: settings.apiKey || '',
        videoModel: 'cogvideox-flash'
      });
    }

    if (settings.provider === 'shenma' && !this.shenmaService) {
      this.shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: settings.baseUrl || 'https://api.whatai.cc',
        apiKey: settings.apiKey || '',
        videoModel: 'sora_video2'
      });
    }
  }

  /**
   * 处理异步视频生成结果
   * @param taskId 任务ID
   * @param settings 提供商设置
   * @param config 轮询配置
   * @returns 最终视频URL
   */
  async handleAsyncVideo(
    taskId: string,
    settings: ProviderSettings,
    config?: PollingConfig
  ): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const pollingConfig: PollingConfig = {
        interval: config?.interval || 5000,
        timeout: config?.timeout || 300000, // 5分钟超时
        onProgress: config?.onProgress,
        onComplete: (status) => {
          if (status.videoUrl) {
            resolve(status.videoUrl);
          } else {
            reject(new Error('视频生成完成但未获取到视频URL'));
          }
        },
        onError: (error) => {
          reject(new Error(error));
        }
      };

      this.startPolling(taskId, settings, pollingConfig);
    });
  }
}

// 创建默认实例
export const videoStatusAPI = new VideoStatusAPI();

/**
 * 便捷函数：获取视频任务状态
 */
export const getVideoStatus = async (
  taskId: string,
  settings: ProviderSettings
): Promise<VideoTaskStatus> => {
  return await videoStatusAPI.getVideoStatus(taskId, settings);
};

/**
 * 便捷函数：开始轮询视频任务状态
 */
export const startPollingVideoStatus = (
  taskId: string,
  settings: ProviderSettings,
  config: PollingConfig
): string => {
  return videoStatusAPI.startPolling(taskId, settings, config);
};

/**
 * 便捷函数：停止轮询视频任务状态
 */
export const stopPollingVideoStatus = (taskId: string): boolean => {
  return videoStatusAPI.stopPolling(taskId);
};

/**
 * 便捷函数：取消视频生成任务
 */
export const cancelVideoTask = async (
  taskId: string,
  settings: ProviderSettings
): Promise<boolean> => {
  return await videoStatusAPI.cancelVideoTask(taskId, settings);
};