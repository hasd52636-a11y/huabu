# 视频生成功能 - 行动计划

**制定日期**: 2025年12月25日  
**优先级**: 高  
**预计工作量**: 9-13小时  
**预计完成时间**: 1-2天

---

## 📋 概述

基于全面检查报告，本行动计划详细列出了完成视频生成功能所需的具体步骤。项目当前进度为40%，需要完成以下关键任务：

1. ✅ 完成类型定义统一
2. ✅ 完成UI组件集成
3. ✅ 完成核心功能集成
4. ✅ 添加错误处理
5. ✅ 编写测试

---

## 🎯 第一阶段：完成类型定义（1-2小时）

### 任务 1.1: 统一类型定义到 types.ts

**目标**: 将分散在各个文件中的类型定义统一到 types.ts

**具体步骤**:

1. **打开 types.ts**
   - 在文件末尾添加以下类型定义

2. **添加 VideoItem 接口**
   ```typescript
   export interface VideoItem {
     id: string;
     taskId: string;
     status: 'loading' | 'completed' | 'failed';
     progress: number;
     videoUrl?: string;
     error?: string;
     x: number;
     y: number;
     width: number;
     height: number;
     createdAt: number;
   }
   ```

3. **添加 VideoObject 接口**
   ```typescript
   export interface VideoObject {
     id: string;
     object: 'video';
     model: string;
     status: 'queued' | 'in_progress' | 'completed' | 'failed';
     progress: number;
     created_at: number;
     seconds?: string;
     size?: string;
     url?: string;
     video_url?: string;
     error?: {
       code: string;
       message: string;
     };
   }
   ```

4. **添加 VideoGenerationParams 接口**
   ```typescript
   export interface VideoGenerationParams {
     model: 'sora-2' | 'sora-2-pro';
     prompt: string;
     size?: '720x1280' | '1280x720' | '1792x1024' | '1024x1792';
     input_reference?: File;
     seconds?: string;
     watermark?: boolean;
   }
   ```

5. **添加 VideoStatus 接口**
   ```typescript
   export interface VideoStatus {
     task_id: string;
     status: 'NOT_START' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE';
     progress: string;
     created_at?: number;
     submit_time?: number;
     start_time?: number;
     finish_time?: number;
     model?: string;
     duration?: number;
     size?: string;
     video_url?: string;
     fail_reason?: string;
     error?: {
       code: string;
       message: string;
     };
   }
   ```

6. **更新 App.tsx 导入**
   ```typescript
   import { ..., VideoItem, VideoObject, VideoGenerationParams, VideoStatus } from './types';
   ```

7. **更新 VideoWindow.tsx**
   - 删除本地的 VideoItem 接口定义
   - 从 types.ts 导入 VideoItem
   ```typescript
   import { VideoItem } from '../types';
   ```

8. **更新 videoService.ts**
   - 从 types.ts 导入类型定义
   ```typescript
   import { VideoStatus, VideoGenerationParams } from './types';
   ```

**验证**:
- [ ] types.ts 中有所有必要的类型定义
- [ ] App.tsx 正确导入所有类型
- [ ] VideoWindow.tsx 正确导入 VideoItem
- [ ] videoService.ts 正确导入类型
- [ ] 没有类型冲突或重复定义

---

## 🎯 第二阶段：完成UI组件（2-3小时）

### 任务 2.1: 创建 VideoEditDialog 组件

**目标**: 实现视频编辑对话框组件

**文件**: `components/VideoEditDialog.tsx`

**具体步骤**:

