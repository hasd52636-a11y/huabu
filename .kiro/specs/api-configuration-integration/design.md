# Design Document

## Overview

本设计文档描述如何将备份项目中的成熟功能代码植入到当前智能创意画布项目中，包括神马API配置、智谱完整服务、批量视频处理和分镜导出功能。设计采用代码植入和接口适配的方式，确保新功能与现有系统无缝集成，同时完全保护现有功能和界面不变。

## Architecture

### 整体架构设计

```
Current Project (intelligent-creative-canvas)
├── 现有核心 (完全保护)
│   ├── App.tsx (主应用组件)
│   ├── Canvas.tsx (画布组件)
│   ├── BlockComponent.tsx (块组件)
│   └── services/geminiService.ts (现有AI服务)
│
├── 植入的服务层 (新增)
│   ├── services/zhipuService.ts (智谱完整服务)
│   ├── services/shenmaService.ts (神马API服务)
│   ├── services/BatchProcessor.ts (批量处理服务)
│   ├── services/VideoStatusManager.ts (视频状态管理)
│   └── services/ExportService.ts (分镜导出服务)
│
├── 植入的组件层 (新增)
│   ├── components/BatchVideoPanel.tsx (批量视频面板)
│   ├── components/ExportLayoutSelector.tsx (导出布局选择器)
│   └── components/APIProviderConfig.tsx (API提供商配置)
│
└── 适配器层 (桥接)
    ├── adapters/AIServiceAdapter.ts (AI服务适配器)
    ├── adapters/ConfigAdapter.ts (配置适配器)
    └── adapters/ExportAdapter.ts (导出适配器)
```

### 植入策略

1. **非侵入式植入**: 新功能作为独立模块植入，不修改现有代码
2. **适配器模式**: 通过适配器桥接新旧系统
3. **配置扩展**: 扩展现有配置系统支持新的API提供商
4. **组件复用**: 复用现有UI组件和样式系统

## Components and Interfaces

### 1. 神马API服务植入

#### ShenmaService.ts
```typescript
export class ShenmaService {
  private config: ProviderConfig;
  
  // 对话模型调用
  async generateText(prompt: string, options?: TextOptions): Promise<string>
  
  // nano-banana图像生成
  async generateImage(prompt: string, options?: ImageOptions): Promise<string>
  
  // sora2视频生成
  async generateVideo(prompt: string, options?: VideoOptions): Promise<string>
  
  // 连接测试
  async testConnection(): Promise<boolean>
}
```

#### 植入位置
- 文件路径: `services/shenmaService.ts`
- 从备份项目复制相关的神马API调用逻辑
- 适配现有的ProviderSettings接口

### 2. 智谱完整服务植入

#### ZhipuService.ts植入
```typescript
// 直接从备份项目植入完整的zhipuService.ts
export default class ZhipuService {
  // GLM-4-Flash文本生成
  async generateText(prompt: string, options?: ZhipuTextOptions): Promise<string>
  
  // GLM-4V-Flash图像分析
  async analyzeImage(imageUrl: string, prompt: string, options?: ZhipuVisionOptions): Promise<string>
  
  // CogView-3-Flash图像生成
  async generateImage(prompt: string, options?: ZhipuImageOptions): Promise<string>
  
  // CogVideoX-Flash视频生成
  async generateVideo(prompt: string, options?: ZhipuVideoOptions): Promise<{taskId: string; status: string}>
  
  // 视频状态查询和轮询
  async getVideoStatus(taskId: string): Promise<VideoStatusResponse>
  startPolling(taskId: string, callbacks: PollingCallbacks): void
}
```

#### 植入位置
- 文件路径: `services/zhipuService.ts`
- 完整复制备份项目的zhipuService.ts文件
- 保持所有智谱模型和功能不变

### 3. 批量视频处理植入

#### BatchProcessor.ts植入
```typescript
// 从备份项目植入批量处理逻辑
export class BatchProcessor {
  private items: VideoItem[] = [];
  private config: BatchConfig;
  
  // 添加批量任务
  addBatchItems(blocks: Block[]): void
  
  // 开始批量处理
  async startBatchProcessing(): Promise<void>
  
  // 暂停/恢复处理
  pauseProcessing(): void
  resumeProcessing(): void
  
  // 获取处理状态
  getProcessingStatus(): BatchGenerationState
}
```

#### VideoStatusManager.ts植入
```typescript
// 从备份项目植入视频状态管理
export class VideoStatusManager {
  private videoItems: Map<string, VideoItem> = new Map();
  
  // 添加视频任务
  addVideoTask(task: VideoItem): void
  
  // 更新任务状态
  updateTaskStatus(taskId: string, status: VideoStatus): void
  
  // 获取任务状态
  getTaskStatus(taskId: string): VideoItem | undefined
}
```

