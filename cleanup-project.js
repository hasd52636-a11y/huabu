/**
 * 项目清理脚本 - 删除临时、测试、参考类无用文件
 * 创建干净的生产版本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 需要删除的文件和文件夹
const filesToDelete = [
  // 测试相关文件
  '__tests__',
  'vitest.config.ts',
  
  // 临时和分析文件
  'analyze-modules.mjs',
  'calculate-full-size.js',
  'calculate-module-size.js', 
  'calculate-module-sizes.js',
  'calculate-module-sizes.mjs',
  'vercel-deploy-check.mjs',
  
  // 演示和测试HTML文件
  'app-model-tester.html',
  'caocao-welcome-demo.html',
  'comprehensive-model-tester.html',
  'demo-tag-chip-system.html',
  'image-config-demo.html',
  'model-api-tester.html',
  'model-configuration-tester.html',
  'parameter-disabling-demo.html',
  'parameter-panel-demo.html',
  'purple-theme-demo.html',
  'test-hk-api.html',
  'test-parameter-disabling.html',
  'test-parameter-panel-purple-theme.html',
  'test-tag-chip-system.js',
  
  // 文档和报告文件
  'API_KEY_SETUP.md',
  'API_MODELS_FIX_REPORT.md',
  'DEPLOY.md',
  'DEPLOYMENT_GUIDE.md',
  'FINAL_SYSTEM_CHECK.md',
  'GITHUB_DEPLOYMENT.md',
  'PARAMETER_DISABLING_IMPLEMENTATION.md',
  'PRODUCTION_READY_SUMMARY.md',
  'TAG_CHIP_ENHANCEMENT_SUMMARY.md',
  'VERCEL_DEPLOYMENT_READY.md',
  '报告.txt',
  
  // 部署脚本
  'deploy-production.bat',
  'deploy.bat',
  
  // 开发相关文件夹
  '.trae',
  'api神马大',
  'docs',
  'examples',
  'scripts',
  
  // Kiro specs (开发规范文档)
  '.kiro',
  
  // 构建输出
  'dist'
];

// 删除文件或文件夹的函数
function deleteFileOrFolder(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        // 递归删除文件夹
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`✅ 删除文件夹: ${filePath}`);
      } else {
        // 删除文件
        fs.unlinkSync(filePath);
        console.log(`✅ 删除文件: ${filePath}`);
      }
    } else {
      console.log(`⚠️  文件不存在: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ 删除失败 ${filePath}:`, error.message);
  }
}

// 主清理函数
function cleanupProject() {
  console.log('🧹 开始清理项目...\n');
  
  let deletedCount = 0;
  let skippedCount = 0;
  
  filesToDelete.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    
    if (fs.existsSync(filePath)) {
      deleteFileOrFolder(filePath);
      deletedCount++;
    } else {
      skippedCount++;
    }
  });
  
  console.log('\n🎉 清理完成!');
  console.log(`📊 统计: 删除 ${deletedCount} 项, 跳过 ${skippedCount} 项`);
  console.log('\n✨ 项目现在是干净的生产版本!');
  
  // 显示保留的核心文件结构
  console.log('\n📁 保留的核心文件结构:');
  console.log('├── components/     # React组件');
  console.log('├── services/       # 业务服务');
  console.log('├── hooks/          # React Hooks');
  console.log('├── utils/          # 工具函数');
  console.log('├── types/          # TypeScript类型');
  console.log('├── adapters/       # 适配器');
  console.log('├── contexts/       # React上下文');
  console.log('├── config/         # 配置文件');
  console.log('├── ai/             # AI相关');
  console.log('├── src/            # 源码资源');
  console.log('├── public/         # 静态资源');
  console.log('├── package.json    # 项目配置');
  console.log('├── vite.config.ts  # 构建配置');
  console.log('├── vercel.json     # 部署配置');
  console.log('└── README.md       # 项目说明');
}

// 执行清理
cleanupProject();