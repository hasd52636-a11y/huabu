import { VideoItem } from '../types';

/**
 * 视频状态管理器
 * 负责创建、更新和管理视频项的状态
 */
export class VideoStatusManager {
  /**
   * 创建新的视频项
   */
  createVideoItem(
    sceneId: string,
    visualPrompt: string,
    videoPrompt: string,
    config: any
  ): VideoItem {
    return {
      id: crypto.randomUUID(),
      taskId: '',
      sceneId,
      visualPrompt,
      videoPrompt,
      prompt: visualPrompt,
      status: 'pending',
      progress: 0,
      retryCount: 0,
      maxRetries: config.maxRetries || 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      x: 0,
      y: 0,
      width: 380,
      height: 214
    };
  }

  /**
   * 更新视频项状态
   */
  updateVideoItem(
    item: VideoItem,
    status: VideoItem['status'],
    updates?: Partial<VideoItem>
  ): VideoItem {
    return {
      ...item,
      status,
      updatedAt: Date.now(),
      ...updates
    };
  }

  /**
   * 标记视频生成失败
   */
  markAsFailed(item: VideoItem, error: Error): VideoItem {
    return this.updateVideoItem(item, 'failed', {
      errorMessage: error.message,
      error: error.message,
      progress: 0
    });
  }

  /**
   * 标记视频生成成功
   */
  markAsSuccess(item: VideoItem, videoUrl: string): VideoItem {
    return this.updateVideoItem(item, 'completed', {
      videoUrl,
      progress: 100,
      completedAt: Date.now()
    });
  }

  /**
   * 标记视频生成中
   */
  markAsGenerating(item: VideoItem, taskId: string): VideoItem {
    return this.updateVideoItem(item, 'generating', {
      taskId,
      progress: 10
    });
  }

  /**
   * 更新进度
   */
  updateProgress(item: VideoItem, progress: number): VideoItem {
    return this.updateVideoItem(item, item.status, {
      progress: Math.min(progress, 99)
    });
  }

  /**
   * 准备重试
   */
  prepareForRetry(item: VideoItem): VideoItem {
    if (!item.retryCount) item.retryCount = 0;
    return this.updateVideoItem(item, 'pending', {
      retryCount: item.retryCount + 1,
      lastRetryAt: Date.now(),
      errorMessage: undefined,
      error: undefined,
      progress: 0
    });
  }

  /**
   * 检查是否应该重试
   */
  shouldRetry(item: VideoItem): boolean {
    const retryCount = item.retryCount || 0;
    const maxRetries = item.maxRetries || 3;
    return retryCount < maxRetries;
  }
}

export default VideoStatusManager;