1. **创建组件框架**
   ```typescript
   import React, { useState } from 'react';
   import { VideoObject } from '../types';

   interface VideoEditDialogProps {
     videoObject: VideoObject;
     videoUrl: string;
     onApply: (prompt: string) => void;
     onCancel: () => void;
     isLoading?: boolean;
     lang?: 'zh' | 'en';
   }

   export default function VideoEditDialog({
     videoObject,
     videoUrl,
     onApply,
     onCancel,
     isLoading = false,
     lang = 'zh'
   }: VideoEditDialogProps) {
     const [editPrompt, setEditPrompt] = useState('');

     const handleApply = () => {
       if (!editPrompt.trim()) {
         alert(lang === 'zh' ? '请输入编辑提示词' : 'Please enter edit prompt');
         return;
       }
       onApply(editPrompt);
     };

     return (
       <div style={{...}}>
         {/* 对话框内容 */}
       </div>
     );
   }
   ```

2. **实现对话框布局**
   - 标题: "编辑视频"
   - 原视频预览（video标签）
   - 编辑提示词输入框（textarea）
   - 应用编辑和取消按钮

3. **实现功能**
   - 提示词输入验证
   - 加载状态显示
   - 错误提示

**验证**:
- [ ] 组件可以正确渲染
- [ ] 提示词输入可以正常工作
- [ ] 应用编辑按钮可以调用回调
- [ ] 取消按钮可以关闭对话框

### 任务 2.2: 完成 VideoGenDialog 集成

**目标**: 确保 VideoGenDialog 与 App.tsx 正确集成

**具体步骤**:

1. **检查 VideoGenDialog 的 Props**
   - 确保所有必要的 Props 都已定义
   - 确保回调函数签名正确

2. **更新 App.tsx 中的使用**
   ```typescript
   {showVideoGenDialog && (
     <VideoGenDialog
       onGenerate={handleGenerateVideo}
       onCancel={() => setShowVideoGenDialog(false)}
       initialPrompt={videoGenDialogPrompt}
       lang={lang}
       selectedFrames={items.filter(it => selectedIds.has(it.id))}
       symbolDescriptions={SYMBOL_DESCRIPTIONS}
     />
   )}
   ```

3. **测试对话框**
   - 打开对话框
   - 输入提示词
   - 选择参数
   - 点击生成

**验证**:
- [ ] 对话框可以正确打开和关闭
- [ ] 参数可以正确选择
- [ ] 生成按钮可以调用回调

### 任务 2.3: 完成 VideoWindow 集成

**目标**: 确保 VideoWindow 与 App.tsx 正确集成

**具体步骤**:

1. **检查 VideoWindow 的 Props**
   - 确保所有必要的 Props 都已定义
   - 确保回调函数签名正确

2. **更新 App.tsx 中的使用**
   ```typescript
   {videoItems.map((videoItem) => (
     <VideoWindow
       key={videoItem.id}
       item={videoItem}
       onDelete={handleDeleteVideoWindow}
       onDownload={handleDownloadVideo}
       onEdit={handleEditVideo}
       onDragStart={handleVideoWindowDragStart}
     />
   ))}
   ```

3. **测试视频窗口**
   - 生成视频后显示窗口
   - 拖拽移动窗口
   - 点击编辑、删除、下载按钮

**验证**:
- [ ] 视频窗口可以正确显示
- [ ] 拖拽功能可以正常工作
- [ ] 操作按钮可以调用回调

---

## 🎯 第三阶段：完成核心功能集成（2-3小时）

### 任务 3.1: 完成 handleGenerateVideo 实现

**目标**: 实现完整的视频生成流程

**文件**: `App.tsx`

**具体步骤**:

1. **初始化 VideoService**
   ```typescript
   useEffect(() => {
     const config = localStorage.getItem('director_canvas_api_config');
     if (config) {
       const { baseUrl, apiKey } = JSON.parse(config);
       videoServiceRef.current = new VideoService({ baseUrl, apiKey });
     }
   }, []);
   ```

