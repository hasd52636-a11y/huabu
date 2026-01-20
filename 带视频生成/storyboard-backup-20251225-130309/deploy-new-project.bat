@echo off
REM 新项目部署脚本 - Storyboard Master v2 (Windows)
REM 用法: deploy-new-project.bat

setlocal enabledelayedexpansion

echo.
echo 🚀 开始部署新项目 - Storyboard Master v2
echo ================================================
echo.

REM 检查 Vercel CLI
where vercel >nul 2>nul
if errorlevel 1 (
    echo ❌ 未找到 Vercel CLI，请先安装：
    echo    npm install -g vercel
    pause
    exit /b 1
)

REM 清理旧的构建
echo 🧹 清理旧的构建文件...
if exist dist rmdir /s /q dist
if exist node_modules\.vite rmdir /s /q node_modules\.vite

REM 安装依赖
echo 📥 安装依赖...
call npm install
if errorlevel 1 (
    echo ❌ 安装依赖失败
    pause
    exit /b 1
)

REM 构建项目
echo 🔨 构建项目...
call npm run build
if errorlevel 1 (
    echo ❌ 构建失败
    pause
    exit /b 1
)

REM 验证构建
if not exist dist (
    echo ❌ 构建失败：dist 目录不存在
    pause
    exit /b 1
)

echo ✅ 构建成功
echo.

REM 部署到 Vercel
echo 🌐 部署到 Vercel...
echo 项目名称: storyboard-master-v2
echo.

call vercel --prod --name storyboard-master-v2 --confirm
if errorlevel 1 (
    echo ❌ 部署失败
    pause
    exit /b 1
)

echo.
echo ================================================
echo ✅ 部署完成！
echo.
echo 📍 新项目 URL:
echo    https://storyboard-master-v2.vercel.app
echo.
echo 📝 后续步骤:
echo    1. 访问新项目 URL 验证功能
echo    2. 在 Vercel 仪表板配置环境变量
echo    3. 测试批量重绘和导出功能
echo.
echo 📚 文档:
echo    - DEPLOYMENT_NEW_PROJECT.md
echo    - BATCH_REDRAW_IMPROVEMENTS.md
echo    - TEST_BATCH_REDRAW_EXPORT.md
echo.

pause
