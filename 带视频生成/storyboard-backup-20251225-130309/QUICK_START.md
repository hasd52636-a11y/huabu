# 视频生成功能 - 快速开始指南

## 📋 概览

这个指南帮助你快速理解和实现 Sora 2 视频生成功能。

---

## 🎯 核心概念（5 分钟了解）

### 什么是 Sora 2 API？

Sora 2 是 OpenAI 的视频生成模型。你通过中转服务（如神马 API）调用它。

### 工作流程

```
你的应用
   ↓
VideoService（我们的服务类）
   ↓
中转服务 API（神马等）
   ↓
Sora 2 API（OpenAI）
   ↓
生成视频
```

### 三个关键 API 端点

| 功能 | 端点 | 用途 |
|------|------|------|
| **创建任务** | `POST /v2/videos/generations` | 提交视频生成请求 |
| **查询进度** | `GET /v2/videos/generations/{task_id}` | 查询生成进度 |
| **编辑视频** | `POST /v1/videos/{task_id}/remix` | 编辑已生成的视频 |

---

## 🚀 快速实现（30 分钟）

### 第 1 步：获取 API 密钥

1. 注册中转服务账号（如神马 API）
2. 获取 `API Key` 和 `Base URL`
3. 保存到本地存储或环境变量

```typescript
const config = {
  baseUrl: 'https://api.xxx.com',  // 中转服务的 Base URL
  apiKey: 'your-api-key-here'      // 你的 API Key
};
```

### 第 2 步：复制 VideoService 类

从 `IMPLEMENTATION_TEMPLATE.md` 复制完整的 `VideoService` 类到你的项目：

```
src/
  ├── videoService.ts          ← 复制这个文件
  ├── types.ts                 ← 添加类型定义
  └── components/
      └── VideoWindow.tsx      ← 创建这个组件
```

### 第 3 步：初始化服务

```typescript
import VideoService from './videoService';

const videoService = new VideoService({
  baseUrl: 'https://api.xxx.com',
  apiKey: 'your-api-key-here'
});
```

### 第 4 步：创建视频

```typescript
// 创建视频生成任务
const result = await videoService.createVideo(
  '一只猫在公园里奔跑',
  {
    model: 'sora-2-pro',
    aspect_ratio: '16:9',
    duration: 10,
    hd: false
  }
);

console.log('Task ID:', result.task_id);
```

### 第 5 步：轮询进度

```typescript
// 启动轮询，每 3 秒查询一次进度
videoService.startPolling(
  result.task_id,
  
  // 进度回调
  (status) => {
    console.log(`Progress: ${status.progress}%`);
    console.log(`Status: ${status.status}`);
  },
  
  // 完成回调
  (videoUrl) => {
    console.log('Video ready:', videoUrl);
    // 显示视频或下载
  },
  
  // 错误回调
  (error) => {
    console.error('Error:', error.message);
  }
);
```

---

## 📊 API 响应格式

### 创建任务响应

```json
{
  "task_id": "abc123def456",
  "status": "NOT_START",
  "progress": 0,
  "created_at": 1703001234
}
```

### 查询进度响应

```json
{
  "task_id": "abc123def456",
  "status": "IN_PROGRESS",
  "progress": 45,
  "created_at": 1703001234,
  "model": "sora-2-pro",
  "duration": 10,
  "size": "1280x720",
  "video_url": null
}
```

### 完成时的响应

```json
{
  "task_id": "abc123def456",
  "status": "SUCCESS",
  "progress": 100,
  "video_url": "https://cdn.example.com/video.mp4",
  "model": "sora-2-pro",
  "duration": 10,
  "size": "1280x720"
}
```

---

## 🔄 状态流转

```
NOT_START
    ↓
IN_PROGRESS (显示进度条)
    ↓
SUCCESS (获得 video_url) ← 显示视频
    ↓
FAILURE (获得 error) ← 显示错误
```

---

## ⚙️ 参数说明

### 模型选择

| 模型 | 特点 | 分辨率 | 时长 |
|------|------|--------|------|
| `sora-2` | 基础 | 720P | 10/15/25 秒 |
| `sora-2-pro` | 专业 | 720P + 1080P | 10/15/25 秒 |

### 宽高比

- `16:9` - 横屏（推荐）
- `9:16` - 竖屏

### 时长

- `10` - 10 秒
- `15` - 15 秒
- `25` - 25 秒

### 高清选项

- `hd: true` - 启用高清（仅 sora-2-pro，生成时间更长）
- `hd: false` - 标清（默认）

