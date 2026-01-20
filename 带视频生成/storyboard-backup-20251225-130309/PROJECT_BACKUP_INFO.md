# 分镜大师 - 项目备份信息

## 备份时间
2025年12月23日 21:11:33

## 备份内容

### 核心文件
- `App.tsx` - 主应用组件
- `index.tsx` - 入口文件
- `index.html` - HTML模板
- `types.ts` - TypeScript类型定义
- `geminiService.ts` - Gemini API服务

### 配置文件
- `package.json` - 项目依赖配置
- `package-lock.json` - 依赖锁定文件
- `tsconfig.json` - TypeScript配置
- `vite.config.ts` - Vite构建配置
- `vercel.json` - Vercel部署配置
- `.env.local` - 环境变量

### 资源文件
- `helpContent.json` - 帮助内容
- `metadata.json` - 元数据
- `public/` - 公共资源目录
- `components/` - React组件目录

## 最新修复列表

| 修复 | 问题 | 状态 |
|------|------|------|
| 1 | 导出缺少分镜验证 | ✅ 完成 |
| 2 | 右键菜单位置偏离 | ✅ 完成 |
| 3 | 生成按钮响应延迟 | ✅ 完成 |
| 4 | 导出分镜图缺失 | ✅ 完成 |
| 5 | 提示词格式过于复杂 | ✅ 完成 |
| 6 | 全局参数重复出现 | ✅ 完成 |
| 7 | 全局参数代码冗余 | ✅ 完成 |

## 部署信息

**生产URL**: https://sora.wboke.com
**备用URL**: https://storyboard-master-hztc3lf9o-hanjiangs-projects-bee54024.vercel.app
**最后部署**: 2025年12月23日

## 恢复步骤

1. 解压备份文件
2. 运行 `npm install` 安装依赖
3. 运行 `npm run build` 构建项目
4. 运行 `npm run preview` 本地预览
5. 运行 `vercel --prod` 部署到Vercel

## 关键改动

### 提示词格式优化
- 场景编号只出现一次：`【SC-01】`
- 全局参数和约束条件只在全局指令中出现
- 每个分镜只包含：场景编号、画面描述、摄像机语言

### 导出功能修复
- 移除了对不存在代理API的依赖
- 改进了图片加载错误处理
- 确保所有分镜图像正确显示

### 代码优化
- 移除了冗余的全局参数构建
- 简化了提示词生成逻辑
- 改进了代码可维护性

## 文件大小

- 备份包: 0.1 MB (源代码)
- 完整项目(含node_modules): ~500 MB
- 构建输出(dist): ~2 MB

## 注意事项

- 备份不包含 `node_modules` 目录（可通过 `npm install` 恢复）
- 备份不包含 `.git` 目录（版本控制信息）
- 备份不包含 `.vercel` 目录（Vercel缓存）
- 环境变量已包含在 `.env.local` 中

## 联系方式

如有问题，请参考：
- FIXES_SUMMARY.md - 修复详情
- DEPLOYMENT_GUIDE.md - 部署指南
- README.md - 项目说明
