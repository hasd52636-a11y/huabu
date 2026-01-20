# Sora 2 API 集成指南

## 目录
1. [API 基础信息](#api-基础信息)
2. [认证方式](#认证方式)
3. [核心 API 端点](#核心-api-端点)
4. [请求/响应格式](#请求响应格式)
5. [实现步骤](#实现步骤)
6. [错误处理](#错误处理)
7. [轮询机制](#轮询机制)

---

## API 基础信息

### 服务提供商
- **官方 API**: OpenAI Sora 2
- **中转服务**: 神马 API（提供 Sora 2 的代理服务）
- **Base URL**: 由中转服务提供（通常类似 `https://api.xxx.com`）

### 关键概念

| 概念 | 说明 |
|------|------|
| **Task ID** | 视频生成任务的唯一标识符，用于追踪和查询进度 |
| **Status** | 任务状态：`NOT_START`（未开始）、`IN_PROGRESS`（进行中）、`SUCCESS`（成功）、`FAILURE`（失败） |
| **Progress** | 进度百分比（0-100） |
| **Video URL** | 生成完成后的视频下载链接 |

---

## 认证方式

### 请求头配置

所有 API 请求都需要在 Header 中添加认证信息：

```typescript
const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  'Pragma': 'no-cache'
};
```

### 配置存储

```typescript
interface APIConfig {
  baseUrl: string;        // API 基础 URL（如 https://api.xxx.com）
  apiKey: string;         // API 密钥（从中转服务获取）
  userId?: string;        // 用户 ID（可选）
}

// 存储在本地存储中（建议加密）
const config: APIConfig = {
  baseUrl: localStorage.getItem('sora_base_url') || '',
  apiKey: localStorage.getItem('sora_api_key') || '',
};
```

---

## 核心 API 端点

### 1. 查询视频生成进度

**端点**: `GET /v2/videos/generations/{task_id}`

**用途**: 查询已提交的视频生成任务的当前状态

**请求示例（JavaScript）**:
```javascript
var myHeaders = new Headers();
myHeaders.append("Authorization", "Bearer YOUR_API_KEY");

var requestOptions = {
  method: 'GET',
  headers: myHeaders,
  redirect: 'follow'
};

fetch("/v2/videos/generations/f0aa213c-c09e-4e19-a0e5-c698fe4", requestOptions)
  .then(response => response.text())
  .then(result => console.log(result))
  .catch(error => console.log('error', error));
```

**请求示例（TypeScript/Fetch）**:
```typescript
const taskId = "f0aa213c-c09e-4e19-a0e5-c698fe4";
const apiKey = "YOUR_API_KEY";
const baseUrl = "https://api.xxx.com"; // 中转服务的 Base URL

const headers = new Headers();
headers.append("Authorization", `Bearer ${apiKey}`);

const response = await fetch(
  `${baseUrl}/v2/videos/generations/${taskId}`,
  {
    method: 'GET',
    headers: headers,
    redirect: 'follow'
  }
);

const result = await response.text();
console.log(result);
```

**响应示例**:
```json
{
  "task_id": "f0aa213c-c09e-4e19-a0e5-c698fe4",
  "status": "IN_PROGRESS",
  "progress": 45,
  "created_at": 1703001234,
  "model": "sora-2-pro",
  "duration": 10,
  "size": "1280x720",
  "video_url": null
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `task_id` | string | 任务唯一标识 |
| `status` | string | 任务状态：`NOT_START`（未开始）、`IN_PROGRESS`（进行中）、`SUCCESS`（成功）、`FAILURE`（失败） |
| `progress` | number | 进度百分比（0-100） |
| `created_at` | number | 创建时间戳 |
| `model` | string | 使用的模型（`sora-2` 或 `sora-2-pro`） |
| `duration` | number | 视频时长（秒） |
| `size` | string | 视频分辨率（如 `1280x720`） |
| `video_url` | string \| null | 视频下载链接（完成后才有） |
| `error` | object | 错误信息（失败时才有） |

**状态转换流程**:
```
NOT_START → IN_PROGRESS → SUCCESS (获得 video_url)
                       ↘ FAILURE (获得 error 信息)
```

**重要提示**:
- 响应格式为 `text/plain`，需要用 `.text()` 而不是 `.json()` 来解析
- 如果响应是 JSON 字符串，需要手动 `JSON.parse()` 转换

---

### 2. 创建视频生成任务

**端点**: `POST /v2/videos/generations`

**用途**: 提交新的视频生成请求

#### 2.1 文生视频（Text-to-Video）

**请求体**:
```json
{
  "model": "sora-2-pro",
  "prompt": "一只猫在公园里奔跑，阳光洒在草地上",
  "aspect_ratio": "16:9",
  "duration": 10,
  "hd": false
}
```

**参数说明**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `model` | string | ✅ | `sora-2` 或 `sora-2-pro` |
| `prompt` | string | ✅ | 视频描述提示词（中英文都支持） |
| `aspect_ratio` | string | ❌ | 宽高比：`16:9`（横屏）或 `9:16`（竖屏），默认 `16:9` |
| `duration` | number | ❌ | 视频时长（秒）：`10`、`15`、`25`，默认 `10` |
| `hd` | boolean | ❌ | 是否高清（仅 `sora-2-pro` 支持），默认 `false` |

**响应示例**:
```json
{
  "task_id": "abc123def456",
  "status": "NOT_START",
  "progress": 0,
  "created_at": 1703001234
}
```

#### 2.2 图生视频（Image-to-Video）

**请求体**:
```json
{
  "model": "sora-2-pro",
  "prompt": "猫继续在公园里奔跑",
  "images": [
    "https://example.com/image1.jpg",
    "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  ],
  "aspect_ratio": "16:9",
  "duration": 10,
  "hd": false
}
```

**参数说明**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `model` | string | ✅ | `sora-2` 或 `sora-2-pro` |
| `prompt` | string | ✅ | 视频描述提示词 |
| `images` | string[] | ✅ | 参考图片数组（URL 或 base64） |
| `aspect_ratio` | string | ❌ | 宽高比：`16:9` 或 `9:16` |
| `duration` | number | ❌ | 视频时长（秒）：`10`、`15`、`25` |
| `hd` | boolean | ❌ | 是否高清（仅 `sora-2-pro` 支持） |

---

### 3. 编辑/Remix 视频

**端点**: `POST /v1/videos/{task_id}/remix`

**用途**: 基于已生成的视频进行编辑和扩展

**请求体**:
```json
{
  "prompt": "猫在公园里跳舞，背景是落日"
}
```

**响应示例**:
```json
{
  "task_id": "new_task_id_xyz",
  "status": "NOT_START",
  "progress": 0,
  "created_at": 1703001235
}
```

**说明**: 返回新的 task_id，需要继续轮询查询新任务的进度

---

### 4. 获取用户余额

**端点**: `GET /v1/token/quota`

**用途**: 查询用户的 API 配额和使用情况

**请求示例**:
```bash
GET /v1/token/quota HTTP/1.1
Host: api.xxx.com
Authorization: Bearer YOUR_API_KEY
```

**响应示例**:
```json
{
  "total_quota": 1000000,
  "used_quota": 250000,
  "remaining_quota": 750000
}
```

**配额计算**:
```typescript
// 原始值需要转换为网站显示的额度
const displayQuota = totalQuota / 500000;  // 例如：1000000 / 500000 = 2
const displayUsed = usedQuota / 500000;
const displayRemaining = remainingQuota / 500000;
```

---

## 请求/响应格式

### 完整的请求示例

```typescript
// 创建视频生成任务
async function createVideoTask(prompt: string) {
  const config = {
    baseUrl: 'https://api.xxx.com',
    apiKey: 'your-api-key-here'
  };

  const response = await fetch(`${config.baseUrl}/v2/videos/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Pragma': 'no-cache'
    },
    body: JSON.stringify({
      model: 'sora-2-pro',
      prompt: prompt,
      aspect_ratio: '16:9',
      duration: 10,
      hd: false
    })
  });

  const data = await response.json();
  return data; // { task_id, status, progress, created_at }
}

// 查询任务进度
async function getVideoStatus(taskId: string) {
  const config = {
    baseUrl: 'https://api.xxx.com',
    apiKey: 'your-api-key-here'
  };

  const response = await fetch(
    `${config.baseUrl}/v2/videos/generations/${taskId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Pragma': 'no-cache'
      }
    }
  );

  const data = await response.json();
  return data; // { task_id, status, progress, video_url, ... }
}
```

---

## 实现步骤

### 第 1 步：配置 API 信息

```typescript
// videoService.ts
class VideoService {
  private config = {
    baseUrl: localStorage.getItem('sora_base_url') || '',
    apiKey: localStorage.getItem('sora_api_key') || ''
  };

  constructor(baseUrl: string, apiKey: string) {
    this.config = { baseUrl, apiKey };
    // 保存到本地存储（建议加密）
    localStorage.setItem('sora_base_url', baseUrl);
    localStorage.setItem('sora_api_key', apiKey);
  }

  private buildHeaders() {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'Pragma': 'no-cache'
    };
  }
}
```

### 第 2 步：实现创建视频任务

```typescript
async createVideo(prompt: string, options: {
  model: 'sora-2' | 'sora-2-pro';
  aspect_ratio?: '16:9' | '9:16';
  duration?: 10 | 15 | 25;
  hd?: boolean;
  images?: string[];
}) {
  const endpoint = `${this.config.baseUrl}/v2/videos/generations`;
  
  const body: any = {
    model: options.model,
    prompt: prompt,
    aspect_ratio: options.aspect_ratio || '16:9',
    duration: options.duration || 10,
    hd: options.hd || false
  };

  // 如果有图片，添加到请求体
  if (options.images && options.images.length > 0) {
    body.images = options.images;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: this.buildHeaders(),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return await response.json();
}
```

### 第 3 步：实现查询进度

```typescript
async getVideoStatus(taskId: string) {
  const endpoint = `${this.config.baseUrl}/v2/videos/generations/${taskId}`;
  
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: this.buildHeaders()
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return await response.json();
}
```

### 第 4 步：实现轮询机制

```typescript
startPolling(
  taskId: string,
  onProgress: (status: any) => void,
  onComplete: (videoUrl: string) => void,
  onError: (error: Error) => void
) {
  let retryCount = 0;
  const maxRetries = 120; // 最多轮询 120 次
  const pollInterval = 3000; // 每 3 秒查询一次

  const poll = async () => {
    try {
      const status = await this.getVideoStatus(taskId);
      
      // 调用进度回调
      onProgress(status);

      if (status.status === 'SUCCESS') {
        // 生成完成
        onComplete(status.video_url);
        this.stopPolling(taskId);
      } else if (status.status === 'FAILURE') {
        // 生成失败
        onError(new Error(status.error?.message || 'Video generation failed'));
        this.stopPolling(taskId);
      } else {
        // 继续轮询
        retryCount++;
        if (retryCount >= maxRetries) {
          onError(new Error('Video generation timeout'));
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

stopPolling(taskId: string) {
  const intervalId = this.pollingIntervals.get(taskId);
  if (intervalId) {
    clearInterval(intervalId);
    this.pollingIntervals.delete(taskId);
  }
}
```

---

## 错误处理

### 常见错误类型

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| `401 Unauthorized` | API Key 无效或过期 | 检查 API Key 是否正确 |
| `400 Bad Request` | 请求参数错误 | 检查参数格式和必需字段 |
| `429 Too Many Requests` | 请求过于频繁 | 增加轮询间隔 |
| `500 Internal Server Error` | 服务器错误 | 重试请求 |

### 错误处理示例

```typescript
async createVideo(prompt: string, options: any) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      if (response.status === 401) {
        throw new Error('API Key 无效，请检查配置');
      } else if (response.status === 400) {
        throw new Error(`参数错误: ${errorData.message}`);
      } else if (response.status === 429) {
        throw new Error('请求过于频繁，请稍后再试');
      } else {
        throw new Error(`API 错误: ${errorData.message}`);
      }
    }

    return await response.json();
  } catch (error) {
    console.error('Video creation error:', error);
    throw error;
  }
}
```

### 内容审查错误

Sora 2 API 会进行三阶段审查，可能返回以下错误：

```typescript
// 图片审查失败
{
  "status": "FAILURE",
  "error": {
    "code": "image_review_failed",
    "message": "图片包含真人，无法生成"
  }
}

// 提示词审查失败
{
  "status": "FAILURE",
  "error": {
    "code": "prompt_review_failed",
    "message": "提示词包含违规内容"
  }
}

// 生成结果审查失败
{
  "status": "FAILURE",
  "error": {
    "code": "result_review_failed",
    "message": "生成结果未通过审查"
  }
}
```

---

## 轮询机制

### 轮询流程图

```
用户点击"生成视频"
    ↓
调用 createVideo() → 获得 task_id
    ↓
创建 VideoWindow（显示"排队中..."）
    ↓
启动轮询 startPolling(task_id)
    ↓
每 3 秒调用 getVideoStatus(task_id)
    ↓
┌─────────────────────────────────────┐
│ 检查 status 字段                     │
├─────────────────────────────────────┤
│ NOT_START → 显示"排队中..."          │
│ IN_PROGRESS → 显示进度条（progress%）│
│ SUCCESS → 获取 video_url，加载视频   │
│ FAILURE → 显示错误信息，停止轮询    │
└─────────────────────────────────────┘
    ↓
如果 status 为 SUCCESS 或 FAILURE，停止轮询
否则继续轮询（最多 120 次）
```

### 轮询参数优化

```typescript
// 根据进度调整轮询间隔（可选）
const getPollInterval = (progress: number) => {
  if (progress < 20) return 2000;   // 早期：2 秒
  if (progress < 50) return 3000;   // 中期：3 秒
  if (progress < 80) return 5000;   // 后期：5 秒
  return 10000;                     // 最后阶段：10 秒
};
```

---

## 完整的 VideoService 框架

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

class VideoService {
  private config: VideoServiceConfig;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: VideoServiceConfig) {
    this.config = config;
  }

  private buildHeaders() {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'Pragma': 'no-cache'
    };
  }

  async createVideo(prompt: string, options: {
    model: 'sora-2' | 'sora-2-pro';
    aspect_ratio?: '16:9' | '9:16';
    duration?: 10 | 15 | 25;
    hd?: boolean;
    images?: string[];
  }): Promise<{ task_id: string }> {
    // 实现创建视频任务
  }

  async getVideoStatus(taskId: string): Promise<VideoStatus> {
    // 实现查询进度
  }

  async remixVideo(taskId: string, prompt: string): Promise<{ task_id: string }> {
    // 实现编辑视频
  }

  startPolling(
    taskId: string,
    onProgress: (status: VideoStatus) => void,
    onComplete: (videoUrl: string) => void,
    onError: (error: Error) => void
  ): void {
    // 实现轮询机制
  }

  stopPolling(taskId: string): void {
    // 停止轮询
  }
}

export default VideoService;
```

---

## 快速参考

### API 端点总结

| 功能 | 方法 | 端点 | 返回值 |
|------|------|------|--------|
| 创建视频 | POST | `/v2/videos/generations` | `{ task_id, status, progress }` |
| 查询进度 | GET | `/v2/videos/generations/{task_id}` | `{ task_id, status, progress, video_url, ... }` |
| 编辑视频 | POST | `/v1/videos/{task_id}/remix` | `{ task_id, status, progress }` |
| 获取余额 | GET | `/v1/token/quota` | `{ total_quota, used_quota, remaining_quota }` |

### 状态值

- `NOT_START`: 未开始
- `IN_PROGRESS`: 进行中
- `SUCCESS`: 成功（有 video_url）
- `FAILURE`: 失败（有 error 信息）

### 模型选择

- `sora-2`: 基础模型，支持 720P，时长 10/15/25 秒
- `sora-2-pro`: 专业模型，支持 720P 和 1080P，时长 10/15/25 秒

### 宽高比

- `16:9`: 横屏（推荐）
- `9:16`: 竖屏