2. **实现 handleGenerateVideo**
   ```typescript
   const handleGenerateVideo = useCallback(async (prompt: string, options: any) => {
     if (!videoServiceRef.current) {
       alert(lang === 'zh' ? '请先配置API' : 'Please configure API first');
       return;
     }

     try {
       setIsLoading(true);
       
       // 调用 VideoService 创建视频
       const result = await videoServiceRef.current.createVideo(prompt, options);
       
       // 创建视频窗口
       const newVideoItem: VideoItem = {
         id: crypto.randomUUID(),
         taskId: result.task_id,
         status: 'loading',
         progress: 0,
         x: 100,
         y: 100,
         width: 400,
         height: 300,
         createdAt: Date.now()
       };
       
       setVideoItems(prev => [...prev, newVideoItem]);
       setShowVideoGenDialog(false);
       
       // 启动轮询
       videoServiceRef.current.startPolling(
         result.task_id,
         (status) => {
           // 更新进度
           setVideoItems(prev => prev.map(item =>
             item.taskId === result.task_id
               ? { ...item, progress: parseInt(status.progress) || 0 }
               : item
           ));
         },
         (videoUrl) => {
           // 完成
           setVideoItems(prev => prev.map(item =>
             item.taskId === result.task_id
               ? { ...item, status: 'completed', videoUrl }
               : item
           ));
         },
         (error) => {
           // 失败
           setVideoItems(prev => prev.map(item =>
             item.taskId === result.task_id
               ? { ...item, status: 'failed', error: error.message }
               : item
           ));
         }
       );
     } catch (error) {
       alert(lang === 'zh' ? '生成失败: ' + error.message : 'Generation failed: ' + error.message);
     } finally {
       setIsLoading(false);
     }
   }, [lang]);
   ```

3. **测试生成流程**
   - 点击"生成视频"按钮
   - 输入提示词
   - 点击生成
   - 观察进度更新
   - 等待完成

**验证**:
- [ ] 视频生成请求可以正确发送
- [ ] 进度可以正确更新
- [ ] 完成后视频可以正确显示
- [ ] 失败时错误信息可以正确显示

### 任务 3.2: 完成 handleEditVideo 实现

**目标**: 实现完整的视频编辑流程

**文件**: `App.tsx`

**具体步骤**:

1. **实现 handleEditVideo**
   ```typescript
   const handleEditVideo = useCallback((videoId: string) => {
     const videoItem = videoItems.find(item => item.id === videoId);
     if (!videoItem || !videoItem.videoUrl) return;
     
     // 打开编辑对话框
     setEditingVideoId(videoId);
     setShowVideoEditDialog(true);
   }, [videoItems]);
   ```

2. **实现编辑提交**
   ```typescript
   const handleApplyVideoEdit = useCallback(async (prompt: string) => {
     if (!editingVideoId || !videoServiceRef.current) return;
     
     const videoItem = videoItems.find(item => item.id === editingVideoId);
     if (!videoItem) return;
     
     try {
       setIsLoading(true);
       
       // 调用 VideoService 编辑视频
       const result = await videoServiceRef.current.remixVideo(videoItem.taskId, prompt);
       
       // 更新视频窗口状态
       setVideoItems(prev => prev.map(item =>
         item.id === editingVideoId
           ? { ...item, status: 'loading', progress: 0 }
           : item
       ));
       
       setShowVideoEditDialog(false);
       
       // 启动新的轮询
       videoServiceRef.current.startPolling(
         result.task_id,
         (status) => {
           setVideoItems(prev => prev.map(item =>
             item.id === editingVideoId
               ? { ...item, progress: parseInt(status.progress) || 0 }
               : item
           ));
         },
         (videoUrl) => {
           setVideoItems(prev => prev.map(item =>
             item.id === editingVideoId
               ? { ...item, status: 'completed', videoUrl }
               : item
           ));
         },
         (error) => {
           setVideoItems(prev => prev.map(item =>
             item.id === editingVideoId
               ? { ...item, status: 'failed', error: error.message }
               : item
           ));
         }
       );
     } catch (error) {
       alert(lang === 'zh' ? '编辑失败: ' + error.message : 'Edit failed: ' + error.message);
     } finally {
       setIsLoading(false);
     }
   }, [editingVideoId, videoItems, lang]);
   ```

3. **测试编辑流程**
   - 生成视频
   - 点击编辑按钮
   - 输入编辑提示词
   - 点击应用编辑
   - 观察进度更新

