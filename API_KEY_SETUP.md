# 🔑 API密钥配置指南

## ❌ 当前问题
语音控制显示"network"错误是因为没有配置有效的API密钥。

## ✅ 快速解决方案

### 🚀 立即配置（推荐）
```bash
# 1. 获取API密钥
# 访问：https://aistudio.google.com/app/apikey
# 登录Google账号，点击"Create API Key"，复制密钥

# 2. 配置密钥
# 编辑 .env.local 文件，替换 PLACEHOLDER_API_KEY 为真实密钥
# 示例：GEMINI_API_KEY=AIzaSyC-your-actual-api-key-here

# 3. 重启服务器
npm run dev
# 或预览模式
npm run preview
```

### 📋 详细步骤

#### 1. 获取Gemini API密钥
1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 登录Google账号
3. 点击"Create API Key"
4. 复制生成的API密钥（格式：AIzaSyC...）

#### 2. 配置API密钥

**开发环境配置：**
编辑项目根目录的 `.env.local` 文件：
```env
# 将下面的 PLACEHOLDER_API_KEY 替换为你的真实API密钥
GEMINI_API_KEY=AIzaSyC-your-actual-api-key-here
```

**生产环境配置（Vercel）：**
在Vercel项目设置中添加环境变量：
- 变量名: `GEMINI_API_KEY`
- 变量值: 你的实际API密钥

#### 3. 重启服务
```bash
# 停止当前服务 (Ctrl+C)
# 重新启动
npm run dev
# 或预览模式（端口5000）
npm run preview
```

## 🔍 验证配置

### 检查API密钥是否生效
1. 打开浏览器开发者工具 (F12)
2. 查看Console标签
3. 应该看到类似信息：
   ```
   [AIServiceAdapter] API密钥已配置: AIza****
   ```

### 测试语音功能
1. 打开"曹操"标签页
2. 激活语音控制（蓝色麦克风按钮）
3. 说"曹操，生成一段文字"
4. 应该正常响应，不再显示network错误

## ⚠️ 重要提醒

### API密钥安全
- ✅ **开发环境**: 使用 `.env.local` (已在.gitignore中)
- ✅ **生产环境**: 使用Vercel环境变量
- ❌ **不要**: 直接写在代码中
- ❌ **不要**: 提交到Git仓库

### API配额管理
- Gemini API有免费配额限制
- 超出配额会显示quota错误
- 建议监控使用量

### 错误排查
如果配置后仍有问题：
1. 检查API密钥格式（应以AIza开头）
2. 确认密钥完整复制（无多余空格）
3. 重启开发服务器
4. 检查浏览器控制台错误信息

## 🚀 配置完成后

配置正确的API密钥后，所有功能将正常工作：
- ✅ 语音控制 - "曹操"唤醒
- ✅ 智能对话 - AI回复
- ✅ 内容生成 - 文字/图片/视频
- ✅ 画布操作 - 多模态交互

---

**⚡ 快速上手：获取API密钥 → 替换.env.local → 重启服务器 → 测试功能！** 🎉