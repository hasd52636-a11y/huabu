<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 曹操画布工作站 - AI多模态创作平台

说曹操，曹操到——这里是曹操画布，您的专业多媒体创作伙伴！💫

曹操画布是一个创新的AI驱动多模态创作平台，集成了语音控制、手势识别和智能画布功能，为用户提供直观的AI内容创作体验。

## ✨ 核心功能

### 🤖 曹操AI助手
- **语音唤醒**: 说"曹操"激活AI助手
- **智能对话**: 自然语言交互
- **多模态控制**: 集中管理语音和手势功能

### 👋 手势控制系统
- **实时识别**: 摄像头手势检测
- **键盘模拟**: 开发测试快捷键
- **视觉反馈**: 实时操作状态显示

### 🎤 语音控制系统
- **唤醒词检测**: "曹操"语音激活
- **指令解析**: 智能语音命令识别
- **实时对话**: 语音交互界面

### 🎨 智能画布
- **无限画布**: 自由缩放和平移
- **多媒体支持**: 文本、图片、视频模块
- **自动布局**: 智能排列算法
- **实时协作**: 多模态同步操作

## 🚀 快速开始

### 环境要求
- Node.js 18+
- 现代浏览器 (Chrome 80+, Firefox 75+, Safari 14+)
- HTTPS环境 (摄像头/麦克风权限要求)

### 安装运行
```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量 (.env.local)
# 获取API密钥：https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_actual_api_key_here

# 3. 启动开发服务器
npm run dev

# 4. 访问应用
# http://localhost:3005
```

### 生产部署
```bash
# 一键部署检查和构建
npm run deploy:ready

# 或分步执行：
npm run build          # 构建生产版本
npm run preview         # 预览构建结果 (端口5000)
vercel --prod          # 部署到Vercel

# Windows用户可使用：
deploy.bat             # 一键部署脚本
```

### API密钥配置
1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 获取Gemini API密钥
3. 配置到 `.env.local` 文件
4. 生产环境在Vercel中配置环境变量

详细配置指南：[API_KEY_SETUP.md](./API_KEY_SETUP.md)

## 🎮 使用指南

### 手势控制快捷键
```
Z → 放大画布     X → 缩小画布
↑ → 上移画布     ↓ → 下移画布  
← → 左移画布     → → 右移画布
R → 重置视角     A → 自动布局
S → 全选模块     C → 清空画布
```

### 语音控制命令
- "曹操 + 指令" - 唤醒并执行
- "生成文字..." - 创建文本内容
- "画一个..." - 生成图片
- "制作视频..." - 创建视频

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI组件**: Tailwind CSS + Lucide Icons
- **AI服务**: Google Gemini API
- **多媒体**: Web Audio API + MediaDevices API
- **状态管理**: React Hooks + Context

## 📱 浏览器支持

| 浏览器 | 版本 | 语音控制 | 手势控制 |
|--------|------|----------|----------|
| Chrome | 80+ | ✅ | ✅ |
| Firefox | 75+ | ✅ | ✅ |
| Safari | 14+ | ✅ | ✅ |
| Edge | 80+ | ✅ | ✅ |

## 📚 完整文档

- [🔑 API密钥配置指南](./API_KEY_SETUP.md) - 详细的API密钥获取和配置步骤
- [🚀 快速部署指南](./QUICK_DEPLOY.md) - 一步步部署到生产环境
- [✅ 部署就绪报告](./DEPLOYMENT_READY.md) - 项目状态和部署检查
- [📋 Vercel部署配置](./VERCEL_DEPLOYMENT_READY.md) - Vercel专用部署指南

## 🎊 特色亮点

- 🎯 **零学习成本**: 自然语音和手势交互
- 🚀 **实时响应**: 毫秒级操作反馈
- 🎨 **创意无限**: 多模态内容创作
- 🔒 **隐私安全**: 本地处理，数据保护
- 📱 **跨平台**: 现代浏览器全支持

## 📄 许可证

MIT License

---

**开始你的AI创作之旅！** 🎉
