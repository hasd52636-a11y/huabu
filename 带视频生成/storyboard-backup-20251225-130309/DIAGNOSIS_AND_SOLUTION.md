# 完整诊断报告：视频生成功能流程问题

## 问题分析

### 1. **核心问题：缺少视频 API 配置入口**

当前应用的问题：
- ✅ 有 `APIConfigDialog.tsx` 组件（用于配置 Sora 2 API）
- ✅ 有 `VideoGenDialog.tsx` 组件（用于生成视频）
- ✅ 有 `VideoService.ts` 类（用于调用视频 API）
- ❌ **但是 KeySelection 组件中没有集成视频 API 配置选项**
- ❌ **设置页面只显示图像生成 API（Gemini、智谱等），没有视频 API 配置**

### 2. **当前流程缺陷**

```
用户打开应用
    ↓
看到 KeySelection 页面（API 配置）
    ↓
只能配置图像生成 API（Gemini、OpenAI 等）
    ↓
无法配置视频 API（Sora 2）
    ↓
即使配置了图像 API，也无法生成视频
    ↓
用户困惑：为什么没有视频生成功能？
```

### 3. **应该的流程**

```
用户打开应用
    ↓
看到 KeySelection 页面
    ↓
选择配置类型：
  - 图像生成 API（Gemini、OpenAI 等）
  - 视频生成 API（Sora 2）
    ↓
配置相应的 API 密钥
    ↓
进入主应用
    ↓
可以生成分镜图片 + 生成视频
```

## 解决方案

### 步骤 1：修改 KeySelection 组件

在 KeySelection 中添加两个标签页：
- **标签 1：图像生成 API**（现有功能）
- **标签 2：视频生成 API**（新增功能）

### 步骤 2：在视频 API 标签中集成 APIConfigDialog

当用户选择"视频生成 API"标签时，显示：
- Base URL 输入框
- API Key 输入框
- 测试连接按钮
- 保存配置按钮

### 步骤 3：修改 App.tsx

在 `handleGenerateVideo` 函数中：
- 检查视频 API 配置是否存在
- 如果不存在，提示用户先配置视频 API
- 如果存在，使用配置调用 VideoService

## 实现细节

### 配置存储位置

**图像生成 API 配置：**
```javascript
localStorage.getItem('director_canvas_api_config')
// 存储格式：
{
  provider: 'gemini' | 'openai' | 'zhipu' | ...,
  apiKey: 'sk-xxx',
  baseUrl: 'https://...',
  llmModel: 'gpt-4o',
  imageModel: 'dall-e-3'
}
```

**视频生成 API 配置：**
```javascript
localStorage.getItem('director_canvas_video_config')
// 存储格式：
{
  baseUrl: 'https://api.xxx.com',
  apiKey: 'sk-xxx'
}
```

### 用户操作流程

#### 首次使用（无任何配置）

1. 打开应用 → 看到 KeySelection 页面
2. 选择"图像生成"标签
3. 选择 AI 服务商（Gemini、OpenAI 等）
4. 输入 API Key 和模型名称
5. 点击"测试连接"验证
6. 点击"保存"
7. 选择"视频生成"标签
8. 输入 Sora 2 API 的 Base URL 和 API Key
9. 点击"测试连接"验证
10. 点击"保存"
11. 点击"完成"进入主应用

#### 使用应用生成分镜

1. 输入剧本或创意描述
2. 点击"生成分镜"
3. 系统使用配置的图像生成 API 生成分镜图片

#### 使用应用生成视频

1. 选择分镜图片
2. 点击"生成视频"
3. 输入视频提示词
4. 点击"生成"
5. 系统使用配置的视频 API 生成视频

## 关键代码位置

### 需要修改的文件

1. **components/KeySelection.tsx**
   - 添加标签页切换（图像 API / 视频 API）
   - 在视频 API 标签中集成 APIConfigDialog 的逻辑

2. **App.tsx**
   - 修改 `handleGenerateVideo` 函数
   - 添加视频 API 配置检查

3. **components/APIConfigDialog.tsx**
   - 可复用，无需修改

4. **videoService.ts**
   - 可复用，无需修改

## 用户体验改进

### 当前问题
- 用户不知道如何配置视频 API
- 设置页面没有视频 API 选项
- 点击"生成视频"时才发现没有配置

### 改进后
- 首次打开应用时，清晰地看到两个配置选项
- 可以分别配置图像和视频 API
- 每个 API 都有独立的测试按钮
- 配置完成后才能进入主应用
- 用户体验更清晰、更直观

## 实现优先级

### 必须实现
1. ✅ 在 KeySelection 中添加视频 API 配置选项
2. ✅ 修改 App.tsx 中的 handleGenerateVideo 检查逻辑
3. ✅ 添加视频 API 配置验证

### 可选优化
1. 添加配置修改功能（在主应用中修改 API 配置）
2. 添加配置导入/导出功能
3. 添加多个 API 配置的切换功能

## 总结

**问题根源**：设置页面没有视频 API 配置入口

**解决方案**：在 KeySelection 组件中添加视频 API 配置标签页

**预期效果**：用户可以清晰地配置图像和视频 API，然后使用完整的分镜生成和视频生成功能
