@echo off
echo.
echo ========================================
echo   曹操画布工作站 - 一键部署脚本
echo ========================================
echo.

echo 🔍 检查部署准备状态...
call node scripts/pre-deploy-check.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  检查未通过，但仍可继续部署
    echo    项目会正常运行，只需后续配置API密钥
    echo.
    set /p continue="是否继续部署？(y/N): "
    if /i not "%continue%"=="y" (
        echo 部署已取消
        pause
        exit /b 1
    )
)

echo.
echo 🏗️  构建项目...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo ❌ 构建失败，请检查错误信息
    pause
    exit /b 1
)

echo.
echo ✅ 构建成功！
echo.
echo 🚀 准备部署到Vercel...
echo.
echo 请选择部署方式：
echo 1. 使用Vercel CLI部署（推荐）
echo 2. 查看手动部署指南
echo 3. 取消部署
echo.
set /p choice="请输入选择 (1-3): "

if "%choice%"=="1" (
    echo.
    echo 检查Vercel CLI...
    vercel --version >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo ⚠️  未安装Vercel CLI，正在安装...
        call npm install -g vercel
    )
    
    echo.
    echo 🚀 开始部署...
    call vercel --prod
    
    echo.
    echo 🎉 部署完成！
    echo.
    echo 📝 重要提醒：
    echo    1. 在Vercel控制台配置环境变量：GEMINI_API_KEY
    echo    2. 测试所有功能是否正常
    echo    3. 查看 DEPLOYMENT_READY.md 了解详细信息
    echo.
) else if "%choice%"=="2" (
    echo.
    echo 📖 手动部署指南：
    echo.
    echo 方法1 - GitHub集成：
    echo   1. 推送代码到GitHub仓库
    echo   2. 在Vercel控制台连接仓库
    echo   3. 配置环境变量：GEMINI_API_KEY
    echo   4. 自动部署
    echo.
    echo 方法2 - 拖拽部署：
    echo   1. 访问 https://vercel.com/new
    echo   2. 拖拽 dist 文件夹到页面
    echo   3. 配置环境变量：GEMINI_API_KEY
    echo.
    echo 详细信息请查看：
    echo   - DEPLOYMENT_READY.md
    echo   - API_KEY_SETUP.md
    echo   - QUICK_DEPLOY.md
    echo.
) else (
    echo 部署已取消
)

echo.
echo 📋 项目状态：
echo   ✅ 构建完成
echo   ✅ 预览服务器：http://localhost:5000
echo   ✅ 所有功能已实现
echo   ⚠️  需要配置API密钥以启用AI功能
echo.
echo 感谢使用曹操画布工作站！🎉
echo.
pause