# 快速部署 - Storyboard Master v2

## 一键部署

### Windows
```bash
deploy-new-project.bat
```

### macOS / Linux
```bash
chmod +x deploy-new-project.sh
./deploy-new-project.sh
```

## 手动部署

### 步骤 1: 构建
```bash
npm install
npm run build
```

### 步骤 2: 部署到 Vercel
```bash
vercel --prod --name storyboard-master-v2
```

### 步骤 3: 配置环境变量

在 Vercel 仪表板中：
1. 进入项目设置
2. 找到 "Environment Variables"
3. 添加 `VITE_API_KEY` (可选，用户可在应用中配置)

## 验证部署

部署完成后，访问：
```
https://storyboard-master-v2.vercel.app
```

## 新功能测试

### 批量重绘 (最多 6 张)
1. 生成 3-6 个分镜
2. 选择分镜
3. 点击"批量重绘"
4. 输入指令
5. 提交 → 顺序处理，每张间隔 500ms

### 分镜导出
1. 生成分镜
2. 选择分镜
3. 点击"分镜合成下载"
4. 验证导出的 JPEG 包含所有分镜

## 常见问题

**Q: 如何回到原项目？**
A: 原项目 URL 保持不变，新项目是独立的

**Q: 如何更新新项目？**
A: 推送代码到 main 分支，Vercel 会自动部署

**Q: 如何删除新项目？**
A: 在 Vercel 仪表板中删除项目

---

**部署时间**: ~5-10 分钟
**状态**: ✅ 生产就绪