**验证**:
- [ ] 编辑对话框可以正确打开
- [ ] 编辑请求可以正确发送
- [ ] 进度可以正确更新
- [ ] 完成后视频可以正确更新

### 任务 3.3: 完成 handleDownloadVideo 实现

**目标**: 实现视频下载功能

**文件**: `App.tsx`

**具体步骤**:

1. **实现 handleDownloadVideo**
   ```typescript
   const handleDownloadVideo = useCallback((videoId: string) => {
     const videoItem = videoItems.find(item => item.id === videoId);
     if (!videoItem || !videoItem.videoUrl) return;

     const a = document.createElement('a');
     a.href = videoItem.videoUrl;
     a.download = `video_${videoItem.taskId}.mp4`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
   }, [videoItems]);
   ```

2. **测试下载功能**
   - 生成视频
   - 点击下载按钮
   - 检查文件是否下载

**验证**:
- [ ] 下载按钮可以正确工作
- [ ] 文件可以正确下载

### 任务 3.4: 完成 handleDeleteVideoWindow 实现

**目标**: 实现视频窗口删除功能

**文件**: `App.tsx`

**具体步骤**:

1. **实现 handleDeleteVideoWindow**
   ```typescript
   const handleDeleteVideoWindow = useCallback((videoId: string) => {
     const videoItem = videoItems.find(item => item.id === videoId);
     if (videoItem && videoServiceRef.current) {
       // 停止轮询
       videoServiceRef.current.stopPolling(videoItem.taskId);
     }
     
     setVideoItems(prev => prev.filter(item => item.id !== videoId));
   }, [videoItems]);
   ```

2. **测试删除功能**
   - 生成视频
   - 点击删除按钮
   - 检查视频窗口是否被删除

**验证**:
- [ ] 删除按钮可以正确工作
- [ ] 轮询可以正确停止
- [ ] 视频窗口可以正确删除

---

## 🎯 第四阶段：添加错误处理（1-2小时）

### 任务 4.1: 完成 API 错误处理

**目标**: 添加完整的 API 错误处理

**具体步骤**:

1. **在 handleGenerateVideo 中添加错误处理**
   ```typescript
   try {
     // ... 生成视频代码
   } catch (error) {
     const errorMessage = error instanceof Error ? error.message : String(error);
     
     // 区分不同的错误类型
     if (errorMessage.includes('真人') || errorMessage.includes('face')) {
       alert(lang === 'zh' 
         ? '❌ 审查失败: 图片中检测到真人或类似真人的内容，请使用非真人图片'
         : '❌ Review failed: Real people detected in image, please use non-real images');
     } else if (errorMessage.includes('违规') || errorMessage.includes('暴力')) {
       alert(lang === 'zh'
         ? '❌ 审查失败: 提示词或内容违规，请修改后重试'
         : '❌ Review failed: Prompt or content violates policy, please modify and retry');
     } else {
       alert(lang === 'zh' ? '生成失败: ' + errorMessage : 'Generation failed: ' + errorMessage);
     }
   }
   ```

2. **在 VideoService 中添加错误处理**
   - 已在 videoService.ts 中实现
   - 检查是否需要改进

3. **测试错误处理**
   - 使用无效的 API 密钥
   - 使用无效的提示词
   - 检查错误信息是否正确显示

**验证**:
- [ ] API 错误可以正确捕获
- [ ] 错误信息可以正确显示
- [ ] 用户可以理解错误原因

### 任务 4.2: 完成轮询超时处理

**目标**: 添加轮询超时处理

**具体步骤**:

1. **检查 VideoService 中的超时处理**
   - 已在 startPolling 中实现 30 分钟超时
   - 检查是否需要改进

2. **在 App.tsx 中处理超时**
   ```typescript
   (error) => {
     if (error.message.includes('timeout')) {
       alert(lang === 'zh'
         ? '⏱️ 生成超时: 视频生成耗时过长，请稍后重试'
         : '⏱️ Generation timeout: Video generation took too long, please retry later');
     } else {
       alert(lang === 'zh' ? '生成失败: ' + error.message : 'Generation failed: ' + error.message);
     }
   }
   ```

