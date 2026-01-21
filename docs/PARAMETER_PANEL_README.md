# 智能参数面板系统

一个功能完整的参数配置界面，专为图像和视频生成模型设计，提供统一的参数管理体验。

## 🌟 主要特性

- **🎨 紫色主题设计** - 统一的 violet-500 主色调
- **📱 响应式布局** - 适配各种屏幕尺寸
- **🌐 多语言支持** - 中文/英文切换
- **🔧 模型感知** - 根据不同模型动态调整参数
- **✅ 实时验证** - 参数输入时即时验证反馈
- **💾 预设管理** - 保存和加载常用参数配置
- **🚨 错误处理** - 完善的错误边界和通知系统
- **♿ 无障碍访问** - 完整的键盘导航和屏幕阅读器支持

## 📦 组件架构

### 核心组件

- **ParameterPanel** - 主要的模态框组件
- **TabManager** - 图像/视频标签切换管理
- **ParameterControls** - 动态参数控件渲染
- **PresetManager** - 预设管理界面

### 集成组件

- **ModelParameterIntegration** - 模型选择器集成
- **ErrorBoundary** - 错误边界处理
- **NotificationSystem** - 通知系统

### 服务层

- **ModelConfigService** - 模型配置和参数检测
- **ParameterValidationService** - 参数验证服务
- **PresetStorageService** - 预设存储服务

## 🚀 快速开始

### 1. 基本使用

```tsx
import { ParameterPanel } from './components';
import { GenerationParameters } from './types';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [parameters, setParameters] = useState<GenerationParameters>({
    prompt: ''
  });

  const handleParametersChange = (newParameters: GenerationParameters) => {
    setParameters(newParameters);
    // 调用生成API
    generateContent(newParameters);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        打开参数面板
      </button>
      
      <ParameterPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        selectedModel="nano-banana-hd"
        generationType="image"
        onParametersChange={handleParametersChange}
        initialParameters={parameters}
        theme="light"
        lang="zh"
      />
    </>
  );
}
```

### 2. 与模型选择器集成

```tsx
import { ModelParameterIntegration } from './components';

function ModelIntegrationExample() {
  const [modelConfig, setModelConfig] = useState(/* 模型配置 */);
  const [selectedModel, setSelectedModel] = useState('nano-banana-hd');

  return (
    <ModelParameterIntegration
      generationType="image"
      modelConfig={modelConfig}
      selectedModelId={selectedModel}
      onModelSelect={setSelectedModel}
      onParametersChange={handleGeneration}
      theme="light"
      lang="zh"
    />
  );
}
```

### 3. 错误处理和通知

```tsx
import { ErrorBoundary, NotificationSystem, useNotifications } from './components';

function AppWithErrorHandling() {
  const { notifications, removeNotification, showSuccess, showError } = useNotifications();

  return (
    <ErrorBoundary lang="zh">
      <div className="app">
        {/* 你的应用内容 */}
        
        <NotificationSystem
          notifications={notifications}
          onRemove={removeNotification}
          position="top-right"
          lang="zh"
        />
      </div>
    </ErrorBoundary>
  );
}
```

## 🎛️ 参数类型

### GenerationParameters

```typescript
interface GenerationParameters {
  // 通用参数
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  
  // 图像参数
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '4:5' | '5:4' | '2:3' | '3:2' | '21:9';
  imageSize?: '1K' | '2K' | '4K';
  guidanceScale?: number;
  steps?: number;
  referenceImage?: File | string;
  
  // 视频参数
  duration?: '10' | '15' | '25';
  fps?: number;
  motionStrength?: number;
  cameraMovement?: 'static' | 'pan' | 'zoom' | 'rotate';
  referenceVideo?: File | string;
  
  // 自定义参数
  customParameters?: Record<string, any>;
}
```

### ModelParameter

```typescript
interface ModelParameter {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'file' | 'range';
  defaultValue: any;
  required: boolean;
  validation: ParameterValidation;
  description?: string;
  category?: string;
  advanced?: boolean;
}
```

## 🎨 主题定制

系统使用 CSS 变量和类名来实现主题定制：

```css
/* 主要颜色 */
--violet-500: #8b5cf6;
--violet-600: #7c3aed;
--violet-700: #6d28d9;

/* 主题类名 */
.btn-violet-primary { /* 主要按钮样式 */ }
.slider-violet { /* 滑块样式 */ }
.tab-violet-active { /* 激活标签样式 */ }
```

## 📱 响应式设计

- **桌面端** (≥1024px): 三列布局，完整功能
- **平板端** (768px-1023px): 两列布局，紧凑显示
- **移动端** (<768px): 单列布局，触摸优化

## ♿ 无障碍支持

- **键盘导航**: 完整的 Tab 键导航支持
- **屏幕阅读器**: ARIA 标签和语义化 HTML
- **焦点管理**: 模态框打开/关闭时的焦点处理
- **高对比度**: 支持高对比度模式
- **减少动画**: 支持减少动画偏好设置

## 🔧 配置选项

### 模型配置

```typescript
const modelConfig: NewModelConfig = {
  providers: {
    shenma: {
      apiKey: 'your-api-key',
      baseUrl: 'https://hk-api.gptbest.vip',
      enabled: true
    }
  },
  image: {
    provider: 'shenma',
    modelId: 'nano-banana-hd'
  },
  video: {
    provider: 'shenma',
    modelId: 'sora_video2'
  }
};
```

### 验证规则

```typescript
const validation: ParameterValidation = {
  min: 1,
  max: 2000,
  required: true,
  pattern: '^[\\s\\S]*$',
  fileTypes: ['image/jpeg', 'image/png'],
  maxFileSize: 10 * 1024 * 1024 // 10MB
};
```

## 🧪 测试

系统包含完整的测试套件：

- **单元测试**: 组件功能测试
- **属性测试**: 使用 fast-check 进行属性验证
- **集成测试**: 端到端工作流测试

```bash
# 运行测试
npm test

# 运行属性测试
npm run test:property

# 生成覆盖率报告
npm run test:coverage
```

## 📚 API 参考

详细的 API 文档请参考：

- [ParameterPanel API](./api/ParameterPanel.md)
- [ModelConfigService API](./api/ModelConfigService.md)
- [ParameterValidationService API](./api/ParameterValidationService.md)
- [PresetStorageService API](./api/PresetStorageService.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Tailwind CSS](https://tailwindcss.com/) - 样式框架
- [Lucide React](https://lucide.dev/) - 图标库
- [fast-check](https://fast-check.dev/) - 属性测试库
- [Vitest](https://vitest.dev/) - 测试框架