#### 植入位置
- 文件路径: `services/BatchProcessor.ts`
- 文件路径: `services/VideoStatusManager.ts`
- 完整复制备份项目的批量处理逻辑

### 4. 分镜导出功能植入

#### ExportService.ts植入
```typescript
export class ExportService {
  // 导出布局配置
  private layouts: ExportLayout[] = ['2x2', '2x3', '3x3', '4x3', 'main-2x2', 'main-2x3'];
  
  // 导出分镜图
  async exportStoryboard(blocks: Block[], layout: ExportLayout): Promise<string>
  
  // 生成布局网格
  private generateLayoutGrid(blocks: Block[], layout: ExportLayout): LayoutGrid
  
  // 渲染到画布
  private renderToCanvas(grid: LayoutGrid): Promise<HTMLCanvasElement>
}
```

#### 植入位置
- 文件路径: `services/ExportService.ts`
- 从备份项目复制导出相关逻辑
- 添加html2canvas依赖到package.json

### 5. UI组件植入

#### BatchVideoPanel.tsx
```typescript
// 批量视频处理面板
export const BatchVideoPanel: React.FC<{
  selectedBlocks: Block[];
  onStartBatch: (config: BatchConfig) => void;
}> = ({ selectedBlocks, onStartBatch }) => {
  // 使用现有的UI组件和样式
  // 保持amber配色方案
}
```

#### ExportLayoutSelector.tsx
```typescript
// 导出布局选择器
export const ExportLayoutSelector: React.FC<{
  blocks: Block[];
  onExport: (layout: ExportLayout) => void;
}> = ({ blocks, onExport }) => {
  // 使用现有的模态框样式
  // 保持现有的设计语言
}
```

## Data Models

### 扩展现有类型定义

```typescript
// 扩展现有的ProviderType
export type ProviderType = 'google' | 'openai-compatible' | 'zhipu' | 'shenma';

// 扩展现有的ModelConfig
export interface ModelConfig {
  text: ProviderSettings;
  image: ProviderSettings;
  video: ProviderSettings;
  // 新增智谱专用配置
  zhipu?: {
    textModel: string;
    visionModel: string;
    imageModel: string;
    videoModel: string;
  };
  // 新增神马专用配置
  shenma?: {
    chatModel: string;
    imageModel: string;
    videoModel: string;
  };
}

// 从备份项目植入的类型
export interface VideoItem {
  id: string;
  taskId: string;
  sceneId?: string;
  prompt: string;
  videoPrompt?: string;
  visualPrompt?: string;
  status: 'loading' | 'completed' | 'failed' | 'pending' | 'generating';
  progress: number;
  videoUrl?: string;
  error?: string;
  // ... 其他字段从备份项目完整复制
}

export interface BatchConfig {
  videoDuration: number;
  processingInterval: number;
  aspectRatio: string;
  referenceImageUrl?: string;
  downloadPath?: string;
  maxRetries?: number;
  retryDelay?: number;
  enableNotifications?: boolean;
}

export type ExportLayout = '2x2' | '2x3' | '3x3' | '4x3' | 'main-2x2' | 'main-2x3' | 'main-3x3' | 'main-4x3';
```

## 接口适配设计

### AIServiceAdapter.ts
```typescript
export class AIServiceAdapter {
  private zhipuService: ZhipuService;
  private shenmaService: ShenmaService;
  private originalService: AIService;
  
  constructor() {
    this.originalService = aiService; // 保持现有服务不变
    this.zhipuService = new ZhipuService(this.getZhipuConfig());
    this.shenmaService = new ShenmaService(this.getShenmaConfig());
  }
  
  // 扩展文本生成，支持多提供商
  async generateText(contents: any, settings: ProviderSettings): Promise<string> {
    if (settings.provider === 'zhipu') {
      return this.zhipuService.generateText(this.convertContents(contents));
    } else if (settings.provider === 'shenma') {
      return this.shenmaService.generateText(this.convertContents(contents));
    } else {
      // 保持现有逻辑完全不变
      return this.originalService.generateText(contents, settings);
    }
  }
  
  // 扩展图像生成
  async generateImage(contents: any, settings: ProviderSettings): Promise<string> {
    if (settings.provider === 'zhipu') {
      return this.zhipuService.generateImage(this.convertContents(contents));
    } else if (settings.provider === 'shenma') {
      return this.shenmaService.generateImage(this.convertContents(contents));
    } else {
      // 保持现有逻辑完全不变
      return this.originalService.generateImage(contents, settings);
    }
  }
  
  // 扩展视频生成
  async generateVideo(prompt: string, settings: ProviderSettings): Promise<string> {
    if (settings.provider === 'zhipu') {
      const result = await this.zhipuService.generateVideo(prompt);
      return this.handleAsyncVideo(result.taskId);
    } else if (settings.provider === 'shenma') {
      return this.shenmaService.generateVideo(prompt);
    } else {
      // 保持现有逻辑完全不变
      return this.originalService.generateVideo(prompt, settings);
    }
  }
}
```

