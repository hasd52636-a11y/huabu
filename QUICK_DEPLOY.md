# 🚀 快速部署指南

## ⚡ 一键部署流程

### 1. 配置API密钥（必需）
```bash
# 获取Gemini API密钥
# 访问: https://aistudio.google.com/app/apikey

# 编辑 .env.local 文件
# 将 PLACEHOLDER_API_KEY 替换为真实密钥
GEMINI_API_KEY=AIzaSyC-your-actual-api-key-here
```

### 2. 部署前检查
```bash
# 运行部署检查
npm run deploy:check

# 如果检查通过，构建项目
npm run deploy:ready
```

### 3. 部署到Vercel
```bash
# 方法1: 使用Vercel CLI（推荐）
npm i -g vercel
vercel --prod

# 方法2: GitHub集成
# 推送到GitHub，在Vercel控制台连接仓库
```

### 4. 配置生产环境变量
在Vercel项目设置中添加：
- `GEMINI_API_KEY` = 你的API密钥

## 🔍 部署状态检查

### 本地测试
```bash
# 启动预览服务器（端口5000）
npm run preview

# 测试功能：
# 1. 打开 http://localhost:5000
# 2. 点击"曹操"标签页
# 3. 激活语音控制
# 4. 说"曹操，生成一段文字"
# 5. 检查是否正常响应
```

### 生产环境验证
部署完成后，在生产环境测试：
- [ ] 页面正常加载（HTTPS）
- [ ] 摄像头权限请求正常
- [ ] 麦克风权限请求正常
- [ ] 手势控制功能正常（Z/X键）
- [ ] 语音控制功能正常
- [ ] API调用成功（无network错误）

## ⚠️ 常见问题

### API密钥问题
**症状**: 语音控制显示"network"错误
**解决**: 
1. 检查.env.local中的API密钥
2. 确保不是PLACEHOLDER_API_KEY
3. 重启开发服务器

### 权限问题
**症状**: 摄像头/麦克风无法访问
**解决**: 
1. 确保使用HTTPS（生产环境）
2. 在浏览器中允许权限
3. 检查浏览器兼容性

### 构建问题
**症状**: 构建失败或文件缺失
**解决**:
```bash
# 清理并重新构建
rm -rf dist node_modules
npm install
npm run build
```

## 📊 性能预期

### 加载性能
- 首屏加载: < 3秒
- 交互响应: < 100ms
- 手势识别: < 200ms延迟
- 语音识别: < 500ms响应

### 功能特性
- ✅ 多模态交互（语音+手势）
- ✅ 实时AI对话
- ✅ 内容生成（文字/图片/视频）
- ✅ 画布操作控制
- ✅ 响应式设计
- ✅ PWA支持

## 🎯 部署成功标志

当你看到以下情况时，说明部署成功：
1. ✅ 页面在HTTPS下正常加载
2. ✅ 语音控制不再显示"network"错误
3. ✅ 手势控制响应正常
4. ✅ AI对话功能正常工作
5. ✅ 所有画布操作正常

---

**🎉 恭喜！曹操画布工作站已成功部署！**

现在你可以享受完整的多模态AI交互体验了！