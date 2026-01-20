# 视频生成功能 - 快速参考指南

**最后更新**: 2025年12月25日

---

## 🚀 快速开始

### 项目状态
- **总体进度**: 40% ⚠️
- **预计完成**: 1-2天
- **优先级**: 高

### 关键数字
- **需求数**: 24个
- **接受标准**: 142个
- **任务数**: 10个主任务 + 47个子任务
- **工作量**: 15-22小时
- **剩余工作**: 9-13小时

---

## 📋 核心文档

| 文档 | 位置 | 用途 |
|------|------|------|
| 需求文档 | `.kiro/specs/video-generation/requirements.md` | 功能需求和接受标准 |
| 设计文档 | `.kiro/specs/video-generation/design.md` | 架构和实现设计 |
| 任务列表 | `.kiro/specs/video-generation/tasks.md` | 实现任务和计划 |
| 全面检查 | `.kiro/specs/video-generation/COMPREHENSIVE_REVIEW.md` | 详细的检查报告 |
| 行动计划 | `.kiro/specs/video-generation/ACTION_PLAN.md` | 具体的实现步骤 |
| 检查总结 | `.kiro/specs/video-generation/REVIEW_SUMMARY.md` | 检查结果总结 |

---

## 🎯 立即行动项

### 优先级 1: 类型定义 (1-2小时)
```typescript
// 需要在 types.ts 中添加
export interface VideoItem { ... }
export interface VideoObject { ... }
export interface VideoGenerationParams { ... }
export interface VideoStatus { ... }
```

### 优先级 2: VideoEditDialog (1-2小时)
```typescript
// 需要创建 components/VideoEditDialog.tsx
// 功能: 显示原视频预览、编辑提示词、应用编辑
```

### 优先级 3: 集成 (2-3小时)
```typescript
// 需要在 App.tsx 中完成
handleGenerateVideo()  // 完整实现
handleEditVideo()      // 新增实现
handleDownloadVideo()  // 完整实现
handleDeleteVideoWindow() // 完整实现
```

---

## 📊 进度跟踪

### 已完成
- ✅ VideoService (100%)
- ✅ VideoGenDialog 框架 (60%)
- ✅ VideoWindow 框架 (60%)
- ✅ App.tsx 状态管理 (40%)

### 进行中
- ⚠️ 集成 (40%)
- ⚠️ 错误处理 (40%)

### 未开始
- ❌ VideoEditDialog (0%)
- ❌ 单元测试 (0%)
- ❌ 集成测试 (0%)
- ❌ 端到端测试 (0%)

---

## 🔧 关键代码位置

### VideoService
**文件**: `videoService.ts`
**状态**: ✅ 完成
**关键方法**:
- `createVideo()` - 创建视频
- `getVideoStatus()` - 查询进度
- `remixVideo()` - 编辑视频
- `startPolling()` - 启动轮询
- `stopPolling()` - 停止轮询

### VideoGenDialog
**文件**: `components/VideoGenDialog.tsx`
**状态**: ⚠️ 60%完成
**需要完成**:
- 与 App.tsx 的完整集成
- 参数验证
- 错误处理

### VideoWindow
**文件**: `components/VideoWindow.tsx`
**状态**: ⚠️ 60%完成
**需要完成**:
- 与 App.tsx 的完整集成
- 拖拽功能完善
- 操作按钮回调

### App.tsx
**文件**: `App.tsx`
**状态**: ⚠️ 40%完成
**需要完成**:
- `handleGenerateVideo()` 完整实现
- `handleEditVideo()` 新增实现
- `handleDownloadVideo()` 完整实现
- `handleDeleteVideoWindow()` 完整实现
- 轮询回调处理

---

## 🐛 已知问题

### 问题 1: 类型定义分散
**位置**: types.ts, videoService.ts, VideoWindow.tsx
**影响**: 中等
**解决**: 统一到 types.ts

### 问题 2: VideoEditDialog 缺失
**位置**: components/
**影响**: 高
**解决**: 创建新组件

### 问题 3: 集成不完整
**位置**: App.tsx
**影响**: 高
**解决**: 完成集成代码

### 问题 4: 缺少测试
**位置**: 整个项目
**影响**: 中等
**解决**: 编写测试

---

## 📚 API 参考

### VideoService 方法

```typescript
// 创建视频
createVideo(prompt: string, options: CreateVideoOptions): Promise<{ task_id: string }>

// 查询进度
getVideoStatus(taskId: string): Promise<VideoStatus>

// 编辑视频
remixVideo(taskId: string, prompt: string): Promise<VideoObject>

// 获取配额
getTokenQuota(): Promise<TokenQuota>

// 启动轮询
startPolling(
  taskId: string,
  onProgress: (status: VideoStatus) => void,
  onComplete: (videoUrl: string) => void,
  onError: (error: Error) => void
): void

// 停止轮询
stopPolling(taskId: string): void
```

