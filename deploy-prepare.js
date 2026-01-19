#!/usr/bin/env node

/**
 * Vercel 部署准备脚本
 * 自动检查和准备部署所需的文件
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 准备 Vercel 部署...\n');

// 检查必要文件
const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'index.html',
  'App.tsx'
];

console.log('📋 检查必要文件:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 缺失!`);
  }
});

// 检查环境变量文件
console.log('\n🔐 检查环境变量:');
if (fs.existsSync('.env.local')) {
  console.log('✅ .env.local 存在');
  const envContent = fs.readFileSync('.env.local', 'utf8');
  if (envContent.includes('GEMINI_API_KEY')) {
    console.log('✅ GEMINI_API_KEY 已配置');
  } else {
    console.log('⚠️  GEMINI_API_KEY 未找到');
  }
} else {
  console.log('⚠️  .env.local 不存在，请创建并添加 API 密钥');
}

// 检查构建配置
console.log('\n⚙️  检查构建配置:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.scripts && packageJson.scripts.build) {
  console.log('✅ 构建脚本已配置');
} else {
  console.log('❌ 构建脚本缺失');
}

// 创建 .vercelignore 文件
console.log('\n📝 创建 .vercelignore:');
const vercelIgnore = `
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Temporary files
.tmp/
.cache/

# Git
.git/
.gitignore

# Documentation (optional)
*.md
docs/
`;

fs.writeFileSync('.vercelignore', vercelIgnore.trim());
console.log('✅ .vercelignore 已创建');

// 创建部署说明
console.log('\n📖 创建部署说明:');
const deployInstructions = `
# 🚀 AUTO CANVAS - Vercel 部署说明

## 快速部署步骤

### 方法1: Vercel CLI (推荐)
\`\`\`bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel

# 4. 按提示配置项目
\`\`\`

### 方法2: 拖拽部署
1. 构建项目: \`npm run build\`
2. 访问 https://vercel.com/dashboard
3. 拖拽 \`dist\` 文件夹到页面

### 方法3: ZIP 上传
1. 运行: \`npm run build\`
2. 压缩项目: \`zip -r auto-canvas.zip . -x node_modules/\\*\`
3. 在 Vercel 控制台上传 ZIP

## 环境变量配置

在 Vercel 项目设置中添加:
- \`GEMINI_API_KEY\`: 你的 Gemini API 密钥
- \`NODE_ENV\`: production

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
`;

fs.writeFileSync('DEPLOY.md', deployInstructions.trim());
console.log('✅ DEPLOY.md 已创建');

console.log('\n🎉 部署准备完成！');
console.log('\n📋 下一步操作:');
console.log('1. 确保 .env.local 包含 GEMINI_API_KEY');
console.log('2. 运行: npm run build (测试构建)');
console.log('3. 运行: vercel (开始部署)');
console.log('4. 在 Vercel 控制台配置环境变量');
console.log('\n🚀 准备就绪，可以部署了！');