# 视频 API 配置集成指南

## 概述

本指南说明如何在 KeySelection 组件中添加视频 API 配置功能。

## 当前状态

- ✅ `APIConfigDialog.tsx` - 视频 API 配置对话框已存在
- ✅ `VideoService.ts` - 视频服务类已实现
- ✅ `VideoGenDialog.tsx` - 视频生成对话框已实现
- ❌ KeySelection 中缺少视频 API 配置入口

## 需要修改的文件

### 1. components/KeySelection.tsx

#### 步骤 1：添加状态变量

在组件顶部的 `useState` 声明中添加：

```typescript
// 标签页状态
const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');

// 视频 API 配置状态
const [videoConfig, setVideoConfig] = useState({
  baseUrl: localStorage.getItem('director_canvas_video_config') 
    ? JSON.parse(localStorage.getItem('director_canvas_video_config') || '{}').baseUrl 
    : '',
  apiKey: localStorage.getItem('director_canvas_video_config')
    ? JSON.parse(localStorage.getItem('director_canvas_video_config') || '{}').apiKey
    : ''
});

// 视频 API 测试状态
const [videoTestStatus, setVideoTestStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
```

#### 步骤 2：添加视频 API 测试函数

在 `runApiTest` 函数后添加：

```typescript
const testVideoConnection = async () => {
  if (!videoConfig.baseUrl || !videoConfig.apiKey) {
    alert(selectedLang === 'zh' ? '请输入 Base URL 和 API Key' : 'Please enter Base URL and API Key');
    return;
  }

  setVideoTestStatus('loading');
  try {
    const response = await fetch(`${videoConfig.baseUrl}/v1/token/quota`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${videoConfig.apiKey}`
      }
    });

    if (response.ok) {
      setVideoTestStatus('success');
      setTimeout(() => setVideoTestStatus('idle'), 3000);
    } else {
      setVideoTestStatus('failed');
      setTimeout(() => setVideoTestStatus('idle'), 3000);
    }
  } catch (e) {
    console.error('Video API test failed:', e);
    setVideoTestStatus('failed');
    setTimeout(() => setVideoTestStatus('idle'), 3000);
  }
};
```

#### 步骤 3：修改 handleSave 函数

找到 `handleSave` 函数，修改为：

```typescript
const handleSave = () => {
  localStorage.setItem('director_canvas_api_config', JSON.stringify(config));
  
  // 保存视频配置
  if (videoConfig.baseUrl && videoConfig.apiKey) {
    localStorage.setItem('director_canvas_video_config', JSON.stringify(videoConfig));
  }
  
  if (onLangChange && selectedLang !== lang) {
    onLangChange(selectedLang);
  }
  if (onThemeChange && selectedTheme !== theme) {
    onThemeChange(selectedTheme);
  }
  onSuccess();
};
```

#### 步骤 4：在 JSX 中添加标签页

在语言和主题设置的 `</div>` 后添加标签页切换：

```jsx
{/* 标签页切换 */}
<div className={`grid grid-cols-2 gap-4 mb-10 pb-10 border-b ${theme === 'dark' ? 'border-white/10' : 'border-zinc-200'}`}>
  <button
    onClick={() => setActiveTab('image')}
    className={`py-3 rounded-xl border font-black uppercase text-xs tracking-widest transition-all ${
      activeTab === 'image'
        ? 'bg-purple-600 border-purple-600 text-white'
        : `${theme === 'dark' ? 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20' : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'}`
    }`}
  >
    🖼️ {selectedLang === 'zh' ? '图像生成 API' : 'Image API'}
  </button>
  <button
    onClick={() => setActiveTab('video')}
    className={`py-3 rounded-xl border font-black uppercase text-xs tracking-widest transition-all ${
      activeTab === 'video'
        ? 'bg-purple-600 border-purple-600 text-white'
        : `${theme === 'dark' ? 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20' : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'}`
    }`}
  >
    🎬 {selectedLang === 'zh' ? '视频生成 API' : 'Video API'}
  </button>
