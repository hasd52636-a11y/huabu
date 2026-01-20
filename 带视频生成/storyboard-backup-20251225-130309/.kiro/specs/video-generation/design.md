# 视频生成功能设计文档

## 概述

本设计文档描述了为分镜创作平台添加视频生成功能的完整架构和实现方案。该功能允许用户选择分镜图片，配置视频参数（方向、分辨率、时长），通过 Sora 2 API 生成视频，并在画布上以小窗口形式展示、编辑和管理视频。

## 架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     Canvas (App.tsx)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Storyboard Items + Video Windows                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │ Frame 1      │  │ Frame 2      │  │ Video Win  │ │   │
│  │  │ (draggable)  │  │ (draggable)  │  │ (draggable)│ │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Toolbar                                             │   │
│  │  [Export] [Generate Video] [Batch Redraw]           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ VideoGenDialog   │  │ VideoEditDialog  │  │ VideoWindow      │
│ (Component)      │  │ (Component)      │  │ (Component)      │
└──────────────────┘  └──────────────────┘  └──────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │ VideoService         │
                    │ (videoService.ts)    │
                    └──────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐          ┌─────────┐         ┌─────────┐
    │ Create  │          │ Query   │         │ Remix   │
    │ Video   │          │ Status  │         │ Video   │
    │ API     │          │ API     │         │ API     │
    └─────────┘          └─────────┘         └─────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │ Sora 2 API           │
                    │ (OpenAI)             │
                    └──────────────────────┘
```

## 组件与接口设计

### 1. VideoService (videoService.ts)

负责与 Sora 2 API 通信的核心服务模块。

interface VideoGenerationParams {
  model: 'sora-2' | 'sora-2-pro';
  prompt: string;
  size?: '720x1280' | '1280x720' | '1792x1024' | '1024x1792';
  input_reference?: File;
  seconds?: string;
  watermark?: boolean;
}

interface ImageToVideoParams {
  model: 'sora-2' | 'sora-2-pro';
  prompt: string;
  images: string[];  // URL 或 base64
  aspect_ratio?: '16:9' | '9:16';
  hd?: boolean;  // 仅 sora-2-pro 支持
  duration?: '10' | '15' | '25';  // 仅 sora-2-pro 支持 15/25
  character_url?: string;  // 角色视频 URL
  character_timestamps?: string;  // 角色时间戳范围，如 "1,3"
  notify_hook?: string;
  watermark?: boolean;
  private?: boolean;
}

interface TextToVideoParams {
  model: 'sora-2' | 'sora-2-pro';
  prompt: string;
  aspect_ratio?: '16:9' | '9:16';
  hd?: boolean;  // 仅 sora-2-pro 支持
  duration?: '10' | '15' | '25';  // 仅 sora-2-pro 支持 15/25
  character_url?: string;  // 角色视频 URL
  character_timestamps?: string;  // 角色时间戳范围，如 "1,3"
  notify_hook?: string;
  watermark?: boolean;
  private?: boolean;
}

interface VideoObject {
  id: string;
  object: 'video';
  model: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  created_at: number;
  seconds?: string;
  duration?: string;
  size?: string;
  aspect_ratio?: string;
  url?: string;
  video_url?: string;
  error?: {
    code: string;
    message: string;
  };
}

interface UserInfo {
  id: number;
  username: string;
  display_name: string;
  email: string;
  status: number;
  quota: number;  // 用户余额（原始值）
  used_quota: number;  // 已使用的余额
  request_count: number;  // 请求次数
  group: string;  // 用户组
  aff_code: string;  // 推荐码
  aff_count: number;  // 推荐人数
  aff_quota: number;  // 推荐奖励余额
  last_login_time: number;  // 最后登录时间
  last_login_ip: string;  // 最后登录 IP
}

interface TokenQuota {
  total_quota: number;  // 总配额
  used_quota: number;  // 已使用配额
  remaining_quota: number;  // 剩余配额
}

interface UserBalance {
  totalQuota: number;  // 总配额（quota / 500000）
  usedQuota: number;  // 已使用配额（used_quota / 500000）
  remainingQuota: number;  // 剩余配额
  requestCount: number;  // 请求次数
}

interface APIConfig {
  baseUrl: string;
  apiKey: string;
  userId?: string;
}

interface CharacterCreateParams {
  url?: string;  // 视频 URL
  from_task?: string;  // 任务 ID
  timestamps: string;  // 时间戳范围，如 "1,3"
}

interface Character {
  id: string;
  username: string;
  created_at: number;
  video_url?: string;
  task_id?: string;
}

interface CharacterCreateResponse {
  character_id: string;
  username: string;
  created_at: number;
}
}

class VideoService {
  private config: APIConfig;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(config: APIConfig) {
    this.config = config;
  }
  
  // 获取用户信息和余额（完整用户信息）
  async getUserInfo(): Promise<UserInfo>
  
  // 获取令牌配额（更直接的方式，推荐使用）
  async getTokenQuota(): Promise<TokenQuota>
  
  // 计算用户余额（将原始值转换为网站额度）
  calculateBalance(userInfo: UserInfo): UserBalance
  
  // 创建视频生成任务（基础文本生成视频 - 逆向分组）
  async createVideo(params: VideoGenerationParams): Promise<VideoObject>
  
  // 文生视频（新端点 - 官方分组）
  async generateTextToVideo(params: TextToVideoParams): Promise<{ task_id: string }>
  
  // 图生视频（新端点 - 官方分组）
  async generateImageToVideo(params: ImageToVideoParams): Promise<{ task_id: string }>
  
  // 查询视频生成进度
  async getVideoStatus(taskId: string): Promise<VideoObject>
  
  // 编辑/Remix 视频
  async remixVideo(taskId: string, prompt: string): Promise<VideoObject>
  
  // 创建角色（从视频或任务 ID）
  async createCharacter(params: CharacterCreateParams): Promise<CharacterCreateResponse>
  
  // 启动轮询机制
  startPolling(taskId: string, onProgress: (video: VideoObject) => void, onComplete: (video: VideoObject) => void, onError: (error: Error) => void): void
  
  // 停止轮询
  stopPolling(taskId: string): void
  
  // 私有方法：构建请求头
  private buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string>
}
```