---

## 🎬 常见场景

### 场景 1：文生视频（最简单）

```typescript
const result = await videoService.createVideo(
  '一只猫在公园里奔跑，阳光洒在草地上',
  {
    model: 'sora-2-pro',
    aspect_ratio: '16:9',
    duration: 10,
    hd: false
  }
);
```

### 场景 2：图生视频（从图片生成）

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

### 场景 3：编辑视频（Remix）

```typescript
// 基于已生成的视频进行编辑
const remixResult = await videoService.remixVideo(
  'original-task-id',
  '猫在公园里跳舞，背景是落日'
);

// 继续轮询新任务
videoService.startPolling(remixResult.task_id, ...);
```

### 场景 4：获取余额

```typescript
const quota = await videoService.getTokenQuota();
console.log('Remaining quota:', quota.remaining_quota);

// 转换为网站显示的额度
const displayRemaining = quota.remaining_quota / 500000;
```

---

## ⏱️ 预期耗时

| 配置 | 耗时 |
|------|------|
| 标清 10 秒 | 1-3 分钟 |
| 标清 15 秒 | 3-5 分钟 |
| 高清 10 秒 | 8+ 分钟 |
| 高清 15 秒 | 10+ 分钟 |

---

## ❌ 常见错误

### 错误 1：`401 Unauthorized`

**原因**: API Key 无效或过期

**解决**: 检查 API Key 是否正确

```typescript
// ❌ 错误
const config = { apiKey: 'wrong-key' };

// ✅ 正确
const config = { apiKey: 'sk-xxx...' };
```

### 错误 2：`400 Bad Request`

**原因**: 请求参数错误

**解决**: 检查参数格式

```typescript
// ❌ 错误
{ duration: '10' }  // 应该是数字

// ✅ 正确
{ duration: 10 }
```

### 错误 3：`429 Too Many Requests`

**原因**: 请求过于频繁

**解决**: 增加轮询间隔

```typescript
// 在 VideoService 中修改
const pollInterval = 5000; // 改为 5 秒
```

### 错误 4：生成失败 - "图片包含真人"

**原因**: 提交的图片包含人脸

**解决**: 使用不含人脸的图片

### 错误 5：生成失败 - "提示词包含违规内容"

**原因**: 提示词包含不允许的内容

**解决**: 修改提示词，避免暴力、色情等内容

---

## 🔍 调试技巧

### 1. 查看完整的 API 响应

```typescript
const response = await fetch(endpoint, options);
const text = await response.text();
console.log('Raw response:', text);
const data = JSON.parse(text);
console.log('Parsed data:', data);
```

### 2. 监控轮询过程

```typescript
videoService.startPolling(
  taskId,
  (status) => {
    console.log('=== Poll Update ===');
    console.log('Status:', status.status);
    console.log('Progress:', status.progress);
    console.log('Video URL:', status.video_url);
    console.log('Error:', status.error);
  },
  ...
);
```

### 3. 检查请求头

```typescript
const headers = new Headers();
headers.append('Authorization', `Bearer ${apiKey}`);
console.log('Headers:', Object.fromEntries(headers));
```

---

## 📚 完整文档

- **API 集成指南**: `API_INTEGRATION_GUIDE.md` - 详细的 API 文档
- **实现模板**: `IMPLEMENTATION_TEMPLATE.md` - 完整的代码示例
- **需求文档**: `requirements.md` - 功能需求
- **设计文档**: `design.md` - 架构设计
- **任务列表**: `tasks.md` - 实现任务

---

## ✅ 检查清单

在开始实现前，确保你已经：

- [ ] 获取了 API Key 和 Base URL
- [ ] 理解了三个核心 API 端点
- [ ] 知道了状态流转过程
- [ ] 复制了 VideoService 类
- [ ] 测试了 API 连接

---

## 🎓 下一步

1. **复制代码**: 从 `IMPLEMENTATION_TEMPLATE.md` 复制 VideoService 类
2. **配置 API**: 设置 Base URL 和 API Key
3. **测试创建**: 尝试创建第一个视频任务
4. **实现轮询**: 添加进度监控
5. **构建 UI**: 创建 VideoWindow 组件显示视频

---

## 💡 提示

- 保存 API Key 到环境变量，不要硬编码
- 使用 localStorage 缓存配置，方便用户设置
- 实现错误重试机制，提高稳定性
- 监控轮询次数，防止无限轮询
- 组件卸载时调用 `cleanup()` 停止轮询

