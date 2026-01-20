@echo off
echo ========================================
echo 曹操画布工作站 - 生产环境部署脚本
echo ========================================
echo.

echo [1/5] 检查环境...
node --version
npm --version
echo.

echo [2/5] 安装依赖...
npm install
if %errorlevel% neq 0 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)
echo.

echo [3/5] 运行类型检查...
npx tsc --noEmit
if %errorlevel% neq 0 (
    echo 错误: TypeScript类型检查失败
    pause
    exit /b 1
)
echo.

echo [4/5] 构建生产版本...
npm run build
if %errorlevel% neq 0 (
    echo 错误: 构建失败
    pause
    exit /b 1
)
echo.

echo [5/5] 预览构建结果...
echo 构建完成！dist文件夹已生成
echo.
echo 可选操作:
echo - 运行 'npm run preview' 预览构建结果
echo - 运行 'vercel --prod' 部署到Vercel
echo - 或将dist文件夹上传到你的服务器
echo.

echo ========================================
echo 部署准备完成! 🎉
echo ========================================
echo.
echo 重要提醒:
echo 1. 确保生产环境使用HTTPS
echo 2. 配置正确的GEMINI_API_KEY环境变量
echo 3. 测试摄像头和麦克风权限
echo.
pause