**API 端点总结：**

| 功能 | 方法 | 端点 | 参数类型 | 返回值 |
|------|------|------|---------|--------|
| 获取用户信息 | GET | `/api/user/self` | - | UserInfo |
| 获取令牌配额 | GET | `/v1/token/quota` | - | TokenQuota |
| 基础文生视频 | POST | `/v1/videos` | VideoGenerationParams | VideoObject |
| 文生视频（新） | POST | `/v2/videos/generations` | TextToVideoParams | { task_id } |
| 图生视频 | POST | `/v2/videos/generations` | ImageToVideoParams | { task_id } |
| 查询视频进度 | GET | `/v1/videos/{task_id}` | - | VideoObject |
| 编辑视频 | POST | `/v1/videos/{task_id}/remix` | { prompt } | VideoObject |
| 创建角色 | POST | `/sora/v1/characters` | CharacterCreateParams | CharacterCreateResponse |

**角色管理系统：**

角色系统允许用户从生成的视频中提取特定对象/动物/物品，并在后续视频生成中重复使用。

**角色创建接口：**

```typescript
interface CharacterCreateParams {
  url?: string;  // 视频 URL（完整生成的视频）
  from_task?: string;  // 任务 ID（从生成过程中提取）
  timestamps: string;  // 时间戳范围，格式 "start,end"，如 "1,3"（1-3 秒范围）
}

interface CharacterCreateResponse {
  character_id: string;  // 角色唯一标识
  username: string;  // 角色用户名，用于提示词中引用
  created_at: number;  // 创建时间戳
}
```

**角色使用规则：**

1. **角色类型限制**：仅支持对象、动物、物品，不支持人物（包括非常像真人的图片）
2. **角色引用格式**：在提示词中使用 `@{username}` 语法引用角色
3. **多角色支持**：单个视频可使用多个角色，角色之间需用空格分隔
4. **时间戳范围**：必须指定 1-3 秒的时间范围（end - start = 1-3 秒）
5. **私有视频限制**：标记为 `private: true` 的视频无法进行第二次编辑（remix）

**角色使用示例：**

```typescript
// 示例 1：单个角色
const prompt1 = "@{cat_character} 在公园里奔跑";
// 生成的视频中，cat_character 角色会在公园里奔跑

// 示例 2：多个角色（空格分隔）
const prompt2 = "@{cat_character} @{dog_character} 在草地上玩耍";
// 生成的视频中，两个角色会在草地上互动

// 示例 3：角色与其他描述结合
const prompt3 = "@{bird_character} 在蓝天白云下飞翔，背景是山脉";
// 生成的视频中，bird_character 在指定的场景中飞翔

// 使用角色生成视频的参数示例
const params: TextToVideoParams = {
  model: 'sora-2-pro',
  prompt: "@{cat_character} 在客厅里跳舞",
  aspect_ratio: '16:9',
  duration: '15',
  character_url: 'https://example.com/cat_video.mp4',  // 角色视频 URL
  character_timestamps: '1,3',  // 从 1-3 秒提取角色
};
```

