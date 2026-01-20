# VideoService 实现模板

这个文档提供了可以直接使用的代码模板，用于实现 Sora 2 API 集成。

## 目录
1. [VideoService 类实现](#videoservice-类实现)
2. [类型定义](#类型定义)
3. [使用示例](#使用示例)
4. [集成到 React 组件](#集成到-react-组件)

---

## VideoService 类实现

### 完整的 VideoService 类

```typescript
// videoService.ts

interface VideoServiceConfig {
  baseUrl: string;
  apiKey: string;
}

interface VideoStatus {
  task_id: string;
  status: 'NOT_START' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE';
  progress: number;
  created_at: number;
  model: string;
  duration: number;
  size: string;
  video_url?: string;
  error?: {
    code: string;
    message: string;
  };
}

interface CreateVideoOptions {
  model: 'sora-2' | 'sora-2-pro';
  aspect_ratio?: '16:9' | '9:16';
  duration?: 10 | 15 | 25;
  hd?: boolean;
  images?: string[];
}

class VideoService {
  private config: VideoServiceConfig;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: VideoServiceConfig) {
    this.config = config;
  }

  /**
   * 构建请求头
   */
  private buildHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 创建视频生成任务
   * @param prompt 视频描述提示词
   * @param options 生成选项
   * @returns 返回 task_id 和初始状态
   */
  async createVideo(
    prompt: string,
    options: CreateVideoOptions
  ): Promise<{ task_id: string; status: string; progress: number }> {
    try {
      const endpoint = `${this.config.baseUrl}/v2/videos/generations`;

      const body: any = {
        model: options.model,
        prompt: prompt,
        aspect_ratio: options.aspect_ratio || '16:9',
        duration: options.duration || 10,
        hd: options.hd || false
      };

      // 如果有图片，添加到请求体（图生视频）
      if (options.images && options.images.length > 0) {
        body.images = options.images;
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

      // 注意：API 返回的是 text，需要手动解析
      const responseText = await response.text();
      const data = JSON.parse(responseText);

      return {
        task_id: data.task_id,
        status: data.status,
        progress: data.progress
      };
    } catch (error) {
      console.error('Video creation error:', error);
      throw error;
    }
  }

  /**
   * 查询视频生成进度
   * @param taskId 任务 ID
   * @returns 返回完整的任务状态
   */
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

      // 注意：API 返回的是 text，需要手动解析
      const responseText = await response.text();
      const data = JSON.parse(responseText);

      return {
        task_id: data.task_id,
        status: data.status,
        progress: data.progress,
        created_at: data.created_at,
        model: data.model,
        duration: data.duration,
        size: data.size,
        video_url: data.video_url,
        error: data.error
      };
    } catch (error) {
      console.error('Get video status error:', error);
      throw error;
    }
  }

  /**
   * 编辑/Remix 视频
   * @param taskId 原始任务 ID
   * @param prompt 编辑提示词
   * @returns 返回新的 task_id
   */
  async remixVideo(
    taskId: string,
    prompt: string
  ): Promise<{ task_id: string; status: string; progress: number }> {
    try {
      const endpoint = `${this.config.baseUrl}/v1/videos/${taskId}/remix`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);

      return {
        task_id: data.task_id,
        status: data.status,
        progress: data.progress
      };
    } catch (error) {
      console.error('Remix video error:', error);
      throw error;
    }
  }

  /**
   * 获取用户余额
   */
  async getTokenQuota(): Promise<{
    total_quota: number;
    used_quota: number;
    remaining_quota: number;
  }> {
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
        total_quota: data.total_quota,
        used_quota: data.used_quota,
        remaining_quota: data.remaining_quota
      };
    } catch (error) {
      console.error('Get token quota error:', error);
      throw error;
    }
  }

  /**
   * 启动轮询机制
   * @param taskId 任务 ID
   * @param onProgress 进度回调
   * @param onComplete 完成回调
   * @param onError 错误回调
   */
  startPolling(
    taskId: string,
    onProgress: (status: VideoStatus) => void,
    onComplete: (videoUrl: string) => void,
    onError: (error: Error) => void
  ): void {
    let retryCount = 0;
    const maxRetries = 120; // 最多轮询 120 次（约 6 分钟，间隔 3 秒）
    const pollInterval = 3000; // 每 3 秒查询一次

    const poll = async () => {
      try {
        const status = await this.getVideoStatus(taskId);

        // 调用进度回调
        onProgress(status);

        if (status.status === 'SUCCESS') {
          // 生成完成
          if (status.video_url) {
            onComplete(status.video_url);
          }
          this.stopPolling(taskId);
        } else if (status.status === 'FAILURE') {
          // 生成失败
          const errorMessage = status.error?.message || 'Video generation failed';
          onError(new Error(errorMessage));
          this.stopPolling(taskId);
        } else {
          // 继续轮询
          retryCount++;
          if (retryCount >= maxRetries) {
            onError(new Error('Video generation timeout (exceeded max retries)'));
            this.stopPolling(taskId);
          }
        }
      } catch (error) {
        onError(error as Error);
        this.stopPolling(taskId);
      }
    };

    // 立即执行一次，然后定期执行
    poll();
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
}

export default VideoService;
export type { VideoStatus, CreateVideoOptions, VideoServiceConfig };
```

---

## 类型定义

### 在 types.ts 中添加

```typescript
// types.ts

// 视频对象
export interface VideoObject {
  id: string;
  task_id: string;
  status: 'NOT_START' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE';
  progress: number;
  created_at: number;
  model: 'sora-2' | 'sora-2-pro';
  duration: number;
  size: string;
  video_url?: string;
  error?: {
    code: string;
    message: string;
  };
}

// 视频窗口项
export interface VideoItem {
  id: string;
  taskId: string;
  videoObject: VideoObject;
  videoUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: number;
  editHistory?: {
    taskId: string;
    prompt: string;
    timestamp: number;
  }[];
}

// API 配置
export interface APIConfig {
  baseUrl: string;
  apiKey: string;
}

// 视频生成参数
export interface VideoGenerationParams {
  model: 'sora-2' | 'sora-2-pro';
  prompt: string;
  aspect_ratio?: '16:9' | '9:16';
  duration?: 10 | 15 | 25;
  hd?: boolean;
  images?: string[];
}
```

---

## 使用示例

### 基础使用

```typescript
// 初始化 VideoService
const videoService = new VideoService({
  baseUrl: 'https://api.xxx.com',
  apiKey: 'your-api-key-here'
});

// 创建视频生成任务
const result = await videoService.createVideo(
  '一只猫在公园里奔跑，阳光洒在草地上',
  {
    model: 'sora-2-pro',
    aspect_ratio: '16:9',
    duration: 10,
    hd: false
  }
);

console.log('Task ID:', result.task_id);

// 启动轮询
videoService.startPolling(
  result.task_id,
  (status) => {
    console.log(`Progress: ${status.progress}%`);
  },
  (videoUrl) => {
    console.log('Video completed:', videoUrl);
  },
  (error) => {
    console.error('Error:', error.message);
  }
);
```

### 图生视频

```typescript
const result = await videoService.createVideo(
  '猫继续在公园里奔跑',
  {
    model: 'sora-2-pro',
    aspect_ratio: '16:9',
    duration: 10,
    hd: false,
    images: [
      'https://example.com/cat.jpg',
      'data:image/jpeg;base64,...'
    ]
  }
);
```

### 编辑视频

```typescript
const remixResult = await videoService.remixVideo(
  'original-task-id',
  '猫在公园里跳舞，背景是落日'
);

// 继续轮询新的任务
videoService.startPolling(
  remixResult.task_id,
  (status) => console.log(`Remix progress: ${status.progress}%`),
  (videoUrl) => console.log('Remix completed:', videoUrl),
  (error) => console.error('Remix error:', error)
);
```

### 获取余额

```typescript
const quota = await videoService.getTokenQuota();
console.log('Total quota:', quota.total_quota);
console.log('Used quota:', quota.used_quota);
console.log('Remaining quota:', quota.remaining_quota);

// 转换为网站显示的额度
const displayQuota = quota.total_quota / 500000;
const displayRemaining = quota.remaining_quota / 500000;
console.log(`Display quota: ${displayQuota}, Remaining: ${displayRemaining}`);
```

---

## 集成到 React 组件

### 在 App.tsx 中使用

```typescript
// App.tsx
import { useState, useRef, useEffect } from 'react';
import VideoService from './videoService';
import type { VideoItem, VideoObject } from './types';

export default function App() {
  const [videoItems, setVideoItems] = useState<VideoItem[]>([]);
  const videoServiceRef = useRef<VideoService | null>(null);

  // 初始化 VideoService
  useEffect(() => {
    const baseUrl = localStorage.getItem('sora_base_url') || '';
    const apiKey = localStorage.getItem('sora_api_key') || '';

    if (baseUrl && apiKey) {
      videoServiceRef.current = new VideoService({ baseUrl, apiKey });
    }

    return () => {
      // 清理轮询
      videoServiceRef.current?.cleanup();
    };
  }, []);

  // 生成视频
  const handleGenerateVideo = async (prompt: string) => {
    if (!videoServiceRef.current) {
      alert('Please configure API settings first');
      return;
    }

    try {
      const result = await videoServiceRef.current.createVideo(prompt, {
        model: 'sora-2-pro',
        aspect_ratio: '16:9',
        duration: 10,
        hd: false
      });

      // 创建新的视频窗口
      const newVideoItem: VideoItem = {
        id: crypto.randomUUID(),
        taskId: result.task_id,
        videoObject: {
          id: result.task_id,
          task_id: result.task_id,
          status: result.status as any,
          progress: result.progress,
          created_at: Date.now(),
          model: 'sora-2-pro',
          duration: 10,
          size: '1280x720'
        },
        x: 100,
        y: 100,
        width: 400,
        height: 300,
        createdAt: Date.now()
      };

      setVideoItems((prev) => [...prev, newVideoItem]);

      // 启动轮询
      videoServiceRef.current.startPolling(
        result.task_id,
        (status) => {
          // 更新进度
          setVideoItems((prev) =>
            prev.map((item) =>
              item.taskId === result.task_id
                ? {
                    ...item,
                    videoObject: {
                      ...item.videoObject,
                      status: status.status as any,
                      progress: status.progress,
                      video_url: status.video_url
                    }
                  }
                : item
            )
          );
        },
        (videoUrl) => {
          // 完成
          console.log('Video completed:', videoUrl);
        },
        (error) => {
          // 错误
          console.error('Video generation error:', error);
        }
      );
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate video');
    }
  };

  // 删除视频
  const handleDeleteVideo = (videoId: string) => {
    setVideoItems((prev) => prev.filter((item) => item.id !== videoId));
  };

  // 下载视频
  const handleDownloadVideo = (videoUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = filename;
    a.click();
  };

  return (
    <div>
      {/* 生成视频按钮 */}
      <button onClick={() => handleGenerateVideo('一只猫在公园里奔跑')}>
        Generate Video
      </button>

      {/* 视频窗口列表 */}
      <div>
        {videoItems.map((item) => (
          <div key={item.id} style={{ position: 'absolute', left: item.x, top: item.y }}>
            <div>
              <p>Progress: {item.videoObject.progress}%</p>
              <p>Status: {item.videoObject.status}</p>
              {item.videoObject.video_url && (
                <>
                  <video src={item.videoObject.video_url} controls width={item.width} />
                  <button
                    onClick={() =>
                      handleDownloadVideo(
                        item.videoObject.video_url!,
                        `video-${item.taskId}.mp4`
                      )
                    }
                  >
                    Download
                  </button>
                </>
              )}
              <button onClick={() => handleDeleteVideo(item.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### VideoWindow 组件

```typescript
// components/VideoWindow.tsx
import React from 'react';
import type { VideoItem } from '../types';

interface VideoWindowProps {
  item: VideoItem;
  onDelete: (id: string) => void;
  onDownload: (url: string, filename: string) => void;
  onEdit: (id: string) => void;
}

export default function VideoWindow({
  item,
  onDelete,
  onDownload,
  onEdit
}: VideoWindowProps) {
  const { videoObject, taskId } = item;

  return (
    <div
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '10px',
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ marginBottom: '10px' }}>
        <strong>Video #{taskId.slice(0, 8)}</strong>
      </div>

      {/* 加载状态 */}
      {videoObject.status === 'NOT_START' || videoObject.status === 'IN_PROGRESS' ? (
        <div>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {videoObject.status === 'NOT_START' ? '排队中...' : '生成中...'}
            </div>
            <div
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#eee',
                borderRadius: '2px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${videoObject.progress}%`,
                  height: '100%',
                  backgroundColor: '#4CAF50',
                  transition: 'width 0.3s'
                }}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              {videoObject.progress}%
            </div>
          </div>
        </div>
      ) : null}

      {/* 完成状态 */}
      {videoObject.status === 'SUCCESS' && videoObject.video_url ? (
        <div>
          <video
            src={videoObject.video_url}
            controls
            style={{ width: '100%', borderRadius: '4px', marginBottom: '10px' }}
          />
        </div>
      ) : null}

      {/* 错误状态 */}
      {videoObject.status === 'FAILURE' ? (
        <div style={{ color: '#d32f2f', fontSize: '12px' }}>
          <p>Error: {videoObject.error?.message || 'Unknown error'}</p>
        </div>
      ) : null}

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
        {videoObject.status === 'SUCCESS' && (
          <>
            <button
              onClick={() => onEdit(item.id)}
              style={{ flex: 1, padding: '5px', fontSize: '12px' }}
            >
              Edit
            </button>
            <button
              onClick={() =>
                onDownload(videoObject.video_url!, `video-${taskId}.mp4`)
              }
              style={{ flex: 1, padding: '5px', fontSize: '12px' }}
            >
              Download
            </button>
          </>
        )}
        <button
          onClick={() => onDelete(item.id)}
          style={{ flex: 1, padding: '5px', fontSize: '12px', color: '#d32f2f' }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
```

---

## 关键要点

1. **API 返回格式**: API 返回的是 `text/plain`，需要用 `.text()` 解析，然后 `JSON.parse()`
2. **认证方式**: 使用 `Authorization: Bearer {API_KEY}` 头
3. **轮询间隔**: 建议 3 秒查询一次，最多轮询 120 次
4. **状态值**: `NOT_START` → `IN_PROGRESS` → `SUCCESS` 或 `FAILURE`
5. **错误处理**: 检查 `error` 字段获取详细错误信息
6. **清理资源**: 组件卸载时调用 `cleanup()` 停止所有轮询

