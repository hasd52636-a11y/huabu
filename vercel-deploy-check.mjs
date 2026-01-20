#!/usr/bin/env node

/**
 * Vercel部署前检查脚本
 * 验证项目是否符合Vercel部署标准
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Vercel部署标准检查...\n');

// 检查必需文件
const requiredFiles = [
  'package.json',
  'vercel.json', 
  'vite.config.ts',
  'dist/index.html'
];

let allChecksPass = true;

console.log('📁 检查必需文件:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - 缺失`);
    allChecksPass = false;
  }
});

// 检查package.json配置
console.log('\n📦 检查package.json配置:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (packageJson.scripts && packageJson.scripts.build) {
  console.log('  ✅ build脚本存在');
} else {
  console.log('  ❌ build脚本缺失');
  allChecksPass = false;
}

// 检查vercel.json配置
console.log('\n⚙️ 检查vercel.json配置:');
const vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

if (vercelJson.framework === 'vite') {
  console.log('  ✅ framework设置为vite');
} else {
  console.log('  ⚠️ 建议设置framework为vite');
}

if (vercelJson.outputDirectory === 'dist') {
  console.log('  ✅ outputDirectory设置正确');
} else {
  console.log('  ❌ outputDirectory应设置为dist');
  allChecksPass = false;
}

// 检查构建输出
console.log('\n🏗️ 检查构建输出:');
if (fs.existsSync('dist') && fs.existsSync('dist/index.html')) {
  console.log('  ✅ 构建输出存在');
  
  // 检查资源文件
  const distFiles = fs.readdirSync('dist');
  const hasAssets = distFiles.some(file => file.startsWith('assets'));
  if (hasAssets) {
    console.log('  ✅ 静态资源文件存在');
  } else {
    console.log('  ⚠️ 未找到assets文件夹');
  }
} else {
  console.log('  ❌ 构建输出缺失，请运行 npm run build');
  allChecksPass = false;
}

console.log('\n' + '='.repeat(50));
if (allChecksPass) {
  console.log('🎉 所有检查通过！项目已准备好部署到Vercel');
  console.log('\n部署命令:');
  console.log('  vercel --prod');
} else {
  console.log('❌ 检查失败，请修复上述问题后重试');
  process.exit(1);
}