3. **测试超时处理**
   - 模拟长时间的生成过程
   - 检查超时是否被正确处理

**验证**:
- [ ] 超时可以正确检测
- [ ] 超时错误可以正确显示
- [ ] 用户可以重试

---

## 🎯 第五阶段：编写测试（3-4小时）

### 任务 5.1: 编写 VideoService 单元测试

**目标**: 为 VideoService 编写单元测试

**文件**: `videoService.test.ts`

**具体步骤**:

1. **创建测试文件**
   ```typescript
   import VideoService from './videoService';

   describe('VideoService', () => {
     let service: VideoService;

     beforeEach(() => {
       service = new VideoService({
         baseUrl: 'https://api.example.com',
         apiKey: 'test-key'
       });
     });

     // 测试用例
   });
   ```

2. **编写测试用例**
   - 测试 createVideo 方法
   - 测试 getVideoStatus 方法
   - 测试 getTokenQuota 方法
   - 测试 startPolling 方法
   - 测试错误处理

3. **运行测试**
   ```bash
   npm test videoService.test.ts
   ```

**验证**:
- [ ] 所有测试都通过
- [ ] 代码覆盖率 > 80%

### 任务 5.2: 编写集成测试

**目标**: 为视频生成流程编写集成测试

**文件**: `App.test.tsx`

**具体步骤**:

1. **创建测试文件**
   ```typescript
   import { render, screen, fireEvent, waitFor } from '@testing-library/react';
   import App from './App';

   describe('Video Generation Integration', () => {
     // 测试用例
   });
   ```

2. **编写测试用例**
   - 测试完整的视频生成流程
   - 测试完整的视频编辑流程
   - 测试多个视频窗口的独立管理
   - 测试错误处理

3. **运行测试**
   ```bash
   npm test App.test.tsx
   ```

**验证**:
- [ ] 所有测试都通过
- [ ] 代码覆盖率 > 70%

### 任务 5.3: 编写端到端测试

**目标**: 为用户完整操作流程编写端到端测试

**文件**: `e2e/video-generation.spec.ts`

**具体步骤**:

1. **创建测试文件**
   ```typescript
   describe('Video Generation E2E', () => {
     // 测试用例
   });
   ```

2. **编写测试用例**
   - 用户选择分镜
   - 用户点击"生成视频"
   - 用户输入提示词
   - 用户点击生成
   - 观察进度更新
   - 等待完成
   - 用户点击编辑
   - 用户输入编辑提示词
   - 用户点击应用编辑
   - 用户点击下载
   - 用户点击删除

3. **运行测试**
   ```bash
   npm run test:e2e
   ```

**验证**:
- [ ] 所有测试都通过
- [ ] 用户流程完整

---

## 📊 进度跟踪

### 第一阶段：完成类型定义
- [ ] 任务 1.1: 统一类型定义到 types.ts
  - [ ] 添加 VideoItem 接口
  - [ ] 添加 VideoObject 接口
  - [ ] 添加 VideoGenerationParams 接口
  - [ ] 添加 VideoStatus 接口
  - [ ] 更新所有导入语句

**预计时间**: 1-2小时  
**实际时间**: ___小时

### 第二阶段：完成UI组件
- [ ] 任务 2.1: 创建 VideoEditDialog 组件
  - [ ] 创建组件框架
  - [ ] 实现对话框布局
  - [ ] 实现功能
  - [ ] 测试组件

- [ ] 任务 2.2: 完成 VideoGenDialog 集成
  - [ ] 检查 Props
  - [ ] 更新 App.tsx 使用
  - [ ] 测试对话框

- [ ] 任务 2.3: 完成 VideoWindow 集成
  - [ ] 检查 Props
  - [ ] 更新 App.tsx 使用
  - [ ] 测试视频窗口

