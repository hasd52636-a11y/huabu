# 部署指南 - 分镜大师

## 快速部署到 Vercel

### 方法 1: 通过 Git 推送 (推荐)

```bash
# 1. 初始化 Git 仓库（如果还没有）
git init

# 2. 添加所有文件
git add .

# 3. 提交更改
git commit -m "Fix: 修复分镜导出和右键菜单位置问题"

# 4. 添加远程仓库
git remote add origin https://github.com/your-username/your-repo.git

# 5. 推送到 GitHub
git push -u origin main
```

Vercel 会自动检测到推送并进行部署。

---

### 方法 2: 使用 Vercel CLI

```bash
# 1. 安装 Vercel CLI（如果还没有）
npm install -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署到生产环境
vercel --prod
```

---

### 方法 3: 通过 Vercel 仪表板

1. 登录 [Vercel 仪表板](https://vercel.com/dashboard)
2. 选择你的项目 "storyboard-master"
3. 点击 "Deployments" 标签
4. 点击 "Redeploy" 按钮
5. 选择最新的提交
6. 点击 "Redeploy"

---

## 部署前检查清单

- [ ] 本地构建成功: `npm run build`
- [ ] 本地预览正常: `npm run preview`
- [ ] 所有修改已保存
- [ ] 没有未提交的更改

---

## 部署后验证

部署完成后，请访问你的 Vercel 项目 URL 并验证：

### 功能测试

1. **右键菜单位置**
   - [ ] 单选分镜图，右键菜单位置正确
   - [ ] 多选分镜图，右键菜单位置正确
   - [ ] 菜单不会超出屏幕边界

2. **导出功能**
   - [ ] 选择分镜图后，导出 JPEG 按钮可用
   - [ ] 导出的 JPEG 包含所有选中的分镜图
   - [ ] 参考主体（如果选中）显示在左侧
   - [ ] 分镜图显示在右侧，带蓝色边框
   - [ ] 场景编号正确显示

3. **其他功能**
   - [ ] 生成分镜图正常
   - [ ] 编辑提示词正常
   - [ ] 批量重绘正常
   - [ ] 克隆分镜图正常

---

## 环境变量配置

如果需要配置环境变量，在 Vercel 仪表板中：

1. 进入项目设置
2. 选择 "Environment Variables"
3. 添加所需的环境变量

常见的环境变量：
- `VITE_GEMINI_API_KEY` - Google Gemini API 密钥
- `VITE_API_BASE_URL` - API 基础 URL

---

## 故障排除

### 部署失败

**错误**: "Build failed"
- 检查 `npm run build` 是否在本地成功
- 检查 `vercel.json` 配置是否正确
- 查看 Vercel 仪表板中的构建日志

**错误**: "Cannot find module"
- 运行 `npm install` 确保所有依赖已安装
- 检查 `package.json` 中的依赖版本

### 功能不正常

**问题**: 右键菜单位置仍然不对
- 清除浏览器缓存
- 进行硬刷新 (Ctrl+Shift+R 或 Cmd+Shift+R)
- 检查浏览器控制台是否有错误

**问题**: 导出 JPEG 失败
- 检查浏览器控制台中的错误信息
- 确保选择了至少一个分镜图
- 检查网络连接

---

## 回滚部署

如果需要回滚到之前的版本：

1. 在 Vercel 仪表板中进入 "Deployments"
2. 找到之前的部署
3. 点击 "Promote to Production"

---

## 监控和日志

### 查看部署日志

1. 进入 Vercel 仪表板
2. 选择项目
3. 点击最新的部署
4. 查看 "Build Logs" 和 "Runtime Logs"

### 性能监控

Vercel 提供了内置的性能监控：
- 访问 "Analytics" 标签查看性能指标
- 查看 "Deployments" 标签中的部署时间

---

## 常见问题

**Q: 部署需要多长时间？**
A: 通常 1-3 分钟，取决于项目大小和网络速度。

**Q: 可以预览部署前的更改吗？**
A: 可以，Vercel 会为每个推送创建一个预览 URL。

**Q: 如何自动部署？**
A: Vercel 默认在每次推送到主分支时自动部署。

**Q: 如何禁用自动部署？**
A: 在项目设置中的 "Git" 部分配置。

---

## 支持和帮助

- [Vercel 文档](https://vercel.com/docs)
- [Vite 文档](https://vitejs.dev/)
- [React 文档](https://react.dev/)