**角色创建工作流：**

```
用户生成视频
    ↓
视频生成完成
    ↓
用户在 VideoWindow 中点击"创建角色"
    ↓
打开角色创建对话框
    ↓
显示视频预览和时间轴
    ↓
用户选择 1-3 秒的时间范围
    ↓
用户点击"创建"
    ↓
调用 VideoService.createCharacter({
  from_task: taskId,
  timestamps: "1,3"
})
    ↓
获取 CharacterCreateResponse（包含 username）
    ↓
保存角色信息到本地存储
    ↓
在提示词编辑器中显示可用角色列表
    ↓
用户可在后续视频生成中引用该角色
```

**API 认证详情：**

```typescript
// 基础认证头（用于视频生成 API）
{
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'Pragma': 'no-cache'
}

// 获取用户信息时需要额外的头
{
  'Authorization': `Bearer ${apiKey}`,
  'Cookie': '',
  'New-API-User': userId,
  'Pragma': 'no-cache'
}

// 获取令牌配额时的头
{
  'Authorization': `Bearer ${apiKey}`,
  'new-api-user': userId  // 可选
}
```

**视频生成预期耗时：**

- 标清 10 秒：1-3 分钟
- 15 秒：3-5 分钟（+2 分钟）
- 高清：+8 分钟
- 25 秒（仅 sora-2-pro）：需要更长时间

**用户余额计算：**

- 原始 API 返回的 `quota` 值需要除以 500000 才能得到网站显示的额度
- 例如：`quota: 1000000` → 网站额度 = 1000000 / 500000 = 2
- 剩余额度 = (quota - used_quota) / 500000
- 推荐使用 `GET /v1/token/quota` 端点获取更直接的配额信息

**审查机制：**

Sora 2 API 会进行三阶段审查：
1. 图片审查：检查是否包含真人（包括非常像真人的图片）
2. 提示词审查：检查是否包含违规内容（暴力、色情、版权、活着的名人等）
3. 生成结果审查：检查生成的视频是否合格（这是常见的"生成 90%+ 后失败"的原因）

### 2. VideoGenDialog (VideoGenDialog.tsx)

视频生成对话框组件，用于配置视频生成参数。

```typescript
interface VideoGenDialogProps {
  selectedItems: StoryboardItem[];
  referenceItem?: StoryboardItem;
  onGenerate: (params: VideoGenerationParams) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface VideoGenDialogState {
  prompt: string;
  model: 'sora-2' | 'sora-2-pro';
  orientation: 'landscape' | 'portrait';
  resolution: '720p' | '1080p';
  duration: string;
  watermark: boolean;
}
```

**主要功能：**
- 显示已选分镜的缩略图列表
- 显示参考主体预览（如果有）
- 提示词输入框（支持多行）
- 视频方向选择器（横屏/竖屏）
- 视频分辨率选择器（根据方向和模型动态更新）
- 视频时长配置（根据 API 分组类型显示不同选项）
- 模型选择（sora-2 / sora-2-pro）
- 预览提示词按钮
- 生成和取消按钮

### 3. VideoEditDialog (VideoEditDialog.tsx)

视频编辑对话框组件，用于编辑已生成的视频。

```typescript
interface VideoEditDialogProps {
  videoObject: VideoObject;
  videoUrl: string;
  onApply: (prompt: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface VideoEditDialogState {
  editPrompt: string;
}
```

**主要功能：**
- 显示原视频预览
- 编辑提示词输入框
- 应用编辑和取消按钮

### 4. VideoWindow (VideoWindow.tsx)

画布上的视频展示窗口组件。

```typescript
interface VideoWindowProps {
  id: string;
  videoObject: VideoObject;
  videoUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onEdit: (id: string) => void;
  onRetry: (id: string) => void;
}

interface VideoWindowState {
  isDragging: boolean;
  status: 'loading' | 'playing' | 'error' | 'completed';
  progress: number;
  errorMessage?: string;
}
```

**主要功能：**
- 显示视频播放器（当 status 为 completed）
- 显示加载动画和进度百分比（当 status 为 loading）
- 显示错误信息和重试按钮（当 status 为 error）
- 支持拖拽移动
- 操作按钮：编辑、删除、下载

### 5. 类型定义扩展 (types.ts)

```typescript
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

export interface VideoGenerationParams {
  model: 'sora-2' | 'sora-2-pro';
  prompt: string;
  size: '720x1280' | '1280x720' | '1792x1024' | '1024x1792';
  input_reference?: File;
  seconds: string;
  watermark?: boolean;
}

export interface VideoObject {
  id: string;
  object: 'video';
  model: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  created_at: number;
  seconds: string;
  size: string;
  url?: string;
  video_url?: string;
  error?: {
    code: string;
    message: string;
  };
}
```

