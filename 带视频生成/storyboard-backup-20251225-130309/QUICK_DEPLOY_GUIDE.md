# 快速部署指南 - 5 分钟上线

## 前置条件
- ✅ Git 仓库已初始化
- ✅ 代码已提交
- 需要：GitHub 账户 + Vercel 账户

## 第一步：推送到 GitHub（2 分钟）

```bash
# 1. 在 GitHub 创建新仓库（不要初始化 README）
# 复制仓库 URL

# 2. 在本地添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## 第二步：在 Vercel 部署（3 分钟）

### 方式 A：通过 Vercel CLI（最快）
```bash
npm i -g vercel
vercel
```
按照提示选择：
- 项目目录：`.`
- 框架：`Vite`
- 构建命令：`npm run build`
- 输出目录：`dist`

### 方式 B：通过 Vercel 网站
1. 访问 https://vercel.com/new
2. 选择 GitHub 仓库
3. 点击 Import
4. 配置环境变量（如需要）
5. 点击 Deploy

## 环境变量（如需要）

在 Vercel 项目设置中添加：
```
VITE_GOOGLE_API_KEY=your_key
VITE_VIDEO_API_KEY=your_key
```

## 完成！

你的应用现在已部署到：
```
https://[project-name].vercel.app
```

## 后续更新

每次推送到 main 分支时，Vercel 会自动重新部署：
```bash
git add .
git commit -m "Update"
git push
```

---

**需要帮助？** 查看完整指南：`VERCEL_DEPLOYMENT_GUIDE.md`

