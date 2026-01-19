# 🚀 AUTO CANVAS - Vercel 部署说明

## 快速部署步骤

### 方法1: Vercel CLI (推荐)
```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel

# 4. 按提示配置项目
```

### 方法2: 拖拽部署
1. 构建项目: `npm run build`
2. 访问 https://vercel.com/dashboard
3. 拖拽 `dist` 文件夹到页面

### 方法3: ZIP 上传
1. 运行: `npm run build`
2. 压缩项目: `zip -r auto-canvas.zip . -x node_modules/\*`
3. 在 Vercel 控制台上传 ZIP

## 环境变量配置

在 Vercel 项目设置中添加:
- `GEMINI_API_KEY`: 你的 Gemini API 密钥
- `NODE_ENV`: production

## 功能特性

✅ 语音指令系统 ("曹操"唤醒)
✅ 智能指令学习
✅ 多模态内容生成
✅ 画布工作流
✅ 用户反馈收集

## 使用说明

1. 点击右侧输入框的🎤按钮
2. 说"曹操，帮我写段文字"
3. 系统自动创建内容块
4. 享受智能语音创作！

部署完成后访问你的域名即可使用。