#!/bin/bash

# 新项目部署脚本 - Storyboard Master v2
# 用法: ./deploy-new-project.sh

set -e

echo "🚀 开始部署新项目 - Storyboard Master v2"
echo "================================================"

# 检查依赖
echo "📦 检查依赖..."
if ! command -v vercel &> /dev/null; then
    echo "❌ 未找到 Vercel CLI，请先安装："
    echo "   npm install -g vercel"
    exit 1
fi

# 清理旧的构建
echo "🧹 清理旧的构建文件..."
rm -rf dist node_modules/.vite

# 安装依赖
echo "📥 安装依赖..."
npm install

# 构建项目
echo "🔨 构建项目..."
npm run build

# 验证构建
if [ ! -d "dist" ]; then
    echo "❌ 构建失败：dist 目录不存在"
    exit 1
fi

echo "✅ 构建成功"
echo ""

# 部署到 Vercel
echo "🌐 部署到 Vercel..."
echo "项目名称: storyboard-master-v2"
echo ""

# 使用 Vercel CLI 部署
vercel --prod \
    --name storyboard-master-v2 \
    --confirm

echo ""
echo "================================================"
echo "✅ 部署完成！"
echo ""
echo "📍 新项目 URL:"
echo "   https://storyboard-master-v2.vercel.app"
echo ""
echo "📝 后续步骤:"
echo "   1. 访问新项目 URL 验证功能"
echo "   2. 在 Vercel 仪表板配置环境变量"
echo "   3. 测试批量重绘和导出功能"
echo ""
echo "📚 文档:"
echo "   - DEPLOYMENT_NEW_PROJECT.md"
echo "   - BATCH_REDRAW_IMPROVEMENTS.md"
echo "   - TEST_BATCH_REDRAW_EXPORT.md"
echo ""
