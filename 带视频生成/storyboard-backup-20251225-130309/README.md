<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 分镜大师 - AI 智能分镜创作平台

Storyboard Master - AI-Powered Storyboarding Platform

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## 🎬 功能特性

- **🤖 AI 智能生成**：支持 Gemini、OpenAI、智谱等多个 AI 模型
- **📐 动态比例**：支持 7 种画面比例（16:9、9:16、21:9、1:1 等）
- **🎨 多种风格**：电影、科幻、赛博朋克、水墨、动漫等 11 种风格
- **📝 双模式生成**：剧本生成 + 创意对话
- **🎯 参考主体**：保持角色一致性
- **📸 智能导出**：自动生成分镜合成图
- **🌙 深浅主题**：支持深色/浅色模式
- **🌍 多语言**：中文/English

## 🚀 快速开始

### 前置要求
- Node.js 16+
- 任意 AI 服务的 API Key（Gemini、OpenAI、智谱等）

### 本地运行

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置 API**
   - 编辑 `.env.local` 文件
   - 设置 `GEMINI_API_KEY` 或其他 AI 服务的 API Key

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **打开浏览器**
   - 访问 `http://localhost:5173`

## 📐 画面比例功能

### 支持的比例

| 比例 | 用途 | 示例 |
|------|------|------|
| **16:9** | 电影、电视、YouTube | 标准宽屏 |
| **9:16** | 短视频、手机 | TikTok、抖音 |
| **21:9** | 电影级效果 | 超宽屏 |
| **1:1** | 社交媒体 | Instagram、微博 |
| **4:3** | 演讲、教学 | 传统比例 |
| **4:5** | 特定平台 | Pinterest |
| **3:2** | 创意需求 | 其他格式 |

### 使用示例

#### 生成电影分镜（16:9）
```
1. 切换到"剧本生成"
2. 输入电影剧本
3. 选择比例：16:9
4. 点击"开始生成"
```

#### 生成手机短视频（9:16）
```
1. 切换到"创意对话"
2. 输入创意想法
3. 选择比例：9:16
4. 点击"生成分镜"
```

#### 混合比例工作流
```
1. 生成一组 16:9 的分镜（电影用）
2. 再生成一组 9:16 的分镜（手机用）
3. 分别导出不同比例的分镜
```

**⚠️ 重要**：导出时所有分镜必须是同一比例

### 详细指南

查看 [ASPECT_RATIO_USAGE_GUIDE.md](./ASPECT_RATIO_USAGE_GUIDE.md) 了解完整的比例功能使用说明。

## 📖 使用说明

### 两种生成模式

#### 1️⃣ 剧本生成模式
- 适合有完整脚本的情况
- 输入剧本 → 选择参数 → 自动生成分镜
- 支持参考主体保持角色一致性

#### 2️⃣ 创意对话模式
- 适合逐步构思的情况
- 与 AI 对话 → 完善细节 → 生成分镜
- 支持多轮对话融合

### 核心功能

- **参考主体**：上传角色图片，保持生成分镜中的角色一致
- **风格选择**：11 种预设风格，满足不同创意需求
- **颜色模式**：彩色/黑白素描，适应不同工作阶段
- **分镜编辑**：拖拽、缩放、重绘、克隆等操作
- **智能导出**：自动排版、编号、合成为 JPEG

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+A` | 全选所有分镜 |
| `Shift+点击` | 逐个选择分镜 |
| `鼠标框选` | 框选多张分镜 |
| `Ctrl+滚轮` | 缩放画布 |

## 🔧 API 配置

### 支持的 AI 服务

- **Gemini**（推荐）：官方高性能引擎
- **OpenAI**：GPT-4o + DALL-E-3
- **智谱 AI**：ChatGLM + CogView
- **通义千问**：Qwen + 通义万相
- **DeepSeek**：DeepSeek Chat
- **自定义**：任何 OpenAI 兼容的 API

### 配置步骤

1. 启动应用后进入设置
2. 选择 AI 服务商
3. 输入 API Key 和模型名称
4. 点击 Test 验证配置
5. 保存配置

## 📦 部署

### 部署到 Vercel

```bash
vercel deploy
```

### 部署到其他平台

```bash
npm run build
# 将 dist 文件夹部署到任何静态托管服务
```

## 🎨 自定义

### 修改风格

编辑 `types.ts` 中的 `STYLES` 数组：

```typescript
export const STYLES: StyleOption[] = [
  { 
    id: 'custom', 
    name: 'Custom Style', 
    nameZh: '自定义风格',
    color: '#FF0000',
    description: 'Your description',
    descriptionZh: '你的描述'
  },
  // ... 更多风格
];
```

### 修改比例

编辑 `types.ts` 中的 `AspectRatio` 类型：

```typescript
export type AspectRatio = '16:9' | '4:3' | '9:16' | '1:1' | '21:9' | '4:5' | '3:2' | '你的比例';
```

## 🐛 常见问题

**Q: 为什么导出时提示"分镜必须是同一个比例"？**  
A: 系统要求导出的所有分镜使用同一比例。如果混合了不同比例，需要分别导出。

**Q: 如何在同一画布中混合不同比例？**  
A: 完全支持！画布可以包含多个比例的分镜，但导出时必须选择同一比例。

**Q: 调整分镜大小时，比例会改变吗？**  
A: 不会。系统会自动保持原有的比例。

**Q: 如何为不同平台生成分镜？**  
A: 根据平台选择对应的比例：YouTube(16:9)、TikTok(9:16)、Instagram(1:1) 等。

更多问题请查看应用内的完整使用说明。

## 📚 文档

- [完整使用指南](./ASPECT_RATIO_USAGE_GUIDE.md) - 详细的功能说明和使用案例
- [API 配置指南](./components/KeySelection.tsx) - 在应用内点击 ? 查看

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [AI Studio](https://ai.studio/apps/drive/1wkj1Wo9G2rTr2nQ8UPbb3VheY-hoIFap)
- [Gemini API 文档](https://ai.google.dev/gemini-api/docs)
- [OpenAI API 文档](https://platform.openai.com/docs)