## 数据流设计

### 应用初始化流程

```
应用启动
    ↓
检查本地存储中的 API 配置
    ↓
如果配置存在 → 调用 VideoService.getUserInfo()
    ↓
获取用户信息（余额、配额等）
    ↓
显示用户余额信息
    ↓
如果配置不存在 → 显示配置提示
```

### 视频生成流程

```
用户点击"生成视频"
    ↓
检查用户余额是否充足
    ↓
如果余额不足 → 显示"余额不足"提示
    ↓
如果余额充足 → 打开 VideoGenDialog
    ↓
用户配置参数（方向、分辨率、时长、提示词）
    ↓
用户点击"生成"
    ↓
VideoService.createVideo() 调用 POST /v1/videos
    ↓
获取 task_id 和初始 VideoObject
    ↓
在画布上创建 VideoWindow（status: loading）
    ↓
启动轮询：VideoService.startPolling(task_id)
    ↓
定期调用 GET /v1/videos/{task_id}
    ↓
更新 VideoWindow 的 progress 和 status
    ↓
status 变为 completed → 获取 video_url → 加载视频
    ↓
status 变为 failed → 显示错误信息
    ↓
刷新用户余额信息
```

### 视频编辑流程

```
用户点击 VideoWindow 的"编辑"按钮
    ↓
打开 VideoEditDialog
    ↓
用户输入编辑提示词
    ↓
用户点击"应用编辑"
    ↓
VideoService.remixVideo(taskId, prompt) 调用 POST /v1/videos/{task_id}/remix
    ↓
获取新的 task_id 和 VideoObject
    ↓
更新 VideoWindow（status: loading）
    ↓
启动新的轮询机制
    ↓
status 变为 completed → 加载编辑后的视频
    ↓
保存编辑历史记录
```

## 状态管理设计

### App.tsx 中的新状态

```typescript
// 视频窗口列表
const [videoItems, setVideoItems] = useState<VideoItem[]>([]);

// 正在轮询的任务 ID 集合
const pollingTasksRef = useRef<Set<string>>(new Set());

// 视频生成对话框状态
const [showVideoGenDialog, setShowVideoGenDialog] = useState(false);

// 视频编辑对话框状态
const [showVideoEditDialog, setShowVideoEditDialog] = useState(false);
const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
```

### 状态更新函数

```typescript
// 添加视频窗口
const handleAddVideoWindow = (videoObject: VideoObject, taskId: string) => {
  const newVideoItem: VideoItem = {
    id: crypto.randomUUID(),
    taskId,
    videoObject,
    x: 100,
    y: 100,
    width: 400,
    height: 300,
    createdAt: Date.now(),
  };
  setVideoItems(prev => [...prev, newVideoItem]);
};

// 更新视频窗口
const handleUpdateVideoWindow = (videoId: string, updates: Partial<VideoItem>) => {
  setVideoItems(prev => prev.map(item => 
    item.id === videoId ? { ...item, ...updates } : item
  ));
};

// 删除视频窗口
const handleDeleteVideoWindow = (videoId: string) => {
  setVideoItems(prev => prev.filter(item => item.id !== videoId));
};

// 下载视频
const handleDownloadVideo = (videoUrl: string, filename: string) => {
  const a = document.createElement('a');
  a.href = videoUrl;
  a.download = filename;
  a.click();
};
```

## 错误处理设计

### API 错误处理

