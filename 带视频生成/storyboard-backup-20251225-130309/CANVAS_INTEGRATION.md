# 视频窗口在画布中的实现

## 概述

视频窗口需要在分镜画布中显示，就像分镜卡片一样。用户可以拖拽、删除、下载视频。

---

## 架构设计

### 数据结构

```typescript
// types.ts 中添加
export interface VideoItem {
  id: string;
  taskId: string;
  status: 'NOT_START' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE';
  progress: number;
  videoUrl?: string;
  error?: {
    code: string;
    message: string;
  };
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: number;
}
```

### 在 App.tsx 中添加状态

```typescript
// App.tsx
const [videoItems, setVideoItems] = useState<VideoItem[]>([]);
const videoServiceRef = useRef<VideoService | null>(null);
```

---

## 完整的 VideoWindow 组件

### components/VideoWindow.tsx

```typescript
import React, { useState, useRef } from 'react';
import type { VideoItem } from '../types';

interface VideoWindowProps {
  item: VideoItem;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onEdit: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
}

export default function VideoWindow({
  item,
  onDelete,
  onDownload,
  onEdit,
  onDragStart
}: VideoWindowProps) {
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getStatusColor = () => {
    switch (item.status) {
      case 'NOT_START':
      case 'IN_PROGRESS':
        return '#2196F3'; // 蓝色
      case 'SUCCESS':
        return '#4CAF50'; // 绿色
      case 'FAILURE':
        return '#f44336'; // 红色
      default:
        return '#999';
    }
  };

  const getStatusText = () => {
    switch (item.status) {
      case 'NOT_START':
        return '排队中...';
      case 'IN_PROGRESS':
        return `生成中... ${item.progress}%`;
      case 'SUCCESS':
        return '生成完成';
      case 'FAILURE':
        return '生成失败';
      default:
        return '未知状态';
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        backgroundColor: '#fff',
        border: '2px solid #ddd',
        borderRadius: '8px',
        boxShadow: isHovering ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        cursor: 'move',
        transition: 'box-shadow 0.2s',
        zIndex: isHovering ? 100 : 1
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseDown={(e) => onDragStart(item.id, e)}
    >
      {/* 标题栏 */}
      <div
        style={{
          padding: '10px',
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'grab'
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
          视频 #{item.taskId.slice(0, 8)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item.id);
          }}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#2196F3',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          编辑
        </button>
      </div>

      {/* 内容区域 */}
      <div
        style={{
          width: '100%',
          height: item.height - 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fafafa',
          position: 'relative'
        }}
      >
        {/* 加载状态 */}
        {(item.status === 'NOT_START' || item.status === 'IN_PROGRESS') && (
          <div style={{ textAlign: 'center' }}>
            {/* 进度条 */}
            <div
              style={{
                width: '80%',
                height: '4px',
                backgroundColor: '#eee',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '10px'
              }}
            >
              <div
                style={{
                  width: `${item.progress}%`,
                  height: '100%',
                  backgroundColor: getStatusColor(),
                  transition: 'width 0.3s'
                }}
              />
            </div>
            {/* 状态文本 */}
            <div style={{ fontSize: '12px', color: '#666' }}>
              {getStatusText()}
            </div>
          </div>
        )}

        {/* 完成状态 - 显示视频 */}
        {item.status === 'SUCCESS' && item.videoUrl && (
          <video
            src={item.videoUrl}
            controls
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}

        {/* 失败状态 */}
        {item.status === 'FAILURE' && (
          <div style={{ textAlign: 'center', color: '#f44336' }}>
            <div style={{ fontSize: '14px', marginBottom: '10px' }}>
              ❌ 生成失败
            </div>
            {item.error && (
              <div style={{ fontSize: '12px', color: '#999' }}>
                {item.error.message}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {item.status === 'SUCCESS' && (
        <div
          style={{
            display: 'flex',
            gap: '5px',
            padding: '8px',
            backgroundColor: '#f5f5f5',
            borderTop: '1px solid #eee'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(item.id);
            }}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '12px',
              backgroundColor: '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            下载
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '12px',
              backgroundColor: '#f44336',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 在 App.tsx 中集成

### 1. 添加状态和引用

```typescript
import VideoService from './videoService';
import VideoWindow from './components/VideoWindow';
import type { VideoItem } from './types';

