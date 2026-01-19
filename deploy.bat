@echo off
echo 🚀 AUTO CANVAS 自动部署脚本
echo.

echo 📋 检查 Vercel CLI...
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI 未安装，正在安装...
    npm install -g vercel
    if %errorlevel% neq 0 (
        echo ❌ 安装失败，请手动运行: npm install -g vercel
        pause
        exit /b 1
    )
    echo ✅ Vercel CLI 安装完成
) else (
    echo ✅ Vercel CLI 已安装
)

echo.
echo 🔨 构建项目...
npm run build
if %errorlevel% neq 0 (
    echo ❌ 构建失败
    pause
    exit /b 1
)
echo ✅ 构建完成

echo.
echo 🚀 开始部署到 Vercel...
echo 提示：首次部署需要登录 Vercel 账户
vercel --prod
if %errorlevel% neq 0 (
    echo ❌ 部署失败
    pause
    exit /b 1
)

echo.
echo 🎉 部署完成！
echo.
echo 📋 重要提醒：
echo 1. 请在 Vercel 控制台添加环境变量 GEMINI_API_KEY
echo 2. 访问你的域名测试语音功能
echo 3. 说"曹操，帮我写段文字"开始使用
echo.
pause