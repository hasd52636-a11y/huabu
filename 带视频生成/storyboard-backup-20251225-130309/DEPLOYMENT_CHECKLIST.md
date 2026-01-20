# Vercel 部署检查清单

## 部署前准备

- [x] Git 仓库已初始化
- [x] 初始提交已完成
- [ ] GitHub 账户已准备
- [ ] 代码已推送到 GitHub

## GitHub 推送步骤

```bash
# 1. 创建 GitHub 仓库（在 GitHub 网站上）
# 仓库名称建议: storyboard-master 或 sora2video

# 2. 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 3. 重命名分支为 main
git branch -M main

# 4. 推送代码
git push -u origin main
```

## Vercel 部署步骤

### 1. 访问 Vercel
- [ ] 登录 [vercel.com](https://vercel.com)
- [ ] 进入 Dashboard

### 2. 导入项目
- [ ] 点击 "Add New" → "Project"
- [ ] 选择 "Import Git Repository"
- [ ] 授权 GitHub 访问
- [ ] 选择 `storyboard-master` 仓库

### 3. 配置构建设置
- [ ] Framework: **Vite**
- [ ] Build Command: **npm run build**
- [ ] Output Directory: **dist**
- [ ] Install Command: **npm install**

### 4. 环境变量配置
在 "Environment Variables" 部分添加：

```
VITE_GOOGLE_API_KEY = [你的 Google API 密钥]
VITE_VIDEO_API_KEY = [你的视频 API 密钥]
```

- [ ] 添加所有必要的环境变量
- [ ] 确认变量已保存

### 5. 部署
- [ ] 点击 "Deploy" 按钮
- [ ] 等待构建完成（通常 2-5 分钟）
- [ ] 检查部署日志是否有错误

## 部署后验证

- [ ] 访问 Vercel 提供的 URL
- [ ] 检查应用是否正常加载
- [ ] 测试主要功能
- [ ] 检查控制台是否有错误

## 自动部署配置

- [ ] 确认 "Auto-deploy on push" 已启用
- [ ] 测试：推送一个小改动到 main 分支
- [ ] 验证 Vercel 自动部署新版本

## 常见问题排查

### 构建失败
```bash
# 本地测试构建
npm install
npm run build
```

### 环境变量问题
- 确保变量名以 `VITE_` 开头
- 在 Vercel 中重新部署以应用新变量

### 性能问题
- 检查 Vercel Analytics
- 优化大型资源文件

## 项目 URL

部署完成后，你的项目将在以下 URL 可用：
```
https://[project-name].vercel.app
```

## 后续维护

- 定期检查 Vercel Analytics
- 监控构建日志
- 及时更新依赖包
- 保持 GitHub 仓库同步

