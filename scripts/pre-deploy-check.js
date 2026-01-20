#!/usr/bin/env node

/**
 * 部署前检查脚本
 * 验证API密钥配置和其他关键设置
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🔍 开始部署前检查...\n');

// 检查.env.local文件
function checkEnvFile() {
  const envPath = path.join(projectRoot, '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local 文件不存在');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  let hasApiKey = false;
  let isPlaceholder = false;
  
  for (const line of lines) {
    if (line.startsWith('GEMINI_API_KEY=')) {
      hasApiKey = true;
      const apiKey = line.split('=')[1];
      
      if (!apiKey || apiKey.trim() === '') {
        console.log('❌ GEMINI_API_KEY 为空');
        return false;
      }
      
      if (apiKey === 'PLACEHOLDER_API_KEY') {
        isPlaceholder = true;
        console.log('⚠️  检测到占位符API密钥');
        console.log('   请访问 https://aistudio.google.com/app/apikey 获取真实密钥');
        return false;
      }
      
      if (!apiKey.startsWith('AIza')) {
        console.log('⚠️  API密钥格式可能不正确（应以AIza开头）');
        console.log('   当前密钥: ' + apiKey.substring(0, 10) + '...');
      } else {
        console.log('✅ API密钥格式正确');
      }
      
      break;
    }
  }
  
  if (!hasApiKey) {
    console.log('❌ 未找到 GEMINI_API_KEY 配置');
    return false;
  }
  
  return !isPlaceholder;
}

// 检查必需文件
function checkRequiredFiles() {
  const requiredFiles = [
    'package.json',
    'vercel.json',
    'vite.config.ts',
    'index.html'
  ];
  
  let allExists = true;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(projectRoot, file))) {
      console.log(`✅ ${file} 存在`);
    } else {
      console.log(`❌ ${file} 不存在`);
      allExists = false;
    }
  }
  
  return allExists;
}

// 检查构建输出
function checkBuildOutput() {
  const distPath = path.join(projectRoot, 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.log('⚠️  dist 目录不存在，请先运行 npm run build');
    return false;
  }
  
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('❌ dist/index.html 不存在');
    return false;
  }
  
  console.log('✅ 构建输出正常');
  return true;
}

// 检查Vercel配置
function checkVercelConfig() {
  const vercelPath = path.join(projectRoot, 'vercel.json');
  
  if (!fs.existsSync(vercelPath)) {
    console.log('❌ vercel.json 不存在');
    return false;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    
    if (config.framework !== 'vite') {
      console.log('⚠️  vercel.json framework 不是 vite');
    }
    
    if (config.outputDirectory !== 'dist') {
      console.log('⚠️  vercel.json outputDirectory 不是 dist');
    }
    
    console.log('✅ Vercel配置正常');
    return true;
  } catch (error) {
    console.log('❌ vercel.json 格式错误:', error.message);
    return false;
  }
}

// 主检查函数
function runChecks() {
  console.log('📋 检查清单:\n');
  
  const checks = [
    { name: 'API密钥配置', fn: checkEnvFile },
    { name: '必需文件', fn: checkRequiredFiles },
    { name: '构建输出', fn: checkBuildOutput },
    { name: 'Vercel配置', fn: checkVercelConfig }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    console.log(`\n🔍 检查 ${check.name}:`);
    const passed = check.fn();
    if (!passed) {
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 所有检查通过！项目已准备好部署');
    console.log('\n🚀 部署命令:');
    console.log('   vercel --prod');
    console.log('\n📝 部署后记得在Vercel中配置环境变量:');
    console.log('   GEMINI_API_KEY = 你的API密钥');
  } else {
    console.log('❌ 部分检查未通过，请修复后再部署');
    console.log('\n📖 详细指南: 查看 API_KEY_SETUP.md');
  }
  
  return allPassed;
}

// 运行检查
const success = runChecks();
process.exit(success ? 0 : 1);