const App: React.FC = () => {
  // ... 现有状态 ...
  
  const [videoItems, setVideoItems] = useState<VideoItem[]>([]);
  const videoServiceRef = useRef<VideoService | null>(null);
  const [showVideoGenDialog, setShowVideoGenDialog] = useState(false);
  
  // 初始化 VideoService
  useEffect(() => {
    const baseUrl = localStorage.getItem('sora_base_url');
    const apiKey = localStorage.getItem('sora_api_key');
    
    if (baseUrl && apiKey) {
      videoServiceRef.current = new VideoService({ baseUrl, apiKey });
    }
  }, []);
  
  // 清理轮询
  useEffect(() => {
    return () => {
      videoServiceRef.current?.cleanup();
    };
  }, []);
};
```

### 2. 添加生成视频的处理函数

```typescript
const handleGenerateVideo = async (prompt: string, options: any) => {
  if (!videoServiceRef.current) {
    alert('请先配置 API');
    return;
  }

  try {
    // 创建视频任务
    const result = await videoServiceRef.current.createVideo(prompt, options);

    // 创建新的视频窗口
    const newVideoItem: VideoItem = {
      id: crypto.randomUUID(),
      taskId: result.task_id,
      status: result.status as any,
      progress: result.progress,
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
                  status: status.status as any,
                  progress: status.progress,
                  videoUrl: status.video_url,
                  error: status.error
                }
              : item
          )
        );
      },
      (videoUrl) => {
        console.log('Video completed:', videoUrl);
      },
      (error) => {
        console.error('Video generation error:', error);
        setVideoItems((prev) =>
          prev.map((item) =>
            item.taskId === result.task_id
              ? {
                  ...item,
                  status: 'FAILURE',
                  error: { code: 'error', message: error.message }
                }
              : item
          )
        );
      }
    );

    setShowVideoGenDialog(false);
  } catch (error) {
    console.error('Error:', error);
    alert('生成视频失败');
  }
};
```

### 3. 添加视频窗口操作处理

```typescript
const handleDeleteVideo = (videoId: string) => {
  setVideoItems((prev) => prev.filter((item) => item.id !== videoId));
};

const handleDownloadVideo = (videoId: string) => {
  const video = videoItems.find((item) => item.id === videoId);
  if (!video || !video.videoUrl) return;

  const a = document.createElement('a');
  a.href = video.videoUrl;
  a.download = `video-${video.taskId}.mp4`;
  a.click();
};

const handleEditVideo = (videoId: string) => {
  // 打开编辑对话框
  console.log('Edit video:', videoId);
};

const handleVideoWindowDragStart = (
  videoId: string,
  e: React.MouseEvent
) => {
  const video = videoItems.find((item) => item.id === videoId);
  if (!video) return;

  const startX = e.clientX;
  const startY = e.clientY;
  const origX = video.x;
  const origY = video.y;

  const handleMouseMove = (moveEvent: MouseEvent) => {
    const deltaX = moveEvent.clientX - startX;
    const deltaY = moveEvent.clientY - startY;

    setVideoItems((prev) =>
      prev.map((item) =>
        item.id === videoId
          ? {
              ...item,
              x: origX + deltaX,
              y: origY + deltaY
            }
          : item
      )
    );
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};
```

### 4. 在画布中渲染视频窗口

```typescript
return (
  <div>
    {/* 现有的分镜卡片 */}
    {items.map((item) => (
      <StoryboardCard key={item.id} item={item} /* ... props ... */ />
    ))}

    {/* 视频窗口 */}
    {videoItems.map((videoItem) => (
      <VideoWindow
        key={videoItem.id}
        item={videoItem}
        onDelete={handleDeleteVideo}
        onDownload={handleDownloadVideo}
        onEdit={handleEditVideo}
        onDragStart={handleVideoWindowDragStart}
      />
    ))}

    {/* 生成视频按钮 */}
    <button
      onClick={() => setShowVideoGenDialog(true)}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '12px 24px',
        backgroundColor: '#2196F3',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold'
      }}
    >
      生成视频
    </button>

    {/* 生成视频对话框 */}
    {showVideoGenDialog && (
      <VideoGenDialog
        onGenerate={handleGenerateVideo}
        onCancel={() => setShowVideoGenDialog(false)}
      />
    )}
  </div>
);
```

---

## VideoGenDialog 组件

### components/VideoGenDialog.tsx

```typescript
import React, { useState } from 'react';

