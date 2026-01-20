# 视频生成功能 - 完整规格文档

## 📖 文档导航

本项目包含以下文档，请按顺序阅读：

### 1️⃣ **快速开始** (15 分钟)
📄 [`QUICK_START.md`](./QUICK_START.md)

**适合**: 想快速了解功能的开发者

**内容**:
- 核心概念（5 分钟）
- 快速实现步骤（30 分钟）
- 常见错误和解决方案
- 调试技巧

**何时阅读**: 第一次接触这个功能时

---

### 2️⃣ **API 集成指南** (30 分钟)
📄 [`API_INTEGRATION_GUIDE.md`](./API_INTEGRATION_GUIDE.md)

**适合**: 需要理解 API 细节的开发者

**内容**:
- API 基础信息和认证方式
- 所有 API 端点的详细说明
- 请求/响应格式
- 错误处理
- 轮询机制

**何时阅读**: 需要深入了解 API 时

---

### 3️⃣ **实现模板** (1 小时)
📄 [`IMPLEMENTATION_TEMPLATE.md`](./IMPLEMENTATION_TEMPLATE.md)

**适合**: 准备开始编码的开发者

**内容**:
- 完整的 VideoService 类实现
- 类型定义
- 使用示例
- React 组件集成示例

**何时阅读**: 开始编写代码时

---

### 4️⃣ **需求文档** (参考)
📄 [`requirements.md`](./requirements.md)

**适合**: 需要了解功能需求的人

**内容**:
- 24 个详细的功能需求
- 用户故事和接受标准
- 术语表

**何时阅读**: 需要了解完整的功能范围时

---

### 5️⃣ **设计文档** (参考)
📄 [`design.md`](./design.md)

**适合**: 需要了解架构设计的人

**内容**:
- 系统架构图
- 组件设计
- 数据流设计
- 状态管理
- 错误处理设计

**何时阅读**: 需要理解系统架构时

---

### 6️⃣ **任务列表** (参考)
📄 [`tasks.md`](./tasks.md)

**适合**: 项目经理或需要了解实现计划的人

**内容**:
- 10 个主要任务
- 子任务分解
- 依赖关系
- 预期工作量

**何时阅读**: 规划项目时间表时

---

## 🎯 学习路径

### 路径 A：快速上手（2 小时）

```
1. 阅读 QUICK_START.md (15 分钟)
   ↓
2. 阅读 IMPLEMENTATION_TEMPLATE.md (45 分钟)
   ↓
3. 复制代码并测试 (60 分钟)
```

**结果**: 能够创建和查询视频生成任务

---

### 路径 B：深入理解（4 小时）

```
1. 阅读 QUICK_START.md (15 分钟)
   ↓
2. 阅读 API_INTEGRATION_GUIDE.md (30 分钟)
   ↓
3. 阅读 IMPLEMENTATION_TEMPLATE.md (45 分钟)
   ↓
4. 阅读 design.md (30 分钟)
   ↓
5. 阅读 requirements.md (30 分钟)
   ↓
6. 复制代码并测试 (90 分钟)
```

**结果**: 完全理解系统架构和实现细节

---

### 路径 C：完整项目规划（6 小时）

```
1. 完成路径 B 的所有步骤 (4 小时)
   ↓
2. 阅读 tasks.md (30 分钟)
   ↓
3. 制定项目计划 (90 分钟)
```

**结果**: 能够规划和执行完整的项目

---

## 🚀 快速开始（5 分钟）

### 最小化实现

如果你只想快速看到效果，按照这个步骤：

#### 1. 获取 API 密钥

```typescript
const config = {
  baseUrl: 'https://api.xxx.com',  // 中转服务的 Base URL
  apiKey: 'your-api-key-here'      // 你的 API Key
};
```

#### 2. 复制 VideoService 类

从 `IMPLEMENTATION_TEMPLATE.md` 复制完整的 `VideoService` 类

#### 3. 创建视频

```typescript
import VideoService from './videoService';

const videoService = new VideoService(config);

const result = await videoService.createVideo(
  '一只猫在公园里奔跑',
  { model: 'sora-2-pro', duration: 10 }
);

console.log('Task ID:', result.task_id);
```

#### 4. 查询进度

```typescript
videoService.startPolling(
  result.task_id,
  (status) => console.log(`Progress: ${status.progress}%`),
  (videoUrl) => console.log('Done:', videoUrl),
  (error) => console.error('Error:', error)
);
```

**完成！** 你现在可以生成视频了。

---

## 📊 核心概念速览

### API 端点

| 功能 | 端点 | 方法 |
|------|------|------|
| 创建任务 | `/v2/videos/generations` | POST |
| 查询进度 | `/v2/videos/generations/{task_id}` | GET |
| 编辑视频 | `/v1/videos/{task_id}/remix` | POST |
| 获取余额 | `/v1/token/quota` | GET |

### 状态流转

```
NOT_START → IN_PROGRESS → SUCCESS (获得 video_url)
                       ↘ FAILURE (获得 error)
```

### 关键参数