## 植入实施计划

### Phase 1: 依赖和类型植入
1. 添加html2canvas依赖到package.json
2. 植入备份项目的types.ts中的相关类型定义
3. 扩展现有types.ts，保持向后兼容

### Phase 2: 服务层植入
1. 植入zhipuService.ts到services目录
2. 创建shenmaService.ts，植入神马API逻辑
3. 植入BatchProcessor.ts和VideoStatusManager.ts
4. 创建ExportService.ts，植入导出逻辑

### Phase 3: 适配器层创建
1. 创建AIServiceAdapter.ts
2. 创建ConfigAdapter.ts处理配置扩展
3. 创建ExportAdapter.ts桥接导出功能

### Phase 4: UI组件植入
1. 植入批量处理相关组件
2. 植入导出布局选择组件
3. 扩展API配置界面

### Phase 5: 集成和测试
1. 在App.tsx中集成适配器
2. 更新现有组件以支持新功能
3. 确保所有现有功能完全不变

## 现有功能保护策略

### 代码保护原则
1. **零修改原则**: 不修改任何现有文件的内容
2. **扩展原则**: 只通过扩展和适配器添加新功能
3. **隔离原则**: 新功能在独立模块中实现
4. **兼容原则**: 保持所有现有接口和行为不变

### 具体保护措施
1. 现有的aiService保持完全不变
2. 现有的组件props和state保持不变
3. 现有的UI布局和样式保持不变
4. 现有的配置格式保持向后兼容
5. 现有的用户交互流程保持不变

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

基于需求分析，以下是系统必须满足的正确性属性：

### Property 1: API服务植入完整性
*For any* 植入的API服务（神马、智谱），调用其任何功能（文本、图像、视频生成）都应该返回有效的结果或明确的错误信息
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 2: 批量处理系统一致性
*For any* 批量视频处理任务集合，系统应该能够正确管理队列、跟踪状态、处理重试，并最终完成所有可完成的任务
**Validates: Requirements 3.1, 3.2, 3.4, 3.5**

### Property 3: 分镜导出功能完整性
*For any* 有效的Block集合和导出布局，系统应该能够生成符合指定布局的高质量分镜图文件
**Validates: Requirements 4.1, 4.2, 4.3, 4.5**

### Property 4: 接口适配兼容性
*For any* 现有的API调用，在植入新服务后应该保持完全相同的输入参数、输出格式和行为
**Validates: Requirements 5.1, 7.2, 7.3**

### Property 5: 现有功能保护完整性
*For any* 现有功能的操作序列，在植入新功能后应该产生与植入前完全相同的结果和界面状态
**Validates: Requirements 7.1, 7.5**

### Property 6: 配置系统向后兼容性
*For any* 现有的配置数据，在扩展配置系统后应该能够正确读取、保存和应用，不影响现有配置的功能
**Validates: Requirements 5.3, 5.5**

## Error Handling

### API错误处理
- 智谱API: 使用备份项目中已验证的错误处理逻辑
- 神马API: 植入备份项目中的重试和降级机制
- 批量处理: 植入备份项目中的任务恢复和错误记录

### 用户反馈
- 保持现有的错误提示样式和位置
- 新功能的错误提示使用相同的设计语言
- 提供清晰的操作指导和恢复建议

## Testing Strategy

### 双重测试方法
本项目将采用单元测试和基于属性的测试相结合的方法：

**单元测试**用于验证：
- 特定的API配置示例和错误情况
- 导出布局的具体示例（如2x2、3x3布局）
- 界面集成的具体场景
- 边界条件和错误处理

**基于属性的测试**用于验证：
- API服务在各种输入下的通用行为
- 批量处理系统的整体一致性
- 现有功能的完整保护
- 配置系统的兼容性

### 基于属性的测试配置
- 每个属性测试最少运行100次迭代
- 使用fast-check库进行属性测试
- 每个测试标记格式：**Feature: api-configuration-integration, Property {number}: {property_text}**

### 测试覆盖范围
1. **功能验证测试**: 验证所有植入的API服务正常工作
2. **兼容性测试**: 确保所有现有功能完全不变
3. **界面一致性测试**: 验证新功能使用现有样式系统
4. **集成测试**: 测试新旧功能之间的协作
5. **性能测试**: 确保植入的功能不影响现有性能