</div>
```

#### 步骤 5：条件渲染内容

将现有的图像 API 配置代码用 `{activeTab === 'image' && (...)}` 包装，然后添加视频 API 配置内容：

```jsx
{/* 图像 API 配置内容 */}
{activeTab === 'image' && (
  <div className="grid grid-cols-2 gap-8">
    {/* 现有的图像 API 配置代码 */}
  </div>
)}

{/* 视频 API 配置内容 */}
{activeTab === 'video' && (
  <div className="space-y-6">
    {/* 视频 API 配置表单 */}
  </div>
)}
```

### 2. App.tsx

修改 `handleGenerateVideo` 函数，添加视频 API 配置检查：

```typescript
const handleGenerateVideo = useCallback(async (prompt: string, options: any) => {
  // 检查视频 API 配置
  const videoConfigStr = localStorage.getItem('director_canvas_video_config');
  if (!videoConfigStr) {
    alert(lang === 'zh' 
      ? '请先配置视频 API。点击左侧设置按钮进行配置。' 
      : 'Please configure Video API first. Click the settings button on the left.');
    return;
  }

  if (!videoServiceRef.current) {
    try {
      const config = JSON.parse(videoConfigStr);
      videoServiceRef.current = new VideoService(config);
    } catch (e) {
      alert(lang === 'zh' ? '视频 API 配置错误' : 'Video API configuration error');
      return;
    }
  }

  // ... 现有代码
}, [items, selectedIds, lang]);
```

## 配置存储格式

### 图像生成 API 配置
```javascript
localStorage.getItem('director_canvas_api_config')
// 格式：
{
  provider: 'gemini' | 'openai' | 'zhipu' | 'custom',
  apiKey: 'sk-xxx',
  baseUrl: 'https://...',
  llmModel: 'gpt-4o',
  imageModel: 'dall-e-3'
}
```

### 视频生成 API 配置
```javascript
localStorage.getItem('director_canvas_video_config')
// 格式：
{
  baseUrl: 'https://api.xxx.com',
  apiKey: 'sk-xxx'
}
```

## 用户流程

### 首次使用

1. 打开应用 → 看到 KeySelection 页面
2. 默认显示"图像生成 API"标签
3. 配置图像生成 API（Gemini、OpenAI 等）
4. 点击"视频生成 API"标签
5. 输入 Sora 2 API 的 Base URL 和 API Key
6. 点击"测试连接"验证
7. 点击"保存"保存配置
8. 点击"完成"进入主应用

### 使用应用

1. 生成分镜图片（使用图像生成 API）
2. 选择分镜图片
3. 点击"生成视频"
4. 系统检查视频 API 配置
5. 如果已配置，打开视频生成对话框
6. 输入视频提示词并生成

## 测试步骤

1. 修改 KeySelection.tsx 添加上述代码
2. 修改 App.tsx 添加视频 API 检查
3. 打开应用，看到两个标签页
4. 配置图像 API 和视频 API
5. 点击"保存"
6. 进入主应用
7. 生成分镜图片
8. 选择分镜，点击"生成视频"
9. 验证视频生成功能

## 常见问题

### Q: 如何修改已保存的视频 API 配置？
A: 点击左侧工具栏的设置按钮，切换到"视频生成 API"标签，修改配置后点击"保存"。

### Q: 视频 API 测试失败怎么办？
A: 检查 Base URL 和 API Key 是否正确，确保网络连接正常。

### Q: 可以同时使用多个视频 API 吗？
A: 当前版本只支持一个视频 API 配置。如需切换，修改配置后重新保存。

## 相关文件

- `components/KeySelection.tsx` - 主配置组件
- `components/APIConfigDialog.tsx` - 视频 API 配置对话框
- `videoService.ts` - 视频服务类
- `App.tsx` - 主应用组件
- `components/VideoGenDialog.tsx` - 视频生成对话框