```typescript
{
  model: 'sora-2-pro',      // 模型选择
  prompt: '视频描述',        // 提示词
  aspect_ratio: '16:9',     // 宽高比
  duration: 10,             // 时长（秒）
  hd: false,                // 是否高清
  images: [...]             // 参考图片（可选）
}
```

---

## 🔧 文件结构

```
.kiro/specs/video-generation/
├── README.md                      ← 你在这里
├── QUICK_START.md                 ← 快速开始指南
├── API_INTEGRATION_GUIDE.md        ← API 详细文档
├── IMPLEMENTATION_TEMPLATE.md      ← 代码模板
├── requirements.md                ← 功能需求
├── design.md                      ← 架构设计
└── tasks.md                       ← 实现任务
```

---

## 💻 实现步骤

### 第 1 阶段：基础设置（1-2 小时）

- [ ] 阅读 QUICK_START.md
- [ ] 获取 API 密钥
- [ ] 复制 VideoService 类
- [ ] 测试 API 连接

**检查点**: 能够成功创建视频任务

---

### 第 2 阶段：核心功能（2-3 小时）

- [ ] 实现轮询机制
- [ ] 创建 VideoWindow 组件
- [ ] 集成到主应用
- [ ] 测试完整流程

**检查点**: 能够生成、查询和显示视频

---

### 第 3 阶段：高级功能（2-3 小时）

- [ ] 实现视频编辑（Remix）
- [ ] 实现视频下载
- [ ] 实现错误处理
- [ ] 实现用户余额显示

**检查点**: 所有功能都能正常工作

---

### 第 4 阶段：优化和测试（1-2 小时）

- [ ] 性能优化
- [ ] 错误处理完善
- [ ] 单元测试
- [ ] 集成测试

**检查点**: 代码质量达到标准

---

## ⚠️ 常见问题

### Q1: API 返回格式是什么？

**A**: API 返回 `text/plain` 格式，需要用 `.text()` 解析，然后 `JSON.parse()`

```typescript
const response = await fetch(endpoint, options);
const text = await response.text();
const data = JSON.parse(text);
```

---

### Q2: 轮询间隔应该设置多少？

**A**: 建议 3 秒。太短会浪费资源，太长会影响用户体验。

```typescript
const pollInterval = 3000; // 3 秒
```

---

### Q3: 最多轮询多少次？

**A**: 建议 120 次（约 6 分钟）。超过这个时间通常表示出现问题。

```typescript
const maxRetries = 120;
```

---

### Q4: 如何处理 API 密钥安全？

**A**: 
- 不要硬编码在代码中
- 使用环境变量或配置文件
- 如果存储在本地存储，建议加密

```typescript
// ❌ 不要这样做
const apiKey = 'sk-xxx...';

// ✅ 这样做
const apiKey = process.env.SORA_API_KEY;
```

---

### Q5: 生成视频需要多长时间？

**A**: 取决于配置：
- 标清 10 秒：1-3 分钟
- 标清 15 秒：3-5 分钟
- 高清 10 秒：8+ 分钟

---

## 📞 获取帮助

### 遇到问题？

1. **查看 QUICK_START.md** - 常见错误和解决方案
2. **查看 API_INTEGRATION_GUIDE.md** - API 详细文档
3. **查看 IMPLEMENTATION_TEMPLATE.md** - 代码示例
4. **检查 API 响应** - 查看具体的错误信息

### 常见错误代码

| 错误 | 原因 | 解决 |
|------|------|------|
| `401` | API Key 无效 | 检查 API Key |
| `400` | 参数错误 | 检查参数格式 |
| `429` | 请求过于频繁 | 增加轮询间隔 |
| `500` | 服务器错误 | 重试请求 |

---

## 📈 项目进度

### 当前状态

- ✅ 需求文档完成
- ✅ 设计文档完成
- ✅ API 集成指南完成
- ✅ 实现模板完成
- ⏳ 代码实现（待开始）
- ⏳ 测试（待开始）

### 预期工作量

- **基础设置**: 1-2 小时
- **核心功能**: 2-3 小时
- **高级功能**: 2-3 小时
- **优化测试**: 1-2 小时

**总计**: 约 6-10 小时

---

## 🎓 学习资源

### 官方文档

- [Sora 官方文档](https://platform.openai.com/docs/guides/vision)
- [Fetch API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

### 相关技术

- TypeScript
- React Hooks
- Async/Await
- State Management

---

## ✨ 最佳实践

1. **错误处理**: 总是处理 API 错误和网络错误
2. **资源清理**: 组件卸载时停止轮询
3. **用户反馈**: 显示进度和状态信息
4. **性能优化**: 限制同时生成的视频数量
5. **安全性**: 不要暴露 API 密钥

---

## 📝 更新日志

### v1.0 (2024-12-24)

- ✅ 完成需求文档
- ✅ 完成设计文档
- ✅ 完成 API 集成指南
- ✅ 完成实现模板
- ✅ 完成快速开始指南

---

## 📄 许可证

本文档和代码示例可自由使用和修改。

---

## 🤝 贡献

如果你发现文档中有错误或有改进建议，欢迎反馈。

---

## 📞 联系方式

如有问题，请查阅相关文档或联系开发团队。

---

**祝你实现顺利！** 🚀