interface VideoGenDialogProps {
  onGenerate: (prompt: string, options: any) => void;
  onCancel: () => void;
}

export default function VideoGenDialog({
  onGenerate,
  onCancel
}: VideoGenDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<'sora-2' | 'sora-2-pro'>('sora-2-pro');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState(10);
  const [hd, setHd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('请输入视频提示词');
      return;
    }

    setIsLoading(true);
    try {
      await onGenerate(prompt, {
        model,
        aspect_ratio: aspectRatio,
        duration,
        hd
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>生成视频</h2>

        {/* 提示词输入 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            视频提示词
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要生成的视频内容..."
            style={{
              width: '100%',
              height: '100px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: 'Arial, sans-serif'
            }}
          />
        </div>

        {/* 模型选择 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            模型
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as any)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="sora-2">Sora 2 (基础)</option>
            <option value="sora-2-pro">Sora 2 Pro (专业)</option>
          </select>
        </div>

        {/* 宽高比 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            宽高比
          </label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as any)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="16:9">横屏 (16:9)</option>
            <option value="9:16">竖屏 (9:16)</option>
          </select>
        </div>

        {/* 时长 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            时长 (秒)
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value={10}>10 秒</option>
            <option value={15}>15 秒</option>
            <option value={25}>25 秒</option>
          </select>
        </div>

        {/* 高清选项 */}
        {model === 'sora-2-pro' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={hd}
                onChange={(e) => setHd(e.target.checked)}
              />
              <span>启用高清 (生成时间更长)</span>
            </label>
          </div>
        )}

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: isLoading ? '#ccc' : '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isLoading ? '生成中...' : '生成'}
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#999',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 画布中的视频窗口布局

### 位置管理

```typescript
// 视频窗口默认位置
const defaultVideoPosition = {
  x: 100,
  y: 100,
  width: 400,
  height: 300
};

// 如果有多个视频，自动错开位置
const getNextVideoPosition = (existingVideos: VideoItem[]) => {
  const baseX = 100;
  const baseY = 100;
  const offsetX = 50;
  const offsetY = 50;

  return {
    x: baseX + existingVideos.length * offsetX,
    y: baseY + existingVideos.length * offsetY,
    width: 400,
    height: 300
  };
};
```

### 拖拽和缩放

```typescript
// 支持拖拽
const handleVideoWindowDragStart = (videoId: string, e: React.MouseEvent) => {
  // ... 拖拽逻辑 ...
};

// 支持缩放（可选）
const handleVideoWindowResize = (videoId: string, newWidth: number, newHeight: number) => {
  setVideoItems((prev) =>
    prev.map((item) =>
      item.id === videoId
        ? { ...item, width: newWidth, height: newHeight }
        : item
    )
  );
};
```

---

## 完整的集成流程

```
用户点击"生成视频"
    ↓
打开 VideoGenDialog
    ↓
用户输入提示词和参数
    ↓
点击"生成"
    ↓
调用 handleGenerateVideo()
    ↓
创建 VideoItem（初始状态：NOT_START）
    ↓
添加到 videoItems 状态
    ↓
在画布上显示 VideoWindow（显示"排队中..."）
    ↓
启动轮询
    ↓
每 3 秒更新一次进度
    ↓
状态变为 IN_PROGRESS → 显示进度条
    ↓
状态变为 SUCCESS → 显示视频播放器
    ↓
用户可以下载、编辑或删除视频
```

---

## 关键要点

1. **视频窗口是独立的组件** - 与分镜卡片并行显示
2. **支持拖拽** - 用户可以移动视频窗口位置
3. **实时进度** - 显示生成进度百分比
4. **完整的生命周期** - 从排队到完成的所有状态
5. **用户操作** - 下载、删除、编辑视频

---

## 样式定制

你可以根据你的应用风格调整：

```typescript
// 颜色主题
const colors = {
  primary: '#2196F3',
  success: '#4CAF50',
  error: '#f44336',
  warning: '#ff9800',
  background: '#fafafa',
  border: '#ddd'
};

// 尺寸
const sizes = {
  videoWidth: 400,
  videoHeight: 300,
  borderRadius: 8,
  padding: 10
};
```