### Sora 2 API 端点

| 功能 | 方法 | 端点 |
|------|------|------|
| 创建视频 | POST | `/v2/videos/generations` |
| 查询进度 | GET | `/v2/videos/generations/{task_id}` |
| 编辑视频 | POST | `/v1/videos/{task_id}/remix` |
| 获取配额 | GET | `/v1/token/quota` |
| 创建角色 | POST | `/sora/v1/characters` |

---

## 🧪 测试清单

### 单元测试
- [ ] VideoService.createVideo()
- [ ] VideoService.getVideoStatus()
- [ ] VideoService.remixVideo()
- [ ] VideoService.startPolling()
- [ ] 错误处理

### 集成测试
- [ ] 完整的视频生成流程
- [ ] 完整的视频编辑流程
- [ ] 多个视频窗口管理
- [ ] 轮询机制

### 端到端测试
- [ ] 用户选择分镜 → 生成视频
- [ ] 用户编辑视频
- [ ] 用户下载视频
- [ ] 用户删除视频

---

## 💾 文件清单

### 核心文件
- `videoService.ts` - 视频服务
- `components/VideoGenDialog.tsx` - 生成对话框
- `components/VideoWindow.tsx` - 视频窗口
- `components/VideoEditDialog.tsx` - 编辑对话框 (需要创建)
- `App.tsx` - 主应用
- `types.ts` - 类型定义

### 文档文件
- `requirements.md` - 需求文档
- `design.md` - 设计文档
- `tasks.md` - 任务列表
- `COMPREHENSIVE_REVIEW.md` - 检查报告
- `ACTION_PLAN.md` - 行动计划
- `REVIEW_SUMMARY.md` - 检查总结
- `QUICK_REFERENCE.md` - 快速参考 (本文件)

---

## 🎓 关键概念

### VideoItem
```typescript
{
  id: string;              // 唯一标识
  taskId: string;          // Sora 2 API 任务ID
  status: 'loading' | 'completed' | 'failed';
  progress: number;        // 0-100
  videoUrl?: string;       // 生成的视频URL
  error?: string;          // 错误信息
  x: number;               // 窗口X坐标
  y: number;               // 窗口Y坐标
  width: number;           // 窗口宽度
  height: number;          // 窗口高度
  createdAt: number;       // 创建时间戳
}
```

### VideoStatus
```typescript
{
  task_id: string;
  status: 'NOT_START' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE';
  progress: string;        // "0%", "50%", "100%"
  video_url?: string;      // 生成的视频URL
  fail_reason?: string;    // 失败原因
  error?: { code: string; message: string };
}
```

### 状态转换
```
创建 → 排队 → 处理中 → 完成
              ↓
            失败
```

---

## 🔐 安全注意事项

### API 密钥
- ✅ 存储在本地存储中（加密）
- ✅ 不在代码中硬编码
- ✅ 支持环境变量配置

### 文件上传
- ✅ 验证文件类型和大小
- ✅ 使用 FormData 上传
- ✅ 显示上传进度

### 内容安全
- ✅ 遵守 Sora 2 API 内容政策
- ✅ 显示 API 返回的错误信息
- ✅ 不尝试绕过内容审核

---

## 📞 常见问题

### Q: 如何配置 API？
A: 在应用中输入 Base URL 和 API Key，系统会保存到本地存储。

### Q: 视频生成需要多长时间？
A: 标清 10 秒约 1-3 分钟，15 秒约 3-5 分钟，高清约 8+ 分钟。

### Q: 如何处理生成失败？
A: 系统会显示失败原因，用户可以修改提示词后重试。

### Q: 如何编辑已生成的视频？
A: 点击视频窗口的"编辑"按钮，输入编辑提示词，点击"应用编辑"。

### Q: 如何下载视频？
A: 点击视频窗口的"下载"按钮，视频会自动下载到本地。

---

## 🚀 下一步

1. **立即** (今天)
   - [ ] 统一类型定义
   - [ ] 创建 VideoEditDialog

2. **继续** (明天)
   - [ ] 完成集成
   - [ ] 添加错误处理

3. **后续** (后天)
   - [ ] 编写测试
   - [ ] 完善文档

---

## 📞 获取帮助

- 📖 查看详细的行动计划: `ACTION_PLAN.md`
- 📋 查看完整的检查报告: `COMPREHENSIVE_REVIEW.md`
- 📚 查看需求文档: `requirements.md`
- 🎨 查看设计文档: `design.md`
- ✅ 查看任务列表: `tasks.md`

---

**最后更新**: 2025年12月25日  
**下一步**: 按照行动计划继续推进项目