**预计时间**: 2-3小时  
**实际时间**: ___小时

### 第三阶段：完成核心功能集成
- [ ] 任务 3.1: 完成 handleGenerateVideo 实现
  - [ ] 初始化 VideoService
  - [ ] 实现 handleGenerateVideo
  - [ ] 测试生成流程

- [ ] 任务 3.2: 完成 handleEditVideo 实现
  - [ ] 实现 handleEditVideo
  - [ ] 实现编辑提交
  - [ ] 测试编辑流程

- [ ] 任务 3.3: 完成 handleDownloadVideo 实现
  - [ ] 实现 handleDownloadVideo
  - [ ] 测试下载功能

- [ ] 任务 3.4: 完成 handleDeleteVideoWindow 实现
  - [ ] 实现 handleDeleteVideoWindow
  - [ ] 测试删除功能

**预计时间**: 2-3小时  
**实际时间**: ___小时

### 第四阶段：添加错误处理
- [ ] 任务 4.1: 完成 API 错误处理
  - [ ] 添加错误处理代码
  - [ ] 测试错误处理

- [ ] 任务 4.2: 完成轮询超时处理
  - [ ] 检查超时处理
  - [ ] 测试超时处理

**预计时间**: 1-2小时  
**实际时间**: ___小时

### 第五阶段：编写测试
- [ ] 任务 5.1: 编写 VideoService 单元测试
  - [ ] 创建测试文件
  - [ ] 编写测试用例
  - [ ] 运行测试

- [ ] 任务 5.2: 编写集成测试
  - [ ] 创建测试文件
  - [ ] 编写测试用例
  - [ ] 运行测试

- [ ] 任务 5.3: 编写端到端测试
  - [ ] 创建测试文件
  - [ ] 编写测试用例
  - [ ] 运行测试

**预计时间**: 3-4小时  
**实际时间**: ___小时

---

## 🎯 成功标准

### 功能完成
- [x] VideoService 完整实现
- [ ] VideoGenDialog 完整实现
- [ ] VideoEditDialog 完整实现
- [ ] VideoWindow 完整实现
- [ ] 完整的视频生成流程
- [ ] 完整的视频编辑流程
- [ ] 完整的视频下载流程
- [ ] 完整的视频删除流程

### 代码质量
- [ ] 所有类型定义都在 types.ts 中
- [ ] 没有类型错误
- [ ] 代码风格一致
- [ ] 代码注释完整

### 错误处理
- [ ] API 错误可以正确处理
- [ ] 轮询超时可以正确处理
- [ ] 用户可以理解错误原因
- [ ] 用户可以重试

### 测试覆盖
- [ ] VideoService 单元测试 > 80%
- [ ] 集成测试覆盖主要流程
- [ ] 端到端测试覆盖用户流程

### 文档完整
- [ ] API 文档完整
- [ ] 组件文档完整
- [ ] 配置文档完整

---

## 📝 注意事项

1. **API 配置**
   - 确保 API 密钥已正确配置
   - 确保 API 端点正确
   - 确保网络连接正常

2. **浏览器兼容性**
   - 测试在 Chrome、Firefox、Safari、Edge 中的兼容性
   - 测试在移动设备中的兼容性

3. **性能考虑**
   - 限制画布上同时显示的视频窗口数量
   - 及时清理已完成的轮询任务
   - 使用 CDN 加速视频 URL

4. **安全考虑**
   - API 密钥加密存储
   - 不在客户端代码中硬编码 API 密钥
   - 支持从环境变量读取 API 密钥

---

## 🔗 相关资源

- 需求文档: `.kiro/specs/video-generation/requirements.md`
- 设计文档: `.kiro/specs/video-generation/design.md`
- 任务列表: `.kiro/specs/video-generation/tasks.md`
- 全面检查报告: `.kiro/specs/video-generation/COMPREHENSIVE_REVIEW.md`

---

**行动计划完成** ✅  
**下一步**: 按照上述步骤逐一完成各个任务