```typescript
// 在 VideoService 中
async createVideo(params: VideoGenerationParams): Promise<VideoObject> {
  try {
    const response = await fetch(`${baseUrl}/v1/videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (data.status === 'failed') {
      throw new Error(`Video generation failed: ${data.error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Video creation error:', error);
    throw error;
  }
}
```

### 轮询超时处理

```typescript
startPolling(taskId: string, onProgress, onComplete, onError) {
  let retryCount = 0;
  const maxRetries = 120; // 4-10 分钟（间隔 2-5 秒）
  
  const poll = async () => {
    try {
      const videoObject = await this.getVideoStatus(taskId);
      
      if (videoObject.status === 'completed') {
        onComplete(videoObject);
        this.stopPolling(taskId);
      } else if (videoObject.status === 'failed') {
        onError(new Error(videoObject.error?.message || 'Video generation failed'));
        this.stopPolling(taskId);
      } else {
        onProgress(videoObject);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          onError(new Error('Video generation timeout'));
          this.stopPolling(taskId);
        }
      }
    } catch (error) {
      onError(error);
      this.stopPolling(taskId);
    }
  };
  
  const intervalId = setInterval(poll, 3000); // 3 秒轮询一次
  this.pollingIntervals.set(taskId, intervalId);
}
```

## 用户界面设计

### 视频生成按钮

在导出按钮旁边添加"生成视频"按钮：
- 当选择了至少一张分镜时启用
- 当未选择任何分镜时禁用并显示提示

### 视频生成对话框布局

```
┌─────────────────────────────────────────┐
│ 生成视频                          [×]   │
├─────────────────────────────────────────┤
│                                         │
│ 已选分镜：                              │
│ ┌──────┐ ┌──────┐ ┌──────┐             │
│ │ SC-01│ │ SC-02│ │ SC-03│             │
│ └──────┘ └──────┘ └──────┘             │
│                                         │
│ 参考主体：                              │
│ ┌──────────────────────────────────┐   │
│ │ [参考主体预览]                   │   │
│ └──────────────────────────────────┘   │
│                                         │
│ 视频提示词：                            │
│ ┌──────────────────────────────────┐   │
│ │ [多行文本输入框]                 │   │
│ │                                  │   │
│ └──────────────────────────────────┘   │
│                                         │
│ 视频方向：  ◉ 横屏  ○ 竖屏             │
│                                         │
│ 视频分辨率：  ◉ 720P  ○ 1080P         │
│                                         │
│ 视频时长：  [输入框] 秒                 │
│                                         │
│ 模型选择：  ◉ sora-2  ○ sora-2-pro    │
│                                         │
│ [预览提示词] [生成] [取消]              │
└─────────────────────────────────────────┘
```

### 视频窗口布局

```
┌──────────────────────────────┐
│ 视频 #1              [编辑]   │
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │   [视频播放器]         │  │
│  │   或                   │  │
│  │   [加载动画 50%]       │  │
│  │   或                   │  │
│  │   [错误信息] [重试]    │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│ [删除] [下载]                │
└──────────────────────────────┘
```

## 性能优化

### 1. 轮询优化

- 使用指数退避策略（可选）：初始间隔 2 秒，逐步增加到 5 秒
- 设置最大轮询次数（120 次）防止无限轮询
- 用户关闭窗口时立即停止轮询

### 2. 内存管理

- 及时清理已完成的轮询任务
- 限制画布上同时显示的视频窗口数量（建议不超过 10 个）
- 视频 URL 使用 CDN 加速

### 3. 网络优化

- 使用 FormData 上传文件时，压缩参考图片
- 实现请求重试机制（最多 3 次）
- 使用 gzip 压缩 API 请求和响应

## 测试策略

### 单元测试

- VideoService 的各个方法（createVideo、getVideoStatus、remixVideo）
- 状态管理函数（handleAddVideoWindow、handleUpdateVideoWindow 等）
- 错误处理逻辑

### 集成测试

- 完整的视频生成流程（从对话框到视频加载）
- 完整的视频编辑流程
- 轮询机制和超时处理
- 多个视频窗口的独立管理

### 端到端测试

- 用户选择分镜 → 生成视频 → 编辑视频 → 下载视频
- 错误场景：API 失败、网络超时、内容违规等

## 安全考虑

### 1. API 密钥管理

- API 密钥存储在本地存储中（使用加密）
- 不在客户端代码中硬编码 API 密钥
- 支持从环境变量读取 API 密钥

### 2. 文件上传安全

- 验证上传文件的类型和大小
- 使用 FormData 上传文件，避免直接传输二进制数据
- 实现文件上传进度显示

### 3. 内容安全

- 遵守 Sora 2 API 的内容政策
- 显示 API 返回的错误信息（如"内容可能违反安全政策"）
- 不尝试绕过 API 的内容审核

## 部署考虑

### 1. 环境配置

- 支持多个 API 端点（官方、中转站等）
- 支持不同的 API 分组（官方分组、逆向分组）
- 可配置的轮询参数（间隔、最大次数等）

### 2. 兼容性

- 支持现代浏览器（Chrome、Firefox、Safari、Edge）
- 支持移动设备（响应式设计）
- 支持离线模式（缓存已生成的视频）

## 后续扩展

### 1. 批量视频生成

- 支持为多个分镜同时生成视频
- 显示批量生成进度

### 2. 视频模板

- 预定义的视频生成模板
- 用户自定义模板

### 3. 视频合成

- 将多个生成的视频合成为一个完整视频
- 支持视频转场效果

### 4. 视频分享

- 生成分享链接
- 支持社交媒体分享

